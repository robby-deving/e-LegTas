// server/src/services/report-file.per-barangay.js
const ExcelJS = require('exceljs');
const path = require('path');

const {
  SLUG,
  escapeCSV,
  row,
  computeAgeYearsAsOfJS,
  buildFullName,
  parseMaybeJSON,
  resolveBarangayLabel,
  normalizeBarangayLabel,
} = require('./report-file.utils');

const { applyPerBarangayColumnLayout } = require('./report-file.layout');

/* ------------------ Per Barangay (XLSX via template) ------------------ */
async function buildPerBarangayXLSX({
  regs = [],
  disasterName = '',
  asOf,
  vulnMap,
  barangayMap,
  barangayId,
  barangayName,
  fields,
  ecNamesByBarangay,
  reliefByFamily,
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
    if (s) {
      if (s.includes('\n')) return s;
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
    return '';
  }

  const families = new Map();
  for (const r of regs) {
    const resident = r?.evacuee_residents?.residents || {};
    const snap = parseMaybeJSON(r?.profile_snapshot, {}) || {};
    const residentJoinName = resident?.barangays?.name || '';
    const originLabel = resolveBarangayLabel(snap.barangay_of_origin, residentJoinName, barangayMap);
    if (originLabel !== TARGET_LABEL) continue;

    // --- Robust canonical family key
    const normId = (id) => {
      const s = String(id ?? '').trim();
      if (!s) return null;
      const n = +s;
      return Number.isFinite(n) ? String(n) : s;
    };

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
    if (!famId && families.has(existingFamForHead)) {
      famKey = existingFamForHead;
    }

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

  const templatePath = path.resolve(__dirname, '../../templates/Barangay.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.getWorksheet('Sheet1') || wb.worksheets[0];

  const tplLogoCols = {
    X: ws.getColumn('X').width,
    Y: ws.getColumn('Y').width,
    Z: ws.getColumn('Z').width,
  };

  const disasterTitle = String(disasterName || '').trim().toUpperCase();
  ws.getCell('N3').value = TARGET_LABEL;
  ws.getCell('N3').alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };

  ws.getCell('A5').value = `EVACUATION DATA FOR  DISASTERS ${disasterTitle || '—'} `;
  ws.getCell('A6').value = `as of ${new Date(asOf).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
  try { ws.mergeCells('N3:Z3'); } catch (_) {}
  const hdrBgy = ws.getCell('N3');
  hdrBgy.value = TARGET_LABEL;
  hdrBgy.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  const START = 11;
  for (let rr = START; rr < START + 3000; rr++) {
    for (let c = 1; c <= 26; c++) ws.getCell(rr, c).value = null;
  }

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
  tryMerge('B8:C8');
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

  applyPerBarangayColumnLayout(ws);
  ws.getColumn('A').alignment = { ...(ws.getColumn('A').alignment || {}), horizontal: 'center', vertical: 'middle', wrapText: true };
  ws.getColumn('B').alignment = { ...(ws.getColumn('B').alignment || {}), horizontal: 'center',   vertical: 'middle', wrapText: true };
  ws.getColumn('C').alignment = { ...(ws.getColumn('C').alignment || {}), horizontal: 'center', vertical: 'middle', wrapText: true };
  ws.getColumn('Z').alignment = { ...(ws.getColumn('Z').alignment || {}), horizontal: 'center',   vertical: 'middle', wrapText: true };

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
    ws.getCell(rowIdx, COL.relief).value   = '---';

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

    const reliefWrapped = wrapRelief(g.reliefText || 'No relief services received', 55);
    const reliefCell = ws.getCell(rowIdx, COL.relief);
    reliefCell.value = reliefWrapped;
    reliefCell.alignment = { ...(reliefCell.alignment || {}), wrapText: true, vertical: 'middle' };

    const lineCount = (reliefWrapped.match(/\n/g)?.length || 0) + 1;
    if (lineCount > 1) {
      ws.getRow(rowIdx).height = Math.min(15 + lineCount * 12, 120);
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
  ws.getCell(rowIdx, COL.relief).value = '---';

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
        if (age >= d.min) f.se++;
      }
    }
    f.t++;

    let ids = r.vulnerability_type_ids;
    if (!Array.isArray(ids)) ids = parseMaybeJSON(ids, []);
    ids = ids.map(x => { const n = Number(x); return Number.isFinite(n) ? n : null; }).filter(n => n != null);

    if (vulnMap?.pwd != null && ids.includes(vulnMap.pwd)) f.pwd++;
    if (vulnMap?.pregnant != null && ids.includes(vulnMap.pregnant)) f.preg++;
    if (vulnMap?.lactating != null && ids.includes(vulnMap.lactating)) f.lact++;

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

  const lines = [];
  lines.push(row(['Republic of the Philippines']));
  lines.push(row(['City Government of Legazpi']));
  lines.push(row([normalizeBarangayLabel(barangayName || '')]));
  lines.push(row([String(disasterName || '').toUpperCase()]));
  lines.push(row([`as of ${new Date(asOf).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`]));
  lines.push('');
  lines.push(row(COLS.map(c => c.hdr)));

  let currentEC = null;
  let totals = { fam:0,m:0,f:0,t:0,inf:0,ch:0,y:0,ad:0,se:0,pwd:0,preg:0,lact:0 };
  let grand  = { fam:0,m:0,f:0,t:0,inf:0,ch:0,y:0,ad:0,se:0,pwd:0,preg:0,lact:0 };

  const flush = () => {
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

  const totalRec = {
    ec:'TOTAL', name: grand.fam, sex:'', purok:'----',
    m:grand.m, f:grand.f, t:grand.t, inf:grand.inf, ch:grand.ch, y:grand.y, ad:grand.ad, se:grand.se,
    pwd:grand.pwd, preg:grand.preg, lact:grand.lact, relief:'---'
  };
  lines.push(row(COLS.map(c => escapeCSV(totalRec[c.key] ?? ''))));

  return Buffer.from('\uFEFF' + lines.join('\n'), 'utf8');
}

module.exports = {
  buildPerBarangayXLSX,
  buildPerBarangayCSV,
};
