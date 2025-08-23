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
 *   generated_by_user_id             // temp: explicit user id during dev
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
      generated_by_user_id,
      barangay_id, // optional except when Per Barangay report
    } = req.body || {};

    // --- requireds ---
    if (!report_name || !report_type_id || !as_of || !file_format) {
      return next(
        new ApiError('Missing required fields: report_name, report_type_id, as_of, file_format.', 400)
      );
    }

    // Scope XOR: exactly one of disaster_id OR disaster_evacuation_event_id
    const hasDisaster = disaster_id !== undefined && disaster_id !== null;
    const hasEvent = disaster_evacuation_event_id !== undefined && disaster_evacuation_event_id !== null;
    if (hasDisaster === hasEvent) {
      return next(new ApiError('Provide exactly one of: disaster_id OR disaster_evacuation_event_id.', 400));
    }

    // as_of must be a valid ISO date
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

    // DEV: generated_by_user_id required (until auth middleware handles it)
    const genByRaw = generated_by_user_id ?? process.env.DEFAULT_REPORT_USER_ID;
    const generatedBy = Number(genByRaw);
    if (!Number.isInteger(generatedBy) || generatedBy <= 0) {
      return next(new ApiError('generated_by_user_id is required (positive integer).', 400));
    }
    // Ensure user exists
    {
      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('id')
        .eq('id', generatedBy)
        .single();
      if (userErr || !userRow) {
        return next(new ApiError('generated_by_user_id not found in users table.', 400));
      }
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

    // Detect Per Barangay report to require barangay_id
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

    // Vulnerability type mapping + Barangay map (for labels & filtering)
    const [vulnMap, barangayMap] = await Promise.all([
      (async () => {
        const { data, error } = await supabase.from('vulnerability_types').select('id, name');
        if (error) throw new ApiError('Failed to fetch vulnerability types.', 500);
        const norm = (s) => String(s || '').toLowerCase();
        const out = { pwd: null, pregnant: null, lactating: null };
        for (const r of data || []) {
          const n = norm(r.name);
          if (out.pwd == null && (n.includes('pwd') || n.includes('disability'))) out.pwd = r.id;
          if (out.pregnant == null && n.includes('pregnan')) out.pregnant = r.id;
          if (out.lactating == null && (n.includes('lactat') || n.includes('breast'))) out.lactating = r.id;
        }
        return out;
      })(),
      (async () => {
        try {
          const { data, error } = await supabase.from('barangays').select('id, name');
          if (error) return new Map();
          return new Map((data || []).map((b) => [Number(b.id), b.name]));
        } catch {
          return new Map();
        }
      })(),
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
        vulnMap,       // for PWD/Pregnant/Lactating buckets
        barangayMap,   // for label resolution
        barangayId,    // only used in Per Barangay
        barangayName,  // banner cell in Per Barangay
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

    // Insert metadata row (respect XOR columns)
    const timestamp = isoNow();
    const insertPayload = {
      report_name: String(report_name),
      report_type_id: Number(report_type_id),
      disaster_id: hasDisaster ? Number(disaster_id) : null,
      disaster_evacuation_event_id: hasEvent ? Number(disaster_evacuation_event_id) : null,
      generation_timestamp: timestamp,
      generated_by_user_id: generatedBy,
      file_path: path,
      file_format: fileFormat,
      created_at: timestamp,
      updated_at: timestamp,
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
      data: { ...ins, public_url: url },
    });
  } catch (err) {
    console.error('[reports.generate] error:', err);
    const status = err instanceof ApiError ? err.statusCode : 500;
    return next(new ApiError(err.message || 'Failed to generate report.', status));
  }
};
