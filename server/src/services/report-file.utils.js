// server/src/services/report-file.utils.js
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

// Layout helpers were moved to report-file.layout.js
// These small helpers remain in utils to preserve original code presence
function tryMerge(ws, a1Range) {
  try { ws.unMergeCells(a1Range); } catch (e) {}
  try { ws.mergeCells(a1Range); } catch (e) {}
}
function center(ws, a1) {
  const c = ws.getCell(a1);
  c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}
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

const normalizeBarangayLabel = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// Normalize for ranking (trim, collapse spaces, case-insensitive, strip accents)
const normalizeBarangayKey = (s) =>
  normalizeBarangayLabel(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const BARANGAY_RANK = new Map(
  BARANGAY_ORDER.map((name, i) => [normalizeBarangayKey(name), i])
);

function barangayRankOf(label) {
  const k = normalizeBarangayKey(label || '');
  return BARANGAY_RANK.has(k) ? BARANGAY_RANK.get(k) : Number.POSITIVE_INFINITY;
}

function normalizeECNamesIndex(idx) {
  const map = new Map();
  if (!idx) return map;

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

module.exports = {
  isPrivateHouseCategory,
  SLUG,
  FILE_BASENAME,
  escapeCSV,
  row,
  formatAsOf,
  parseAgeYearsText,
  computeAgeYearsAsOfJS,
  tryMerge,
  center,
  setIfNonEmpty,
  BARANGAY_ORDER,
  barangayRankOf,
  normalizeBarangayLabel,
  normalizeECNamesIndex,
  resolveBarangayLabel,
  asBarangayName,
  parseMaybeJSON,
  buildFullName,
  ageInYears,
  coerceAgeYears,
  getAgeYearsFromAllSources,
  extractAgeYears,
  autoFitWorksheet,
};
