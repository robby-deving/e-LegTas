// server/src/services/report-file.disaggregated.js
const ExcelJS = require('exceljs');
const path = require('path');

const {
  row,
  escapeCSV,
  barangayRankOf,
  normalizeECNamesIndex,
} = require('./report-file.utils');

const { applyDisaggColumnLayout } = require('./report-file.layout');

/* ------------------ Disaggregated (XLSX via template) — DB-backed ------------------ */
async function buildDisaggregatedXLSX({
  sqlRows = [],
  disasterName = "",
  asOf,
  fields,
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
    return dt.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

// inside server/src/services/report-file.disaggregated.js
const normalizeECNamesIndexLocal = (map) => {
  const out = new Map();
  const norm = (s) =>
    String(s || '')
      .normalize('NFKC')
      .replace(/[–—]/g, '-')   // unify dashes
      .replace(/\s+/g, ' ')    // collapse multi-space
      .trim();

  if (map && typeof map === 'object') {
    for (const [barangay, names] of Object.entries(map)) {
      const seen = new Set();
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


  const barangayRankOfLocal = (name) => {
    const m = String(name || '').match(/\d+/);
    return m ? parseInt(m[0], 10) : Number.POSITIVE_INFINITY;
  };

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

  const rangeText = (def) => {
    const hasMin = def?.min != null;
    const hasMax = def?.max != null;
    if (!hasMin && !hasMax) return "{ Age Range Here }";
    if (hasMin && hasMax) return `${def.min} - ${def.max} years old`;
    if (hasMin) return `${def.min}+ years old`;
    return `≤${def.max} years old`;
  };

  console.log('[disagg-xlsx] fields (raw):', fields);
  console.log('[disagg-xlsx] ageDefs:', ageDefs);
  console.log('[disagg-xlsx] headerTexts:', {
    infant:   rangeText(ageDefs.infant),
    children: rangeText(ageDefs.children),
    youth:    rangeText(ageDefs.youth),
    adult:    rangeText(ageDefs.adult),
    seniors:  rangeText(ageDefs.seniors),
  });

  const ecIndex = normalizeECNamesIndexLocal(ecNamesByBarangay);

  const rows = [...sqlRows].sort((a, b) => {
    const A = a?.barangay_name || '';
    const B = b?.barangay_name || '';
    const ra = barangayRankOfLocal(A);
    const rb = barangayRankOfLocal(B);
    if (ra !== rb) return ra - rb;
    return A.localeCompare(B);
  });

  const templatePath = path.resolve(__dirname, "../../templates/Disaggregated.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.getWorksheet("Sheet1") || wb.worksheets[0];

  ws.getCell("A4").value = `STATUS REPORT FOR ${(disasterName || "").toUpperCase()}`;
  ws.getCell("A5").value = `as of ${formatAsOf(asOf)}`;

  const START_ROW = 10;

  for (let rr = START_ROW; rr < START_ROW + 2000; rr++) {
    for (let cc = 1; cc <= 24; cc++) ws.getCell(rr, cc).value = null;
  }

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

  ["A","B","C","D","E","F","V","W","X"].forEach((col) => {
    tryMerge(ws, `${col}7:${col}9`);
    center(ws, `${col}7`);
  });

  [
    ["G7:I7", "G7"],
    ["J7:L7", "J7"],
    ["M7:O7", "M7"],
    ["P7:R7", "P7"],
    ["S7:U7", "S7"],
  ].forEach(([range, topLeft]) => {
    tryMerge(ws, range);
    center(ws, topLeft);
  });

  const THIN = { style: 'thin', color: { argb: 'FF000000' } };
  const patchBorder = (addr, side) => {
    const cell = ws.getCell(addr);
    cell.border = { ...(cell.border || {}), [side]: THIN };
  };
  patchBorder('S7', 'right');
  patchBorder('S8', 'right');
  patchBorder('U9', 'right');
  patchBorder('V7', 'left');

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

  ws.getCell("G9").value = "Male";   ws.getCell("H9").value = "Female";   ws.getCell("I9").value = "Total";
  ws.getCell("J9").value = "Male";   ws.getCell("K9").value = "Female";   ws.getCell("L9").value = "Total";
  ws.getCell("M9").value = "Male";   ws.getCell("N9").value = "Female";   ws.getCell("O9").value = "Total";
  ws.getCell("P9").value = "Male";   ws.getCell("Q9").value = "Female";   ws.getCell("R9").value = "Total";
  ws.getCell("S9").value = "Male";   ws.getCell("T9").value = "Female";   ws.getCell("U9").value = "Total";
  ["G9","H9","I9","J9","K9","L9","M9","N9","O9","P9","Q9","R9","S9","T9","U9"].forEach(addr => center(ws, addr));

  const COL = {
    barangay: 1, ecSite: 2, family: 3, male: 4, female: 5, total: 6,
    infM: 7, infF: 8, infT: 9,
    chM: 10, chF: 11, chT: 12,
    yoM: 13, yoF: 14, yoT: 15,
    adM: 16, adF: 17, adT: 18,
    seM: 19, seF: 20, seT: 21,
    pwd: 22, preg: 23, lact: 24,
  };

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

    const allNames = (normalizeECNamesIndexLocal(ecNamesByBarangay).get(bname) || []);
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
  sqlRows = null,
  regs = [],
  disasterName = '',
  asOf,
  vulnMap,
  barangayMap,
  fields,
  ecNamesByBarangay = {}
}) {
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
  lines.push(row([`as of ${new Date(asOf).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`]));
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

    lines.push(row(COLS.map(c => (c.key === 'barangay' ? 'TOTAL' : (c.key === 'ec' ? '-----' : totals[c.key])))));
    return Buffer.from('\uFEFF' + lines.join('\n'), 'utf8');
  }

  return Buffer.from('\uFEFF' + lines.join('\n'), 'utf8');
}

module.exports = {
  buildDisaggregatedXLSX,
  buildDisaggregatedCSV,
};
