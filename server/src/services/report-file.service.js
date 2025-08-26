// server/src/services/report-file.service.js
const ExcelJS = require('exceljs');
const path = require('path');
const puppeteer = require('puppeteer');

const LAUNCH_OPTS = {
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  ...(process.env.PUPPETEER_EXECUTABLE_PATH
    ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }
    : {})
};

class NotImplementedError extends Error {}

const SLUG = (s = '') =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 120);

const escapeCSV = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (arr) => arr.map(escapeCSV).join(',');

const PRINT_BASE_URL = process.env.PRINT_BASE_URL || 'http://localhost:5173/print';

// Default PDF options from env (format or width/height)
const DEFAULT_PDF_OPTS = (() => {
  const base = {
    printBackground: true,
    landscape: String(process.env.PDF_LANDSCAPE).toLowerCase() === 'true',
    margin: {
      top:    process.env.PDF_MARGIN_TOP    || process.env.PDF_MARGIN || '5mm',
      right:  process.env.PDF_MARGIN_RIGHT  || process.env.PDF_MARGIN || '5mm',
      bottom: process.env.PDF_MARGIN_BOTTOM || process.env.PDF_MARGIN || '5mm',
      left:   process.env.PDF_MARGIN_LEFT   || process.env.PDF_MARGIN || '5mm',
    },
  };
  const w = process.env.PDF_WIDTH;
  const h = process.env.PDF_HEIGHT;
  if (w && h) return { ...base, width: w, height: h };
  return { ...base, format: process.env.PDF_FORMAT || 'A4' };
})();

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

function splitAsOf(asOfISO) {
  const d = new Date(asOfISO);
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'long' });
  const year = d.getFullYear();
  let h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const time = m === 0 ? `${h}${ampm}` : `${h}:${String(m).padStart(2, '0')} ${ampm}`;
  return { reportDate: `${day} ${month} ${year}`, reportTime: time };
}

const normalizeBarangayLabel = (s) => String(s || '').replace(/\s+/g, ' ').trim();

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

function parseMaybeJSON(v, fallback) {
  if (Array.isArray(v) || (v && typeof v === 'object')) return v;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return fallback; }
  }
  return fallback;
}

function buildFullName({ first_name, middle_name, last_name, suffix }) {
  const parts = [first_name, middle_name, last_name].map((x) => (x ?? '').trim()).filter(Boolean);
  const base = parts.join(' ');
  return suffix ? `${base} ${suffix}` : base;
}

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

/* ---------- Auto-fit for all XLSX ---------- */
function autoFitWorksheet(ws, { min = 8, max = 50 } = {}) {
  const colCount = ws.columnCount || (ws.actualColumnCount ?? 0) || 50;
  for (let c = 1; c <= colCount; c++) {
    let maxLen = 0;
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cell = row.getCell(c);
      const v = cell?.value;
      const s = typeof v === 'object' && v && v.richText
        ? v.richText.map(rt => rt.text).join('')
        : v == null ? '' : String(v);
      if (s.length > maxLen) maxLen = s.length;
    });
    if (maxLen > 0) ws.getColumn(c).width = Math.min(Math.max(maxLen + 2, min), max);
  }
}

/* ------------------ Aggregated (CSV) ------------------ */
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
        familiesKeys: new Set(),
    });
    }
    const bucket = byEc.get(ecId);

    const famKey = r.family_head_id ?? `solo:${r.evacuee_resident_id}`;
    bucket.familiesKeys.add(famKey);
    bucket.persons += 1;

    const snap = parseMaybeJSON(r?.profile_snapshot, {}) || {};
    const residentJoinName = r?.evacuee_residents?.residents?.barangays?.name || '';
    const originFinal = resolveBarangayLabel(snap.barangay_of_origin, residentJoinName, barangayMap);
    if (originFinal) bucket.originNames.add(originFinal);
  }

  let totalFamilies = 0;
  let totalPersons  = 0;

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
    const persons  = agg.persons;
    totalFamilies += families;
    totalPersons  += persons;
    const originsJoined = Array.from(agg.originNames).sort((a,b)=>a.localeCompare(b)).join(' / ');
    lines.push(row([agg.ecName, agg.address, originsJoined, families, persons, '', '']));
  }

  // FINAL TOTAL ROW (outside ECs default to 0)
  lines.push(row(['TOTAL', '', '', totalFamilies, totalPersons, 0, 0]));

  const csv = '\uFEFF' + lines.join('\n');
  return Buffer.from(csv, 'utf8');
}


/* ------------------ Aggregated (XLSX via template) ------------------ */
/* Template: templates/Aggregated.xlsx
   Banners: A4 = "STATUS REPORT FOR DISASTER", A5 = "as of ..."
   Headers at row 7–9; first data row = row 10 (A..E). F/G (Outside EC’s) remain blank. */
async function buildAggregatedStatusXLSX({ regs = [], disasterName = '', asOf, barangayMap }) {
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
        familiesKeys: new Set(),
      });
    }
    const bucket = byEc.get(ecId);

    const famKey = r.family_head_id ?? `solo:${r.evacuee_resident_id}`;
    bucket.familiesKeys.add(famKey);
    bucket.persons += 1;

    const snap = parseMaybeJSON(r?.profile_snapshot, {}) || {};
    const residentJoinName = r?.evacuee_residents?.residents?.barangays?.name || '';
    const originFinal = resolveBarangayLabel(snap.barangay_of_origin, residentJoinName, barangayMap);
    if (originFinal) bucket.originNames.add(originFinal);
  }

  const rows = Array.from(byEc.values()).sort((a, b) =>
    (a.ecName || '').localeCompare(b.ecName || '')
  );

  const templatePath = path.resolve(__dirname, '../../templates/Aggregated.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.getWorksheet('Sheet1') || wb.worksheets[0];

  ws.getCell('A4').value = `STATUS REPORT FOR ${(disasterName || '').toUpperCase()}`;
  ws.getCell('A5').value = `as of ${formatAsOf(asOf)}`;

  const START = 10;

  for (let r = START; r < START + 2000; r++) {
    for (let c = 1; c <= 7; c++) ws.getCell(r, c).value = null;
  }

  let totalFamilies = 0;
  let totalPersons  = 0;

  rows.forEach((g, i) => {
    const r = START + i;
    ws.getCell(r, 1).value = g.ecName || '';
    ws.getCell(r, 2).value = g.address || '';
    ws.getCell(r, 3).value = Array.from(g.originNames).sort((a,b)=>a.localeCompare(b)).join(' / ');
    const fam = Number(g.familiesKeys.size) || 0;
    const per = Number(g.persons) || 0;
    ws.getCell(r, 4).value = fam;
    ws.getCell(r, 5).value = per;
    totalFamilies += fam;
    totalPersons  += per;
  });

  // FINAL TOTAL ROW (outside EC’s = 0)
const totalRow = START + rows.length;
ws.getCell(totalRow, 1).value = 'TOTAL';
ws.getCell(totalRow, 2).value = '-----';
ws.getCell(totalRow, 3).value = '-----';
ws.getCell(totalRow, 4).value = totalFamilies;
ws.getCell(totalRow, 5).value = totalPersons;
ws.getCell(totalRow, 6).value = '-----';
ws.getCell(totalRow, 7).value = '-----';


  autoFitWorksheet(ws, { min: 10, max: 60 });

  const buffer = await wb.xlsx.writeBuffer();
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: 'xlsx',
    filenameBase: `${SLUG('aggregated-status')}`,
  };
}


/* ------------------ Disaggregated (XLSX via template) ------------------ */
async function buildDisaggregatedXLSX({ regs = [], disasterName = '', asOf, vulnMap, barangayMap }) {
  const groups = new Map();

  for (const r of regs) {
    const resident = r?.evacuee_residents?.residents || {};
    const snap = parseMaybeJSON(r?.profile_snapshot, {}) || {};

    const sexVal = (snap.sex ?? resident.sex ?? '').toString().toLowerCase();
    const birthdate = snap.birthdate ?? resident.birthdate ?? null;

    const residentJoinName = resident?.barangays?.name || '';
    const originName = resolveBarangayLabel(snap.barangay_of_origin, residentJoinName, barangayMap);
    const ecName = r?.evacuation_center_rooms?.evacuation_centers?.name || '';

    const key = `${originName}||${ecName}`;
    if (!groups.has(key)) {
      groups.set(key, {
        barangay: originName,
        ecName,
        familyKeys: new Set(),
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

    const famKey = r.family_head_id ?? `solo:${r.evacuee_resident_id}`;
    g.familyKeys.add(famKey);

    if (sexVal === 'male') g.male += 1;
    else if (sexVal === 'female') g.female += 1;

    const age = ageInYears(birthdate, asOf);
    if (age != null) {
      if (age <= 1) g.infants += 1;
      else if (age <= 12) g.children += 1;
      else if (age <= 17) g.youth += 1;
      else if (age <= 59) g.adults += 1;
      else g.seniors += 1;
    }

    g.total += 1;

    let ids = r.vulnerability_type_ids;
    if (!Array.isArray(ids)) ids = parseMaybeJSON(ids, []);
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

  ws.getCell('A4').value = `STATUS REPORT FOR ${(disasterName || '').toUpperCase()}`;
  ws.getCell('A5').value = `as of ${formatAsOf(asOf)}`;

  const START_ROW = 9;

  for (let r = START_ROW; r < START_ROW + 2000; r++) {
    for (let c = 1; c <= 14; c++) ws.getCell(r, c).value = null;
  }

  const totals = {
    families: 0, male: 0, female: 0, total: 0,
    infants: 0, children: 0, youth: 0, adults: 0, seniors: 0,
    pwd: 0, pregnant: 0, lactating: 0,
  };

  rows.forEach((g, i) => {
    const r = START_ROW + i;
    const fam = Number(g.familyKeys.size) || 0;

    ws.getCell(r, 1).value  = g.barangay || '';
    ws.getCell(r, 2).value  = g.ecName || '';
    ws.getCell(r, 3).value  = fam;
    ws.getCell(r, 4).value  = Number(g.male) || 0;
    ws.getCell(r, 5).value  = Number(g.female) || 0;
    ws.getCell(r, 6).value  = Number(g.total) || 0;
    ws.getCell(r, 7).value  = Number(g.infants) || 0;
    ws.getCell(r, 8).value  = Number(g.children) || 0;
    ws.getCell(r, 9).value  = Number(g.youth) || 0;
    ws.getCell(r,10).value  = Number(g.adults) || 0;
    ws.getCell(r,11).value  = Number(g.seniors) || 0;
    ws.getCell(r,12).value  = Number(g.pwd) || 0;
    ws.getCell(r,13).value  = Number(g.pregnant) || 0;
    ws.getCell(r,14).value  = Number(g.lactating || 0);

    totals.families  += fam;
    totals.male      += g.male || 0;
    totals.female    += g.female || 0;
    totals.total     += g.total || 0;
    totals.infants   += g.infants || 0;
    totals.children  += g.children || 0;
    totals.youth     += g.youth || 0;
    totals.adults    += g.adults || 0;
    totals.seniors   += g.seniors || 0;
    totals.pwd       += g.pwd || 0;
    totals.pregnant  += g.pregnant || 0;
    totals.lactating += g.lactating || 0;
  });

  // FINAL TOTAL ROW
  const totalRow = START_ROW + rows.length;
  ws.getCell(totalRow, 1).value = 'TOTAL';
  ws.getCell(totalRow, 2).value = '-----';
  ws.getCell(totalRow, 3).value = totals.families;
  ws.getCell(totalRow, 4).value = totals.male;
  ws.getCell(totalRow, 5).value = totals.female;
  ws.getCell(totalRow, 6).value = totals.total;
  ws.getCell(totalRow, 7).value = totals.infants;
  ws.getCell(totalRow, 8).value = totals.children;
  ws.getCell(totalRow, 9).value = totals.youth;
  ws.getCell(totalRow,10).value = totals.adults;
  ws.getCell(totalRow,11).value = totals.seniors;
  ws.getCell(totalRow,12).value = totals.pwd;
  ws.getCell(totalRow,13).value = totals.pregnant;
  ws.getCell(totalRow,14).value = totals.lactating;

  autoFitWorksheet(ws);

  const buffer = await wb.xlsx.writeBuffer();
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: 'xlsx',
    filenameBase: `${SLUG('disaggregated-status')}`,
  };
}


/* ------------------ Disaggregated (CSV) ------------------ */
function buildDisaggregatedCSV({ regs = [], disasterName = '', asOf, vulnMap, barangayMap }) {
  const groups = new Map();

  for (const r of regs) {
    const resident = r?.evacuee_residents?.residents || {};
    const snap = parseMaybeJSON(r?.profile_snapshot, {}) || {};

    const sexVal = (snap.sex ?? resident.sex ?? '').toString().toLowerCase();
    const birthdate = snap.birthdate ?? resident.birthdate ?? null;

    const residentJoinName = resident?.barangays?.name || '';
    const originName = resolveBarangayLabel(snap.barangay_of_origin, residentJoinName, barangayMap);
    const ecName = r?.evacuation_center_rooms?.evacuation_centers?.name || '';

    const key = `${originName}||${ecName}`;
    if (!groups.has(key)) {
      groups.set(key, {
        barangay: originName,
        ecName,
        familyKeys: new Set(),
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

    const famKey = r.family_head_id ?? `solo:${r.evacuee_resident_id}`;
    g.familyKeys.add(famKey);

    if (sexVal === 'male') g.male += 1;
    else if (sexVal === 'female') g.female += 1;

    const age = ageInYears(birthdate, asOf);
    if (age != null) {
      if (age <= 1) g.infants += 1;
      else if (age <= 12) g.children += 1;
      else if (age <= 17) g.youth += 1;
      else if (age <= 59) g.adults += 1;
      else g.seniors += 1;
    }

    g.total += 1;

    let ids = r.vulnerability_type_ids;
    if (!Array.isArray(ids)) ids = parseMaybeJSON(ids, []);
    if (vulnMap?.pwd != null && ids.includes(vulnMap.pwd)) g.pwd += 1;
    if (vulnMap?.pregnant != null && ids.includes(vulnMap.pregnant)) g.pregnant += 1;
    if (vulnMap?.lactating != null && ids.includes(vulnMap.lactating)) g.lactating += 1;
  }

  const rows = Array.from(groups.values()).sort((a, b) => {
    const byB = (a.barangay || '').localeCompare(b.barangay || '');
    if (byB !== 0) return byB;
    return (a.ecName || '').localeCompare(b.ecName || '');
  });

  const totals = {
    families: 0, male: 0, female: 0, total: 0,
    infants: 0, children: 0, youth: 0, adults: 0, seniors: 0,
    pwd: 0, pregnant: 0, lactating: 0,
  };

  const lines = [];
  lines.push(row(['Republic of the Philippines']));
  lines.push(row(['City Government of Legazpi']));
  lines.push(row([`STATUS REPORT FOR ${(disasterName || '').toUpperCase()}`]));
  lines.push(row([`as of ${formatAsOf(asOf)}`]));
  lines.push('');
  lines.push(row([
    'Barangay', 'Evacuation Center/Site', 'Family', 'Total No. of Male', 'Total No. of Female', 'Total No. of Individuals',
    'Infant', 'Children', 'Youth', 'Adult', 'Senior Citizens', 'PWD', 'Pregnant Woman', 'Lactating Women'
  ]));

  for (const g of rows) {
    const fam = g.familyKeys.size || 0;
    lines.push(row([
      g.barangay || '',
      g.ecName || '',
      fam,
      g.male || 0,
      g.female || 0,
      g.total || 0,
      g.infants || 0,
      g.children || 0,
      g.youth || 0,
      g.adults || 0,
      g.seniors || 0,
      g.pwd || 0,
      g.pregnant || 0,
      g.lactating || 0,
    ]));

    totals.families   += fam;
    totals.male       += g.male || 0;
    totals.female     += g.female || 0;
    totals.total      += g.total || 0;
    totals.infants    += g.infants || 0;
    totals.children   += g.children || 0;
    totals.youth      += g.youth || 0;
    totals.adults     += g.adults || 0;
    totals.seniors    += g.seniors || 0;
    totals.pwd        += g.pwd || 0;
    totals.pregnant   += g.pregnant || 0;
    totals.lactating  += g.lactating || 0;
  }

  // FINAL TOTAL ROW
  lines.push(row([
    'TOTAL', '',
    totals.families, totals.male, totals.female, totals.total,
    totals.infants, totals.children, totals.youth, totals.adults, totals.seniors,
    totals.pwd, totals.pregnant, totals.lactating
  ]));

  const csv = '\uFEFF' + lines.join('\n');
  return Buffer.from(csv, 'utf8');
}




/* ------------------ Per Barangay (XLSX via template) ------------------ */
/* Data start A11..N11, EC site label centered+bold (merged block),
   SUBTOTAL label bold in col A only; numeric values not bold. */
async function buildPerBarangayXLSX({
  regs = [],
  disasterName = '',
  asOf,
  vulnMap,
  barangayMap,
  barangayId,
  barangayName,
}) {
  const TARGET_LABEL = normalizeBarangayLabel(barangayName || '');
  const families = new Map();

  for (const r of regs) {
    const resident = r?.evacuee_residents?.residents || {};
    const snap = parseMaybeJSON(r?.profile_snapshot, {}) || {};

    const residentJoinName = resident?.barangays?.name || '';
    const originLabel = resolveBarangayLabel(snap.barangay_of_origin, residentJoinName, barangayMap);
    if (originLabel !== TARGET_LABEL) continue;

    const famKey = r.family_head_id ?? `solo:${r.evacuee_resident_id}`;
    if (!families.has(famKey)) {
      families.set(famKey, {
        ecName: r?.evacuation_center_rooms?.evacuation_centers?.name || '',
        headName: null,
        purok: null,
        male: 0, female: 0, total: 0,
        inf: 0, ch: 0, y: 0, ad: 0, se: 0,
        pwd: 0, preg: 0, lact: 0,
      });
    }
    const f = families.get(famKey);

    if (!f.ecName && r?.evacuation_center_rooms?.evacuation_centers?.name) {
      f.ecName = r.evacuation_center_rooms.evacuation_centers.name;
    }

    const rel = snap.relationship_to_family_head ?? r?.evacuee_residents?.relationship_to_family_head ?? null;
    const name = buildFullName({
      first_name: snap.first_name ?? resident.first_name ?? null,
      middle_name: snap.middle_name ?? resident.middle_name ?? null,
      last_name:  snap.last_name  ?? resident.last_name  ?? null,
      suffix: (Object.prototype.hasOwnProperty.call(snap, 'suffix') ? snap.suffix : resident.suffix) ?? null,
    });
    if (rel === 'Head' && !f.headName) f.headName = name;

    if (!f.purok) {
      const purokLabel = snap.purok ?? null;
      if (purokLabel != null && String(purokLabel).trim() !== '') f.purok = String(purokLabel);
    }

    const sex = (snap.sex ?? resident.sex ?? '').toString().toLowerCase();
    if (sex === 'male') f.male += 1;
    else if (sex === 'female') f.female += 1;

    const age = ageInYears(snap.birthdate ?? resident.birthdate ?? null, asOf);
    if (age != null) {
      if (age <= 1) f.inf += 1;
      else if (age <= 12) f.ch += 1;
      else if (age <= 17) f.y += 1;
      else if (age <= 59) f.ad += 1;
      else f.se += 1;
    }

    f.total += 1;

    let ids = r.vulnerability_type_ids;
    if (!Array.isArray(ids)) ids = parseMaybeJSON(ids, []);
    if (vulnMap?.pwd != null && ids.includes(vulnMap.pwd)) f.pwd += 1;
    if (vulnMap?.pregnant != null && ids.includes(vulnMap.pregnant)) f.preg += 1;
    if (vulnMap?.lactating != null && ids.includes(vulnMap.lactating)) f.lact += 1;
  }

  const rows = Array.from(families.values()).sort((a, b) => {
    const byEC = (a.ecName || '').localeCompare(b.ecName || '');
    if (byEC !== 0) return byEC;
    return (a.headName || '').localeCompare(b.headName || '');
  });

  const templatePath = path.resolve(__dirname, '../../templates/Barangay.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.getWorksheet('Sheet1') || wb.worksheets[0];

  ws.getCell('A4').value = TARGET_LABEL;
  ws.getCell('A6').value = String(disasterName || '').toUpperCase();
  ws.getCell('A7').value = `as of ${formatAsOf(asOf)}`;

  const START = 11;

  for (let rr = START; rr < START + 3000; rr++) {
    for (let c = 1; c <= 14; c++) ws.getCell(rr, c).value = null;
  }

// replace your style block with this:
const EC_STYLE = {
  alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
  font: { bold: false }, // was true
};
const SUBTOTAL_LABEL_STYLE = {
  alignment: { vertical: 'middle', horizontal: 'center' },
  font: { bold: false }, // was true
};
const SUBTOTAL_VALUE_STYLE = {
  alignment: { vertical: 'middle', horizontal: 'center' },
  font: { bold: false },
};
const DATA_STYLE_FONT = { bold: false };


  const zeroTotals = () => ({
    families: 0, male: 0, female: 0, total: 0,
    inf: 0, ch: 0, y: 0, ad: 0, se: 0,
    pwd: 0, preg: 0, lact: 0
  });

  let rowIdx = START;
  let groupStart = null;
  let currentEC = null;
  let totals = zeroTotals();
  let grand  = zeroTotals();

  const flushGroup = () => {
    if (groupStart == null) return;

    ws.mergeCells(groupStart, 1, rowIdx - 1, 1);
    const ecCell = ws.getCell(groupStart, 1);
    ecCell.value = currentEC || '';
    ecCell.alignment = EC_STYLE.alignment;
    ecCell.font = EC_STYLE.font;

    ws.getCell(rowIdx, 1).value = 'SUBTOTAL';
    ws.getCell(rowIdx, 2).value = Number(totals.families) || 0;
    ws.getCell(rowIdx, 3).value = '----';
    ws.getCell(rowIdx, 4).value = Number(totals.male) || 0;
    ws.getCell(rowIdx, 5).value = Number(totals.female) || 0;
    ws.getCell(rowIdx, 6).value = Number(totals.total) || 0;
    ws.getCell(rowIdx, 7).value = Number(totals.inf) || 0;
    ws.getCell(rowIdx, 8).value = Number(totals.ch) || 0;
    ws.getCell(rowIdx, 9).value = Number(totals.y) || 0;
    ws.getCell(rowIdx,10).value = Number(totals.ad) || 0;
    ws.getCell(rowIdx,11).value = Number(totals.se) || 0;
    ws.getCell(rowIdx,12).value = Number(totals.pwd) || 0;
    ws.getCell(rowIdx,13).value = Number(totals.preg) || 0;
    ws.getCell(rowIdx,14).value = Number(totals.lact) || 0;

    const subA = ws.getCell(rowIdx, 1);
    subA.alignment = SUBTOTAL_LABEL_STYLE.alignment;
    subA.font = SUBTOTAL_LABEL_STYLE.font;
    for (let c = 2; c <= 14; c++) {
      const cell = ws.getCell(rowIdx, c);
      cell.alignment = SUBTOTAL_VALUE_STYLE.alignment;
      cell.font = SUBTOTAL_VALUE_STYLE.font;
    }

    rowIdx += 1;
    groupStart = null;
    totals = zeroTotals();
  };

  for (const g of rows) {
    if (currentEC !== null && g.ecName !== currentEC) flushGroup();
    if (groupStart == null) { currentEC = g.ecName; groupStart = rowIdx; }

    // Data row (A reserved for merged EC name)
    ws.getCell(rowIdx, 2).value = g.headName || '';
    const purokStr = g.purok != null ? String(g.purok).trim() : '';
    if (/^\d+$/.test(purokStr)) {
      ws.getCell(rowIdx, 3).value = Number(purokStr);
    } else {
      ws.getCell(rowIdx, 3).value = purokStr || '';
    }
    ws.getCell(rowIdx, 3).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getCell(rowIdx, 4).value = Number(g.male) || 0;
    ws.getCell(rowIdx, 5).value = Number(g.female) || 0;
    ws.getCell(rowIdx, 6).value = Number(g.total) || 0;
    ws.getCell(rowIdx, 7).value = Number(g.inf) || 0;
    ws.getCell(rowIdx, 8).value = Number(g.ch) || 0;
    ws.getCell(rowIdx, 9).value = Number(g.y) || 0;
    ws.getCell(rowIdx,10).value = Number(g.ad) || 0;
    ws.getCell(rowIdx,11).value = Number(g.se) || 0;
    ws.getCell(rowIdx,12).value = Number(g.pwd) || 0;
    ws.getCell(rowIdx,13).value = Number(g.preg) || 0;
    ws.getCell(rowIdx,14).value = Number(g.lact) || 0;

    for (let c = 2; c <= 14; c++) ws.getCell(rowIdx, c).font = DATA_STYLE_FONT;

    // Subtotals
    totals.families += 1;
    totals.male += g.male; totals.female += g.female; totals.total += g.total;
    totals.inf += g.inf; totals.ch += g.ch; totals.y += g.y;
    totals.ad += g.ad; totals.se += g.se; totals.pwd += g.pwd;
    totals.preg += g.preg; totals.lact += g.lact;

    // Grand totals
    grand.families += 1;
    grand.male += g.male; grand.female += g.female; grand.total += g.total;
    grand.inf += g.inf; grand.ch += g.ch; grand.y += g.y;
    grand.ad += g.ad; grand.se += g.se; grand.pwd += g.pwd;
    grand.preg += g.preg; grand.lact += g.lact;

    rowIdx += 1;
  }
  flushGroup();

  // GRAND TOTAL ROW (label bold only)
  ws.getCell(rowIdx, 1).value = 'TOTAL';
  ws.getCell(rowIdx, 2).value = Number(grand.families) || 0;
  ws.getCell(rowIdx, 3).value = '----';
  ws.getCell(rowIdx, 4).value = Number(grand.male) || 0;
  ws.getCell(rowIdx, 5).value = Number(grand.female) || 0;
  ws.getCell(rowIdx, 6).value = Number(grand.total) || 0;
  ws.getCell(rowIdx, 7).value = Number(grand.inf) || 0;
  ws.getCell(rowIdx, 8).value = Number(grand.ch) || 0;
  ws.getCell(rowIdx, 9).value = Number(grand.y) || 0;
  ws.getCell(rowIdx,10).value = Number(grand.ad) || 0;
  ws.getCell(rowIdx,11).value = Number(grand.se) || 0;
  ws.getCell(rowIdx,12).value = Number(grand.pwd) || 0;
  ws.getCell(rowIdx,13).value = Number(grand.preg) || 0;
  ws.getCell(rowIdx,14).value = Number(grand.lact) || 0;

  autoFitWorksheet(ws);

  const buffer = await wb.xlsx.writeBuffer();
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: 'xlsx',
    filenameBase: `${SLUG('per-barangay')}-${SLUG(TARGET_LABEL || 'report')}`,
  };
}




/* ------------------ Per Barangay (CSV) ------------------ */
function buildPerBarangayCSV({ regs = [], disasterName = '', asOf, vulnMap, barangayMap, barangayName }) {
  const TARGET_LABEL = normalizeBarangayLabel(barangayName || '');
  const families = new Map();

  for (const r of regs) {
    const resident = r?.evacuee_residents?.residents || {};
    const snap = parseMaybeJSON(r?.profile_snapshot, {}) || {};

    const residentJoinName = resident?.barangays?.name || '';
    const originLabel = resolveBarangayLabel(snap.barangay_of_origin, residentJoinName, barangayMap);
    if (originLabel !== TARGET_LABEL) continue;

    const famKey = r.family_head_id ?? `solo:${r.evacuee_resident_id}`;
    if (!families.has(famKey)) {
      families.set(famKey, {
        ecName: r?.evacuation_center_rooms?.evacuation_centers?.name || '',
        headName: null,
        purok: null,
        male: 0, female: 0, total: 0,
        inf: 0, ch: 0, y: 0, ad: 0, se: 0,
        pwd: 0, preg: 0, lact: 0,
      });
    }
    const f = families.get(famKey);

    if (!f.ecName && r?.evacuation_center_rooms?.evacuation_centers?.name) {
      f.ecName = r.evacuation_center_rooms.evacuation_centers.name;
    }

    const rel = snap.relationship_to_family_head ?? r?.evacuee_residents?.relationship_to_family_head ?? null;
    const name = buildFullName({
      first_name: snap.first_name ?? resident.first_name ?? null,
      middle_name: snap.middle_name ?? resident.middle_name ?? null,
      last_name:  snap.last_name  ?? resident.last_name  ?? null,
      suffix: (Object.prototype.hasOwnProperty.call(snap, 'suffix') ? snap.suffix : resident.suffix) ?? null,
    });
    if (rel === 'Head' && !f.headName) f.headName = name;

    if (!f.purok) {
      const purokLabel = snap.purok ?? null;
      if (purokLabel != null && String(purokLabel).trim() !== '') f.purok = String(purokLabel);
    }

    const sex = (snap.sex ?? resident.sex ?? '').toString().toLowerCase();
    if (sex === 'male') f.male += 1;
    else if (sex === 'female') f.female += 1;

    const birthdate = snap.birthdate ?? resident.birthdate ?? null;
    const age = ageInYears(birthdate, asOf);
    if (age != null) {
      if (age <= 1) f.inf += 1;
      else if (age <= 12) f.ch += 1;
      else if (age <= 17) f.y += 1;
      else if (age <= 59) f.ad += 1;
      else f.se += 1;
    }

    f.total += 1;

    let ids = r.vulnerability_type_ids;
    if (!Array.isArray(ids)) ids = parseMaybeJSON(ids, []);
    if (vulnMap?.pwd != null && ids.includes(vulnMap.pwd)) f.pwd += 1;
    if (vulnMap?.pregnant != null && ids.includes(vulnMap.pregnant)) f.preg += 1;
    if (vulnMap?.lactating != null && ids.includes(vulnMap.lactating)) f.lact += 1;
  }

  const rows = Array.from(families.values()).sort((a, b) => {
    const byEC = (a.ecName || '').localeCompare(b.ecName || '');
    if (byEC !== 0) return byEC;
    return (a.headName || '').localeCompare(b.headName || '');
  });

  const lines = [];
  lines.push(row(['Republic of the Philippines']));
  lines.push(row(['City Government of Legazpi']));
  lines.push(row([TARGET_LABEL]));
  lines.push(row([String(disasterName || '').toUpperCase()]));
  lines.push(row([`as of ${formatAsOf(asOf)}`]));
  lines.push('');
  lines.push(row([
    'Evacuation Centers', 'Family Head', 'Purok', 'Total No of Male', 'Total No of Female', 'Total Individuals',
    'Infant', 'Children', 'Youth', 'Adult', 'Senior Citizens', 'PWD', 'Pregnant Women', 'Lactating Women'
  ]));

  let currentEC = null;
  let totals = { families: 0, male: 0, female: 0, total: 0, inf: 0, ch: 0, y: 0, ad: 0, se: 0, pwd: 0, preg: 0, lact: 0 };
  let grand =  { families: 0, male: 0, female: 0, total: 0, inf: 0, ch: 0, y: 0, ad: 0, se: 0, pwd: 0, preg: 0, lact: 0 };
  const flushTotals = () => {
    lines.push(row(['SUBTOTAL', totals.families, '----', totals.male, totals.female, totals.total, totals.inf, totals.ch, totals.y, totals.ad, totals.se, totals.pwd, totals.preg, totals.lact]));
    totals = { families: 0, male: 0, female: 0, total: 0, inf: 0, ch: 0, y: 0, ad: 0, se: 0, pwd: 0, preg: 0, lact: 0 };
  };

  for (const g of rows) {
    if (currentEC !== null && g.ecName !== currentEC) flushTotals();
    currentEC = g.ecName;

    lines.push(row([
      g.ecName || '',
      g.headName || '',
      g.purok != null ? String(g.purok) : '',
      g.male || 0,
      g.female || 0,
      g.total || 0,
      g.inf || 0,
      g.ch || 0,
      g.y || 0,
      g.ad || 0,
      g.se || 0,
      g.pwd || 0,
      g.preg || 0,
      g.lact || 0,
    ]));

    totals.families += 1;
    totals.male += g.male; totals.female += g.female; totals.total += g.total;
    totals.inf += g.inf; totals.ch += g.ch; totals.y += g.y; totals.ad += g.ad; totals.se += g.se; totals.pwd += g.pwd; totals.preg += g.preg; totals.lact += g.lact;

    grand.families += 1;
    grand.male += g.male; grand.female += g.female; grand.total += g.total;
    grand.inf += g.inf; grand.ch += g.ch; grand.y += g.y; grand.ad += g.ad; grand.se += g.se; grand.pwd += g.pwd; grand.preg += g.preg; grand.lact += g.lact;
  }
  if (currentEC !== null) flushTotals();

  // GRAND TOTAL
  lines.push(row(['TOTAL', grand.families, '----', grand.male, grand.female, grand.total, grand.inf, grand.ch, grand.y, grand.ad, grand.se, grand.pwd, grand.preg, grand.lact]));

  const csv = '\uFEFF' + lines.join('\n');
  return Buffer.from(csv, 'utf8');
}


/* ================== NEW: PDF helpers (via Puppeteer) ================== */
function encodeProps(props) {
  return Buffer.from(JSON.stringify(props || {}), 'utf8').toString('base64');
}


// keep your LAUNCH_OPTS and DEFAULT_PDF_OPTS as you have them

async function renderTemplatePDF({ templateKey, props, pdfOptions = {} }) {
  if (!PRINT_BASE_URL) throw new Error('PRINT_BASE_URL is not configured.');
  const url = `${PRINT_BASE_URL}?t=${encodeURIComponent(templateKey)}&props=${encodeURIComponent(encodeProps(props))}`;

  const browser = await puppeteer.launch(LAUNCH_OPTS);
  try {
    const page = await browser.newPage();
    page.on('pageerror', e => console.error('[print pageerror]', e));

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });
    await page.waitForSelector('#print-ready', { timeout: 60_000 });

const buffer = await page.pdf({
  ...DEFAULT_PDF_OPTS,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
  preferCSSPageSize: true,
});


    return buffer;
  } finally {
    await browser.close();
  }
}

// Build props for Aggregated template and print to PDF
async function buildAggregatedStatusPDF({ regs = [], disasterName = '', asOf, barangayMap }) {
  // Reuse grouping like CSV/XLSX
  const byEc = new Map();
  for (const r of regs) {
    const ec = r?.evacuation_center_rooms?.evacuation_centers || {};
    const ecId = ec?.id ?? 'unknown';
    const ecName = ec?.name ?? '';
    const ecBarangayName = ec?.barangays?.name || '';
    const ecAddr = ecBarangayName || asBarangayName(ec?.address || '');
    if (!byEc.has(ecId)) {
      byEc.set(ecId, {
        name: ecName,
        address: ecAddr,
        originNames: new Set(),
        persons: 0,
        familiesKeys: new Set(),
      });
    }
    const bucket = byEc.get(ecId);
    const famKey = r.family_head_id ?? `solo:${r.evacuee_resident_id}`;
    bucket.familiesKeys.add(famKey);
    bucket.persons += 1;

    const snap = parseMaybeJSON(r?.profile_snapshot, {}) || {};
    const residentJoinName = r?.evacuee_residents?.residents?.barangays?.name || '';
    const originFinal = resolveBarangayLabel(snap.barangay_of_origin, residentJoinName, barangayMap);
    if (originFinal) bucket.originNames.add(originFinal);
  }

  const evacuationCenters = Array.from(byEc.values()).map(v => ({
    name: v.name || '',
    address: v.address || '',
    originBarangay: Array.from(v.originNames).sort((a,b)=>a.localeCompare(b)).join(' / '),
    insideFamilies: v.familiesKeys.size || 0,
    insidePersons: v.persons || 0,
    outsideFamilies: null,
    outsidePersons: null,
  })).sort((a, b) => a.name.localeCompare(b.name));

  const { reportDate, reportTime } = splitAsOf(asOf);
  const props = {
    disasterEvent: disasterName || '',
    reportDate,
    reportTime,
    evacuationCenters,
  };
  const buffer = await renderTemplatePDF({ templateKey: 'aggregated', props });
  return {
    buffer,
    contentType: 'application/pdf',
    ext: 'pdf',
    filenameBase: `${SLUG('aggregated-status')}`,
  };
}

// Build props for Disaggregated template and print to PDF
async function buildDisaggregatedPDF({ regs = [], disasterName = '', asOf, vulnMap, barangayMap }) {
  const groups = new Map(); // key: `${barangay}||${ecName}`
  for (const r of regs) {
    const resident = r?.evacuee_residents?.residents || {};
    const snap = parseMaybeJSON(r?.profile_snapshot, {}) || {};
    const sexVal = (snap.sex ?? resident.sex ?? '').toString().toLowerCase();
    const birthdate = snap.birthdate ?? resident.birthdate ?? null;
    const residentJoinName = resident?.barangays?.name || '';
    const originName = resolveBarangayLabel(snap.barangay_of_origin, residentJoinName, barangayMap);
    const ecName = r?.evacuation_center_rooms?.evacuation_centers?.name || '';
    const key = `${originName}||${ecName}`;
    if (!groups.has(key)) {
      groups.set(key, {
        barangay: originName, ecName,
        familyKeys: new Set(), male: 0, female: 0, total: 0,
        infants: 0, children: 0, youth: 0, adults: 0, seniors: 0,
        pwd: 0, pregnant: 0, lactating: 0,
      });
    }
    const g = groups.get(key);
    const famKey = r.family_head_id ?? `solo:${r.evacuee_resident_id}`;
    g.familyKeys.add(famKey);
    if (sexVal === 'male') g.male += 1;
    else if (sexVal === 'female') g.female += 1;
    const age = ageInYears(birthdate, asOf);
    if (age != null) {
      if (age <= 1) g.infants += 1;
      else if (age <= 12) g.children += 1;
      else if (age <= 17) g.youth += 1;
      else if (age <= 59) g.adults += 1;
      else g.seniors += 1;
    }
    g.total += 1;
    let ids = r.vulnerability_type_ids;
    if (!Array.isArray(ids)) ids = parseMaybeJSON(ids, []);
    if (vulnMap?.pwd != null && ids.includes(vulnMap.pwd)) g.pwd += 1;
    if (vulnMap?.pregnant != null && ids.includes(vulnMap.pregnant)) g.pregnant += 1;
    if (vulnMap?.lactating != null && ids.includes(vulnMap.lactating)) g.lactating += 1;
  }

  const evacuationSites = Array.from(groups.values()).sort((a, b) => {
    const byB = (a.barangay || '').localeCompare(b.barangay || '');
    if (byB !== 0) return byB;
    return (a.ecName || '').localeCompare(b.ecName || '');
  }).map(g => ({
    barangay: g.barangay || '',
    evacuationCenter: g.ecName || '',
    families: g.familyKeys.size || 0,
    male: g.male || 0,
    female: g.female || 0,
    total: g.total || 0,
    infant: g.infants || 0,
    children: g.children || 0,
    youth: g.youth || 0,
    adult: g.adults || 0,
    seniorCitizens: g.seniors || 0,
    pwd: g.pwd || 0,
    pregnant: g.pregnant || 0,
    lactating: g.lactating || 0,
  }));

  const { reportDate, reportTime } = splitAsOf(asOf);
  const props = {
    disasterEvent: disasterName || '',
    reportDate,
    reportTime,
    evacuationSites,
    showTotals: true,
  };
  const buffer = await renderTemplatePDF({ templateKey: 'disaggregated', props });
  return {
    buffer,
    contentType: 'application/pdf',
    ext: 'pdf',
    filenameBase: `${SLUG('disaggregated-status')}`,
  };
}

// Build props for Barangay template and print to PDF
async function buildPerBarangayPDF({ regs = [], disasterName = '', asOf, vulnMap, barangayMap, barangayName }) {
  const TARGET_LABEL = normalizeBarangayLabel(barangayName || '');
  const families = new Map();
  for (const r of regs) {
    const resident = r?.evacuee_residents?.residents || {};
    const snap = parseMaybeJSON(r?.profile_snapshot, {}) || {};
    const residentJoinName = resident?.barangays?.name || '';
    const originLabel = resolveBarangayLabel(snap.barangay_of_origin, residentJoinName, barangayMap);
    if (originLabel !== TARGET_LABEL) continue;
    const famKey = r.family_head_id ?? `solo:${r.evacuee_resident_id}`;
    if (!families.has(famKey)) {
      families.set(famKey, {
        ecName: r?.evacuation_center_rooms?.evacuation_centers?.name || '',
        headName: null,
        purok: null,
        male: 0, female: 0, total: 0,
        infant: 0, children: 0, youth: 0, adult: 0, seniorCitizens: 0,
        pwd: 0, pregnant: 0, lactating: 0,
      });
    }
    const f = families.get(famKey);
    const rel = snap.relationship_to_family_head ?? r?.evacuee_residents?.relationship_to_family_head ?? null;
    const name = buildFullName({
      first_name: snap.first_name ?? resident.first_name ?? null,
      middle_name: snap.middle_name ?? resident.middle_name ?? null,
      last_name:  snap.last_name  ?? resident.last_name  ?? null,
      suffix: (Object.prototype.hasOwnProperty.call(snap, 'suffix') ? snap.suffix : resident.suffix) ?? null,
    });
    if (rel === 'Head' && !f.headName) f.headName = name;
    if (!f.purok) {
      const purokLabel = snap.purok ?? null;
      if (purokLabel != null && String(purokLabel).trim() !== '') f.purok = String(purokLabel);
    }
    const sex = (snap.sex ?? resident.sex ?? '').toString().toLowerCase();
    if (sex === 'male') f.male += 1;
    else if (sex === 'female') f.female += 1;
    const age = ageInYears(snap.birthdate ?? resident.birthdate ?? null, asOf);
    if (age != null) {
      if (age <= 1) f.infant += 1;
      else if (age <= 12) f.children += 1;
      else if (age <= 17) f.youth += 1;
      else if (age <= 59) f.adult += 1;
      else f.seniorCitizens += 1;
    }
    f.total += 1;
    let ids = r.vulnerability_type_ids;
    if (!Array.isArray(ids)) ids = parseMaybeJSON(ids, []);
    if (vulnMap?.pwd != null && ids.includes(vulnMap.pwd)) f.pwd += 1;
    if (vulnMap?.pregnant != null && ids.includes(vulnMap.pregnant)) f.pregnant += 1;
    if (vulnMap?.lactating != null && ids.includes(vulnMap.lactating)) f.lactating += 1;
  }

  // Convert to template shape
  const evacByCenter = new Map();
  for (const f of families.values()) {
    if (!evacByCenter.has(f.ecName)) evacByCenter.set(f.ecName, []);
    evacByCenter.get(f.ecName).push({
      familyHead: f.headName || '',
      purok: f.purok || '',
      male: f.male || 0,
      female: f.female || 0,
      total: f.total || 0,
      infant: f.infant || 0,
      children: f.children || 0,
      youth: f.youth || 0,
      adult: f.adult || 0,
      seniorCitizens: f.seniorCitizens || 0,
      pwd: f.pwd || 0,
      pregnant: f.pregnant || 0,
      lactating: f.lactating || 0,
    });
  }
  const evacuationCenters = Array.from(evacByCenter.entries()).sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([name, evacuees]) => ({ name, evacuees }));

  const { reportDate, reportTime } = splitAsOf(asOf);
  const props = {
    barangayName: TARGET_LABEL,
    disasterEvent: disasterName || '',
    reportDate,
    reportTime,
    evacuationCenters,
  };
  const buffer = await renderTemplatePDF({ templateKey: 'barangay', props });
  return {
    buffer,
    contentType: 'application/pdf',
    ext: 'pdf',
    filenameBase: `${SLUG('per-barangay')}-${SLUG(TARGET_LABEL || 'report')}`,
  };
}

/* ------------------ Dispatcher ------------------ */
async function generateReportFile({
  reportTypeName,
  fileFormat,
  regs,
  reportName,
  disasterName,
  asOf,
  vulnMap,
  barangayMap,
  barangayId,
  barangayName,
}) {
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
    if (/^disaggregated/.test(type)) {
      return {
        buffer: buildDisaggregatedCSV({ regs, disasterName, asOf, vulnMap, barangayMap }),
        contentType: 'text/csv',
        ext: 'csv',
        filenameBase: `${SLUG('disaggregated-status')}-${SLUG(reportName || 'report')}`,
      };
    }
    if (/^per\s*barangay/.test(type)) {
      return {
        buffer: buildPerBarangayCSV({ regs, disasterName, asOf, vulnMap, barangayMap, barangayName }),
        contentType: 'text/csv',
        ext: 'csv',
        filenameBase: `${SLUG('per-barangay')}-${SLUG(barangayName || 'report')}-${SLUG(reportName || 'report')}`,
      };
    }
    throw new NotImplementedError('CSV generation for this report type is not implemented yet.');
  }

  if (fileFormat === 'XLSX') {
    if (/^aggregated/.test(type)) {
      return await buildAggregatedStatusXLSX({ regs, disasterName, asOf, barangayMap });
    }
    if (/^disaggregated/.test(type)) {
      return await buildDisaggregatedXLSX({ regs, disasterName, asOf, vulnMap, barangayMap });
    }
    if (/^per\s*barangay/.test(type)) {
      return await buildPerBarangayXLSX({
        regs, disasterName, asOf, vulnMap, barangayMap, barangayId, barangayName,
      });
    }
    throw new NotImplementedError('XLSX generation for this report type is not implemented yet.');
  }

if (fileFormat === 'PDF') {
  if (/^aggregated/.test(type)) {
    return await buildAggregatedStatusPDF({ regs, disasterName, asOf, barangayMap });
  }
  if (/^disaggregated/.test(type)) {
    return await buildDisaggregatedPDF({ regs, disasterName, asOf, vulnMap, barangayMap });
  }
  if (/^per\s*barangay/.test(type)) {
    return await buildPerBarangayPDF({ regs, disasterName, asOf, vulnMap, barangayMap, barangayName });
  }
  throw new NotImplementedError('PDF generation for this report type is not implemented yet.');
}
throw new Error('Unsupported file format.');
}

/* ------------------ Storage path ------------------ */
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
