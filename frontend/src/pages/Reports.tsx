// Reports.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { usePageTitle } from '../hooks/usePageTitle';
import CreateReportModal from '@/components/modals/CreateReportModal';
import { Button } from "../components/ui/button";
import { Dialog, DialogTrigger } from "../components/ui/dialog";
import { Plus } from "lucide-react";
import ReportCard from '@/components/cards/ReportCard';
import DeleteReportModal from '@/components/modals/DeleteReportModal';

type FileIcon = 'PDF' | 'CSV' | 'XLSX';

type CardReport = {
  id: string;
  name: string;
  type: string;
  disaster: string;
  format: FileIcon;
  date: string;
  size: string;
  icon: FileIcon;
  publicUrl?: string | null;
};

type ApiReport = {
  id: number | string;
  report_name: string;
  report_type: string;
  file_format: FileIcon;
  disaster_name: string | null;
  as_of?: string | null;
  file_size_human?: string | null;
  public_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ReportTypeOption = { id: number; label: string; raw: string; pretty: string };
type BarangayOptionAPI = { id: number; name: string };
type DisasterOption = { id: number; name: string };

type BarangayForModal = { id: string; name: string };
type IdName = { id: string; name: string };

type ApiResponse<T> = { message: string; data: T };

// -------------------------
const API_BASE = 'http://localhost:3000/api/v1';
const FILE_FORMATS: FileIcon[] = ['PDF', 'CSV', 'XLSX'];
const DEFAULT_GENERATOR_USER_ID = 2; // <— hard default
// -------------------------

const CURRENT_USER_KEY = 'auth:user';

function readCurrentUserIdFromLocalStorage(): number | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    const id = Number(obj?.id ?? obj?.user_id ?? obj?.user?.id);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

const toLocalDateTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  }).format(d);
};

const coerceIcon = (fmt: string): FileIcon =>
  fmt === 'PDF' ? 'PDF' : fmt === 'XLSX' ? 'XLSX' : 'CSV';

const toISOFromDateAndTime = (date?: Date, time?: string) => {
  const base = date ? new Date(date) : new Date();
  const [hh, mm] = (time || '00:00').split(':').map((n) => Number(n));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return base.toISOString();
  base.setHours(hh, mm, 0, 0);
  return base.toISOString();
};

export default function Reports() {
  usePageTitle('Reports');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('');
  const [disasterEvent, setDisasterEvent] = useState(''); // name to submit
  const [fileFormat, setFileFormat] = useState<FileIcon>('CSV');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<string>('12:00');

  // current user id (optional; we’ll fallback to 2)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Barangay search state
  const [barangayQuery, setBarangayQuery] = useState('');
  const [barangayResults, setBarangayResultsState] = useState<BarangayForModal[]>([]);
  const [selectedBarangay, setSelectedBarangay] = useState<{ id: string; name: string } | null>(null);

  // Disaster search state
  const [disasterQuery, setDisasterQuery] = useState('');
  const [disasterResults, setDisasterResultsState] = useState<IdName[]>([]);
  const [selectedDisaster, setSelectedDisaster] = useState<IdName | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isLoadingList, setIsLoadingList] = useState<boolean>(false);

  const [reports, setReports] = useState<CardReport[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CardReport | null>(null);

  const [reportTypeOptions, setReportTypeOptions] = useState<ReportTypeOption[]>([]);

  const [typeNameToId, setTypeNameToId] = useState<Map<string, number>>(new Map());
  const [disasterNameToId, setDisasterNameToId] = useState<Map<string, number>>(new Map());

  // resolve current user id on mount (optional; we can still fall back to 2)
  useEffect(() => {
    const local = readCurrentUserIdFromLocalStorage();
    if (local) {
      setCurrentUserId(local);
      return;
    }
    axios
      .get<ApiResponse<{ id: number }>>(`${API_BASE}/auth/me`, { withCredentials: true })
      .then((r) => {
        const id = Number(r?.data?.data?.id);
        if (Number.isFinite(id)) setCurrentUserId(id);
      })
      .catch(() => {
        setCurrentUserId(null);
      });
  }, []);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!reportName.trim()) errors.reportName = 'Report name is required.';
    if (!reportType) errors.reportType = 'Report type is required.';
    if (reportType === 'Barangay Report' && !selectedBarangay) {
      errors.barangay = 'Please select a barangay.';
    }
    if (!disasterEvent) errors.disasterEvent = 'Please select a disaster event.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchReports = async () => {
    setIsLoadingList(true);
    try {
      const res = await axios.get<ApiResponse<ApiReport[]>>(`${API_BASE}/reports/getAllReports`, { withCredentials: true });
      const list = (res.data.data || []).map<CardReport>((r) => {
        const icon = coerceIcon(r.file_format);
        return {
          id: String(r.id),
          name: r.report_name,
          type: r.report_type,
          disaster: r.disaster_name || '—',
          format: icon,
          date: toLocalDateTime(r.as_of) || toLocalDateTime(r.created_at) || '',
          size: r.file_size_human || '',
          icon,
          publicUrl: r.public_url || null
        };
      });
      setReports(list);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setReports([]);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const loadOptions = async (barangaySearch = '', disasterSearch = '') => {
    try {
      const res = await axios.get<ApiResponse<{
        report_types: Array<{ id: number; report_type: string; pretty: string }>;
        barangays: BarangayOptionAPI[];
        disasters: DisasterOption[];
      }>>(`${API_BASE}/reports/options`, {
        params: {
          search: barangaySearch,
          disaster_search: disasterSearch,
          barangay_limit: 70,
          disaster_limit: 200,
          status: 'all',
        },
        withCredentials: true,
      });

      const data = res.data.data;

      const typeOpts: ReportTypeOption[] = (data.report_types || []).map((t) => {
        const label = t.pretty === 'Per Barangay' ? 'Barangay Report' : t.pretty;
        return { id: t.id, label, raw: t.report_type, pretty: t.pretty };
      });
      setReportTypeOptions(typeOpts);

      const brgysForModal: BarangayForModal[] = (data.barangays || []).map((b) => ({
        id: String(b.id),
        name: b.name,
      }));
      setBarangayResultsState(brgysForModal);

      const disasters = (data.disasters || []);
      const disResults: IdName[] = disasterSearch
        ? disasters.map(d => ({ id: String(d.id), name: d.name }))
        : [];
      setDisasterResultsState(disResults);

      setTypeNameToId(new Map(typeOpts.map(t => [t.label, t.id])));
      setDisasterNameToId(new Map(disasters.map(d => [d.name, d.id])));
    } catch (err) {
      console.error('Failed to load report options:', err);
    }
  };

  useEffect(() => {
    if (createModalOpen) loadOptions('', '');
  }, [createModalOpen]);

  useEffect(() => {
    if (!createModalOpen) return;
    if (reportType !== 'Barangay Report') return;
    loadOptions(barangayQuery, disasterQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barangayQuery, reportType, createModalOpen]);

  useEffect(() => {
    if (!createModalOpen) return;
    loadOptions(barangayQuery, disasterQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disasterQuery, createModalOpen]);

  /* ----- Card adapters ----- */
  const onCardDownload = (r: any) => {
    const pubUrl: string | null = r.publicUrl ?? r.public_url ?? r.publicURL ?? null;
    if (pubUrl) {
      const a = document.createElement('a');
      a.href = pubUrl;
      a.target = '_blank';
      a.setAttribute('download', '');
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    alert('No file available for download. Please regenerate the report.');
  };

  const onCardDelete = (r: any) => {
    const normalized: CardReport = {
      id: String(r.id),
      name: String(r.name ?? r.report_name ?? ''),
      type: String(r.type ?? r.report_type ?? ''),
      disaster: String(r.disaster ?? r.disaster_name ?? '—'),
      format: coerceIcon(String(r.format ?? r.file_format ?? 'CSV')),
      date: String(r.date ?? ''),
      size: String(r.size ?? r.file_size_human ?? ''),
      icon: coerceIcon(String(r.icon ?? r.format ?? r.file_format ?? 'CSV')),
      publicUrl: r.publicUrl ?? r.public_url ?? null,
    };
    setPendingDelete(normalized);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await axios.delete(`${API_BASE}/reports/${pendingDelete.id}`, { withCredentials: true });
      setConfirmOpen(false);
      setPendingDelete(null);
      await fetchReports();
    } catch (err) {
      console.error('Failed to delete report:', err);
      alert('Failed to delete report.');
    }
  };

  // Create via backend
  const handleCreateReport = async () => {
    if (!validateForm()) return;

    try {
      setIsCreating(true);

      const typeId = typeNameToId.get(reportType);
      if (!typeId) throw new Error('Unknown report type.');

      const disasterId = disasterNameToId.get(disasterEvent);
      if (!disasterId) throw new Error('Unknown disaster.');

      const as_of = toISOFromDateAndTime(date, time);

      // Use logged-in id if available, else default to 2
      const generatorId = currentUserId ?? DEFAULT_GENERATOR_USER_ID;

      const payload: any = {
        report_name: reportName,
        report_type_id: typeId,
        disaster_id: disasterId,
        as_of,
        file_format: fileFormat,
        generated_by_user_id: generatorId, // <-- fallback to 2 if needed
      };

      if (reportType === 'Barangay Report') {
        const bId = selectedBarangay?.id ? Number(selectedBarangay.id) : NaN;
        if (!Number.isInteger(bId)) throw new Error('Please select a barangay.');
        payload.barangay_id = bId;
      }

      const res = await axios.post<ApiResponse<any>>(`${API_BASE}/reports/generate`, payload, { withCredentials: true });
      const pubUrl: string | undefined = res.data?.data?.public_url;

      if (pubUrl) {
        const a = document.createElement('a');
        a.href = pubUrl;
        a.target = '_blank';
        a.setAttribute('download', '');
        document.body.appendChild(a);
        a.click();
        a.remove();
      }

      await fetchReports();

      setReportName('');
      setReportType('');
      setDisasterEvent('');
      setSelectedDisaster(null);
      setDisasterQuery('');
      setDate(undefined);
      setTime('12:00');
      setFileFormat('CSV');
      setBarangayQuery('');
      setSelectedBarangay(null);
      setFormErrors({});
      setCreateModalOpen(false);
    } catch (err) {
      console.error('Failed to generate report:', err);
      alert('Failed to generate report.');
    } finally {
      setIsCreating(false);
    }
  };

  const reportTypeLabels = reportTypeOptions.map((t) => t.label);

  return (
    <div className="text-black p-6 space-y-6">
      {/* ... UI unchanged ... */}
      <div className="flex justify-start">
        <h1 className="text-3xl font-bold text-green-800">Reports</h1>
      </div>
      <div className="flex justify-end">
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-700 hover:bg-green-800 text-white px-6 cursor-pointer">
              <Plus className="w-4 h-4" />
              Create Report
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* ... cards + modal props unchanged ... */}
      <div>
        <h2 className="text-lg font-bold text-green-700 mb-4">Generated Reports</h2>
        {isLoadingList ? (
          <div className="text-gray-500 py-8 text-center">Loading…</div>
        ) : reports.length === 0 ? (
          <div className="text-gray-400 py-8 text-center">No reports available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onDownload={onCardDownload}
                onDelete={onCardDelete}
              />
            ))}
          </div>
        )}
      </div>

      <CreateReportModal
        isOpen={createModalOpen}
        onOpenChange={setCreateModalOpen}
        reportName={reportName}
        setReportName={setReportName}
        reportType={reportType}
        setReportType={setReportType}
        disasterEvent={disasterEvent}
        setDisasterEvent={setDisasterEvent}
        fileFormat={fileFormat}
        setFileFormat={(v: string) => setFileFormat(v as FileIcon)}
        evacuationQuery=""
        setEvacuationQuery={() => {}}
        evacuationResults={[]}
        setEvacuationResults={() => {}}
        selectedCenter={null}
        setSelectedCenter={() => {}}
        barangayQuery={barangayQuery}
        setBarangayQuery={setBarangayQuery}
        barangayResults={barangayResults}
        setBarangayResults={(arr) => setBarangayResultsState(arr)}
        selectedBarangay={selectedBarangay}
        setSelectedBarangay={setSelectedBarangay}
        disasterQuery={disasterQuery}
        setDisasterQuery={setDisasterQuery}
        disasterResults={disasterResults}
        setDisasterResults={(rows) => setDisasterResultsState(rows)}
        selectedDisaster={selectedDisaster}
        setSelectedDisaster={setSelectedDisaster}
        formErrors={formErrors}
        isCreating={isCreating}
        onCreate={handleCreateReport}
        reportTypes={reportTypeLabels}
        fileFormats={FILE_FORMATS}
        date={date}
        setDate={setDate}
        time={time}
        setTime={setTime}
        clearFormError={(key) => {
          const next = { ...formErrors };
          delete next[key];
          setFormErrors(next);
        }}
      />

      <DeleteReportModal
        isOpen={confirmOpen}
        onOpenChange={(open) => { setConfirmOpen(open); if (!open) setPendingDelete(null); }}
        reportName={pendingDelete?.name}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
