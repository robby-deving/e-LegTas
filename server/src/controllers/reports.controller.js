// server/src/controllers/reports.controller.js
const { supabase } = require('../config/supabase');
const { uploadReportFile } = require('../services/storage.service');
const {
  NotImplementedError,
  generateReportFile,
  buildStoragePath,
} = require('../services/report-file.service');

// --- Helper for Custom API Errors ---
class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

function humanFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 100 || i === 0 ? 0 : val >= 10 ? 1 : 2)} ${units[i]}`;
}

const isoNow = () => new Date().toISOString();

/* ---------------------------------- *
 * Scope helpers
 * ---------------------------------- */
async function resolveEventIds({ disaster_evacuation_event_id, disaster_id }) {
  if (disaster_evacuation_event_id) return [Number(disaster_evacuation_event_id)];

  if (!disaster_id) return [];
  const { data: evs, error } = await supabase
    .from('disaster_evacuation_event')
    .select('id')
    .eq('disaster_id', Number(disaster_id));

  if (error) {
    console.error('[reports] resolveEventIds error:', error);
    throw new ApiError('Failed to resolve events for disaster.', 500);
  }
  return (evs || []).map((e) => e.id);
}

// Resolve disaster_name for headings/meta (works for either scope)
async function resolveDisasterName({ disaster_id, disaster_evacuation_event_id }) {
  if (disaster_evacuation_event_id) {
    const { data, error } = await supabase
      .from('disaster_evacuation_event')
      .select('disasters:disaster_id(disaster_name)')
      .eq('id', Number(disaster_evacuation_event_id))
      .single();
    if (error) {
      console.error('[reports] resolveDisasterName(error via event):', error);
      return null;
    }
    return data?.disasters?.disaster_name || null;
  }
  if (disaster_id) {
    const { data, error } = await supabase
      .from('disasters')
      .select('disaster_name')
      .eq('id', Number(disaster_id))
      .single();
    if (error) {
      console.error('[reports] resolveDisasterName(error via disaster):', error);
      return null;
    }
    return data?.disaster_name || null;
  }
  return null;
}

// Fetch registrations for event ids (filter “active as of” in Node)
async function fetchRegistrationsForEvents(eventIds = []) {
  if (!eventIds.length) return [];

  const { data, error } = await supabase
    .from('evacuation_registrations')
    .select(`
      id,
      arrival_timestamp,
      decampment_timestamp,
      ec_rooms_id,
      family_head_id,
      disaster_evacuation_event_id,
      evacuee_resident_id,
      profile_snapshot,
      vulnerability_type_ids,
      evacuee_residents:evacuee_resident_id (
        id,
        purok,
        relationship_to_family_head,
        residents:resident_id (
          id,
          sex,
          birthdate,
          barangay_of_origin,
          barangays:barangay_of_origin ( id, name )
        )
      ),
      evacuation_center_rooms:ec_rooms_id (
        id,
        room_name,
        evacuation_centers:evacuation_center_id (
          id,
          name,
          address,
          barangay_id,
          barangays:barangay_id ( id, name )
        )
      )
    `)
    .in('disaster_evacuation_event_id', eventIds);

  if (error) {
    console.error('[reports] fetchRegistrationsForEvents error:', error);
    throw new ApiError('Failed to fetch registrations.', 500);
  }
  return data || [];
}


// Vulnerability type map (PWD / Pregnant / Lactating)
async function fetchVulnerabilityTypeMap() {
  const { data, error } = await supabase
    .from('vulnerability_types')
    .select('id, name');

  if (error) {
    console.error('[reports] fetchVulnerabilityTypeMap error:', error);
    throw new ApiError('Failed to fetch vulnerability types.', 500);
  }
  const norm = (s) => String(s || '').toLowerCase();
  const out = { pwd: null, pregnant: null, lactating: null };
  for (const r of data || []) {
    const n = norm(r.name);
    if (out.pwd == null && (n.includes('pwd') || n.includes('disability'))) out.pwd = r.id;
    if (out.pregnant == null && n.includes('pregnan')) out.pregnant = r.id;
    if (out.lactating == null && (n.includes('lactat') || n.includes('breast'))) out.lactating = r.id;
  }
  return out;
}

// Barangay id -> name map (for snapshot numeric values)
async function fetchBarangayMap() {
  try {
    const { data, error } = await supabase.from('barangays').select('id, name');
    if (error) {
      console.warn('[reports] fetchBarangayMap warn:', error);
      return new Map();
    }
    return new Map((data || []).map((b) => [Number(b.id), b.name]));
  } catch (e) {
    console.warn('[reports] fetchBarangayMap exception:', e);
    return new Map();
  }
}

// “Active as of”: arrival <= asOf && (decamp is null || decamp > asOf)
function filterActiveAsOf(rows, asOf) {
  const t = new Date(asOf).getTime();
  return rows.filter((r) => {
    const arr = Date.parse(r.arrival_timestamp);
    if (Number.isNaN(arr) || arr > t) return false;
    const dec = r.decampment_timestamp ? Date.parse(r.decampment_timestamp) : null;
    return dec == null || dec > t;
  });
}

/**
 * @desc Generate a report, upload to Storage, and record in generated_reports
 * @route POST /api/v1/reports/generate
 * @body {
 *   report_name,
 *   report_type_id,
 *   disaster_id?,                    // XOR with disaster_evacuation_event_id
 *   disaster_evacuation_event_id?,   // XOR with disaster_id
 *   as_of,                           // ISO timestamp boundary
 *   file_format,                     // 'CSV' | 'PDF' | 'XLSX'
 *   generated_by_user_id?            // OPTIONAL fallback (legacy/dev). Prefer req.user.id.
 *   barangay_id?                     // required only for Per Barangay
 * }
 */
exports.generateReport = async (req, res, next) => {
  try {
    const {
      report_name,
      report_type_id,
      disaster_id,
      disaster_evacuation_event_id,
      as_of,
      file_format,
      generated_by_user_id, // optional fallback from client
      barangay_id,          // required for Per Barangay
    } = req.body || {};

    // --- required fields ---
    if (!report_name || !report_type_id || !as_of || !file_format) {
      return next(
        new ApiError('Missing required fields: report_name, report_type_id, as_of, file_format.', 400)
      );
    }

    // XOR scope: exactly one of disaster_id OR disaster_evacuation_event_id
    const hasDisaster = disaster_id !== undefined && disaster_id !== null;
    const hasEvent = disaster_evacuation_event_id !== undefined && disaster_evacuation_event_id !== null;
    if (hasDisaster === hasEvent) {
      return next(new ApiError('Provide exactly one of: disaster_id OR disaster_evacuation_event_id.', 400));
    }

    // as_of must be a valid ISO datetime
    const asDate = new Date(as_of);
    if (Number.isNaN(asDate.getTime())) {
      return next(new ApiError('Invalid as_of timestamp. Use ISO 8601.', 400));
    }

    // file_format guard
    const fileFormat = String(file_format).toUpperCase();
    const allowedFormats = new Set(['CSV', 'PDF', 'XLSX']);
    if (!allowedFormats.has(fileFormat)) {
      return next(new ApiError('Invalid file_format. Use one of: CSV, PDF, XLSX.', 400));
    }

    // --- Who is generating? Prefer authenticated user; fallback to body; final fallback to 2 ---
    const tokenUserId =
      (req?.user?.id) ??
      (req?.user?.user?.id) ??
      (req?.auth?.user?.id) ??
      null;

    let generatedBy = Number(tokenUserId);
    if (!Number.isInteger(generatedBy) || generatedBy <= 0) {
      const fallback = Number(generated_by_user_id);
      generatedBy = Number.isInteger(fallback) && fallback > 0 ? fallback : NaN;
    }
    // FINAL hard fallback to 2 (CDRRMO)
    if (!Number.isInteger(generatedBy) || generatedBy <= 0) {
      generatedBy = 2;
      console.warn('[reports.generate] Falling back to default generated_by_user_id=2');
    }

    // Ensure user exists in either 'users' or 'users_profile'
    let userFound = false;
    {
      let userRow = null;
      let userErr = null;

      // Try 'users'
      ({ data: userRow, error: userErr } = await supabase
        .from('users')
        .select('id')
        .eq('id', generatedBy)
        .single());

      if (!userErr && userRow) {
        userFound = true;
      } else {
        // Try 'users_profile'
        const { data: upRow, error: upErr } = await supabase
          .from('users_profile')
          .select('id')
          .eq('id', generatedBy)
          .single();

        if (!upErr && upRow) {
          userFound = true;
        }
      }
    }

    if (!userFound) {
      return next(new ApiError('User not found or unauthorized.', 401));
    }

    // Confirm report_type exists
    const { data: rtype, error: rtErr } = await supabase
      .from('report_types')
      .select('id, report_type')
      .eq('id', Number(report_type_id))
      .single();
    if (rtErr || !rtype) {
      return next(new ApiError('Invalid report_type_id.', 400));
    }

    // Detect Per Barangay report → require barangay_id
    const isPerBarangay = /^per\s*barangay/i.test(String(rtype.report_type || ''));
    let barangayId = null;
    if (isPerBarangay) {
      barangayId = Number(barangay_id);
      if (!Number.isInteger(barangayId) || barangayId <= 0) {
        return next(new ApiError('barangay_id is required and must be a positive integer for Per Barangay reports.', 400));
      }
    }

    // Resolve scope → event ids
    const eventIds = await resolveEventIds({ disaster_evacuation_event_id, disaster_id });
    if (!eventIds.length) {
      return next(new ApiError('No events found for the provided scope. Check disaster_id / event_id.', 400));
    }

    // Fetch rows in scope and filter "active as of"
    const rawRegs = await fetchRegistrationsForEvents(eventIds);
    const regs = filterActiveAsOf(rawRegs, as_of);

    // Resolve disaster name for headings
    const disasterName = await resolveDisasterName({ disaster_id, disaster_evacuation_event_id });

    // Vulnerability type mapping + Barangay map
    const [vulnMap, barangayMap] = await Promise.all([
      fetchVulnerabilityTypeMap(),
      fetchBarangayMap(),
    ]);

    const barangayName = isPerBarangay ? (barangayMap.get(barangayId) || '') : '';

    // Build file content by report type via service
    let buffer, contentType, ext, filenameBase;
    try {
      const gen = await generateReportFile({
        reportTypeName: rtype.report_type, // "Aggregated...", "Disaggregated...", "Per Barangay..."
        fileFormat,
        regs,
        reportName: report_name,
        disasterName,
        asOf: as_of,
        vulnMap,       
        barangayMap,  
        barangayId,    
        barangayName,  
      });
      ({ buffer, contentType, ext, filenameBase } = gen);
    } catch (e) {
      if (e instanceof NotImplementedError) {
        return next(new ApiError(e.message, 501));
      }
      throw e;
    }

    // Build storage path via service
    const pathInBucket = buildStoragePath({
      asOf: as_of,
      disaster_evacuation_event_id,
      disaster_id,
      filenameBase,
      ext,
    });

    // Upload to Storage
    const { path, url } = await uploadReportFile(buffer, pathInBucket, contentType);
    const fileSizeBytes = Buffer.isBuffer(buffer) ? buffer.length : (buffer?.byteLength ?? 0);

    // Insert metadata row
    const timestamp = isoNow();
    const insertPayload = {
      report_name: String(report_name),
      report_type_id: Number(report_type_id),
      disaster_id: hasDisaster ? Number(disaster_id) : null,
      disaster_evacuation_event_id: hasEvent ? Number(disaster_evacuation_event_id) : null,
       generation_timestamp: new Date(as_of).toISOString(),
      generated_by_user_id: generatedBy,
      file_path: path,
      file_format: fileFormat,
      created_at: timestamp,
      updated_at: timestamp,
      file_size_bytes: fileSizeBytes,
      file_size_human: humanFileSize(fileSizeBytes),
    };

    const { data: ins, error: insErr } = await supabase
      .from('generated_reports')
      .insert([insertPayload])
      .select()
      .single();

    if (insErr) {
      console.error('[reports] failed to insert generated_reports:', insErr);
      return next(new ApiError('File uploaded but failed to record metadata.', 500));
    }

    return res.status(201).json({
      message: 'Report generated successfully.',
      data: {
        ...ins,
        public_url: url,
        file_size_bytes: fileSizeBytes,
        file_size_human: humanFileSize(fileSizeBytes),
      },
    });
  } catch (err) {
    console.error('[reports.generate] error:', err);
    const status = err instanceof ApiError ? err.statusCode : 500;
    return next(new ApiError(err.message || 'Failed to generate report.', status));
  }
};

function prettyReportType(label = '') {
  const s = String(label).toLowerCase();
  if (s.startsWith('aggregated')) return 'Aggregated';
  if (s.startsWith('disaggregated')) return 'Disaggregated';
  if (s.startsWith('per') && s.includes('barangay')) return 'Per Barangay';
  return label || '';
}

// --- Split a storage path into { dir, name } (yours is fine)
function splitStoragePath(p = '') {
  const idx = p.lastIndexOf('/');
  if (idx === -1) return { dir: '', name: p };
  return { dir: p.slice(0, idx), name: p.slice(idx + 1) };
}

// --- Batch fetch file sizes from Supabase Storage (more robust)
async function resolveSizesForPaths(paths = []) {
  if (!Array.isArray(paths) || paths.length === 0) return new Map();

  const result = new Map(); // file_path -> bytes|null
  const byDir = new Map();  // dir -> Set<name>

  for (const p of paths) {
    if (!p) continue;
    result.set(p, null);
    const { dir, name } = splitStoragePath(p);
    if (!byDir.has(dir)) byDir.set(dir, new Set());
    byDir.get(dir).add(name);
  }

  // Process each directory; you can also do Promise.all here if you like
  for (const [dir, namesSet] of byDir.entries()) {
    const names = Array.from(namesSet);
    const limit = Math.min(1000, Math.max(100, names.length)); // cap at 1000

    const { data: files, error } = await supabase.storage
      .from('reports')
      .list(dir || '', { limit });

    if (error || !Array.isArray(files)) continue;

    // Only files; and consider both top-level "size" and "metadata.size"
    const sizeByName = new Map(
      files
        .filter(f => typeof f?.name === 'string' && f.name.length > 0)
        .map(f => {
          const sizeTop = (typeof f.size === 'number') ? f.size : null;
          const sizeMeta = (f?.metadata && typeof f.metadata.size === 'number') ? f.metadata.size : null;
          return [f.name, (sizeTop ?? sizeMeta ?? null)];
        })
    );

    for (const n of names) {
      const full = dir ? `${dir}/${n}` : n;
      result.set(full, sizeByName.get(n) ?? null);
    }
  }

  return result; // Map(path -> bytes|null)
}

/**
 * @desc Get all generated reports (pretty fields)
 * @route GET /api/v1/reports/getAllReports
 * @query (optional) disaster_id, disaster_evacuation_event_id, report_type_id, file_format, search, sort_by, sort_dir
 */
exports.getAllReports = async (req, res, next) => {
  try {
    const {
      disaster_id,
      disaster_evacuation_event_id,
      report_type_id,
      file_format,              // CSV | XLSX | PDF
      search,                   // substring on report_name
      sort_by = 'created_at',   // created_at | generation_timestamp | report_name | file_format
      sort_dir = 'desc',        // asc | desc
      include_deleted = 'false' // show soft-deleted if "true"
    } = req.query || {};

    const allowedSort = new Set(['created_at', 'generation_timestamp', 'report_name', 'file_format']);
    const sortCol = allowedSort.has(String(sort_by)) ? String(sort_by) : 'created_at';
    const ascending = String(sort_dir).toLowerCase() === 'asc';
    const showDeleted = String(include_deleted).toLowerCase() === 'true';

    let q = supabase
      .from('generated_reports')
      .select(`
        id,
        report_name,
        report_type_id,
        disaster_id,
        disaster_evacuation_event_id,
        generation_timestamp,
        generated_by_user_id,
        file_path,
        file_format,
        file_size_bytes,
        file_size_human,
        created_at,
        updated_at,
        deleted_at,
        report_types:report_type_id ( report_type ),
        disasters:disaster_id ( disaster_name ),
        disaster_evacuation_event:disaster_evacuation_event_id (
          id,
          disasters:disaster_id ( disaster_name )
        )
      `);

    if (!showDeleted) q = q.is('deleted_at', null);

    if (disaster_id) q = q.eq('disaster_id', Number(disaster_id));
    if (disaster_evacuation_event_id) q = q.eq('disaster_evacuation_event_id', Number(disaster_evacuation_event_id));
    if (report_type_id) q = q.eq('report_type_id', Number(report_type_id));
    if (file_format) q = q.eq('file_format', String(file_format).toUpperCase());
    if (search) q = q.ilike('report_name', `%${search}%`);

    q = q.order(sortCol, { ascending, nullsFirst: !ascending });

    const { data, error } = await q;
    if (error) {
      console.error('[reports.getAllReports] supabase error:', error);
      return next(new ApiError('Failed to fetch reports.', 500));
    }

    const rows = data || [];

    // Fallback size for legacy rows without persisted size
    const sizeMap = await resolveSizesForPaths(rows.map(r => r.file_path).filter(Boolean));

    const out = rows.map((r) => {
      const disasterName =
        r?.disasters?.disaster_name ||
        r?.disaster_evacuation_event?.disasters?.disaster_name ||
        null;

      const { data: pub } = supabase.storage.from('reports').getPublicUrl(r.file_path || '');

      // Prefer saved size; else fallback to listing
      const savedHuman = r.file_size_human ?? null;
      const savedBytes = r.file_size_bytes ?? null;
      const fallbackBytes = sizeMap.get(r.file_path || '') ?? null;
      const finalBytes = savedBytes ?? fallbackBytes ?? null;

      const sizeHuman = savedHuman ?? (finalBytes != null ? humanFileSize(finalBytes) : null);

      return {
        id: r.id,
        report_name: r.report_name,
        report_type: prettyReportType(r?.report_types?.report_type || ''), // Aggregated | Disaggregated | Per Barangay
        file_format: r.file_format,                                        // CSV | PDF | XLSX
        disaster_name: disasterName,
        as_of: r.generation_timestamp,                                     // <- use generation_timestamp as "as of"
        file_size_human: sizeHuman,
        public_url: pub?.publicUrl || null,
        created_at: r.created_at,
        updated_at: r.updated_at
      };
    });

    return res.status(200).json({ message: 'Fetched reports.', data: out });
  } catch (err) {
    console.error('[reports.getAllReports] error:', err);
    return next(new ApiError('Failed to fetch reports.', 500));
  }
};

/**
 * @desc Soft delete a generated report by id (sets deleted_at)
 * @route DELETE /api/v1/reports/:id
 */
exports.deleteReport = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return next(new ApiError('Invalid report id.', 400));
    }

    // Ensure it exists and is not already deleted
    const { data: row, error: fetchErr } = await supabase
      .from('generated_reports')
      .select('id, deleted_at')
      .eq('id', id)
      .single();

    if (fetchErr || !row) {
      return next(new ApiError('Report not found.', 404));
    }
    if (row.deleted_at) {
      return next(new ApiError('Report already deleted.', 404));
    }

    const timestamp = new Date().toISOString();

    const { data: updated, error: updErr } = await supabase
      .from('generated_reports')
      .update({ deleted_at: timestamp, updated_at: timestamp })
      .eq('id', id)
      .select()
      .single();

    if (updErr) {
      console.error('[reports.deleteReport] supabase error:', updErr);
      return next(new ApiError('Failed to delete report.', 500));
    }

    return res.status(200).json({
      message: 'Report deleted (soft).',
      data: { id: updated.id, deleted_at: updated.deleted_at }
    });
  } catch (err) {
    console.error('[reports.deleteReport] error:', err);
    return next(new ApiError('Failed to delete report.', 500));
  }
};


function uiReportType(label = '') {
  // Keep your UI label convention: "Barangay Report"
  const s = String(label).toLowerCase();
  if (s.startsWith('aggregated')) return 'Aggregated';
  if (s.startsWith('disaggregated')) return 'Disaggregated';
  if (s.includes('barangay')) return 'Barangay Report';
  return label || '';
}

exports.getReportTypes = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('report_types')
      .select('id, report_type')
      .order('id', { ascending: true });

    if (error) {
      console.error('[reports.getReportTypes] supabase error:', error);
      return next(new ApiError('Failed to fetch report types.', 500));
    }

    const out = (data || []).map((r) => ({
      id: r.id,
      name: r.report_type,                          
      pretty_name: prettyReportType(r.report_type),  
      ui_label: uiReportType(r.report_type),         
    }));

    return res.status(200).json({ message: 'Fetched report types.', data: out });
  } catch (err) {
    console.error('[reports.getReportTypes] error:', err);
    return next(new ApiError('Failed to fetch report types.', 500));
  }
};

/**
 * GET /api/v1/reports/options
 * Query:
 *  - search: string (barangay name contains)
 *  - disaster_search: string (disaster name contains)  <-- NEW
 *  - barangay_limit: number (default 70)
 *  - disaster_limit: number (default 100)
 *  - status: 'all' | 'active' | 'ended'   (default 'all')
 */
exports.getReportOptions = async (req, res, next) => {
  try {
    const {
      search = '',
      disaster_search = '',
      barangay_limit = '70',
      disaster_limit = '100',
      status = 'all'
    } = req.query || {};

    // 1) Report types
    const { data: types, error: typesErr } = await supabase
      .from('report_types')
      .select('id, report_type')
      .order('id', { ascending: true });
    if (typesErr) throw typesErr;

    // 2) Barangays (sorted by numeric prefix if present)
    const brgyLimitNumRaw = Number(barangay_limit);
    const brgyLimit = Number.isFinite(brgyLimitNumRaw) && brgyLimitNumRaw > 0 ? brgyLimitNumRaw : 70;

    let bq = supabase.from('barangays').select('id, name');
    if (search) bq = bq.ilike('name', `%${search}%`);

    const { data: barangaysRaw, error: brgyErr } = await bq;
    if (brgyErr) throw brgyErr;

    const extractNum = (s = '') => {
      const m = String(s).match(/\d+/);
      return m ? parseInt(m[0], 10) : Number.POSITIVE_INFINITY;
    };

    const barangaysSorted = (barangaysRaw || []).sort((a, b) => {
      const an = extractNum(a.name);
      const bn = extractNum(b.name);
      return an === bn ? a.name.localeCompare(b.name) : an - bn;
    });

    const barangays = barangaysSorted.slice(0, brgyLimit);

    // 3) Disasters (filter by status and optional name search)
    const disLimitNumRaw = Number(disaster_limit);
    const disLimit = Number.isFinite(disLimitNumRaw) && disLimitNumRaw > 0 ? disLimitNumRaw : 100;

    let dq = supabase
      .from('disasters')
      .select(`
        id,
        disaster_name,
        disaster_start_date,
        disaster_end_date,
        disaster_type_id,
        disaster_types:disaster_type_id ( name )
      `)
      .order('disaster_start_date', { ascending: false })
      .limit(disLimit);

    const s = String(status).toLowerCase();
    if (s === 'active') dq = dq.is('disaster_end_date', null);
    if (s === 'ended')  dq = dq.not('disaster_end_date', 'is', null);

    if (disaster_search) dq = dq.ilike('disaster_name', `%${disaster_search}%`);

    const { data: disasters, error: disErr } = await dq;
    if (disErr) throw disErr;

    return res.status(200).json({
      message: 'Fetched report options.',
      data: {
        report_types: (types || []).map(t => ({
          id: t.id,
          report_type: t.report_type,
          pretty: prettyReportType(t.report_type || ''),
        })),
        barangays: barangays.map(b => ({
          id: b.id,
          name: b.name,
        })),
        disasters: (disasters || []).map(d => ({
          id: d.id,
          name: d.disaster_name,
          type_id: d.disaster_type_id,
          type_name: d?.disaster_types?.name || null,
          start_date: d.disaster_start_date,
          end_date: d.disaster_end_date,
          status: d.disaster_end_date ? 'Ended' : 'Active',
        })),
      },
    });
  } catch (err) {
    console.error('[reports.getReportOptions] error:', err);
    return next(new ApiError('Failed to fetch report options.', 500));
  }
};
