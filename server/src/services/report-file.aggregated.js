// server/src/services/report-file.aggregated.js
const ExcelJS = require('exceljs');
const path = require('path');

const {
  isPrivateHouseCategory,
  SLUG,
  FILE_BASENAME,
  escapeCSV,
  row,
  formatAsOf,
  normalizeBarangayLabel,
  normalizeECNamesIndex,
  barangayRankOf,
  resolveBarangayLabel,
  asBarangayName,
  parseMaybeJSON,
} = require('./report-file.utils');

const { applyAggregatedColumnLayout } = require('./report-file.layout');

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

  const lines = [];
  lines.push(row(['LEGAZPI CITY']));
  lines.push(row([`Status Report on ${disasterName || '—'}`]));
  lines.push(row([`as of ${formatAsOf(asOf)}`]));
  lines.push('');

  lines.push(row(cols.map(c => c.group ? 'Number of Displaced' : c.header)));
  lines.push(row(cols.map(c => c.group || '')));
  lines.push(row(cols.map(c => c.group ? c.header : '')));

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

  const totalRow = cols.map(c => {
    if (!c.group) return c.key === 'name' ? 'TOTAL' : '';
    return String(totals[c.key] ?? '');
  });
  lines.push(row(totalRow));

  return Buffer.from('\uFEFF' + lines.join('\n'), 'utf8');
}

/* ------------------ Aggregated (XLSX via template) ------------------ */
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
  const ecIndex = normalizeECNamesIndex(ecNamesByBarangay);

  const want = {
    nameOfCenter: fields?.nameOfCenter ?? true,
    address: fields?.address ?? true,
    origin: fields?.origin ?? true,

    insideFamilies: fields?.displaced?.inside?.families ?? true,
    insideMale: fields?.displaced?.inside?.persons?.male ?? false,
    insideFemale: fields?.displaced?.inside?.persons?.female ?? false,
    insideTotal:
      (fields?.displaced?.inside?.persons?.total ?? null) ??
      (!fields?.displaced?.inside?.persons ? true : false),

    outsideFamilies: fields?.displaced?.outside?.families ?? false,
    outsideMale: fields?.displaced?.outside?.persons?.male ?? false,
    outsideFemale: fields?.displaced?.outside?.persons?.female ?? false,
    outsideTotal: fields?.displaced?.outside?.persons?.total ?? false,
  };

  const anyInside =
    want.insideFamilies || want.insideMale || want.insideFemale || want.insideTotal;
  const anyOutside =
    want.outsideFamilies || want.outsideMale || want.outsideFemale || want.outsideTotal;

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

  const byBgy = new Map();

  for (const r of regs) {
    const ecRoom = r?.evacuation_center_rooms || null;
    const ec = ecRoom?.evacuation_centers || null;

    const ecId = ec?.id ?? null;
    const ecName = (ec?.name ?? "").toString().trim();
    const ecCategory = ec?.category ?? null;
    const ecIsPrivateHouse = isPrivateHouseCategory(ecCategory);

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
        ecNamesSeen: new Set(),
        hasAnyEC: false,
        originNames: new Set(),

        insideFamiliesKeys: new Set(),
        insideMale: 0,
        insideFemale: 0,

        outsideFamiliesKeys: new Set(),
        outsideMale: 0,
        outsideFemale: 0,
      });
    }

    const bucket = byBgy.get(rowBarangay);

    if (ecId) {
      bucket.hasAnyEC = true;
      if (ecName) bucket.ecNamesSeen.add(ecName);
    }

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

    if (originFinal) bucket.originNames.add(originFinal);
  }

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

  ws.getCell("A4").value = `STATUS REPORT FOR ${(disasterName || "").toUpperCase()}`;
  ws.getCell("A5").value = `as of ${formatAsOf(asOf)}`;

  const START = 11;
  for (let r = START; r < START + 2000; r++) {
    for (let c = 1; c <= 11; c++) ws.getCell(r, c).value = null;
  }

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

      const authoritative = ecIndex.get(g.barangay) || [];
      const allNames = new Set([
        ...Array.from(g.ecNamesSeen),
        ...authoritative,
      ]);
      const nameJoined = Array.from(allNames).sort((a, b) => a.localeCompare(b)).join(", ");

      const addressStr = g.barangay || "";
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

module.exports = {
  buildAggregatedStatusCSV,
  buildAggregatedStatusXLSX,
};
