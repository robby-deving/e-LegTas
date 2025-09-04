// src/pages/PrintReport.tsx
import React, { useMemo } from 'react';
import AggregatedReport from '@/components/report-templates/AggregatedReport';
import DisaggregatedReport from '@/components/report-templates/DisaggregatedReport';
import BarangayReport from '@/components/report-templates/BarangayReport';
import '@/styles/print.css'; // ← keep this

declare global {
  interface Window { __PRINT_PROPS?: any; }
}

function decodeProps(): any {
  const url = new URL(window.location.href);
  const b64 = url.searchParams.get('props');
  if (b64) { try { return JSON.parse(atob(b64)); } catch {} }
  if (window.__PRINT_PROPS) return window.__PRINT_PROPS;
  try { const ss = sessionStorage.getItem('print:props'); if (ss) return JSON.parse(ss); } catch {}
  return {};
}

export default function PrintReport() {
  const url = new URL(window.location.href);
  const t = url.searchParams.get('t') || '';
  const props = useMemo(() => decodeProps(), []);

  React.useEffect(() => {
    console.log('[PrintReport] window.location.href =', window.location.href);
    let el = document.getElementById('print-ready');
    if (!el) { el = document.createElement('div'); el.id = 'print-ready'; document.body.appendChild(el); }
  }, []);

  let content: React.ReactNode = <div style={{ padding: 16 }}>Unknown template</div>;
  if (t === 'aggregated') content = <AggregatedReport {...props} />;
  if (t === 'disaggregated') content = <DisaggregatedReport {...props} />;
  if (t === 'barangay') content = <BarangayReport {...props} />;

  return <>{content}</>;
}
