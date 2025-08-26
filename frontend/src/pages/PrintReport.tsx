// src/pages/PrintReport.tsx
import React, { useMemo } from 'react';
import AggregatedReport from '@/components/report-templates/AggregatedReport';
import DisaggregatedReport from '@/components/report-templates/DisaggregatedReport';
import BarangayReport from '@/components/report-templates/BarangayReport';

function decodeProps(): any {
  const url = new URL(window.location.href);
  const b64 = url.searchParams.get('props') || '';
  try {
    return JSON.parse(atob(b64));
  } catch {
    return {};
  }
}

export default function PrintReport() {
  const url = new URL(window.location.href);
  const t = url.searchParams.get('t') || '';
  const props = useMemo(() => decodeProps(), []);

  React.useEffect(() => {
    let el = document.getElementById('print-ready');
    if (!el) {
      el = document.createElement('div');
      el.id = 'print-ready';
      document.body.appendChild(el);
    }
  }, []);

  if (t === 'aggregated') return <AggregatedReport {...props} />;
  if (t === 'disaggregated') return <DisaggregatedReport {...props} />;
  if (t === 'barangay') return <BarangayReport {...props} />;

  return <div style={{ padding: 16 }}>Unknown template</div>;
}
