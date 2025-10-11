// server/src/services/report-file.service.js
const ExcelJS = require('exceljs');
const path = require('path');

class NotImplementedError extends Error {}

const isPrivateHouseCategory = (v) => {
  const s = String(v || '').toLowerCase().replace(/[_\s-]+/g, ' ');
  return s.includes('private') && s.includes('house');
};

const SLUG = (s = '') =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 120);

// Keep user's text (case & spaces), only swap path/OS-unsafe chars
const FILE_BASENAME = (s = '') =>
  String(s ?? '')
    .replace(/[\/\\:*?"<>|]/g, '-')  // Windows/URL-unsafe
    .trim() || 'Report';


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

function parseAgeYearsText(txt) {
  if (txt == null) return null;
  const t = String(txt).trim().toLowerCase();
  let m = t.match(/^(\d+(?:\.\d+)?)\s*(m|mo|mos|month|months)\b/);
  if (m) return parseFloat(m[1]) / 12;
  m = t.match(/^(\d+(?:\.\d+)?)\s*(d|day|days)\b/);
  if (m) return parseFloat(m[1]) / 365;
  m = t.match(/^(\d+(?:\.\d+)?)(?:\s*(y|yr|yrs|year|years))?\b/);
  if (m) return parseFloat(m[1]);
  return null;
}

// JS equivalent with NEW precedence: snapshot.age -> snapshot.birthdate -> residentBirthdate -> reported_age_at_arrival
function computeAgeYearsAsOfJS(snapshot, reportedAgeAtArrival, residentBirthdate, asOfTs) {
  // 1) snapshot.age
  const fromSnapAge = parseAgeYearsText(snapshot?.age);
  if (Number.isFinite(fromSnapAge)) return fromSnapAge;

  // 2) snapshot.birthdate
  const snapBD = snapshot?.birthdate ? new Date(snapshot.birthdate) : null;
  const asMs = new Date(asOfTs).getTime();
  if (snapBD && Number.isFinite(snapBD.getTime()) && Number.isFinite(asMs)) {
    return (asMs - snapBD.getTime()) / 31557600000; // 365.25 days in ms
  }

  // 3) resident birthdate
  const resBD = residentBirthdate ? new Date(residentBirthdate) : null;
  if (resBD && Number.isFinite(resBD.getTime()) && Number.isFinite(asMs)) {
    return (asMs - resBD.getTime()) / 31557600000;
  }

  // 4) reported age at arrival
  const raa = Number(reportedAgeAtArrival);
  if (Number.isFinite(raa)) return raa;

  return null;
}



// Layout for the Disaggregated sheet: compact number columns, wrapped headers.
function applyDisaggColumnLayout(ws) {
  // Wider text columns
  ws.getColumn('A').width = 45; // Barangay
  ws.getColumn('B').width = 90; // Evacuation Center/Site

  // Compact numeric columns (2–3 digits)
  ws.getColumn('C').width = 10;  // Family
  ws.getColumn('D').width = 10;  // Total No. of Male
  ws.getColumn('E').width = 10;  // Total No. of Female
  ws.getColumn('F').width = 14;  // Total No. of Individuals

  // Age buckets G–U + singles V–X: all narrow
  for (let c = 7; c <= 24; c++) ws.getColumn(c).width = 10;

  // Center all numeric columns (C–X)
  for (let idx = 3; idx <= 24; idx++) {
    ws.getColumn(idx).alignment = { horizontal: 'center' };
  }

  // Wrap & vertically-center headers so long labels don’t force wide columns
  for (let r = 7; r <= 9; r++) {
    for (let c = 1; c <= 24; c++) {
      const cell = ws.getCell(r, c);
      cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: 'middle' };
    }
  }

  // Make headers readable when wrapped
  ws.getRow(7).height = 30; // group headers
  ws.getRow(8).height = 22; // "{ Age Range Here }"
  ws.getRow(9).height = 20; // Male/Female/Total

  // Nice default view (freeze headers; optional)
  ws.views = [{ state: 'frozen', ySplit: 9, zoomScale: 90 }];
}

// Layout for the Aggregated sheet: wide text cols, compact number cols
function applyAggregatedColumnLayout(
  ws,
  {
    nameWidth = 90,    // A: Name of Evacuation Center
    addrWidth = 45,    // B: Address
    originWidth = 45,  // C: Origin / Barangay
    numWidth = 10,     // D–K numeric columns
    headerRows = [8, 9],
    freezeAtRow = 10,  // keep headers visible (data starts at row 11)
  } = {}
) {
  // Text columns
  ws.getColumn('A').width = nameWidth;
  ws.getColumn('B').width = addrWidth;
  ws.getColumn('C').width = originWidth;

  // Numeric columns D–K
  for (let c = 4; c <= 11; c++) {
    ws.getColumn(c).width = numWidth;
    ws.getColumn(c).alignment = { horizontal: 'center' };
  }

  // Wrap & vertically-center header cells so labels don’t force wide columns
  for (const r of headerRows) {
    for (let c = 1; c <= 11; c++) {
      const cell = ws.getCell(r, c);
      cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: 'middle' };
    }
  }
  // Make wrapped headers readable
  ws.getRow(headerRows[0]).height = 28;
  ws.getRow(headerRows[1]).height = 22;

  // Nice default view
  ws.views = [{ state: 'frozen', ySplit: freezeAtRow, zoomScale: 90 }];
}

// -------------------------------------------
// Per-Barangay layout helper (A–Z columns)
// EXACTLY mirrors Disaggregated sizing/alignment,
// except Z (Relief Services) is wider (60).
// -------------------------------------------
function applyPerBarangayColumnLayout(ws) {
  // Text columns
  ws.getColumn('A').width = 50; // Evacuation Center/Site
  ws.getColumn('B').width = 30; // Family Head - Name

  // Compact columns
  ws.getColumn('C').width = 10; // Sex
  ws.getColumn('D').width = 10; // Purok
  ws.getColumn('E').width = 10; // Total No. of Male
  ws.getColumn('F').width = 10; // Total No. of Female
  ws.getColumn('G').width = 14; // Total No. of Individuals

  // Age buckets H–V
  for (let c = 8; c <= 22; c++) ws.getColumn(c).width = 10;

  // W–Y compact, Z wide
  ws.getColumn('W').width = 10; // PWD
  ws.getColumn('X').width = 10; // Pregnant Women
  ws.getColumn('Y').width = 10; // Lactating Women
  ws.getColumn('Z').width = 55; // Relief Services (ONLY this column is wide)

  // Center all numeric-ish columns (C–Z)
  for (let idx = 3; idx <= 26; idx++) {
    ws.getColumn(idx).alignment = { horizontal: 'center' };
  }

  // Wrap & vertically-center headers
  for (let r = 8; r <= 10; r++) {
    for (let c = 1; c <= 26; c++) {
      const cell = ws.getCell(r, c);
      cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: 'middle' };
    }
  }

  // Header row heights + view
  ws.getRow(8).height = 30;
  ws.getRow(9).height = 22;
  ws.getRow(10).height = 20;
  ws.views = [{ state: 'frozen', ySplit: 10, zoomScale: 90 }];
}



const normalizeBarangayLabel = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// Convert an incoming object/map of { barangayLabel -> [names] } to a Map keyed by normalized labels
function normalizeECNamesIndex(idx) {
  const map = new Map();
  if (!idx) return map;

  // idx may be a plain object or a Map; accept both
  if (idx instanceof Map) {
    for (const [k, v] of idx.entries()) {
      map.set(normalizeBarangayLabel(k), Array.isArray(v) ? v : Array.from(v || []));
    }
  } else if (typeof idx === 'object') {
    for (const k of Object.keys(idx)) {
      const v = idx[k];
      map.set(normalizeBarangayLabel(k), Array.isArray(v) ? v : Array.from(v || []));
    }
  }
  return map;
}
// ─── Excel helpers (pure JS) ──────────────────────────────────────────────
function tryMerge(ws, a1Range) {
  // be resilient whether the template is already merged or not
  try { ws.unMergeCells(a1Range); } catch (e) {}
  try { ws.mergeCells(a1Range); } catch (e) {}
}

function center(ws, a1) {
  const c = ws.getCell(a1);
  c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}

// Only overwrite a cell if the value is non-empty (so template placeholders remain)
function setIfNonEmpty(ws, addr, val) {
  if (val !== "" && val != null) ws.getCell(addr).value = val;
}
// --- Chronological Barangay order (Bgy. 1 -> Bgy. 70) ---
const BARANGAY_ORDER = [
  "Bgy. 1 - EM's Barrio",
  "Bgy. 2 - EM's Barrio South",
  "Bgy. 3 - EM's Barrio East",
  "Bgy. 4 - Sagpon",
  "Bgy. 5 - Sagmin",
  "Bgy. 6 - Bañadero",
  "Bgy. 7 - Baño",
  "Bgy. 8 - Bagumbayan",
  "Bgy. 9 - Pinaric",
  "Bgy. 10 - Cabugao",
  "Bgy. 11 - Maoyod",
  "Bgy. 12 - Tula-tula",
  "Bgy. 13 - Ilawod West",
  "Bgy. 14 - Ilawod",
  "Bgy. 15 - Ilawod East",
  "Bgy. 16 - Kawit-East Washington Drive",
  "Bgy. 17 - Rizal Street",
  "Bgy. 18 - Cabagñan West",
  "Bgy. 19 - Cabagñan",
  "Bgy. 20 - Cabagñan East",
  "Bgy. 21 - Binanuahan West",
  "Bgy. 22 - Binanuahan East",
  "Bgy. 23 - Imperial Court Subd.",
  "Bgy. 24 - Rizal Street",
  "Bgy. 25 - Lapu-lapu",
  "Bgy. 26 - Dinagaan",
  "Bgy. 27 - Victory Village South",
  "Bgy. 28 - Victory Village North",
  "Bgy. 29 - Sabang",
  "Bgy. 30 - Pigcale",
  "Bgy. 31 - Centro-Baybay",
  "Bgy. 32 - San Roque",
  "Bgy. 33 - PNR-Peñaranda St.-Iraya",
  "Bgy. 34 - Oro Site-Magallanes St.",
  "Bgy. 35 - Tinago",
  "Bgy. 36 - Kapanatawan",
  "Bgy. 37 - Bitano",
  "Bgy. 38 - Gogon",
  "Bgy. 39 - Bonot",
  "Bgy. 40 - Cruzada",
  "Bgy. 41 - Bogtong",
  "Bgy. 42 - Rawis",
  "Bgy. 43 - Tamaoyan",
  "Bgy. 44 - Pawa",
  "Bgy. 45 - Dita",
  "Bgy. 46 - San Joaquin",
  "Bgy. 47 - Arimbay",
  "Bgy. 48 - Bagong Abre",
  "Bgy. 49 - Bigaa",
  "Bgy. 50 - Padang",
  "Bgy. 51 - Buyoan",
  "Bgy. 52 - Matanag",
  "Bgy. 53 - Bonga",
  "Bgy. 54 - Mabinit",
  "Bgy. 55 - Estanza",
  "Bgy. 56 - Taysan",
  "Bgy. 57 - Dap-dap",
  "Bgy. 58 - Buragwis",
  "Bgy. 59 - Puro",
  "Bgy. 60 - Lamba",
  "Bgy. 61 - Maslog",
  "Bgy. 62 - Homapon",
  "Bgy. 63 - Mariawa",
  "Bgy. 64 - Bagacay",
  "Bgy. 65 - Imalnod",
  "Bgy. 66 - Banquerohan",
  "Bgy. 67 - Bariis",
  "Bgy. 68 - San Francisco",
  "Bgy. 69 - Buenavista",
  "Bgy. 70 - Cagbacong",
];

// Normalize for ranking (trim, collapse spaces, case-insensitive, strip accents)
const normalizeBarangayKey = (s) =>
  normalizeBarangayLabel(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove diacritics (e.g., Peñaranda)

const BARANGAY_RANK = new Map(
  BARANGAY_ORDER.map((name, i) => [normalizeBarangayKey(name), i])
);

function barangayRankOf(label) {
  const k = normalizeBarangayKey(label || '');
  return BARANGAY_RANK.has(k) ? BARANGAY_RANK.get(k) : Number.POSITIVE_INFINITY;
}

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
// Accepts things like "3 months", "10 mo", "120 days", "0.8"
function coerceAgeYears(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;

  const s = String(raw).trim().toLowerCase();
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;

  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;

  if (/(^|\s)(mo|month|months)(\s|$)/.test(s)) return n / 12;  // months → years
  if (/(^|\s)(day|days)(\s|$)/.test(s))       return n / 365; // days → years
  return n; // assume years
}

// prefer registration's reported age, then snapshot/resident age fields, then birthdate
function getAgeYearsFromAllSources(regRow, resident, snap, asOfISO) {
  const tryVals = [
    regRow?.reported_age_at_arrival,
    snap?.reported_age_at_arrival,
    snap?.age, snap?.age_years, snap?.ageYears, snap?.age_in_years,
    resident?.age, resident?.age_years, resident?.ageYears, resident?.age_in_years,
  ];
  for (const v of tryVals) {
    const y = coerceAgeYears(v);
    if (y != null) return y;
  }
  const bd = snap?.birthdate ?? snap?.date_of_birth ??
             resident?.birthdate ?? resident?.date_of_birth ?? null;
  return ageInYears(bd, asOfISO);
}


// Try many places for age; fallback to birthdate-based computation
function extractAgeYears(snap, resident, asOfISO) {
  const candidates = [
    snap?.age, snap?.age_years, snap?.ageYears, snap?.age_in_years,
    resident?.age, resident?.age_years, resident?.ageYears, resident?.age_in_years,
  ];
  for (const c of candidates) {
    const v = coerceAgeYears(c);
    if (v != null) return v;
  }
  const bd =
    snap?.birthdate ?? snap?.date_of_birth ??
    resident?.birthdate ?? resident?.date_of_birth ?? null;

  return ageInYears(bd, asOfISO);
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

/* ------------------ Aggregated (CSV) — honors UI visibility like XLSX ------------------ */
function buildAggregatedStatusCSV({
  regs = [],
  disasterName = '',
  asOf,
  barangayMap,
  ecNamesByBarangay = {},
  fields
}) {
  const ecIndex = normalizeECNamesIndex(ecNamesByBarangay);

  // Visibility derived from modal (same defaults as XLSX)
  const want = {
    nameOfCenter: fields?.nameOfCenter ?? true,
    address:      fields?.address ?? true,
    origin:       fields?.origin ?? true,

    insideFamilies: fields?.displaced?.inside?.families ?? true,
    insideMale:     fields?.displaced?.inside?.persons?.male ?? false,
    insideFemale:   fields?.displaced?.inside?.persons?.female ?? false,
    insideTotal:    (fields?.displaced?.inside?.persons?.total ?? null) ??
                    (!fields?.displaced?.inside?.persons ? true : false),

    outsideFamilies: fields?.displaced?.outside?.families ?? false,
    outsideMale:     fields?.displaced?.outside?.persons?.male ?? false,
    outsideFemale:   fields?.displaced?.outside?.persons?.female ?? false,
    outsideTotal:    fields?.displaced?.outside?.persons?.total ?? false,
  };
  const anyInside  = want.insideFamilies || want.insideMale || want.insideFemale || want.insideTotal;
  const anyOutside = want.outsideFamilies || want.outsideMale || want.outsideFemale || want.outsideTotal;

  // Aggregate by row barangay (EC barangay if linked; otherwise evacuee origin)
  const byBgy = new Map();
  for (const r of regs) {
    const ec = r?.evacuation_center_rooms?.evacuation_centers || {};
    const ecId = ec?.id ?? null;
    const ecName = (ec?.name ?? '').toString().trim();
    const ecIsPrivate = isPrivateHouseCategory(ec?.category);

    const bgyRaw = ec?.barangays?.name || asBarangayName(ec?.address || '');
    const ecBarangay = normalizeBarangayLabel(bgyRaw);

    const snap = parseMaybeJSON(r?.profile_snapshot, {}) || {};
    const resident = r?.evacuee_residents?.residents || {};
    const originFinal = resolveBarangayLabel(
      snap.barangay_of_origin,
      resident?.barangays?.name || '',
      barangayMap
    );

    const rowBarangay = normalizeBarangayLabel(ecId ? ecBarangay : originFinal);
    if (!rowBarangay) continue;

    if (!byBgy.has(rowBarangay)) {
      byBgy.set(rowBarangay, {
        barangay: rowBarangay,
        ecNamesSeen: new Set(),
        inFam: new Set(), inM: 0, inF: 0,
        outFam: new Set(), outM: 0, outF: 0,
      });
    }
    const b = byBgy.get(rowBarangay);
    if (ecId && ecName) b.ecNamesSeen.add(ecName);

    const famKey = r.family_head_id ?? `solo:${r.evacuee_resident_id}`;
    const sex = (snap.sex ?? resident.sex ?? '').toString().toLowerCase();
    const isOutside = !ecId || ecIsPrivate;

    if (isOutside) {
      b.outFam.add(famKey);
      if (sex === 'male') b.outM++; else if (sex === 'female') b.outF++;
    } else {
      b.inFam.add(famKey);
      if (sex === 'male') b.inM++; else if (sex === 'female') b.inF++;
    }
  }

  const rows = Array.from(byBgy.values()).sort((a, b) => {
    const ra = barangayRankOf(a.barangay), rb = barangayRankOf(b.barangay);
    if (ra !== rb) return ra - rb;
    const aFirst = Array.from(a.ecNamesSeen).sort()[0] || '';
    const bFirst = Array.from(b.ecNamesSeen).sort()[0] || '';
    return aFirst.localeCompare(bFirst);
  });

  // Build dynamic cols
  const cols = [];
  if (want.nameOfCenter) cols.push({ key: 'name', header: 'Name of Evacuation Center' });
  if (want.address)      cols.push({ key: 'addr', header: 'Address' });
  if (want.origin)       cols.push({ key: 'origin', header: 'Origin of IDPs' });

  const pushIn  = (hdr, key) => cols.push({ group: 'INSIDE ECs',  key, header: hdr });
  const pushOut = (hdr, key) => cols.push({ group: 'OUTSIDE ECs', key, header: hdr });

  if (anyInside) {
    if (want.insideFamilies) pushIn('Families', 'inFam');
    if (want.insideMale)     pushIn('Male',     'inM');
    if (want.insideFemale)   pushIn('Female',   'inF');
    if (want.insideTotal)    pushIn('Persons',  'inT');
  }
  if (anyOutside) {
    if (want.outsideFamilies) pushOut('Families', 'outFam');
    if (want.outsideMale)     pushOut('Male',     'outM');
    if (want.outsideFemale)   pushOut('Female',   'outF');
    if (want.outsideTotal)    pushOut('Persons',  'outT');
  }

  // Headers (CSV can’t merge, so we do 3 rows like the XLSX groups)
  const lines = [];
  lines.push(row(['LEGAZPI CITY']));
  lines.push(row([`Status Report on ${disasterName || '—'}`]));
  lines.push(row([`as of ${formatAsOf(asOf)}`]));
  lines.push('');

  lines.push(row(cols.map(c => c.group ? 'Number of Displaced' : c.header)));
  lines.push(row(cols.map(c => c.group || '')));
  lines.push(row(cols.map(c => c.group ? c.header : '')));

  // Data + totals
  const totals = { inFam:0,inM:0,inF:0,inT:0,outFam:0,outM:0,outF:0,outT:0 };
  for (const g of rows) {
    const authoritative = ecIndex.get(g.barangay) || [];
    const allNames = new Set([...Array.from(g.ecNamesSeen), ...authoritative]);
    const nameJoined = Array.from(allNames).sort((a, b) => a.localeCompare(b)).join(', ');

    const inFam = g.inFam.size, inT = g.inM + g.inF;
    const outFam = g.outFam.size, outT = g.outM + g.outF;

    const rec = {
      name: nameJoined,
      addr: g.barangay,
      origin: g.barangay,
      inFam, inM: g.inM, inF: g.inF, inT,
      outFam, outM: g.outM, outF: g.outF, outT,
    };
    lines.push(row(cols.map(c => escapeCSV(rec[c.key] ?? ''))));

    totals.inFam += inFam; totals.inM += g.inM; totals.inF += g.inF; totals.inT += inT;
    totals.outFam += outFam; totals.outM += g.outM; totals.outF += g.outF; totals.outT += outT;
  }

  // Totals row for numeric cols
  const totalRow = cols.map(c => {
    if (!c.group) return c.key === 'name' ? 'TOTAL' : '';
    return String(totals[c.key] ?? '');
  });
  lines.push(row(totalRow));

  return Buffer.from('\uFEFF' + lines.join('\n'), 'utf8');
}



/* ------------------ Aggregated (XLSX via template) ------------------ */
/* Template: templates/Aggregated.xlsx
   Header group layout (by column):
   A: Name of Evacuation Center
   B: Address
   C: Origin of IDP's / Barangay Name
   D: Inside ECs - Families
   E: Inside ECs - Persons (Male)
   F: Inside ECs - Persons (Female)
   G: Inside ECs - Persons (Total)
   H: Outside ECs - Families
   I: Outside ECs - Persons (Male)
   J: Outside ECs - Persons (Female)
   K: Outside ECs - Persons (Total)
   First data row starts at row 11.
*/
async function buildAggregatedStatusXLSX({
  regs = [],
  disasterName = "",
  asOf,
  barangayMap,
  /** Checkbox selections from the modal. */
  fields,
  // IMPORTANT: this must be built from the EVACUATION CENTERS table by barangay (see controller)
  ecNamesByBarangay,
}) {
  // Index of EC names by normalized barangay label (from EC table; includes Private House)
  const ecIndex = normalizeECNamesIndex(ecNamesByBarangay);

  // ---- derive which columns to show from checkbox selections ----
  const want = {
    nameOfCenter: fields?.nameOfCenter ?? true,
    address: fields?.address ?? true,
    origin: fields?.origin ?? true,

    // Inside ECs
    insideFamilies: fields?.displaced?.inside?.families ?? true,
    insideMale: fields?.displaced?.inside?.persons?.male ?? false,
    insideFemale: fields?.displaced?.inside?.persons?.female ?? false,
    insideTotal:
      (fields?.displaced?.inside?.persons?.total ?? null) ??
      (!fields?.displaced?.inside?.persons ? true : false),

    // Outside ECs
    outsideFamilies: fields?.displaced?.outside?.families ?? false,
    outsideMale: fields?.displaced?.outside?.persons?.male ?? false,
    outsideFemale: fields?.displaced?.outside?.persons?.female ?? false,
    outsideTotal: fields?.displaced?.outside?.persons?.total ?? false,
  };

  const anyInside =
    want.insideFamilies || want.insideMale || want.insideFemale || want.insideTotal;
  const anyOutside =
    want.outsideFamilies || want.outsideMale || want.outsideFemale || want.outsideTotal;

  // Column map (1-indexed)
  const COL = {
    nameOfCenter: 1,
    address: 2,
    origin: 3,
    insideFamilies: 4,
    insideMale: 5,
    insideFemale: 6,
    insideTotal: 7,
    outsideFamilies: 8,
    outsideMale: 9,
    outsideFemale: 10,
    outsideTotal: 11,
  };

  // ---- aggregate (compute families + sex breakdown) ----
  // Bucket keyed by: EC barangay (if EC exists, incl. Private House), else evacuee origin
  const byBgy = new Map();

  for (const r of regs) {
    const ecRoom = r?.evacuation_center_rooms || null;
    const ec = ecRoom?.evacuation_centers || null;

    const ecId = ec?.id ?? null;
    const ecName = (ec?.name ?? "").toString().trim();
    const ecCategory = ec?.category ?? null;
    const ecIsPrivateHouse = isPrivateHouseCategory(ecCategory);

    // Row barangay: prefer EC barangay (even for Private House); fallback to evacuee origin if no EC
    const bgyRaw = ec?.barangays?.name || asBarangayName(ec?.address || "");
    const ecBarangay = normalizeBarangayLabel(bgyRaw);

    const snap = parseMaybeJSON(r?.profile_snapshot, {}) || {};
    const resident = r?.evacuee_residents?.residents || {};
    const residentJoinName = resident?.barangays?.name || "";
    const originFinal = resolveBarangayLabel(
      snap.barangay_of_origin,
      residentJoinName,
      barangayMap
    );

    const rowBarangay = normalizeBarangayLabel(ecId ? ecBarangay : originFinal);
    if (!rowBarangay) continue;

    if (!byBgy.has(rowBarangay)) {
      byBgy.set(rowBarangay, {
        barangay: rowBarangay,
        ecNamesSeen: new Set(),  // EC names from registrations (official + Private House)
        hasAnyEC: false,         // mark if this bucket ever had an EC-linked registration
        // we keep originNames but we won't *display* it anymore
        originNames: new Set(),

        // INSIDE (official ECs)
        insideFamiliesKeys: new Set(),
        insideMale: 0,
        insideFemale: 0,

        // OUTSIDE (Private House OR no-EC)
        outsideFamiliesKeys: new Set(),
        outsideMale: 0,
        outsideFemale: 0,
      });
    }

    const bucket = byBgy.get(rowBarangay);

    // Mark that this barangay row actually had EC-based registrations; collect names
    if (ecId) {
      bucket.hasAnyEC = true;
      if (ecName) bucket.ecNamesSeen.add(ecName); // includes Private House names
    }

    // Count family members (Private House contributes to OUTSIDE)
    const famKey = r.family_head_id ?? `solo:${r.evacuee_resident_id}`;
    const sexVal = (snap.sex ?? resident.sex ?? "").toString().toLowerCase();
    const isOutside = !ecId || ecIsPrivateHouse;

    if (isOutside) {
      bucket.outsideFamiliesKeys.add(famKey);
      if (sexVal === "male") bucket.outsideMale += 1;
      else if (sexVal === "female") bucket.outsideFemale += 1;
    } else {
      bucket.insideFamiliesKeys.add(famKey);
      if (sexVal === "male") bucket.insideMale += 1;
      else if (sexVal === "female") bucket.insideFemale += 1;
    }

    // We still collect evacuee origins, but we won't show them in Column C anymore.
    if (originFinal) bucket.originNames.add(originFinal);
  }

  // Sort rows by chronological barangay order; tie-break by first EC name
  const rows = Array.from(byBgy.values()).sort((a, b) => {
    const ra = barangayRankOf(a.barangay);
    const rb = barangayRankOf(b.barangay);
    if (ra !== rb) return ra - rb;
    const aFirst = Array.from(a.ecNamesSeen).sort()[0] || "";
    const bFirst = Array.from(b.ecNamesSeen).sort()[0] || "";
    return aFirst.localeCompare(bFirst);
  });

  const templatePath = path.resolve(__dirname, "../../templates/Aggregated.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.getWorksheet("Sheet1") || wb.worksheets[0];

  // Titles
  ws.getCell("A4").value = `STATUS REPORT FOR ${(disasterName || "").toUpperCase()}`;
  ws.getCell("A5").value = `as of ${formatAsOf(asOf)}`;

  // Clear data area (A11:K2009)
  const START = 11;
  for (let r = START; r < START + 2000; r++) {
    for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null;
  }

  // Write rows
  let totalInsideFamilies = 0,
      totalInsideMale = 0,
      totalInsideFemale = 0,
      totalOutsideFamilies = 0,
      totalOutsideMale = 0,
      totalOutsideFemale = 0;

  if (rows.length === 0) {
    const r = START;
    if (want.nameOfCenter)   ws.getCell(r, COL.nameOfCenter).value = "";
    if (want.address)        ws.getCell(r, COL.address).value = "";
    if (want.origin)         ws.getCell(r, COL.origin).value = "";
    if (want.insideFamilies) ws.getCell(r, COL.insideFamilies).value = 0;
    if (want.insideMale)     ws.getCell(r, COL.insideMale).value = 0;
    if (want.insideFemale)   ws.getCell(r, COL.insideFemale).value = 0;
    if (want.insideTotal)    ws.getCell(r, COL.insideTotal).value = 0;
    if (want.outsideFamilies) ws.getCell(r, COL.outsideFamilies).value = 0;
    if (want.outsideMale)     ws.getCell(r, COL.outsideMale).value = 0;
    if (want.outsideFemale)   ws.getCell(r, COL.outsideFemale).value = 0;
    if (want.outsideTotal)    ws.getCell(r, COL.outsideTotal).value = 0;
  } else {
    rows.forEach((g, i) => {
      const r = START + i;

      // Name column: union of seen EC names + authoritative EC list for this barangay
      const authoritative = ecIndex.get(g.barangay) || [];
      const allNames = new Set([
        ...Array.from(g.ecNamesSeen),
        ...authoritative,
      ]);
      const nameJoined = Array.from(allNames).sort((a, b) => a.localeCompare(b)).join(", ");

      // Address column: barangay label (per template)
      const addressStr = g.barangay || "";

      // Origin column MUST MATCH the row barangay (no concatenation)
      const originStr = addressStr;

      const inFam = Number(g.insideFamiliesKeys.size) || 0;
      const inMale = Number(g.insideMale) || 0;
      const inFemale = Number(g.insideFemale) || 0;
      const inTotal = inMale + inFemale;

      const outFam = Number(g.outsideFamiliesKeys.size) || 0;
      const outMale = Number(g.outsideMale) || 0;
      const outFemale = Number(g.outsideFemale) || 0;
      const outTotal = outMale + outFemale;

      if (want.nameOfCenter) ws.getCell(r, COL.nameOfCenter).value = nameJoined || "";
      if (want.address)      ws.getCell(r, COL.address).value      = addressStr;
      if (want.origin)       ws.getCell(r, COL.origin).value       = originStr;

      if (want.insideFamilies) ws.getCell(r, COL.insideFamilies).value = inFam;
      if (want.insideMale)     ws.getCell(r, COL.insideMale).value     = inMale;
      if (want.insideFemale)   ws.getCell(r, COL.insideFemale).value   = inFemale;
      if (want.insideTotal)    ws.getCell(r, COL.insideTotal).value    = inTotal;

      if (want.outsideFamilies) ws.getCell(r, COL.outsideFamilies).value = outFam;
      if (want.outsideMale)     ws.getCell(r, COL.outsideMale).value     = outMale;
      if (want.outsideFemale)   ws.getCell(r, COL.outsideFemale).value   = outFemale;
      if (want.outsideTotal)    ws.getCell(r, COL.outsideTotal).value    = outTotal;

      totalInsideFamilies += inFam;
      totalInsideMale     += inMale;
      totalInsideFemale   += inFemale;
      totalOutsideFamilies += outFam;
      totalOutsideMale     += outMale;
      totalOutsideFemale   += outFemale;
    });
  }

  // Totals row
  const tRow = START + Math.max(rows.length, 1);
  ws.getCell(tRow, 1).value = "TOTAL";
  if (want.address) ws.getCell(tRow, 2).value = "-----";
  if (want.origin)  ws.getCell(tRow, 3).value = "-----";

  if (want.insideFamilies) ws.getCell(tRow, COL.insideFamilies).value = totalInsideFamilies;
  if (want.insideMale)     ws.getCell(tRow, COL.insideMale).value     = totalInsideMale;
  if (want.insideFemale)   ws.getCell(tRow, COL.insideFemale).value   = totalInsideFemale;
  if (want.insideTotal)    ws.getCell(tRow, COL.insideTotal).value    = totalInsideMale + totalInsideFemale;

  if (want.outsideFamilies) ws.getCell(tRow, COL.outsideFamilies).value = totalOutsideFamilies;
  if (want.outsideMale)     ws.getCell(tRow, COL.outsideMale).value     = totalOutsideMale;
  if (want.outsideFemale)   ws.getCell(tRow, COL.outsideFemale).value   = totalOutsideFemale;
  if (want.outsideTotal)    ws.getCell(tRow, COL.outsideTotal).value    = totalOutsideMale + totalOutsideFemale;

  // Hide unselected columns
  const showByCol = {
    1: want.nameOfCenter,
    2: want.address,
    3: want.origin,
    4: want.insideFamilies,
    5: want.insideMale,
    6: want.insideFemale,
    7: want.insideTotal,
    8: want.outsideFamilies,
    9: want.outsideMale,
    10: want.outsideFemale,
    11: want.outsideTotal,
  };
  for (let c = 1; c <= 11; c++) ws.getColumn(c).hidden = !showByCol[c];

  try {
    if (!anyInside)  ['D8','E8','F8','G8','D9','E9','F9','G9'].forEach(a => { const cell = ws.getCell(a); if (cell) cell.value = ''; });
    if (!anyOutside) ['H8','I8','J8','K8','H9','I9','J9','K9'].forEach(a => { const cell = ws.getCell(a); if (cell) cell.value = ''; });
  } catch (_) {}

  applyAggregatedColumnLayout(ws);
  const buffer = await wb.xlsx.writeBuffer();
  return {
    buffer,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: "xlsx",
    filenameBase: `${SLUG("aggregated-status")}`,
  };
}



/* ------------------ Disaggregated (XLSX via template) — DB-backed ------------------ */
async function buildDisaggregatedXLSX({
  // NEW: rows returned by the SQL function report_disagg_by_barangay_disaster
  sqlRows = [],
  // kept for headers/meta
  disasterName = "",
  asOf,
  // UI config with checkboxes + age inputs (from modal)
  fields,
  // { "<Barangay Name>": ["EC A","EC B", ...], ... }
  ecNamesByBarangay = {},
}) {
  if (!Array.isArray(sqlRows)) {
    throw new Error('buildDisaggregatedXLSX: expected array "sqlRows" from RPC(report_disagg_by_barangay_disaster)');
  }

  // -------------------- tiny helpers (local & safe) --------------------
  const SLUG = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const center = (ws, addr) => {
    const cell = ws.getCell(addr);
    cell.alignment = {
      ...(cell.alignment || {}),
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
  };

  const tryMerge = (ws, range) => {
    try { ws.mergeCells(range); } catch (_) {}
  };

  const setIfNonEmpty = (ws, addr, text) => {
    const t = (text ?? '').toString().trim();
    if (t && t !== '{ Age Range Here }') ws.getCell(addr).value = t;
  };

  const formatAsOf = (d) => {
    const dt = (d && new Date(d)) || new Date();
    // adjust however you like; kept simple here
    return dt.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

const normalizeECNamesIndex = (map) => {
  const out = new Map();
  const norm = (s) =>
    String(s || '')
      .normalize('NFKC')
      .replace(/[–—]/g, '-')   // unify dashes
      .replace(/\s+/g, ' ')    // collapse multi-space
      .trim();

  if (map && typeof map === 'object') {
    for (const [barangay, names] of Object.entries(map)) {
      const seen = new Set(); // canonical lowercase for dedupe
      const displayList = [];
      (Array.isArray(names) ? names : []).forEach((nm) => {
        const disp = norm(nm);
        if (!disp) return;
        const canon = disp.toLowerCase();
        if (seen.has(canon)) return;
        seen.add(canon);
        displayList.push(disp);
      });
      out.set(norm(barangay), displayList.sort((a, b) => a.localeCompare(b)));
    }
  }
  return out;
};


  const barangayRankOf = (name) => {
    const m = String(name || '').match(/\d+/);
    return m ? parseInt(m[0], 10) : Number.POSITIVE_INFINITY;
  };

  // read user-entered age ranges (for header text + visibility only)
const numOrNull = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const mkAgeDef = (node, altKey) => {
  const a = node ?? {};
  const b = (fields && fields.age && fields.age[altKey]) ? fields.age[altKey] : {};
  const fallbackMin =
    a.min ?? a.age_min ?? a.min_age ??
    b.min ?? b.age_min ?? b.min_age ??
    fields?.[`${altKey}Min`] ?? fields?.[`age_${altKey}_min`] ?? null;

  const fallbackMax =
    a.max ?? a.age_max ?? a.max_age ??
    b.max ?? b.age_max ?? b.max_age ??
    fields?.[`${altKey}Max`] ?? fields?.[`age_${altKey}_max`] ?? null;

  const min = numOrNull(a?.age?.min ?? fallbackMin);
  const max = numOrNull(a?.age?.max ?? fallbackMax);
  const enabled = !!(a.enabled ?? b.enabled) || min != null || max != null;
  return { enabled, min, max };
};

const ageDefs = {
  infant:   mkAgeDef(fields?.infant,   'infant'),
  children: mkAgeDef(fields?.children, 'children'),
  youth:    mkAgeDef(fields?.youth,    'youth'),
  adult:    mkAgeDef(fields?.adult,    'adult'),
  seniors:  mkAgeDef(fields?.seniors,  'seniors'),
};
// Header text helper (unchanged)
const rangeText = (def) => {
  const hasMin = def?.min != null;
  const hasMax = def?.max != null;
  if (!hasMin && !hasMax) return "{ Age Range Here }";
  if (hasMin && hasMax) return `${def.min} - ${def.max} years old`;
  if (hasMin) return `${def.min}+ years old`;
  return `≤${def.max} years old`;
};

// (optional extra logging)
console.log('[disagg-xlsx] fields (raw):', fields);
console.log('[disagg-xlsx] ageDefs:', ageDefs);
console.log('[disagg-xlsx] headerTexts:', {
  infant:   rangeText(ageDefs.infant),
  children: rangeText(ageDefs.children),
  youth:    rangeText(ageDefs.youth),
  adult:    rangeText(ageDefs.adult),
  seniors:  rangeText(ageDefs.seniors),
});



  // evacuation center index by barangay (for column B)
  const ecIndex = normalizeECNamesIndex(ecNamesByBarangay);

  // -------------------- sort the DB rows by barangay --------------------
  const rows = [...sqlRows].sort((a, b) => {
    const A = a?.barangay_name || '';
    const B = b?.barangay_name || '';
    const ra = barangayRankOf(A);
    const rb = barangayRankOf(B);
    if (ra !== rb) return ra - rb;
    return A.localeCompare(B);
  });

  // -------------------- open template --------------------
  const templatePath = path.resolve(__dirname, "../../templates/Disaggregated.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.getWorksheet("Sheet1") || wb.worksheets[0];

  ws.getCell("A4").value = `STATUS REPORT FOR ${(disasterName || "").toUpperCase()}`;
  ws.getCell("A5").value = `as of ${formatAsOf(asOf)}`;

  // -------------------- header layout (rows 7–9); data starts at row 10 --------------------
  const START_ROW = 10;

  // Clear A10:X2009
  for (let rr = START_ROW; rr < START_ROW + 2000; rr++) {
    for (let cc = 1; cc <= 24; cc++) ws.getCell(rr, cc).value = null;
  }

  // Row 7: main titles (leftmost/top cell)
  ws.getCell("A7").value = "Barangay";
  ws.getCell("B7").value = "Evacuation Center/Site";
  ws.getCell("C7").value = "Family";
  ws.getCell("D7").value = "Total No. of Male";
  ws.getCell("E7").value = "Total No. of Female";
  ws.getCell("F7").value = "Total No. of Individuals";

  ws.getCell("G7").value = "Infant";
  ws.getCell("J7").value = "Children";
  ws.getCell("M7").value = "Youth";
  ws.getCell("P7").value = "Adult";
  ws.getCell("S7").value = "Senior Citizens";

  ws.getCell("V7").value = "PWD";
  ws.getCell("W7").value = "Pregnant Women";
  ws.getCell("X7").value = "Lactating Women";

  // Merge single columns vertically across rows 7–9 (A–F, V–X) and center them
  ["A","B","C","D","E","F","V","W","X"].forEach((col) => {
    tryMerge(ws, `${col}7:${col}9`);
    center(ws, `${col}7`);
  });

  // Merge & center group headers on row 7
  [
    ["G7:I7", "G7"], // Infant
    ["J7:L7", "J7"], // Children
    ["M7:O7", "M7"], // Youth
    ["P7:R7", "P7"], // Adult
    ["S7:U7", "S7"], // Senior Citizens
  ].forEach(([range, topLeft]) => {
    tryMerge(ws, range);
    center(ws, topLeft);
  });

  // Thin borders to visually close Senior group on the right
  const THIN = { style: 'thin', color: { argb: 'FF000000' } };
  const patchBorder = (addr, side) => {
    const cell = ws.getCell(addr);
    cell.border = { ...(cell.border || {}), [side]: THIN };
  };
  patchBorder('S7', 'right');
  patchBorder('S8', 'right');
  patchBorder('U9', 'right');
  patchBorder('V7', 'left');   // left edge before PWD

  // Row 8: user-entered AGE RANGES (merge & center)
  [
    ["G8:I8", "G8", rangeText(ageDefs.infant)],
    ["J8:L8", "J8", rangeText(ageDefs.children)],
    ["M8:O8", "M8", rangeText(ageDefs.youth)],
    ["P8:R8", "P8", rangeText(ageDefs.adult)],
    ["S8:U8", "S8", rangeText(ageDefs.seniors)],
  ].forEach(([range, topLeft, text]) => {
    tryMerge(ws, range);
    setIfNonEmpty(ws, topLeft, text);
    center(ws, topLeft);
  });

  // Row 9: subheaders (Male / Female / Total), no merges
  ws.getCell("G9").value = "Male";   ws.getCell("H9").value = "Female";   ws.getCell("I9").value = "Total";
  ws.getCell("J9").value = "Male";   ws.getCell("K9").value = "Female";   ws.getCell("L9").value = "Total";
  ws.getCell("M9").value = "Male";   ws.getCell("N9").value = "Female";   ws.getCell("O9").value = "Total";
  ws.getCell("P9").value = "Male";   ws.getCell("Q9").value = "Female";   ws.getCell("R9").value = "Total";
  ws.getCell("S9").value = "Male";   ws.getCell("T9").value = "Female";   ws.getCell("U9").value = "Total";
  ["G9","H9","I9","J9","K9","L9","M9","N9","O9","P9","Q9","R9","S9","T9","U9"].forEach(addr => center(ws, addr));

  // Column indices (A=1 … X=24)
  const COL = {
    barangay: 1, ecSite: 2, family: 3, male: 4, female: 5, total: 6,
    infM: 7, infF: 8, infT: 9,
    chM: 10, chF: 11, chT: 12,
    yoM: 13, yoF: 14, yoT: 15,
    adM: 16, adF: 17, adT: 18,
    seM: 19, seF: 20, seT: 21,
    pwd: 22, preg: 23, lact: 24,
  };

  // -------------------- write data rows from DB --------------------
  const totals = {
    families: 0, male: 0, female: 0, total: 0,
    infant:   { male: 0, female: 0, total: 0 },
    children: { male: 0, female: 0, total: 0 },
    youth:    { male: 0, female: 0, total: 0 },
    adult:    { male: 0, female: 0, total: 0 },
    seniors:  { male: 0, female: 0, total: 0 },
    pwd: 0, pregnant: 0, lactating: 0,
  };

  rows.forEach((r, i) => {
    const rIdx = START_ROW + i;
    const bname = r?.barangay_name || '';

    // Column B: join all EC names known for this barangay
    const allNames = ecIndex.get(bname) || [];
    const ecJoined = allNames.length ? [...new Set(allNames)].sort((a, b) => a.localeCompare(b)).join(", ") : "";

    ws.getCell(rIdx, COL.barangay).value = bname;
    ws.getCell(rIdx, COL.ecSite).value   = ecJoined;

    ws.getCell(rIdx, COL.family).value   = Number(r?.family || 0);
    ws.getCell(rIdx, COL.male).value     = Number(r?.total_male || 0);
    ws.getCell(rIdx, COL.female).value   = Number(r?.total_female || 0);
    ws.getCell(rIdx, COL.total).value    = Number(r?.total_individuals || 0);

    ws.getCell(rIdx, COL.infM).value = Number(r?.infant_male || 0);
    ws.getCell(rIdx, COL.infF).value = Number(r?.infant_female || 0);
    ws.getCell(rIdx, COL.infT).value = Number(r?.infant_total || 0);

    ws.getCell(rIdx, COL.chM).value  = Number(r?.children_male || 0);
    ws.getCell(rIdx, COL.chF).value  = Number(r?.children_female || 0);
    ws.getCell(rIdx, COL.chT).value  = Number(r?.children_total || 0);

    ws.getCell(rIdx, COL.yoM).value  = Number(r?.youth_male || 0);
    ws.getCell(rIdx, COL.yoF).value  = Number(r?.youth_female || 0);
    ws.getCell(rIdx, COL.yoT).value  = Number(r?.youth_total || 0);

    ws.getCell(rIdx, COL.adM).value  = Number(r?.adult_male || 0);
    ws.getCell(rIdx, COL.adF).value  = Number(r?.adult_female || 0);
    ws.getCell(rIdx, COL.adT).value  = Number(r?.adult_total || 0);

    ws.getCell(rIdx, COL.seM).value  = Number(r?.seniors_male || 0);
    ws.getCell(rIdx, COL.seF).value  = Number(r?.seniors_female || 0);
    ws.getCell(rIdx, COL.seT).value  = Number(r?.seniors_total || 0);

    ws.getCell(rIdx, COL.pwd).value  = Number(r?.pwd_total || 0);
    ws.getCell(rIdx, COL.preg).value = Number(r?.pregnant_women || 0);
    ws.getCell(rIdx, COL.lact).value = Number(r?.lactating_women || 0);

    totals.families += Number(r?.family || 0);
    totals.male     += Number(r?.total_male || 0);
    totals.female   += Number(r?.total_female || 0);
    totals.total    += Number(r?.total_individuals || 0);

    totals.infant.male    += Number(r?.infant_male || 0);
    totals.infant.female  += Number(r?.infant_female || 0);
    totals.infant.total   += Number(r?.infant_total || 0);

    totals.children.male  += Number(r?.children_male || 0);
    totals.children.female+= Number(r?.children_female || 0);
    totals.children.total += Number(r?.children_total || 0);

    totals.youth.male     += Number(r?.youth_male || 0);
    totals.youth.female   += Number(r?.youth_female || 0);
    totals.youth.total    += Number(r?.youth_total || 0);

    totals.adult.male     += Number(r?.adult_male || 0);
    totals.adult.female   += Number(r?.adult_female || 0);
    totals.adult.total    += Number(r?.adult_total || 0);

    totals.seniors.male   += Number(r?.seniors_male || 0);
    totals.seniors.female += Number(r?.seniors_female || 0);
    totals.seniors.total  += Number(r?.seniors_total || 0);

    totals.pwd       += Number(r?.pwd_total || 0);
    totals.pregnant  += Number(r?.pregnant_women || 0);
    totals.lactating += Number(r?.lactating_women || 0);
  });

  // totals row (always place at row 10 if no data)
  const totalRow = START_ROW + Math.max(rows.length, 1);
  ws.getCell(totalRow, COL.barangay).value = "TOTAL";
  ws.getCell(totalRow, COL.ecSite).value   = "-----";
  ws.getCell(totalRow, COL.family).value   = totals.families;
  ws.getCell(totalRow, COL.male).value     = totals.male;
  ws.getCell(totalRow, COL.female).value   = totals.female;
  ws.getCell(totalRow, COL.total).value    = totals.total;

  ws.getCell(totalRow, COL.infM).value = totals.infant.male;
  ws.getCell(totalRow, COL.infF).value = totals.infant.female;
  ws.getCell(totalRow, COL.infT).value = totals.infant.total;

  ws.getCell(totalRow, COL.chM).value  = totals.children.male;
  ws.getCell(totalRow, COL.chF).value  = totals.children.female;
  ws.getCell(totalRow, COL.chT).value  = totals.children.total;

  ws.getCell(totalRow, COL.yoM).value  = totals.youth.male;
  ws.getCell(totalRow, COL.yoF).value  = totals.youth.female;
  ws.getCell(totalRow, COL.yoT).value  = totals.youth.total;

  ws.getCell(totalRow, COL.adM).value  = totals.adult.male;
  ws.getCell(totalRow, COL.adF).value  = totals.adult.female;
  ws.getCell(totalRow, COL.adT).value  = totals.adult.total;

  ws.getCell(totalRow, COL.seM).value  = totals.seniors.male;
  ws.getCell(totalRow, COL.seF).value  = totals.seniors.female;
  ws.getCell(totalRow, COL.seT).value  = totals.seniors.total;

  ws.getCell(totalRow, COL.pwd).value  = totals.pwd;
  ws.getCell(totalRow, COL.preg).value = totals.pregnant;
  ws.getCell(totalRow, COL.lact).value = totals.lactating;

  // -------------------- column visibility --------------------
  // Unhide everything first
  for (let c = 1; c <= 24; c++) {
    const col = ws.getColumn(c);
    col.hidden = false;
    if (typeof col.outlineLevel === 'number') col.outlineLevel = 0;
  }

  const wantsCustomVisibility = !!(fields && fields.customVisibility === true);
  if (wantsCustomVisibility) {
    const show = {
      barangay:         fields ? !!fields.barangayName : true,
      ecSite:           fields ? !!fields.evacuationCenterSite : true,
      family:           fields ? !!fields.family : true,
      totalMale:        fields ? !!fields.totalMale : true,
      totalFemale:      fields ? !!fields.totalFemale : true,
      totalIndividuals: fields ? !!fields.totalIndividuals : true,

      // Age buckets visibility controlled by checkboxes + whether bucket is "enabled"
      infM: ageDefs.infant.enabled   && (fields?.infant?.buckets?.male   ?? true),
      infF: ageDefs.infant.enabled   && (fields?.infant?.buckets?.female ?? true),
      infT: ageDefs.infant.enabled   && (fields?.infant?.buckets?.total  ?? true),

      chM:  ageDefs.children.enabled && (fields?.children?.buckets?.male   ?? true),
      chF:  ageDefs.children.enabled && (fields?.children?.buckets?.female ?? true),
      chT:  ageDefs.children.enabled && (fields?.children?.buckets?.total  ?? true),

      yoM:  ageDefs.youth.enabled    && (fields?.youth?.buckets?.male   ?? true),
      yoF:  ageDefs.youth.enabled    && (fields?.youth?.buckets?.female ?? true),
      yoT:  ageDefs.youth.enabled    && (fields?.youth?.buckets?.total  ?? true),

      adM:  ageDefs.adult.enabled    && (fields?.adult?.buckets?.male   ?? true),
      adF:  ageDefs.adult.enabled    && (fields?.adult?.buckets?.female ?? true),
      adT:  ageDefs.adult.enabled    && (fields?.adult?.buckets?.total  ?? true),

      seM:  ageDefs.seniors.enabled  && (fields?.seniors?.buckets?.male   ?? true),
      seF:  ageDefs.seniors.enabled  && (fields?.seniors?.buckets?.female ?? true),
      seT:  ageDefs.seniors.enabled  && (fields?.seniors?.buckets?.total  ?? true),

      // Vulnerabilities
      pwd:  !!fields?.pwd?.enabled,
      preg: !!fields?.pregnantWomen,
      lact: !!fields?.lactatingWomen,
    };

    for (let c = 1; c <= 24; c++) {
      const visible =
        c === 1  ? show.barangay :
        c === 2  ? show.ecSite :
        c === 3  ? show.family :
        c === 4  ? show.totalMale :
        c === 5  ? show.totalFemale :
        c === 6  ? show.totalIndividuals :
        c === 7  ? show.infM :
        c === 8  ? show.infF :
        c === 9  ? show.infT :
        c === 10 ? show.chM :
        c === 11 ? show.chF :
        c === 12 ? show.chT :
        c === 13 ? show.yoM :
        c === 14 ? show.yoF :
        c === 15 ? show.yoT :
        c === 16 ? show.adM :
        c === 17 ? show.adF :
        c === 18 ? show.adT :
        c === 19 ? show.seM :
        c === 20 ? show.seF :
        c === 21 ? show.seT :
        c === 22 ? show.pwd :
        c === 23 ? show.preg :
        c === 24 ? show.lact : true;

      ws.getColumn(c).hidden = !visible;
    }
  }

  // Optional shared layout helper (call only if defined in your codebase)
  if (typeof applyDisaggColumnLayout === 'function') {
    applyDisaggColumnLayout(ws);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return {
    buffer,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: "xlsx",
    filenameBase: `${SLUG("disaggregated-status")}`,
  };
}


/* ------------------ Disaggregated (CSV) — uses SQL rows + UI visibility ------------------ */
function buildDisaggregatedCSV({
  sqlRows = null,                // prefer DB-aggregated rows
  regs = [],                     // fallback (kept for signature parity)
  disasterName = '',
  asOf,
  vulnMap,
  barangayMap,
  fields,
  ecNamesByBarangay = {}
}) {
  // Age bucket enables like XLSX (we only need enabled flags to decide columns)
  const numOrNull = v => (v === '' || v == null) ? null : (Number.isFinite(+v) ? +v : null);
  const mkAgeDef = (node = {}, altKey) => {
    const a = node ?? {};
    const b = fields?.age?.[altKey] ?? {};
    const min = numOrNull(a?.age?.min ?? a.min ?? b.min);
    const max = numOrNull(a?.age?.max ?? a.max ?? b.max);
    const enabled = !!(a.enabled ?? b.enabled) || min != null || max != null;
    return { enabled, min, max };
  };
  const A = {
    infant:   mkAgeDef(fields?.infant,   'infant'),
    children: mkAgeDef(fields?.children, 'children'),
    youth:    mkAgeDef(fields?.youth,    'youth'),
    adult:    mkAgeDef(fields?.adult,    'adult'),
    seniors:  mkAgeDef(fields?.seniors,  'seniors'),
  };

  const show = {
    barangay:         fields ? !!fields.barangayName : true,
    ecSite:           fields ? !!fields.evacuationCenterSite : true,
    family:           fields ? !!fields.family : true,
    totalMale:        fields ? !!fields.totalMale : true,
    totalFemale:      fields ? !!fields.totalFemale : true,
    totalIndividuals: fields ? !!fields.totalIndividuals : true,

    infM: A.infant.enabled,  infF: A.infant.enabled,  infT: A.infant.enabled,
    chM:  A.children.enabled, chF:  A.children.enabled, chT:  A.children.enabled,
    yoM:  A.youth.enabled,    yoF:  A.youth.enabled,    yoT:  A.youth.enabled,
    adM:  A.adult.enabled,    adF:  A.adult.enabled,    adT:  A.adult.enabled,
    seM:  A.seniors.enabled,  seF:  A.seniors.enabled,  seT:  A.seniors.enabled,

    pwd:  !!fields?.pwd?.enabled,
    preg: !!fields?.pregnantWomen,
    lact: !!fields?.lactatingWomen,
  };

  const COLS = [
    { key: 'barangay', hdr: 'Barangay', show: show.barangay },
    { key: 'ec',       hdr: 'Evacuation Center/Site', show: show.ecSite },
    { key: 'family',   hdr: 'Family', show: show.family },
    { key: 'm',        hdr: 'Total No. of Male', show: show.totalMale },
    { key: 'f',        hdr: 'Total No. of Female', show: show.totalFemale },
    { key: 't',        hdr: 'Total No. of Individuals', show: show.totalIndividuals },

    { key: 'infM', hdr: 'Infant (Male)',   show: show.infM },
    { key: 'infF', hdr: 'Infant (Female)', show: show.infF },
    { key: 'infT', hdr: 'Infant (Total)',  show: show.infT },

    { key: 'chM', hdr: 'Children (Male)',   show: show.chM },
    { key: 'chF', hdr: 'Children (Female)', show: show.chF },
    { key: 'chT', hdr: 'Children (Total)',  show: show.chT },

    { key: 'yoM', hdr: 'Youth (Male)',   show: show.yoM },
    { key: 'yoF', hdr: 'Youth (Female)', show: show.yoF },
    { key: 'yoT', hdr: 'Youth (Total)',  show: show.yoT },

    { key: 'adM', hdr: 'Adult (Male)',   show: show.adM },
    { key: 'adF', hdr: 'Adult (Female)', show: show.adF },
    { key: 'adT', hdr: 'Adult (Total)',  show: show.adT },

    { key: 'seM', hdr: 'Senior Citizens (Male)',   show: show.seM },
    { key: 'seF', hdr: 'Senior Citizens (Female)', show: show.seF },
    { key: 'seT', hdr: 'Senior Citizens (Total)',  show: show.seT },

    { key: 'pwd',  hdr: 'PWD',              show: show.pwd },
    { key: 'preg', hdr: 'Pregnant Women',   show: show.preg },
    { key: 'lact', hdr: 'Lactating Women',  show: show.lact },
  ].filter(c => c.show);

  const lines = [];
  lines.push(row(['Republic of the Philippines']));
  lines.push(row(['City Government of Legazpi']));
  lines.push(row([`STATUS REPORT FOR ${(disasterName || '').toUpperCase()}`]));
  lines.push(row([`as of ${formatAsOf(asOf)}`]));
  lines.push('');
  lines.push(row(COLS.map(c => c.hdr)));

  const ecIndex = normalizeECNamesIndex(ecNamesByBarangay);

  if (Array.isArray(sqlRows) && sqlRows.length) {
    const totals = Object.fromEntries(COLS.map(c => [c.key, 0]));
    const rowsSorted = [...sqlRows].sort((a, b) => {
      const A = a?.barangay_name || '', B = b?.barangay_name || '';
      const ra = barangayRankOf(A), rb = barangayRankOf(B);
      return ra === rb ? A.localeCompare(B) : ra - rb;
    });

    for (const r of rowsSorted) {
      const ecJoined = (ecIndex.get(r?.barangay_name || '') || []).join(', ');
      const rec = {
        barangay: r?.barangay_name || '',
        ec: ecJoined,
        family: Number(r?.family || 0),
        m: Number(r?.total_male || 0),
        f: Number(r?.total_female || 0),
        t: Number(r?.total_individuals || 0),

        infM: Number(r?.infant_male || 0),   infF: Number(r?.infant_female || 0),   infT: Number(r?.infant_total || 0),
        chM:  Number(r?.children_male || 0), chF:  Number(r?.children_female || 0), chT:  Number(r?.children_total || 0),
        yoM:  Number(r?.youth_male || 0),    yoF:  Number(r?.youth_female || 0),    yoT:  Number(r?.youth_total || 0),
        adM:  Number(r?.adult_male || 0),    adF:  Number(r?.adult_female || 0),    adT:  Number(r?.adult_total || 0),
        seM:  Number(r?.seniors_male || 0),  seF:  Number(r?.seniors_female || 0),  seT:  Number(r?.seniors_total || 0),

        pwd:  Number(r?.pwd_total || 0),
        preg: Number(r?.pregnant_women || 0),
        lact: Number(r?.lactating_women || 0),
      };
      lines.push(row(COLS.map(c => rec[c.key])));
      for (const c of COLS) totals[c.key] = (totals[c.key] || 0) + (Number(rec[c.key]) || 0);
    }

    // TOTAL
    lines.push(row(COLS.map(c => (c.key === 'barangay' ? 'TOTAL' : (c.key === 'ec' ? '-----' : totals[c.key])))));
    return Buffer.from('\uFEFF' + lines.join('\n'), 'utf8');
  }

  // (If RPC returned nothing, keep an empty table with headers.)
  return Buffer.from('\uFEFF' + lines.join('\n'), 'utf8');
}






/* ------------------ Per Barangay (XLSX via template) ------------------ */
async function buildPerBarangayXLSX({
  regs = [],
  disasterName = '',
  asOf,
  vulnMap,
  barangayMap,
  barangayId,
  barangayName,
  fields,               // visibility + age ranges (normalized)
  ecNamesByBarangay,    // optional
  reliefByFamily,       // Map<string, string[]> -> per family services
}) {
  const TARGET_LABEL = normalizeBarangayLabel(barangayName || '');

  const numOrNull = (v) => (v === '' || v == null ? null : (Number.isFinite(+v) ? +v : null));
  const mkAgeDef = (node) => ({ enabled: !!node?.enabled, min: numOrNull(node?.age?.min), max: numOrNull(node?.age?.max) });
  const ageDefs = {
    infant:   mkAgeDef(fields?.infant),
    children: mkAgeDef(fields?.children),
    youth:    mkAgeDef(fields?.youth),
    adult:    mkAgeDef(fields?.adult),
    seniors:  mkAgeDef(fields?.seniors),
  };
  const rangeText = (def) => {
    const hasMin = def?.min != null, hasMax = def?.max != null;
    if (!hasMin && !hasMax) return '{ Age Range Here }';
    if (hasMin && hasMax) return `${def.min} - ${def.max} years old`;
    if (hasMin) return `${def.min}+ years old`;
    return `≤${def.max} years old`;
  };
  const headerTexts = {
    infant:   rangeText(ageDefs.infant),
    children: rangeText(ageDefs.children),
    youth:    rangeText(ageDefs.youth),
    adult:    rangeText(ageDefs.adult),
    seniors:  rangeText(ageDefs.seniors),
  };

// Prefer breaking on ", " so items stay whole; fall back to word wrap.
function wrapRelief(text, max = 55) {
  const s = (text ?? '').toString().trim();
  if (!s) return '';
  if (s.includes('\n')) return s; // already wrapped

  // If we have comma-separated items, pack as many as fit per line.
  const parts = s.split(/\s*,\s*/).filter(Boolean);
  const out = [];
  if (parts.length > 1) {
    let line = '';
    for (const p of parts) {
      const next = line ? `${line}, ${p}` : p;
      if (next.length > max && line) { out.push(line); line = p; }
      else { line = next; }
    }
    if (line) out.push(line);
    return out.join('\n');
  }

  // Otherwise, greedy word wrap.
  const words = s.split(/\s+/);
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > max && line) { out.push(line); line = w; }
    else { line = next; }
  }
  if (line) out.push(line);
  return out.join('\n');
}


  // ---- Aggregate per-family, attach relief text from reliefByFamily ----
  const families = new Map();
  for (const r of regs) {
    const resident = r?.evacuee_residents?.residents || {};
    const snap = parseMaybeJSON(r?.profile_snapshot, {}) || {};
    const residentJoinName = resident?.barangays?.name || '';
    const originLabel = resolveBarangayLabel(snap.barangay_of_origin, residentJoinName, barangayMap);
    if (originLabel !== TARGET_LABEL) continue;

// --- Robust canonical family key (prevents dupes even when head row has null family_head_id)
const normId = (id) => {
  const s = String(id ?? '').trim();
  if (!s) return null;
  const n = +s;
  return Number.isFinite(n) ? String(n) : s; // strip leading zeros if numeric
};

const resId  = normId(r.evacuee_resident_id);   // the head’s id for the family
const famId  = normId(r.family_head_id);        // may be null/blank on the head row itself

// If a SOLO row exists and we now see a famId for the same head, move it to fam:<famId>
if (famId) {
  const soloK = `solo:${resId}`;
  const famK  = `fam:${famId}`;
  if (families.has(soloK) && !families.has(famK)) {
    families.set(famK, families.get(soloK));
    families.delete(soloK);
  }
}

// Choose the working key:
// - Prefer fam:<famId>
// - If famId is absent but we already have fam:<resId> (members processed first), reuse that
let famKey = famId ? `fam:${famId}` : `solo:${resId}`;
const existingFamForHead = `fam:${resId}`;
if (!famId && families.has(existingFamForHead)) {
  famKey = existingFamForHead; // collapse head's SOLO row into existing family
}

// Initialize if needed
if (!families.has(famKey)) {
  families.set(famKey, {
    ecName: r?.evacuation_center_rooms?.evacuation_centers?.name || '',
    headName: null,
    headSex: null,
    purok: null,
    male: 0, female: 0, total: 0,
    inf: 0, ch: 0, y: 0, ad: 0, se: 0,
    pwd: 0, preg: 0, lact: 0,
    reliefText: 'No relief services received',
    _reliefLocked: false,
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
    const sexRaw = (snap.sex ?? resident.sex ?? '').toString().toLowerCase();
    if (rel === 'Head') {
      if (!f.headName) f.headName = name;
      if (!f.headSex)  f.headSex  = sexRaw === 'male' ? 'Male' : sexRaw === 'female' ? 'Female' : '';
    }

    if (!f.purok) {
      const purokLabel = snap.purok ?? null;
      if (purokLabel != null && String(purokLabel).trim() !== '') f.purok = String(purokLabel);
    }

    if (sexRaw === 'male') f.male += 1; else if (sexRaw === 'female') f.female += 1;

const age = computeAgeYearsAsOfJS(
  snap,
  r?.reported_age_at_arrival,
  resident.birthdate ?? null,
  asOf
);

if (age != null) {
  const inRange = (d) => d?.enabled && d?.min != null &&
    (d.max == null ? age >= d.min : (age >= d.min && age <= d.max));
  if (inRange(ageDefs.infant))   f.inf += 1;
  if (inRange(ageDefs.children)) f.ch  += 1;
  if (inRange(ageDefs.youth))    f.y   += 1;
  if (inRange(ageDefs.adult))    f.ad  += 1;
  if (ageDefs.seniors?.enabled && ageDefs.seniors.min != null && age >= ageDefs.seniors.min) f.se += 1;
}
    f.total += 1;
    let ids = r.vulnerability_type_ids;
    if (!Array.isArray(ids)) ids = parseMaybeJSON(ids, []);
ids = ids.map((x) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}).filter((n) => n != null);

    if (vulnMap?.pwd != null && ids.includes(vulnMap.pwd)) f.pwd += 1;
    if (vulnMap?.pregnant != null && ids.includes(vulnMap.pregnant)) f.preg += 1;
    if (vulnMap?.lactating != null && ids.includes(vulnMap.lactating)) f.lact += 1;

    // ✅ Relief Services text (from map). Set once per family.
    if (!f._reliefLocked) {
      const items = reliefByFamily?.get(String(r.family_head_id)) || [];
      if (Array.isArray(items) && items.length) {
        f.reliefText = items.join(', ');
      } else {
        f.reliefText = 'No relief services received';
      }
      f._reliefLocked = true;
    }
  }

  const rows = Array.from(families.values()).sort((a, b) => {
    const byEC = (a.ecName || '').localeCompare(b.ecName || '');
    if (byEC !== 0) return byEC;
    return (a.headName || '').localeCompare(b.headName || '');
  });

  // --- open template ---
  const templatePath = path.resolve(__dirname, '../../templates/Barangay.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.getWorksheet('Sheet1') || wb.worksheets[0];

// Keep original widths for the logo span so it won't stretch
const tplLogoCols = {
  X: ws.getColumn('X').width,
  Y: ws.getColumn('Y').width,
  Z: ws.getColumn('Z').width,
};

  

  // --- Titles (rows 3,5,6) ---
  const disasterTitle = String(disasterName || '').trim().toUpperCase();
 ws.getCell('N3').value = TARGET_LABEL;               // <-- use the merged header block on the right (N3:Z3 in the template)
 ws.getCell('N3').alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };

  ws.getCell('A5').value = `EVACUATION DATA FOR  DISASTERS ${disasterTitle || '—'} `;
  ws.getCell('A6').value = `as of ${formatAsOf(asOf)}`
  // Put the barangay label in the right header block and center it
  try { ws.mergeCells('N3:Z3'); } catch (_) {}
  const hdrBgy = ws.getCell('N3');
  hdrBgy.value = TARGET_LABEL;
hdrBgy.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // --- Clear data area A11:Z3009 ---
  const START = 11;
  for (let rr = START; rr < START + 3000; rr++) {
    for (let c = 1; c <= 26; c++) ws.getCell(rr, c).value = null;
  }

  // --- Header (rows 8–10) ---
  const center = (addr) => {
    const cell = ws.getCell(addr);
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  };
  const tryMerge = (range) => { try { ws.mergeCells(range); } catch (_) {} };

  ws.getCell('A8').value = 'Evacuation Center/Site';
  ws.getCell('B8').value = 'Family Head';
  ws.getCell('D8').value = 'Purok';
  ws.getCell('E8').value = 'Total No. of Male';
  ws.getCell('F8').value = 'Total No. of Female';
  ws.getCell('G8').value = 'Total No. of Individuals';
  ws.getCell('H8').value = 'Infant';
  ws.getCell('K8').value = 'Children';
  ws.getCell('N8').value = 'Youth';
  ws.getCell('Q8').value = 'Adult';
  ws.getCell('T8').value = 'Senior Citizens';
  ws.getCell('W8').value = 'PWD';
  ws.getCell('X8').value = 'Pregnant Women';
  ws.getCell('Y8').value = 'Lactating Women';
  ws.getCell('Z8').value = 'Relief Services';

  ['A8:A10','D8:D10','E8:E10','F8:F10','G8:G10','W8:W10','X8:X10','Y8:Y10','Z8:Z10'].forEach(tryMerge);
  tryMerge('B8:C8'); // Family Head (B–C)
  [['H8:J8','H9:J9'],['K8:M8','K9:M9'],['N8:P8','N9:P9'],['Q8:S8','Q9:S9'],['T8:V8','T9:V9']]
    .forEach(([a,b]) => { tryMerge(a); tryMerge(b); });

  ws.getCell('B9').value = 'Name';
  ws.getCell('C9').value = 'Sex';
  ws.getCell('H9').value = headerTexts.infant;
  ws.getCell('K9').value = headerTexts.children;
  ws.getCell('N9').value = headerTexts.youth;
  ws.getCell('Q9').value = headerTexts.adult;
  ws.getCell('T9').value = headerTexts.seniors;

  const trio = (c1,c2,c3) => { ws.getCell(c1).value='Male'; ws.getCell(c2).value='Female'; ws.getCell(c3).value='Total'; };
  trio('H10','I10','J10'); trio('K10','L10','M10'); trio('N10','O10','P10'); trio('Q10','R10','S10'); trio('T10','U10','V10');

  [
    'A8','B8','D8','E8','F8','G8','H8','K8','N8','Q8','T8','W8','X8','Y8','Z8',
    'B9','C9','H9','K9','N9','Q9','T9',
    'H10','I10','J10','K10','L10','M10','N10','O10','P10','Q10','R10','S10','T10','U10','V10'
  ].forEach(center);

  // Keep Disaggregated sizing; make Z extra-wide and left-aligned for prose
  applyPerBarangayColumnLayout(ws);
  // Text columns layout: center A, wrap B (name), center C (sex), wrap Z (relief)
ws.getColumn('A').alignment = { ...(ws.getColumn('A').alignment || {}), horizontal: 'center', vertical: 'middle', wrapText: true };
ws.getColumn('B').alignment = { ...(ws.getColumn('B').alignment || {}), horizontal: 'center',   vertical: 'middle', wrapText: true };
ws.getColumn('C').alignment = { ...(ws.getColumn('C').alignment || {}), horizontal: 'center', vertical: 'middle', wrapText: true };
ws.getColumn('Z').alignment = { ...(ws.getColumn('Z').alignment || {}), horizontal: 'center',   vertical: 'middle', wrapText: true };

  // Make text columns wrap automatically so long values flow to a new line.
  ['A','B','Z'].forEach(col => {
    const c = ws.getColumn(col);
    c.alignment = { ...(c.alignment || {}), wrapText: true, vertical: 'middle' };
  });

  const COL = {
    ec: 1,
    headName: 2, headSex: 3, purok: 4,
    male: 5, female: 6, total: 7,
    infM: 8, infF: 9, infT: 10,
    chM: 11, chF: 12, chT: 13,
    yoM: 14, yoF: 15, yoT: 16,
    adM: 17, adF: 18, adT: 19,
    seM: 20, seF: 21, seT: 22,
    pwd: 23, preg: 24, lact: 25, relief: 26,
  };

  const show = {
    ecSite:           fields ? !!fields.evacuationCenterSite : true,
    headName:         fields?.familyHead?.name ?? true,
    headSex:          fields?.familyHead?.sex  ?? true,
    purok:            fields ? !!fields.purok : true,
    totalMale:        fields ? !!fields.totalMale : true,
    totalFemale:      fields ? !!fields.totalFemale : true,
    totalIndividuals: fields ? !!fields.totalIndividuals : true,
    infM:  ageDefs.infant.enabled   && (fields?.infant?.buckets?.male   ?? true),
    infF:  ageDefs.infant.enabled   && (fields?.infant?.buckets?.female ?? true),
    infT:  ageDefs.infant.enabled   && (fields?.infant?.buckets?.total  ?? true),
    chM:   ageDefs.children.enabled && (fields?.children?.buckets?.male   ?? true),
    chF:   ageDefs.children.enabled && (fields?.children?.buckets?.female ?? true),
    chT:   ageDefs.children.enabled && (fields?.children?.buckets?.total  ?? true),
    yoM:   ageDefs.youth.enabled    && (fields?.youth?.buckets?.male   ?? true),
    yoF:   ageDefs.youth.enabled    && (fields?.youth?.buckets?.female ?? true),
    yoT:   ageDefs.youth.enabled    && (fields?.youth?.buckets?.total  ?? true),
    adM:   ageDefs.adult.enabled    && (fields?.adult?.buckets?.male   ?? true),
    adF:   ageDefs.adult.enabled    && (fields?.adult?.buckets?.female ?? true),
    adT:   ageDefs.adult.enabled    && (fields?.adult?.buckets?.total  ?? true),
    seM:   ageDefs.seniors.enabled  && (fields?.seniors?.buckets?.male   ?? true),
    seF:   ageDefs.seniors.enabled  && (fields?.seniors?.buckets?.female ?? true),
    seT:   ageDefs.seniors.enabled  && (fields?.seniors?.buckets?.total  ?? true),
    pwd:   !!fields?.pwd?.enabled,
    preg:  !!fields?.pregnantWomen,
    lact:  !!fields?.lactatingWomen,
   relief: fields ? !!fields.reliefServices : true,
  };
  for (let c = 1; c <= 26; c++) {
    const visible =
      c === 1  ? show.ecSite :
      c === 2  ? show.headName :
      c === 3  ? show.headSex :
      c === 4  ? show.purok :
      c === 5  ? show.totalMale :
      c === 6  ? show.totalFemale :
      c === 7  ? show.totalIndividuals :
      c === 8  ? show.infM :
      c === 9  ? show.infF :
      c === 10 ? show.infT :
      c === 11 ? show.chM :
      c === 12 ? show.chF :
      c === 13 ? show.chT :
      c === 14 ? show.yoM :
      c === 15 ? show.yoF :
      c === 16 ? show.yoT :
      c === 17 ? show.adM :
      c === 18 ? show.adF :
      c === 19 ? show.adT :
      c === 20 ? show.seM :
      c === 21 ? show.seF :
      c === 22 ? show.seT :
      c === 23 ? show.pwd :
      c === 24 ? show.preg :
      c === 25 ? show.lact :
                 show.relief;
    ws.getColumn(c).hidden = !visible;
  }

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

    ws.mergeCells(groupStart, COL.ec, rowIdx - 1, COL.ec);
    const ecCell = ws.getCell(groupStart, COL.ec);
    ecCell.value = currentEC || '';
    ecCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    ws.getCell(rowIdx, COL.ec).value = 'SUBTOTAL';
    ws.getCell(rowIdx, COL.ec).alignment = { vertical:'middle', horizontal:'center' };
    ws.getCell(rowIdx, COL.headName).value = Number(totals.families) || 0;
    ws.getCell(rowIdx, COL.headSex).value  = '---';
    ws.getCell(rowIdx, COL.purok).value    = '----';
    ws.getCell(rowIdx, COL.male).value     = totals.male;
    ws.getCell(rowIdx, COL.female).value   = totals.female;
    ws.getCell(rowIdx, COL.total).value    = totals.total;
    ws.getCell(rowIdx, COL.infM).value     = totals.inf;
    ws.getCell(rowIdx, COL.infF).value     = 0;
    ws.getCell(rowIdx, COL.infT).value     = totals.inf;
    ws.getCell(rowIdx, COL.chM).value      = totals.ch;
    ws.getCell(rowIdx, COL.chF).value      = 0;
    ws.getCell(rowIdx, COL.chT).value      = totals.ch;
    ws.getCell(rowIdx, COL.yoM).value      = totals.y;
    ws.getCell(rowIdx, COL.yoF).value      = 0;
    ws.getCell(rowIdx, COL.yoT).value      = totals.y;
    ws.getCell(rowIdx, COL.adM).value      = totals.ad;
    ws.getCell(rowIdx, COL.adF).value      = 0;
    ws.getCell(rowIdx, COL.adT).value      = totals.ad;
    ws.getCell(rowIdx, COL.seM).value      = totals.se;
    ws.getCell(rowIdx, COL.seF).value      = 0;
    ws.getCell(rowIdx, COL.seT).value      = totals.se;
    ws.getCell(rowIdx, COL.pwd).value      = totals.pwd;
    ws.getCell(rowIdx, COL.preg).value     = totals.preg;
    ws.getCell(rowIdx, COL.lact).value     = totals.lact;
    ws.getCell(rowIdx, COL.relief).value   = '---'; // no subtotal for Relief Services

// AFTER:
for (let c = 1; c <= 26; c++) {
  if (c !== COL.ec) {
    ws.getCell(rowIdx, c).alignment = { vertical: 'middle', horizontal: 'center' };
  }
}

    rowIdx += 1;
    groupStart = null;
    totals = zeroTotals();
  };

for (const g of rows) {
  // Normalize missing/blank EC names to a clear label
  if (!g.ecName || !String(g.ecName).trim()) g.ecName = 'Outside / Private House';

  if (currentEC !== null && g.ecName !== currentEC) flushGroup();
  if (groupStart == null) { currentEC = g.ecName; groupStart = rowIdx; }


    ws.getCell(rowIdx, COL.headName).value = g.headName || '';
    ws.getCell(rowIdx, COL.headSex).value  = g.headSex || '';
    const purokStr = g.purok != null ? String(g.purok).trim() : '';
    ws.getCell(rowIdx, COL.purok).value = /^\d+$/.test(purokStr) ? Number(purokStr) : (purokStr || '');

    ws.getCell(rowIdx, COL.male).value   = Number(g.male) || 0;
    ws.getCell(rowIdx, COL.female).value = Number(g.female) || 0;
    ws.getCell(rowIdx, COL.total).value  = Number(g.total) || 0;

    ws.getCell(rowIdx, COL.infM).value = Number(g.inf) || 0;
    ws.getCell(rowIdx, COL.infF).value = 0;
    ws.getCell(rowIdx, COL.infT).value = Number(g.inf) || 0;

    ws.getCell(rowIdx, COL.chM).value  = Number(g.ch) || 0;
    ws.getCell(rowIdx, COL.chF).value  = 0;
    ws.getCell(rowIdx, COL.chT).value  = Number(g.ch) || 0;

    ws.getCell(rowIdx, COL.yoM).value  = Number(g.y) || 0;
    ws.getCell(rowIdx, COL.yoF).value  = 0;
    ws.getCell(rowIdx, COL.yoT).value  = Number(g.y) || 0;

    ws.getCell(rowIdx, COL.adM).value  = Number(g.ad) || 0;
    ws.getCell(rowIdx, COL.adF).value  = 0;
    ws.getCell(rowIdx, COL.adT).value  = Number(g.ad) || 0;

    ws.getCell(rowIdx, COL.seM).value  = Number(g.se) || 0;
    ws.getCell(rowIdx, COL.seF).value  = 0;
    ws.getCell(rowIdx, COL.seT).value  = Number(g.se) || 0;

    ws.getCell(rowIdx, COL.pwd).value  = Number(g.pwd) || 0;
    ws.getCell(rowIdx, COL.preg).value = Number(g.preg) || 0;
    ws.getCell(rowIdx, COL.lact).value = Number(g.lact) || 0;

    // Relief Services: wrap at commas to create real new lines, then enable wrapText
const reliefWrapped = wrapRelief(g.reliefText || 'No relief services received', 55);
const reliefCell = ws.getCell(rowIdx, COL.relief);
reliefCell.value = reliefWrapped;
// keep column Z's horizontal centering; just ensure wrap + vertical centering here
reliefCell.alignment = { ...(reliefCell.alignment || {}), wrapText: true, vertical: 'middle' };

// Set row height from the actual number of wrapped lines
const lineCount = (reliefWrapped.match(/\n/g)?.length || 0) + 1;
if (lineCount > 1) {
  ws.getRow(rowIdx).height = Math.min(15 + lineCount * 12, 120); // base ~15pt + 12pt per extra line
}


    totals.families += 1;
    totals.male += g.male; totals.female += g.female; totals.total += g.total;
    totals.inf += g.inf; totals.ch += g.ch; totals.y += g.y; totals.ad += g.ad; totals.se += g.se;
    totals.pwd += g.pwd; totals.preg += g.preg; totals.lact += g.lact;

    grand.families += 1;
    grand.male += g.male; grand.female += g.female; grand.total += g.total;
    grand.inf += g.inf; grand.ch += g.ch; grand.y += g.y; grand.ad += g.ad; grand.se += g.se;
    grand.pwd += g.pwd; grand.preg += g.preg; grand.lact += g.lact;

    rowIdx += 1;
  }
  flushGroup();

  // TOTAL row (Relief column is '---')
  ws.getCell(rowIdx, COL.ec).value       = 'TOTAL';
  ws.getCell(rowIdx, COL.headName).value = Number(grand.families) || 0;
  ws.getCell(rowIdx, COL.headSex).value  = '---';
  ws.getCell(rowIdx, COL.purok).value    = '----';
  ws.getCell(rowIdx, COL.male).value     = Number(grand.male) || 0;
  ws.getCell(rowIdx, COL.female).value   = Number(grand.female) || 0;
  ws.getCell(rowIdx, COL.total).value    = Number(grand.total) || 0;

  ws.getCell(rowIdx, COL.infM).value = Number(grand.inf) || 0;
  ws.getCell(rowIdx, COL.infF).value = 0;
  ws.getCell(rowIdx, COL.infT).value = Number(grand.inf) || 0;

  ws.getCell(rowIdx, COL.chM).value = Number(grand.ch) || 0;
  ws.getCell(rowIdx, COL.chF).value = 0;
  ws.getCell(rowIdx, COL.chT).value = Number(grand.ch) || 0;

  ws.getCell(rowIdx, COL.yoM).value = Number(grand.y) || 0;
  ws.getCell(rowIdx, COL.yoF).value = 0;
  ws.getCell(rowIdx, COL.yoT).value = Number(grand.y) || 0;

  ws.getCell(rowIdx, COL.adM).value = Number(grand.ad) || 0;
  ws.getCell(rowIdx, COL.adF).value = 0;
  ws.getCell(rowIdx, COL.adT).value = Number(grand.ad) || 0;

  ws.getCell(rowIdx, COL.seM).value = Number(grand.se) || 0;
  ws.getCell(rowIdx, COL.seF).value = 0;
  ws.getCell(rowIdx, COL.seT).value = Number(grand.se) || 0;

  ws.getCell(rowIdx, COL.pwd).value    = Number(grand.pwd) || 0;
  ws.getCell(rowIdx, COL.preg).value   = Number(grand.preg) || 0;
  ws.getCell(rowIdx, COL.lact).value   = Number(grand.lact) || 0;
  ws.getCell(rowIdx, COL.relief).value = '---'; // no total for Relief Services

  const buffer = await wb.xlsx.writeBuffer();
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: 'xlsx',
    filenameBase: `${SLUG('per-barangay')}-${SLUG(TARGET_LABEL || 'report')}`,
  };
}

// ---- Build per-barangay CSV ----
function buildPerBarangayCSV({
  regs = [],
  disasterName = '',
  asOf,
  vulnMap,
  barangayMap,
  barangayName,
  fields,
  reliefByFamily = new Map(),
}) {
  const TARGET_LABEL = normalizeBarangayLabel(barangayName || '');

  // Visibility (like XLSX)
  const show = {
    ecSite:           fields ? !!fields.evacuationCenterSite : true,
    headName:         fields?.familyHead?.name ?? true,
    headSex:          fields?.familyHead?.sex  ?? true,
    purok:            fields ? !!fields.purok : true,
    totalMale:        fields ? !!fields.totalMale : true,
    totalFemale:      fields ? !!fields.totalFemale : true,
    totalIndividuals: fields ? !!fields.totalIndividuals : true,
    inf:  !!fields?.infant?.enabled,
    ch:   !!fields?.children?.enabled,
    y:    !!fields?.youth?.enabled,
    ad:   !!fields?.adult?.enabled,
    se:   !!fields?.seniors?.enabled,
    pwd:  !!fields?.pwd?.enabled,
    preg: !!fields?.pregnantWomen,
    lact: !!fields?.lactatingWomen,
    relief: fields ? !!fields.reliefServices : true,
  };

  // Column model (filter by visibility)
  const COLS = [
    { key: 'ec',     hdr: 'Evacuation Center/Site', show: show.ecSite },
    { key: 'name',   hdr: 'Family Head - Name',     show: show.headName },
    { key: 'sex',    hdr: 'Family Head - Sex',      show: show.headSex },
    { key: 'purok',  hdr: 'Purok',                  show: show.purok },
    { key: 'm',      hdr: 'Total No. of Male',      show: show.totalMale },
    { key: 'f',      hdr: 'Total No. of Female',    show: show.totalFemale },
    { key: 't',      hdr: 'Total Individuals',      show: show.totalIndividuals },
    { key: 'inf',    hdr: 'Infant (Total)',         show: show.inf },
    { key: 'ch',     hdr: 'Children (Total)',       show: show.ch },
    { key: 'y',      hdr: 'Youth (Total)',          show: show.y },
    { key: 'ad',     hdr: 'Adult (Total)',          show: show.ad },
    { key: 'se',     hdr: 'Senior Citizens (Total)',show: show.se },
    { key: 'pwd',    hdr: 'PWD',                    show: show.pwd },
    { key: 'preg',   hdr: 'Pregnant Women',         show: show.preg },
    { key: 'lact',   hdr: 'Lactating Women',        show: show.lact },
    { key: 'relief', hdr: 'Relief Services',        show: show.relief },
  ].filter(c => c.show);

  // Robust family key (same strategy as XLSX)
  const families = new Map();
  const normId = (id) => {
    const s = String(id ?? '').trim();
    if (!s) return null;
    const n = +s;
    return Number.isFinite(n) ? String(n) : s;
  };

  for (const r of regs) {
    const resident = r?.evacuee_residents?.residents || {};
    const snap = parseMaybeJSON(r?.profile_snapshot, {}) || {};

    const originLabel = resolveBarangayLabel(
      snap.barangay_of_origin,
      resident?.barangays?.name || '',
      barangayMap
    );
    if (originLabel !== TARGET_LABEL) continue;

    const resId  = normId(r.evacuee_resident_id);
    const famId  = normId(r.family_head_id);

    if (famId) {
      const soloK = `solo:${resId}`;
      const famK  = `fam:${famId}`;
      if (families.has(soloK) && !families.has(famK)) {
        families.set(famK, families.get(soloK));
        families.delete(soloK);
      }
    }

    let famKey = famId ? `fam:${famId}` : `solo:${resId}`;
    const existingFamForHead = `fam:${resId}`;
    if (!famId && families.has(existingFamForHead)) famKey = existingFamForHead;

    if (!families.has(famKey)) {
      families.set(famKey, {
        ec: r?.evacuation_center_rooms?.evacuation_centers?.name || 'Outside / Private House',
        name: null,
        sex: null,
        purok: null,
        m:0,f:0,t:0,
        inf:0,ch:0,y:0,ad:0,se:0,
        pwd:0,preg:0,lact:0,
        relief: 'No relief services received',
        _reliefLocked: false,
      });
    }
    const f = families.get(famKey);

    if (!f.ec && r?.evacuation_center_rooms?.evacuation_centers?.name) {
      f.ec = r.evacuation_center_rooms.evacuation_centers.name;
    }

    const rel = snap.relationship_to_family_head ?? r?.evacuee_residents?.relationship_to_family_head ?? null;
    const fullName = buildFullName({
      first_name:  snap.first_name  ?? resident.first_name  ?? null,
      middle_name: snap.middle_name ?? resident.middle_name ?? null,
      last_name:   snap.last_name   ?? resident.last_name   ?? null,
      suffix: (Object.prototype.hasOwnProperty.call(snap, 'suffix') ? snap.suffix : resident.suffix) ?? null,
    });
    const sexRaw = (snap.sex ?? resident.sex ?? '').toString().toLowerCase();
    if (rel === 'Head') {
      if (!f.name) f.name = fullName;
      if (!f.sex)  f.sex  = sexRaw === 'male' ? 'M' : sexRaw === 'female' ? 'F' : '';
    }

    if (!f.purok) {
      const p = snap.purok ?? null;
      if (p != null && String(p).trim() !== '') f.purok = String(p);
    }

    if (sexRaw === 'male') f.m++; else if (sexRaw === 'female') f.f++;
    const age = computeAgeYearsAsOfJS(
      snap,
      r?.reported_age_at_arrival,
      resident.birthdate ?? null,
      asOf
    );
    if (age != null) {
      // We follow the same bucket cut as XLSX (enabled buckets will be shown)
      if (fields?.infant?.enabled && fields?.infant?.age?.min != null) {
        const d = fields.infant.age;
        if (d.max == null ? age >= d.min : (age >= d.min && age <= d.max)) f.inf++;
      }
      if (fields?.children?.enabled && fields?.children?.age?.min != null) {
        const d = fields.children.age;
        if (d.max == null ? age >= d.min : (age >= d.min && age <= d.max)) f.ch++;
      }
      if (fields?.youth?.enabled && fields?.youth?.age?.min != null) {
        const d = fields.youth.age;
        if (d.max == null ? age >= d.min : (age >= d.min && age <= d.max)) f.y++;
      }
      if (fields?.adult?.enabled && fields?.adult?.age?.min != null) {
        const d = fields.adult.age;
        if (d.max == null ? age >= d.min : (age >= d.min && age <= d.max)) f.ad++;
      }
      if (fields?.seniors?.enabled && fields?.seniors?.age?.min != null) {
        const d = fields.seniors.age;
        if (age >= d.min) f.se++; // open ended (≥ min)
      }
    }
    f.t++;

    let ids = r.vulnerability_type_ids;
    if (!Array.isArray(ids)) ids = parseMaybeJSON(ids, []);
    ids = ids.map(x => { const n = Number(x); return Number.isFinite(n) ? n : null; }).filter(n => n != null);

    if (vulnMap?.pwd != null && ids.includes(vulnMap.pwd)) f.pwd++;
    if (vulnMap?.pregnant != null && ids.includes(vulnMap.pregnant)) f.preg++;
    if (vulnMap?.lactating != null && ids.includes(vulnMap.lactating)) f.lact++;

    // Relief services text (same as XLSX): keep first computed list
    if (!f._reliefLocked) {
      const items = reliefByFamily.get(String(r.family_head_id)) || [];
      f.relief = (Array.isArray(items) && items.length) ? items.join(', ') : 'No relief services received';
      f._reliefLocked = true;
    }
  }

  const rows = Array.from(families.values()).sort((a, b) => {
    const ec = (a.ec || '').localeCompare(b.ec || '');
    return ec !== 0 ? ec : (a.name || '').localeCompare(b.name || '');
  });

  // CSV
  const lines = [];
  lines.push(row(['Republic of the Philippines']));
  lines.push(row(['City Government of Legazpi']));
  lines.push(row([TARGET_LABEL]));
  lines.push(row([String(disasterName || '').toUpperCase()]));
  lines.push(row([`as of ${formatAsOf(asOf)}`]));
  lines.push('');
  lines.push(row(COLS.map(c => c.hdr)));

  let currentEC = null;
  let totals = { fam:0,m:0,f:0,t:0,inf:0,ch:0,y:0,ad:0,se:0,pwd:0,preg:0,lact:0 };
  let grand  = { fam:0,m:0,f:0,t:0,inf:0,ch:0,y:0,ad:0,se:0,pwd:0,preg:0,lact:0 };

  const flush = () => {
    // SUBTOTAL row (Relief column shown as ---)
    const rec = { ec:'SUBTOTAL', name: totals.fam, sex:'', purok:'----',
      m:totals.m, f:totals.f, t:totals.t, inf:totals.inf, ch:totals.ch, y:totals.y, ad:totals.ad, se:totals.se,
      pwd:totals.pwd, preg:totals.preg, lact:totals.lact, relief:'---'
    };
    lines.push(row(COLS.map(c => escapeCSV(rec[c.key] ?? ''))));
    totals = { fam:0,m:0,f:0,t:0,inf:0,ch:0,y:0,ad:0,se:0,pwd:0,preg:0,lact:0 };
  };

  for (const g of rows) {
    if (currentEC !== null && g.ec !== currentEC) flush();
    if (currentEC === null) currentEC = g.ec;

    const rec = {
      ec: g.ec || 'Outside / Private House',
      name: g.name || '',
      sex: g.sex || '',
      purok: g.purok ?? '',
      m: g.m || 0, f: g.f || 0, t: g.t || 0,
      inf: g.inf || 0, ch: g.ch || 0, y: g.y || 0, ad: g.ad || 0, se: g.se || 0,
      pwd: g.pwd || 0, preg: g.preg || 0, lact: g.lact || 0, relief: g.relief || 'No relief services received',
    };
    lines.push(row(COLS.map(c => escapeCSV(rec[c.key] ?? ''))));

    totals.fam++; grand.fam++;
    totals.m += rec.m; totals.f += rec.f; totals.t += rec.t;
    totals.inf += rec.inf; totals.ch += rec.ch; totals.y += rec.y; totals.ad += rec.ad; totals.se += rec.se;
    totals.pwd += rec.pwd; totals.preg += rec.preg; totals.lact += rec.lact;

    grand.m += rec.m; grand.f += rec.f; grand.t += rec.t;
    grand.inf += rec.inf; grand.ch += rec.ch; grand.y += rec.y; grand.ad += rec.ad; grand.se += rec.se;
    grand.pwd += rec.pwd; grand.preg += rec.preg; grand.lact += rec.lact;
  }
  if (currentEC !== null) flush();

  // TOTAL row (Relief column as ---)
  const totalRec = {
    ec:'TOTAL', name: grand.fam, sex:'', purok:'----',
    m:grand.m, f:grand.f, t:grand.t, inf:grand.inf, ch:grand.ch, y:grand.y, ad:grand.ad, se:grand.se,
    pwd:grand.pwd, preg:grand.preg, lact:grand.lact, relief:'---'
  };
  lines.push(row(COLS.map(c => escapeCSV(totalRec[c.key] ?? ''))));

  return Buffer.from('\uFEFF' + lines.join('\n'), 'utf8');
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
  fields,
  ecNamesByBarangay,
  sqlRows,
  reliefByFamily = new Map(),
}) {
  const type = String(reportTypeName || '').toLowerCase();

if (fileFormat === 'CSV') {
  if (/^aggregated/.test(type)) {
    return {
      buffer: buildAggregatedStatusCSV({
        regs, disasterName, asOf, barangayMap, ecNamesByBarangay, fields
      }),
      contentType: 'text/csv',
      ext: 'csv',
      filenameBase: FILE_BASENAME(reportName),
    };
  }

  if (/^disaggregated/.test(type)) {
    return {
      buffer: buildDisaggregatedCSV({
        sqlRows, regs, disasterName, asOf, vulnMap, barangayMap, fields, ecNamesByBarangay
      }),
      contentType: 'text/csv',
      ext: 'csv',
      filenameBase: FILE_BASENAME(reportName),
    };
  }

  if (/^per\s*barangay/.test(type)) {
    return {
      buffer: buildPerBarangayCSV({
        regs, disasterName, asOf, vulnMap, barangayMap, barangayName, fields, reliefByFamily
      }),
      contentType: 'text/csv',
      ext: 'csv',
      filenameBase: FILE_BASENAME(reportName),
    };
  }
  throw new NotImplementedError('CSV generation for this report type is not implemented yet.');
}


if (fileFormat === 'XLSX') {
  if (/^aggregated/.test(type)) {
    const out = await buildAggregatedStatusXLSX({
      regs, disasterName, asOf, barangayMap, fields, ecNamesByBarangay,
    });
    out.filenameBase = FILE_BASENAME(reportName);
    return out;
  }

  if (/^disaggregated/.test(type)) {
    const out = await buildDisaggregatedXLSX({
      sqlRows, regs, disasterName, asOf, vulnMap, barangayMap, fields, ecNamesByBarangay,
    });
    out.filenameBase = FILE_BASENAME(reportName);
    return out;
  }

  if (/^per\s*barangay/.test(type)) {
    const out = await buildPerBarangayXLSX({
      regs, disasterName, asOf, vulnMap, barangayMap, barangayId, barangayName, fields, ecNamesByBarangay, reliefByFamily,
    });
    out.filenameBase = FILE_BASENAME(reportName);
    return out;
  }

  throw new NotImplementedError('XLSX generation for this report type is not implemented yet.');
}

  throw new NotImplementedError('Unsupported file format requested.');
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
