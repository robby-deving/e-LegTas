// Reports.tsx 
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { usePageTitle } from '../hooks/usePageTitle';
import CreateReportModal from '@/components/modals/CreateReportModal';
import { Button } from "../components/ui/button";
import { Dialog, DialogTrigger } from "../components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../components/ui/dropdown-menu";
import { Plus, Filter } from "lucide-react";
import ReportCard from '@/components/cards/ReportCard';
import DeleteReportModal from '@/components/modals/DeleteReportModal';
import MonthYearGridPicker from '@/components/Disasters/MonthYearGridPicker'; 
import { Input } from "../components/ui/input";

// Types 
type FileIcon = 'PDF' | 'CSV' | 'XLSX';

type CardReport = {
  id: string;
  name: string;
  type: string; 
  disaster: string;
  format: FileIcon;
  date: string; 
  asOfISO?: string; 
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

// Utils
async function forceDownload(url: string, fallbackName = 'report') {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  let filename = fallbackName;
  const cd = res.headers.get('content-disposition');
  if (cd) {
    const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
    if (m) filename = decodeURIComponent(m[1]);
  } else {
    const u = new URL(url);
    filename = u.pathname.split('/').pop() || filename;
  }
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

const API_BASE = 'http://localhost:3000/api/v1';
const FILE_FORMATS: FileIcon[] = ['PDF', 'CSV', 'XLSX'];
const DEFAULT_GENERATOR_USER_ID = 2; // dev user_CDRRMO AND CAMP MANAGER CAN MAKE A REPORT

// Persistent filter storage keys
const STORAGE_KEYS = { type: 'reports.typeFilter', year: 'reports.year', month: 'reports.month' } as const;

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

const monthName = (m: number) => new Date(2000, m, 1).toLocaleString(undefined, { month: 'long' });
const monthLabel = (m: number | null) => {
  if (m == null) return 'all months';
  if (m >= 0 && m <= 11) return monthName(m);
  if (m >= 1 && m <= 12) return monthName(m - 1);
  return 'all months';
};

const asUIType = (label: string): 'Aggregated' | 'Disaggregated' | 'Barangay Report' | string =>
  label === 'Per Barangay' ? 'Barangay Report' : label;

const toISOFromDateAndTime = (date?: Date, time?: string) => {
  const base = date ? new Date(date) : new Date();
  const [hh, mm] = (time || '00:00').split(':').map((n) => Number(n));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return base.toISOString();
  base.setHours(hh, mm, 0, 0);
  return base.toISOString();
};

// Component
export default function Reports() {
  usePageTitle('Reports');

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Create form state
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('');
  const [disasterEvent, setDisasterEvent] = useState('');
  const [fileFormat, setFileFormat] = useState<FileIcon>('CSV');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<string>('12:00');

  // Barangay search state (for Barangay Report generation)
  const [barangayQuery, setBarangayQuery] = useState('');
  const [barangayResults, setBarangayResultsState] = useState<BarangayForModal[]>([]);
  const [selectedBarangay, setSelectedBarangay] = useState<{ id: string; name: string } | null>(null);

  // Disaster search state (for generation)
  const [disasterQuery, setDisasterQuery] = useState('');
  const [disasterResults, setDisasterResultsState] = useState<IdName[]>([]);
  const [selectedDisaster, setSelectedDisaster] = useState<IdName | null>(null);

  const [searchTerm, setSearchTerm] = useState('');


  // Page data state
  const [isCreating, setIsCreating] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [reports, setReports] = useState<CardReport[]>([]);

  // Delete state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CardReport | null>(null);

  // Options & mappings
  const [reportTypeOptions, setReportTypeOptions] = useState<ReportTypeOption[]>([]);
  const [typeNameToId, setTypeNameToId] = useState<Map<string, number>>(new Map());
  const [disasterNameToId, setDisasterNameToId] = useState<Map<string, number>>(new Map());

  // Filters 
  const REPORT_TYPE_FILTERS = ['All', 'Aggregated', 'Disaggregated', 'Barangay Report'] as const;
  type ReportTypeFilter = typeof REPORT_TYPE_FILTERS[number];
  const [typeFilter, setTypeFilter] = useState<ReportTypeFilter>('All');
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number | null>(null);

  // Hydrate filters from localStorage
  useEffect(() => {
    try {
      const t = localStorage.getItem(STORAGE_KEYS.type);
      if (t && (['All','Aggregated','Disaggregated','Barangay Report'] as const).includes(t as any)) {
        setTypeFilter(t as ReportTypeFilter);
      }
      const y = localStorage.getItem(STORAGE_KEYS.year);
      if (y != null) {
        const ny = Number(y);
        if (Number.isFinite(ny)) setYear(ny);
      }
      const m = localStorage.getItem(STORAGE_KEYS.month);
      if (m != null) {
        if (m === 'null') setMonth(null);
        else {
          const nm = Number(m);
          if (Number.isFinite(nm)) setMonth(nm);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.type, typeFilter);
      localStorage.setItem(STORAGE_KEYS.year, String(year));
      localStorage.setItem(STORAGE_KEYS.month, String(month));
    } catch {}
  }, [typeFilter, year, month]); // null = whole year

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!reportName.trim()) errors.reportName = 'Report name is required.';
    if (!reportType) errors.reportType = 'Report type is required.';
    if (reportType === 'Barangay Report' && !selectedBarangay) errors.barangay = 'Please select a barangay.';
    if (!disasterEvent) errors.disasterEvent = 'Please select a disaster event.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchReports = async () => {
    setIsLoadingList(true);
    try {
      const params: Record<string, any> = {}; 
      const res = await axios.get<ApiResponse<ApiReport[]>>(
        `${API_BASE}/reports/getAllReports`,
        { params, withCredentials: true }
      );

      const list = (res.data.data || []).map<CardReport>((r) => {
        const icon = coerceIcon(r.file_format);
        const asOfISO = r.as_of || r.created_at || '';
        return {
          id: String(r.id),
          name: r.report_name,
          type: asUIType(r.report_type),
          disaster: r.disaster_name || '—',
          format: icon,
          date: toLocalDateTime(asOfISO),
          asOfISO,
          size: r.file_size_human || '',
          icon,
          publicUrl: r.public_url || null,
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
    (async () => {
      try { await loadOptions('', ''); } catch {}
      await fetchReports();
    })();
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
      setTypeNameToId(new Map(typeOpts.map(t => [t.label, t.id])));

      const brgysForModal: BarangayForModal[] = (data.barangays || []).map((b) => ({ id: String(b.id), name: b.name }));
      setBarangayResultsState(brgysForModal);

      const disasters = (data.disasters || []);
      const disResults: IdName[] = disasterSearch ? disasters.map(d => ({ id: String(d.id), name: d.name })) : [];
      setDisasterResultsState(disResults);

      setDisasterNameToId(new Map(disasters.map(d => [d.name, d.id])));
    } catch (err) {
      console.error('Failed to load report options:', err);
    }
  };

  useEffect(() => {
    if (!createModalOpen) {
      setIsCreating(false);
    } else {
      setFormErrors({});
    }
  }, [createModalOpen]);

  useEffect(() => {
    if (!createModalOpen) return;
    if (reportType !== 'Barangay Report') return;
    loadOptions(barangayQuery, disasterQuery);
  }, [barangayQuery, reportType, createModalOpen]);

  useEffect(() => {
    if (!createModalOpen) return;
    loadOptions(barangayQuery, disasterQuery);
  }, [disasterQuery, createModalOpen]);

  /* Card adapters */
  const onCardDownload = async (r: any) => {
    const pubUrl: string | null = r.publicUrl ?? r.public_url ?? r.publicURL ?? null;
    if (pubUrl) {
      try { await forceDownload(pubUrl); } catch (e) { console.error(e); alert('Failed to download file.'); }
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
      asOfISO: String(r.asOfISO ?? r.as_of ?? r.created_at ?? ''),
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
      const generatorId = DEFAULT_GENERATOR_USER_ID;
      const payload: any = {
        report_name: reportName,
        report_type_id: typeId,
        disaster_id: disasterId,
        as_of,
        file_format: fileFormat,
        generated_by_user_id: generatorId,
      };
      if (reportType === 'Barangay Report') {
        const bId = selectedBarangay?.id ? Number(selectedBarangay.id) : NaN;
        if (!Number.isInteger(bId)) throw new Error('Please select a barangay.');
        payload.barangay_id = bId;
      }
      const res = await axios.post<ApiResponse<any>>(`${API_BASE}/reports/generate`, payload, { withCredentials: true });
      const pubUrl: string | undefined = res.data?.data?.public_url;
      if (pubUrl) {
        try { await forceDownload(pubUrl); } catch (e) { console.error(e); alert('Failed to download file.'); }
      }
      await fetchReports();
      setReportName(''); setReportType(''); setDisasterEvent(''); setSelectedDisaster(null);
      setDisasterQuery(''); setDate(undefined); setTime('12:00'); setFileFormat('CSV');
      setBarangayQuery(''); setSelectedBarangay(null); setFormErrors({}); setCreateModalOpen(false);
  } catch (err: any) {
    console.error('Failed to generate report:', err);
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      'Failed to generate report.';
    alert(msg);
  } finally {
    setIsCreating(false);
  }
};

  // ------------------------- Derived: date & type filtering -------------------------
  const dateFilteredReports = useMemo(() => {
    if (!reports || !reports.length) return [] as CardReport[];
    return reports.filter(r => {
      const iso = r.asOfISO || '';
      if (!iso) return false;
      const d = new Date(iso);
      if (isNaN(d.getTime())) return false;
      if (d.getFullYear() !== year) return false;
      if (month == null) return true;
      const m = Number(month);
      if (!Number.isFinite(m)) return true;
      if (m >= 0 && m <= 11) return d.getMonth() === m;       
      if (m >= 1 && m <= 12) return d.getMonth() + 1 === m;   
      return true;
    });
  }, [reports, year, month]);

const filteredReports = useMemo(() => {
  // type + date first
  const base =
    typeFilter === 'All'
      ? dateFilteredReports
      : dateFilteredReports.filter(r => r.type === typeFilter);

  // search next
  const q = searchTerm.trim().toLowerCase();
  if (!q) return base;

  return base.filter((r) =>
    [
      r.name,
      r.disaster,
      r.type,
      String(r.format),
      r.date,
    ]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  );
}, [dateFilteredReports, typeFilter, searchTerm]);


  const typeCounts = useMemo(() => {
    const base: Record<ReportTypeFilter, number> = { All: 0, Aggregated: 0, Disaggregated: 0, 'Barangay Report': 0 };
    for (const r of dateFilteredReports) {
      if (r.type === 'Aggregated' || r.type === 'Disaggregated' || r.type === 'Barangay Report') {
        base[r.type as Exclude<ReportTypeFilter,'All'>] += 1;
      }
    }
    base.All = dateFilteredReports.length;
    return base;
  }, [dateFilteredReports]);

  const reportTypeLabels = reportTypeOptions.map((t) => t.label); reportTypeOptions.map((t) => t.label);

  // ------------------------- Render -------------------------
  return (
    <div className="text-black p-6 space-y-6">
      {/* Header */}
       <div className="flex justify-start">
        <h1 className="text-3xl font-bold text-green-800">Reports</h1>
        </div>
         <div className="flex justify-end items-center gap-2 md:gap-3">

          {/* Type Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex gap-2 items-center min-w-[150px] cursor-pointer">
                <Filter className="w-4 h-4" />
                {typeFilter === 'All' ? `Report Type (${typeCounts.All ?? 0})` : `${typeFilter} (${typeCounts[typeFilter] ?? 0})`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {REPORT_TYPE_FILTERS.map((type) => (
                <DropdownMenuItem key={type} onClick={() => setTypeFilter(type)}>
                  {type} ({typeCounts[type] ?? 0})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Month / Year Filter */}
          <MonthYearGridPicker
            month={month}
            year={year}
            onMonthYearChange={(m, y) => { setMonth(m); setYear(y); }}
          />

          {/* Create Report */}
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-700 hover:bg-green-800 text-white px-6 cursor-pointer">
                <Plus className="w-4 h-4" />
                Create Report
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>

        {/* List */}
        <div>
          <h2 className="text-lg font-bold text-green-700 mb-4">Generated Reports</h2>
            {/* Search */}
          <div className="w-full max-w-xs mb-4">
            <Input
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          {isLoadingList ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
              <div role="status" aria-live="polite" aria-busy="true">
                <svg
                  aria-hidden="true"
                  className="w-16 h-16 animate-spin text-gray-200 dark:text-gray-700 fill-green-600"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="currentColor"
                  />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentFill"
                  />
                </svg>
                <span className="sr-only">Loading reports…</span>
              </div>
              <p className="text-sm text-gray-600">Loading reports…</p>
            </div>

            
          ) : filteredReports.length === 0 ? (
            <div className="text-gray-400 py-8 text-center">
              No reports for {monthLabel(month)} {year} — Type: {typeFilter}.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredReports.map((report) => (
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
      {/* Create Modal */}
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

      {/* Delete Modal */}
      <DeleteReportModal
        isOpen={confirmOpen}
        onOpenChange={(open) => { setConfirmOpen(open); if (!open) setPendingDelete(null); }}
        reportName={pendingDelete?.name}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
