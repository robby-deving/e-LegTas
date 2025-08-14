import { useState, useEffect } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "../components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Plus } from "lucide-react";
import ReportCard from '@/components/cards/ReportCard';
import DeleteReportModal from '@/components/modals/DeleteReportModal';

type Report = {
  id: string;
  name: string;
  type: string;
  disaster: string;
  format: string;
  date: string;
  size: string;
  icon: 'PDF' | 'CSV' | 'XLSX';
};

const MOCK_REPORTS: Report[] = [
  {
    id: '1',
    name: 'Kristine',
    type: 'Aggregated',
    disaster: 'Typhoon Kristine',
    format: 'PDF',
    date: 'October 21, 2024',
    size: '10MB',
    icon: 'PDF'
  },
  {
    id: '2',
    name: 'Kristine',
    type: 'Aggregated',
    disaster: 'Typhoon Kristine',
    format: 'CSV',
    date: 'October 21, 2024',
    size: '5MB',
    icon: 'CSV'
  },
  {
    id: '3',
    name: 'Kristine',
    type: 'Aggregated',
    disaster: 'Typhoon Kristine',
    format: 'XLSX',
    date: 'October 21, 2024',
    size: '15MB',
    icon: 'XLSX'
  }
];

const REPORT_TYPES = [
  'Aggregated',
  'Specific Evacuation',
  'Summary',
  'Detailed',
  'Statistical',
  'Emergency Response'
];

const MOCK_CENTERS: { id: string; name: string; barangay?: string; municipality?: string }[] = [
  { id: 'c1', name: 'Brgy. Central Evacuation Center', barangay: 'Central', municipality: 'Sample City' },
  { id: 'c2', name: 'Northside Evacuation Center', barangay: 'Northside', municipality: 'Sample City' },
  { id: 'c3', name: 'Southridge Evacuation Center', barangay: 'Southridge', municipality: 'Sample City' },
  { id: 'c4', name: 'Eastview Evacuation Center', barangay: 'Eastview', municipality: 'Sample Town' },
];

const DISASTER_EVENTS = [
  'Typhoon Kristine',
  'Tropical Storm Fyang',
  'Mayon Volcanic Eruption',
  'Landslide Event',
  'Typhoon Odette',
  'Taal Volcanic Eruption'
];

const FILE_FORMATS = [
  'PDF',
  'CSV',
  'XLSX'
];

export default function Reports() {
  usePageTitle('Reports');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('');
  const [disasterEvent, setDisasterEvent] = useState('');
  const [fileFormat, setFileFormat] = useState('CSV');

  // New states for Specific Evacuation search and selection
  const [evacuationQuery, setEvacuationQuery] = useState('');
  const [evacuationResults, setEvacuationResults] = useState(MOCK_CENTERS);
  const [selectedCenter, setSelectedCenter] = useState<{ id: string; name: string } | null>(null);

  // Loading / error handling
  const [isCreating, setIsCreating] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Reports state (mutable list shown in UI)
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Report | null>(null);

  useEffect(() => {
    if (!evacuationQuery) {
      setEvacuationResults(MOCK_CENTERS);
      return;
    }
    const q = evacuationQuery.toLowerCase();
    setEvacuationResults(MOCK_CENTERS.filter((c) => c.name.toLowerCase().includes(q) || (c.barangay || '').toLowerCase().includes(q)));
  }, [evacuationQuery]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!reportName.trim()) errors.reportName = 'Report name is required.';
    if (!reportType) errors.reportType = 'Report type is required.';
    if (reportType === 'Specific Evacuation') {
      if (!selectedCenter) errors.evacuation = 'Please select an evacuation center.';
    } else {
      if (!disasterEvent) errors.disasterEvent = 'Please select a disaster event.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateCSVContent = (r: Report) => {
    // Simple CSV with basic fields. For demo only.
    const headers = ['Report Name', 'Type', 'Disaster', 'Format', 'Date', 'Size', 'EvacuationCenter'];
    const values = [r.name, r.type, r.disaster, r.format, r.date, r.size, (r as any).evacuationCenter || ''];
    const csv = `${headers.join(',')}\n${values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')}`;
    return csv;
  };

  const generateAndDownloadReport = (r: Report) => {
    try {
      let blob: Blob;
      // Use report name as filename (sanitize to remove unsafe characters)
      const sanitize = (s: string) => s.replace(/[^a-z0-9 _.-]/gi, '').trim().replace(/\s+/g, '_') || 'report';
      const ext = r.format.toLowerCase();
      const filename = `${sanitize(r.name)}.${ext}`;

      if (r.format === 'CSV') {
        const csv = generateCSVContent(r);
        blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      } else if (r.format === 'PDF') {
        // Simple placeholder PDF/text file for demo
        const content = `PDF Report: ${r.name}\nType: ${r.type}\nDisaster: ${r.disaster}`;
        blob = new Blob([content], { type: 'application/pdf' });
      } else if (r.format === 'XLSX') {
        // Placeholder xlsx as csv content; real implementation would use a library
        const csv = generateCSVContent(r);
        blob = new Blob([csv], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      } else {
        const txt = generateCSVContent(r);
        blob = new Blob([txt], { type: 'text/plain' });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to generate download.');
    }
  };

  const handleCreateReport = () => {
    if (!validateForm()) return;

    setIsCreating(true);
    // Simulate async report generation
    setTimeout(() => {
      const id = String(Date.now());
      const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      const size = '1MB';
      const newReport: Report = {
        id,
        name: reportName,
        type: reportType || 'Aggregated',
        disaster: disasterEvent || (selectedCenter ? `Evacuation: ${selectedCenter.name}` : ''),
        format: fileFormat,
        date,
        size,
        icon: fileFormat === 'PDF' ? 'PDF' : fileFormat === 'CSV' ? 'CSV' : 'XLSX'
      };

      // Add evacuationCenter info to the report object for CSV generation
      (newReport as any).evacuationCenter = selectedCenter ? selectedCenter.name : '';

      setReports((prev) => [newReport, ...prev]);

      // Auto-download after creation (since the modal button is 'Download Report')
      generateAndDownloadReport(newReport);

      // Reset form
      setReportName('');
      setReportType('');
      setDisasterEvent('');
      setFileFormat('CSV');
      setEvacuationQuery('');
      setSelectedCenter(null);
      setFormErrors({});
      setIsCreating(false);
      setCreateModalOpen(false);
    }, 800);
  };

  const handleDownload = (report: Report) => {
    // Trigger file generation and download
    generateAndDownloadReport(report);
  };

  const handleDelete = (report: Report) => {
    setPendingDelete(report);
    setConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    setReports((prev) => prev.filter((r) => r.id !== pendingDelete.id));
    setPendingDelete(null);
    setConfirmOpen(false);
  };

  return (
    <div className="text-black p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-start">
        <h1 className="text-3xl font-bold text-green-800">Reports</h1>
      </div>
      <div className="flex justify-end">
        {/* Create Report Button */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-700 hover:bg-green-800 text-white px-6 cursor-pointer">
              <Plus className="w-4 h-4" />
              Create Report
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Recent Reports Section */}
      <div>
        <h2 className="text-lg font-bold text-green-700 mb-4 ">Generated Reports</h2>

        {reports.length === 0 ? (
          <div className="text-gray-400 py-8 text-center">No reports available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {reports.map((report) => (
                <ReportCard key={report.id} report={report} onDownload={handleDownload} onDelete={handleDelete} />
               ))}
           </div>
         )}
       </div>

      {/* Create Report Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="relative">
            <DialogTitle className="text-green-700 text-xl font-bold">Create Report</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreateReport(); }}>
            <div>
              <label className="block text-sm font-semibold mb-2">Report Name:</label>
              <Input
                placeholder="Enter report name"
                className="w-full"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                required
              />
              {formErrors.reportName && <p className="text-red-600 text-sm mt-1">{formErrors.reportName}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Report Type:</label>
              <Select value={reportType} onValueChange={(v: string) => { setReportType(v); setFormErrors((s) => ({ ...s, reportType: '' })); if (v !== 'Specific Evacuation') { setSelectedCenter(null); setEvacuationQuery(''); } }} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.reportType && <p className="text-red-600 text-sm mt-1">{formErrors.reportType}</p>}
            </div>

            {/* Specific Evacuation Search */}
            {reportType === 'Specific Evacuation' && (
              <div>
                <label className="block text-sm font-semibold mb-2">Search Evacuation Center:</label>
                <Input
                  placeholder="Evacuation Center"
                  className="w-full"
                  value={evacuationQuery}
                  onChange={(e) => { setEvacuationQuery(e.target.value); setSelectedCenter(null); setFormErrors((s) => ({ ...s, evacuation: '' })); }}
                />

                {selectedCenter ? (
                  <div className="text-sm mt-2 flex items-center gap-2">
                    <div className="font-medium">Selected: {selectedCenter.name}</div>
                    <button type="button" className="text-xs text-red-500 underline" onClick={() => { setSelectedCenter(null); setEvacuationQuery(''); }}>Clear</button>
                  </div>
                ) : (
                  evacuationQuery && (
                    <ul className="border rounded mt-2 max-h-40 overflow-auto bg-white">
                      {evacuationResults.map(c => (
                        <li key={c.id} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => { setSelectedCenter({ id: c.id, name: c.name }); setEvacuationQuery(c.name); setEvacuationResults([]); }}>
                          <div className="text-sm font-medium">{c.name}</div>
                          <div className="text-xs text-gray-500">{c.barangay}, {c.municipality}</div>
                        </li>
                      ))}
                      {evacuationResults.length === 0 && <li className="p-2 text-sm text-gray-500">No results</li>}
                    </ul>
                  )
                )}

                {formErrors.evacuation && <p className="text-red-600 text-sm mt-1">{formErrors.evacuation}</p>}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2">Disaster Event:</label>
              <Select value={disasterEvent} onValueChange={setDisasterEvent} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {DISASTER_EVENTS.map(disaster => (
                    <SelectItem key={disaster} value={disaster}>{disaster}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.disasterEvent && <p className="text-red-600 text-sm mt-1">{formErrors.disasterEvent}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">File Format:</label>
              <Select value={fileFormat} onValueChange={setFileFormat}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_FORMATS.map(format => (
                    <SelectItem key={format} value={format}>{format}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </form>

          <DialogFooter className="flex justify-between mt-6">
            <DialogClose asChild>
              <Button variant="outline" className="cursor-pointer">Cancel</Button>
            </DialogClose>
            <Button 
              className="bg-green-700 hover:bg-green-800 text-white cursor-pointer"
              onClick={handleCreateReport}
              disabled={isCreating || !reportName || !reportType || (reportType === 'Specific Evacuation' ? !selectedCenter : !disasterEvent)}
            >
              {isCreating ? 'Generating...' : 'Download Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation modal */}
      <DeleteReportModal
        isOpen={confirmOpen}
        onOpenChange={(open) => { setConfirmOpen(open); if (!open) setPendingDelete(null); }}
        reportName={pendingDelete?.name}
        onConfirm={confirmDelete}
      />
    </div>
  );
}