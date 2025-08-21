// server/src/services/report-file.service.js
class NotImplementedError extends Error {}

/** Safe, short slug for filenames */
const SLUG = (s = '') =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 120);

/** CSV helpers */
const escapeCSV = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (arr) => arr.map(escapeCSV).join(',');

/** 21 August 2025, 9 AM */
function formatAsOf(asOfISO) {
  const d = new Date(asOfISO);
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'long' });
  const year = d.getFullYear();
  let h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const time = m === 0 ? `${h}${ampm}` : `${h}:${String(m).padStart(2, '0')} ${ampm}`;
  return `${day} ${month} ${year}, ${time}`;
}

/**
 * Normalize barangay label to the plain name.
 * Examples:
 *  - "Bgy. 10 - Cabugao"        -> "Cabugao"
 *  - "Brgy 47 - Arimbay"        -> "Arimbay"
 *  - "Barangay 16 - Kawit-East" -> "Kawit-East"
 *  - "Cabugao"                  -> "Cabugao"
 */
function asBarangayName(raw) {
  if (!raw) return '';
  let s = String(raw).trim();

  // Common pattern "X - Name" → take the part after the last " - "
  const idx = s.lastIndexOf(' - ');
  if (idx !== -1) {
    return s.slice(idx + 3).trim();
  }

  // Strip leading tokens like "Brgy", "Bgy", "Barangay" and optional number
  s = s.replace(/^(?:brgy|bgy|barangay)\.?/i, '').trim();
  s = s.replace(/^\d+\s*/i, '').trim();

  return s;
}

/**
 * Aggregated Status Report (CSV)
 * Address:
 *   - Prefer barangays.name from evacuation_centers.barangay_id
 *   - Fallback to evacuation_centers.address (normalized to name if it contains "Bgy. X - Name")
 * Origin of IDPs:
 *   - Prefer barangays.name from residents.barangay_of_origin
 *   - Fallback to profile_snapshot.barangay_of_origin (normalized)
 *   - De-duped by final name; sorted alphabetically
 */
function buildAggregatedStatusCSV({ regs = [], disasterName = '', asOf }) {
  const byEc = new Map(); // ecId -> { ecName, address, originNames(Set), persons, familyIds(Set) }

  for (const r of regs) {
    const ec = r?.evacuation_center_rooms?.evacuation_centers || {};
    const ecId = ec?.id ?? 'unknown';
    const ecName = ec?.name ?? '';

    // ADDRESS: show only the barangay NAME (no "Bgy. <id> -")
    const ecBarangayName = ec?.barangays?.name || '';
    let ecAddr = ecBarangayName || asBarangayName(ec?.address || '');

    if (!byEc.has(ecId)) {
      byEc.set(ecId, {
        ecName,
        address: ecAddr,
        originNames: new Set(), // unique barangay names
        persons: 0,
        familyIds: new Set(),
      });
    }
    const bucket = byEc.get(ecId);

    bucket.persons += 1;
    if (r.family_head_id) bucket.familyIds.add(r.family_head_id);

    // ORIGIN OF IDPs: prefer join name; fallback to normalized snapshot
    const originNameJoined = r?.evacuee_residents?.residents?.barangays?.name || '';
    const originSnapshot = r?.profile_snapshot?.barangay_of_origin || '';
    const originFinal = originNameJoined || asBarangayName(originSnapshot);

    if (originFinal) bucket.originNames.add(originFinal);
  }

  const lines = [];
  lines.push(row(['LEGAZPI CITY']));
  lines.push(row([`Status Report on ${disasterName || '—'}`]));
  lines.push(row([`as of ${formatAsOf(asOf)}`]));
  lines.push('');

  // 3-row table header
  lines.push(row([
    'Name of Evacuation Center',
    'Address',
    'Origin of IDPs',
    'Number of Displaced', '', '', ''
  ]));
  lines.push(row(['', '', '', 'INSIDE ECs', '', 'OUTSIDE ECs', '' ]));
  lines.push(row(['', '', '', 'Families', 'Persons', 'Families', 'Persons' ]));

  // Data rows
  for (const [, agg] of byEc) {
    const families = agg.familyIds.size;
    const persons = agg.persons;

    // Sort origin names alphabetically for consistent output
    const originsJoined = Array.from(agg.originNames).sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    ).join(' / ');

    lines.push(row([
      agg.ecName,
      agg.address,
      originsJoined,
      families,
      persons,
      '', // outside ECs families (not in scope)
      ''  // outside ECs persons  (not in scope)
    ]));
  }

  // Excel-friendly UTF-8
  const csv = '\uFEFF' + lines.join('\n');
  return Buffer.from(csv, 'utf8');
}

/** Dispatcher */
function generateReportFile({ reportTypeName, fileFormat, regs, reportName, disasterName, asOf }) {
  const type = String(reportTypeName || '').toLowerCase();

  if (fileFormat === 'CSV') {
    if (/^aggregated/.test(type)) {
      return {
        buffer: buildAggregatedStatusCSV({ regs, disasterName, asOf }),
        contentType: 'text/csv',
        ext: 'csv',
        filenameBase: `${SLUG('aggregated-status')}-${SLUG(reportName || 'report')}`,
      };
    }
    throw new NotImplementedError('CSV generation for this report type is not implemented yet.');
  }

  if (fileFormat === 'XLSX') throw new NotImplementedError('XLSX generation not implemented yet.');
  if (fileFormat === 'PDF') throw new NotImplementedError('PDF generation not implemented yet.');
  throw new Error('Unsupported file format.');
}

/** Storage path: YYYY-MM-DD/<event|disaster>-<id>/<slug>-<timestamp>.ext */
function buildStoragePath({ asOf, disaster_evacuation_event_id, disaster_id, filenameBase, ext }) {
  const d = new Date(asOf);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const scopeFolder = disaster_evacuation_event_id
    ? `event-${Number(disaster_evacuation_event_id)}`
    : `disaster-${Number(disaster_id)}`;
  return `${y}-${m}-${dd}/${scopeFolder}/${filenameBase}-${Date.now()}.${ext}`;
}

module.exports = {
  NotImplementedError,
  generateReportFile,
  buildStoragePath,
};
