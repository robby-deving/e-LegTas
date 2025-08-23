// server/src/services/report-file.service.js
const ExcelJS = require('exceljs');
const path = require('path');

class NotImplementedError extends Error {}

const SLUG = (s = '') =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 120);

const escapeCSV = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (arr) => arr.map(escapeCSV).join(',');

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

// Normalize barangay labels to avoid duplicates (trim, collapse spaces)
function normalizeBarangayLabel(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

// Prefer snapshot.barangay_of_origin; support numeric (map to name) or string
function resolveBarangayLabel(snapValue, residentJoinName, barangayMap) {
  if (snapValue !== undefined && snapValue !== null) {
    const num = Number(snapValue);
    if (Number.isFinite(num)) {
      const mapped = barangayMap?.get(num);
      if (mapped) return normalizeBarangayLabel(mapped);
    }
    if (typeof snapValue === 'string' && snapValue.trim() !== '') {
      return normalizeBarangayLabel(snapValue);
    }
  }
  return normalizeBarangayLabel(residentJoinName || '');
}

function asBarangayName(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  const idx = s.lastIndexOf(' - ');
  if (idx !== -1) return s.slice(idx + 3).trim();
  s = s.replace(/^(?:brgy|bgy|barangay)\.?/i, '').trim();
  s = s.replace(/^\d+\s*/i, '').trim();
  return s;
}

/** ------------------ Aggregated (CSV) ------------------ */
function buildAggregatedStatusCSV({ regs = [], disasterName = '', asOf, barangayMap }) {
  const byEc = new Map();

  for (const r of regs) {
    const ec = r?.evacuation_center_rooms?.evacuation_centers || {};
    const ecId = ec?.id ?? 'unknown';
    const ecName = ec?.name ?? '';
    const ecBarangayName = ec?.barangays?.name || '';
    const ecAddr = ecBarangayName || asBarangayName(ec?.address || '');

    if (!byEc.has(ecId)) {
      byEc.set(ecId, {
        ecName,
        address: ecAddr,
        originNames: new Set(),
        persons: 0,
        // count families per EC (unique family or solo evacuee)
        familiesKeys: new Set(),
      });
    }
    const bucket = byEc.get(ecId);

    // Family key: handle null family_head_id as "solo:<evacuee>"
    const famKey = r.family_head_id ?? `solo:${r.evacuee_resident_id}`;
    bucket.familiesKeys.add(famKey);

    bucket.persons += 1;

    // Origin (SNAPSHOT-FIRST)
    const residentJoinName = r?.evacuee_residents?.residents?.barangays?.name || '';
    const originFinal = resolveBarangayLabel(
      r?.profile_snapshot?.barangay_of_origin,
      residentJoinName,
      barangayMap
    );
    if (originFinal) bucket.originNames.add(originFinal);
  }

  const lines = [];
  lines.push(row(['LEGAZPI CITY']));
  lines.push(row([`Status Report on ${disasterName || '—'}`]));
  lines.push(row([`as of ${formatAsOf(asOf)}`]));
  lines.push('');
  lines.push(row([
    'Name of Evacuation Center','Address','Origin of IDPs',
    'Number of Displaced','','',''
  ]));
  lines.push(row(['','','','INSIDE ECs','','OUTSIDE ECs','']));
  lines.push(row(['','','','Families','Persons','Families','Persons']));

  for (const [, agg] of byEc) {
    const families = agg.familiesKeys.size;
    const persons = agg.persons;
    const originsJoined = Array.from(agg.originNames).sort((a,b)=>a.localeCompare(b)).join(' / ');
    lines.push(row([agg.ecName, agg.address, originsJoined, families, persons, '', '']));
  }
  const csv = '\uFEFF' + lines.join('\n');
  return Buffer.from(csv, 'utf8');
}

/** ------------------ Disaggregated (XLSX via template) ------------------ */

function ageInYears(birthdateISO, asOfISO) {
  if (!birthdateISO) return null;
  const b = new Date(birthdateISO);
  const a = new Date(asOfISO);
  if (isNaN(b.getTime()) || isNaN(a.getTime())) return null;
  let age = a.getFullYear() - b.getFullYear();
  const m = a.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && a.getDate() < b.getDate())) age--;
  return age;
}

async function buildDisaggregatedXLSX({ regs = [], disasterName = '', asOf, vulnMap, barangayMap }) {
  // group by (Barangay, Evacuation Center) using normalized labels
  const groups = new Map(); // key: `${barangay}||${ecName}`

  for (const r of regs) {
    const resident = r?.evacuee_residents?.residents || {};
    const snap = (typeof r?.profile_snapshot === 'string'
      ? (() => { try { return JSON.parse(r.profile_snapshot); } catch { return {}; } })()
      : (r?.profile_snapshot || {}));

    // SNAPSHOT-FIRST sex & birthdate
    const sexVal = (snap.sex ?? resident.sex ?? '').toString().toLowerCase();
    const birthdate = snap.birthdate ?? resident.birthdate ?? null;

    // SNAPSHOT-FIRST origin barangay
    const residentJoinName = resident?.barangays?.name || '';
    const originName = resolveBarangayLabel(snap.barangay_of_origin, residentJoinName, barangayMap);

    const ecName = r?.evacuation_center_rooms?.evacuation_centers?.name || '';

    const key = `${originName}||${ecName}`;
    if (!groups.has(key)) {
      groups.set(key, {
        barangay: originName,
        ecName,
        familyKeys: new Set(),      // robust family counting
        male: 0,
        female: 0,
        total: 0,
        infants: 0,
        children: 0,
        youth: 0,
        adults: 0,
        seniors: 0,
        pwd: 0,
        pregnant: 0,
        lactating: 0,
      });
    }
    const g = groups.get(key);

    // Family counting: handle null family_head_id
    const famKey = r.family_head_id ?? `solo:${r.evacuee_resident_id}`;
    g.familyKeys.add(famKey);

    // Sex
    if (sexVal === 'male') g.male += 1;
    else if (sexVal === 'female') g.female += 1;

    // Age buckets (SNAPSHOT-FIRST birthdate)
    const age = ageInYears(birthdate, asOf);
    if (age != null) {
      if (age <= 1) g.infants += 1;
      else if (age <= 12) g.children += 1;
      else if (age <= 17) g.youth += 1;
      else if (age <= 59) g.adults += 1;
      else g.seniors += 1;
    }

    g.total += 1;

    // Vulnerabilities are event-scoped on the registration row
    const ids = Array.isArray(r.vulnerability_type_ids) ? r.vulnerability_type_ids : [];
    if (vulnMap?.pwd != null && ids.includes(vulnMap.pwd)) g.pwd += 1;
    if (vulnMap?.pregnant != null && ids.includes(vulnMap.pregnant)) g.pregnant += 1;
    if (vulnMap?.lactating != null && ids.includes(vulnMap.lactating)) g.lactating += 1;
  }

  const rows = Array.from(groups.values()).sort((a, b) => {
    const byB = (a.barangay || '').localeCompare(b.barangay || '');
    if (byB !== 0) return byB;
    return (a.ecName || '').localeCompare(b.ecName || '');
  });

  const templatePath = path.resolve(__dirname, '../../templates/Disaggregated.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.getWorksheet('Sheet1') || wb.worksheets[0];

  // Banners
  ws.getCell('A4').value = `STATUS REPORT FOR ${disasterName || ''}`;
  ws.getCell('A5').value = `as of ${formatAsOf(asOf)}`;

  // First data row at A9..N9
  const START_ROW = 9;

  // Optional cleanup to avoid stale rows if template gets reused
  for (let r = START_ROW; r < START_ROW + 2000; r++) {
    for (let c = 1; c <= 14; c++) ws.getCell(r, c).value = null;
  }

  rows.forEach((g, i) => {
    const r = START_ROW + i;
    ws.getCell(r, 1).value  = g.barangay || '';           // A: Barangay
    ws.getCell(r, 2).value  = g.ecName || '';             // B: Evacuation Center/Site
    ws.getCell(r, 3).value  = g.familyKeys.size;          // C: Family (unique families in group)
    ws.getCell(r, 4).value  = g.male;                     // D: Total Male
    ws.getCell(r, 5).value  = g.female;                   // E: Total Female
    ws.getCell(r, 6).value  = g.total;                    // F: Total Individuals
    ws.getCell(r, 7).value  = g.infants;                  // G: Infant
    ws.getCell(r, 8).value  = g.children;                 // H: Children
    ws.getCell(r, 9).value  = g.youth;                    // I: Youth
    ws.getCell(r,10).value  = g.adults;                   // J: Adult
    ws.getCell(r,11).value  = g.seniors;                  // K: Senior Citizens
    ws.getCell(r,12).value  = g.pwd;                      // L: PWD
    ws.getCell(r,13).value  = g.pregnant;                 // M: Pregnant Woman
    ws.getCell(r,14).value  = g.lactating;                // N: Lactating Women
  });

  // Simple widths
  [1,2].forEach((col) => { ws.getColumn(col).width = 28; });
  for (let c = 3; c <= 14; c++) ws.getColumn(c).width = 16;

  const buffer = await wb.xlsx.writeBuffer();
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: 'xlsx',
    filenameBase: `${SLUG('disaggregated-status')}`,
  };
}

/** Dispatcher */
function generateReportFile({ reportTypeName, fileFormat, regs, reportName, disasterName, asOf, vulnMap, barangayMap }) {
  const type = String(reportTypeName || '').toLowerCase();

  if (fileFormat === 'CSV') {
    if (/^aggregated/.test(type)) {
      return {
        buffer: buildAggregatedStatusCSV({ regs, disasterName, asOf, barangayMap }),
        contentType: 'text/csv',
        ext: 'csv',
        filenameBase: `${SLUG('aggregated-status')}-${SLUG(reportName || 'report')}`,
      };
    }
    throw new NotImplementedError('CSV generation for this report type is not implemented yet.');
  }

  if (fileFormat === 'XLSX') {
    if (/^disaggregated/.test(type)) {
      return buildDisaggregatedXLSX({ regs, disasterName, asOf, vulnMap, barangayMap });
    }
    throw new NotImplementedError('XLSX generation for this report type is not implemented yet.');
  }

  if (fileFormat === 'PDF') throw new NotImplementedError('PDF generation not implemented yet.');
  throw new Error('Unsupported file format.');
}

/** Storage path */
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
