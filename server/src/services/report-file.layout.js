// server/src/services/report-file.layout.js
function applyDisaggColumnLayout(ws) {
  ws.getColumn('A').width = 45; // Barangay
  ws.getColumn('B').width = 90; // Evacuation Center/Site

  ws.getColumn('C').width = 10;  // Family
  ws.getColumn('D').width = 10;  // Total No. of Male
  ws.getColumn('E').width = 10;  // Total No. of Female
  ws.getColumn('F').width = 14;  // Total No. of Individuals

  for (let c = 7; c <= 24; c++) ws.getColumn(c).width = 10;

  for (let idx = 3; idx <= 24; idx++) {
    ws.getColumn(idx).alignment = { horizontal: 'center' };
  }

  for (let r = 7; r <= 9; r++) {
    for (let c = 1; c <= 24; c++) {
      const cell = ws.getCell(r, c);
      cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: 'middle' };
    }
  }

  ws.getRow(7).height = 30;
  ws.getRow(8).height = 22;
  ws.getRow(9).height = 20;

  ws.views = [{ state: 'frozen', ySplit: 9, zoomScale: 90 }];
}

function applyAggregatedColumnLayout(
  ws,
  {
    nameWidth = 90,
    addrWidth = 45,
    originWidth = 45,
    numWidth = 10,
    headerRows = [8, 9],
    freezeAtRow = 10,
  } = {}
) {
  ws.getColumn('A').width = nameWidth;
  ws.getColumn('B').width = addrWidth;
  ws.getColumn('C').width = originWidth;

  for (let c = 4; c <= 11; c++) {
    ws.getColumn(c).width = numWidth;
    ws.getColumn(c).alignment = { horizontal: 'center' };
  }

  for (const r of headerRows) {
    for (let c = 1; c <= 11; c++) {
      const cell = ws.getCell(r, c);
      cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: 'middle' };
    }
  }
  ws.getRow(headerRows[0]).height = 28;
  ws.getRow(headerRows[1]).height = 22;

  ws.views = [{ state: 'frozen', ySplit: freezeAtRow, zoomScale: 90 }];
}

function applyPerBarangayColumnLayout(ws) {
  ws.getColumn('A').width = 50; // Evacuation Center/Site
  ws.getColumn('B').width = 30; // Family Head - Name

  ws.getColumn('C').width = 10; // Sex
  ws.getColumn('D').width = 10; // Purok
  ws.getColumn('E').width = 10; // Total No. of Male
  ws.getColumn('F').width = 10; // Total No. of Female
  ws.getColumn('G').width = 14; // Total No. of Individuals

  for (let c = 8; c <= 22; c++) ws.getColumn(c).width = 10;

  ws.getColumn('W').width = 10; // PWD
  ws.getColumn('X').width = 10; // Pregnant Women
  ws.getColumn('Y').width = 10; // Lactating Women
  ws.getColumn('Z').width = 55; // Relief Services

  for (let idx = 3; idx <= 26; idx++) {
    ws.getColumn(idx).alignment = { horizontal: 'center' };
  }

  for (let r = 8; r <= 10; r++) {
    for (let c = 1; c <= 26; c++) {
      const cell = ws.getCell(r, c);
      cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: 'middle' };
    }
  }

  ws.getRow(8).height = 30;
  ws.getRow(9).height = 22;
  ws.getRow(10).height = 20;
  ws.views = [{ state: 'frozen', ySplit: 10, zoomScale: 90 }];
}

module.exports = {
  applyDisaggColumnLayout,
  applyAggregatedColumnLayout,
  applyPerBarangayColumnLayout,
};
