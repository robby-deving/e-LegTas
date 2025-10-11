// server/src/services/report-file.service.js
const {
  FILE_BASENAME,
} = require('./report-file.utils');

const {
  buildAggregatedStatusCSV,
  buildAggregatedStatusXLSX,
} = require('./report-file.aggregated');

const {
  buildDisaggregatedXLSX,
  buildDisaggregatedCSV,
} = require('./report-file.disaggregated');

const {
  buildPerBarangayXLSX,
  buildPerBarangayCSV,
} = require('./report-file.per-barangay');

class NotImplementedError extends Error {}

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
