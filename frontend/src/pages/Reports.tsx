import { useState, useEffect } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import CreateReportModal from '@/components/modals/CreateReportModal';
import { Button } from "../components/ui/button";
import { Dialog, DialogTrigger } from "../components/ui/dialog";
import { Plus } from "lucide-react";
import ReportCard from '@/components/cards/ReportCard';
import DeleteReportModal from '@/components/modals/DeleteReportModal';
import AggregatedReport from '@/components/report-templates/AggregatedReport';
import DisaggregatedReport from '@/components/report-templates/DisaggregatedReport';
import BarangayReport from '@/components/report-templates/BarangayReport';
import React from 'react';
import { createRoot } from 'react-dom/client';

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
  'Disaggregated', 
  'Barangay Report'
];

const MOCK_BARANGAYS: { id: string; name: string; municipality: string }[] = [
  { id: 'b1', name: 'Barangay 1 - Albay', municipality: 'Legazpi City' },
  { id: 'b2', name: 'Barangay 2 - Bitano', municipality: 'Legazpi City' },
  { id: 'b3', name: 'Barangay 3 - Bonot', municipality: 'Legazpi City' },
  { id: 'b4', name: 'Barangay 4 - Bonga', municipality: 'Legazpi City' },
  { id: 'b5', name: 'Barangay 5 - Buyuan', municipality: 'Legazpi City' },
  { id: 'b6', name: 'Barangay 6 - Cabangan', municipality: 'Legazpi City' },
  { id: 'b7', name: 'Barangay 7 - Cagbacong', municipality: 'Legazpi City' },
  { id: 'b8', name: 'Barangay 8 - Cagsawa', municipality: 'Legazpi City' },
  { id: 'b9', name: 'Barangay 9 - Pinaric', municipality: 'Legazpi City' },
  { id: 'b10', name: 'Barangay 10 - Rawis', municipality: 'Legazpi City' },
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
  // Date and time states
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<string>('12:00');

  // Barangay search states for Barangay Report
  const [barangayQuery, setBarangayQuery] = useState('');
  const [barangayResults, setBarangayResults] = useState(MOCK_BARANGAYS);
  const [selectedBarangay, setSelectedBarangay] = useState<{ id: string; name: string } | null>(null);

  // Loading / error handling
  const [isCreating, setIsCreating] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Reports state (mutable list shown in UI)
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Report | null>(null);

  useEffect(() => {
    if (!barangayQuery) {
      setBarangayResults(MOCK_BARANGAYS);
      return;
    }
    const q = barangayQuery.toLowerCase();
    setBarangayResults(MOCK_BARANGAYS.filter((b) => b.name.toLowerCase().includes(q) || (b.municipality || '').toLowerCase().includes(q)));
  }, [barangayQuery]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!reportName.trim()) errors.reportName = 'Report name is required.';
    if (!reportType) errors.reportType = 'Report type is required.';
    if (reportType === 'Barangay Report') {
      if (!selectedBarangay) errors.barangay = 'Please select a barangay.';
    } else {
      if (!disasterEvent) errors.disasterEvent = 'Please select a disaster event.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateTemplateData = (report: Report) => {
    const baseProps = {
      disasterEvent: report.disaster,
      reportDate: new Date(report.date).toLocaleDateString(),
      reportTime: new Date(report.date).toLocaleTimeString()
    };

    // Sample evacuation center data for templates
    const sampleEvacuationCenters = [
      {
        name: "Legazpi Elementary School",
        address: "Rizal Street, Legazpi City",
        originBarangay: "Barangay 9 - Pinaric",
        insideFamilies: 15,
        insidePersons: 52,
        outsideFamilies: 8,
        outsidePersons: 28
      },
      {
        name: "Barangay Hall - Pinaric", 
        address: "Pinaric Road, Legazpi City",
        originBarangay: "Barangay 9 - Pinaric",
        insideFamilies: 12,
        insidePersons: 45,
        outsideFamilies: 5,
        outsidePersons: 18
      }
    ];

    // Sample data for disaggregated report
    const sampleEvacuationSites = [
      {
        barangay: "Barangay 9 - Pinaric",
        evacuationCenter: "Legazpi Elementary School",
        families: 15,
        male: 25,
        female: 27,
        total: 52,
        infant: 3,
        children: 12,
        youth: 18,
        adult: 15,
        seniorCitizens: 4,
        pwd: 2,
        pregnant: 1,
        lactating: 2
      },
      {
        barangay: "Barangay 12 - Cabangan",
        evacuationCenter: "Legazpi Sports Complex",
        families: 25,
        male: 45,
        female: 44,
        total: 89,
        infant: 5,
        children: 20,
        youth: 30,
        adult: 25,
        seniorCitizens: 9,
        pwd: 3,
        pregnant: 2,
        lactating: 3
      }
    ];

    // Sample data for barangay report
    const sampleBarangayData = [
      {
        name: "Legazpi Elementary School",
        evacuees: [
          {
            familyHead: "Juan Dela Cruz",
            purok: "Purok 1",
            male: 2,
            female: 3,
            total: 5,
            infant: 1,
            children: 2,
            youth: 1,
            adult: 1,
            seniorCitizens: 0,
            pwd: 0,
            pregnant: 0,
            lactating: 1
          },
          {
            familyHead: "Maria Santos",
            purok: "Purok 2", 
            male: 3,
            female: 2,
            total: 5,
            infant: 0,
            children: 2,
            youth: 2,
            adult: 1,
            seniorCitizens: 0,
            pwd: 1,
            pregnant: 0,
            lactating: 0
          }
        ]
      }
    ];

    switch (report.type) {
      case 'Aggregated':
        return {
          ...baseProps,
          evacuationCenters: sampleEvacuationCenters
        };
      case 'Disaggregated':
        return {
          ...baseProps,
          evacuationSites: sampleEvacuationSites
        };
      case 'Barangay Report':
        return {
          ...baseProps,
          barangayName: selectedBarangay?.name || "Sample Barangay",
          evacuationCenters: sampleBarangayData
        };
      default:
        return {
          ...baseProps,
          evacuationCenters: sampleEvacuationCenters
        };
    }
  };

  const generatePDFFromTemplate = (report: Report) => {
    const templateData = generateTemplateData(report);
    
    // Create a hidden container for rendering the template
    const printContainer = document.createElement('div');
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.width = '210mm'; // A4 width
    printContainer.className = 'report-template';
    
    document.body.appendChild(printContainer);
    
    // Render the appropriate template
    const root = createRoot(printContainer);
    let templateElement;
    
    switch (report.type) {
      case 'Aggregated':
        templateElement = React.createElement(AggregatedReport, templateData as any);
        break;
      case 'Disaggregated':
        templateElement = React.createElement(DisaggregatedReport, templateData as any);
        break;
      case 'Barangay Report':
        templateElement = React.createElement(BarangayReport, templateData as any);
        break;
      default:
        templateElement = React.createElement(AggregatedReport, templateData as any);
    }
    
    root.render(templateElement);
    
    // Wait for render then trigger print
    setTimeout(() => {
      // Store original content and styles
      const originalContent = document.body.innerHTML;
      const originalClass = document.body.className;
      
      // Replace body content with rendered template
      document.body.innerHTML = printContainer.innerHTML;
      document.body.className = 'report-template';
      
      // Trigger print
      window.print();
      
      // Restore original content
      document.body.innerHTML = originalContent;
      document.body.className = originalClass;
      
      // Clean up
      if (document.body.contains(printContainer)) {
        document.body.removeChild(printContainer);
      }
    }, 100);
  };

  const generateCSVContent = (report: Report) => {
    const templateData = generateTemplateData(report);
    
    if (report.type === 'Aggregated' && (templateData as any).evacuationCenters) {
      const headers = ['Evacuation Center', 'Address', 'Origin Barangay', 'Inside Families', 'Inside Persons', 'Outside Families', 'Outside Persons', 'Total Families', 'Total Persons'];
      const centers = (templateData as any).evacuationCenters;
      const rows = centers.map((center: any) => [
        center.name,
        center.address,
        center.originBarangay,
        center.insideFamilies.toString(),
        center.insidePersons.toString(),
        center.outsideFamilies.toString(),
        center.outsidePersons.toString(),
        (center.insideFamilies + center.outsideFamilies).toString(),
        (center.insidePersons + center.outsidePersons).toString()
      ]);
      
      const csvContent = [headers, ...rows]
        .map(row => row.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      return `Report: ${report.name}\nDisaster: ${report.disaster}\nDate: ${report.date}\n\n${csvContent}`;
    }
    
    if (report.type === 'Disaggregated' && (templateData as any).evacuationSites) {
      const headers = ['Barangay', 'Evacuation Center', 'Families', 'Male', 'Female', 'Total', 'Infant', 'Children', 'Youth', 'Adult', 'Senior Citizens', 'PWD', 'Pregnant', 'Lactating'];
      const sites = (templateData as any).evacuationSites;
      const rows = sites.map((site: any) => [
        site.barangay,
        site.evacuationCenter,
        site.families.toString(),
        site.male.toString(),
        site.female.toString(),
        site.total.toString(),
        site.infant.toString(),
        site.children.toString(),
        site.youth.toString(),
        site.adult.toString(),
        site.seniorCitizens.toString(),
        site.pwd.toString(),
        site.pregnant.toString(),
        site.lactating.toString()
      ]);
      
      const csvContent = [headers, ...rows]
        .map(row => row.map((cell: string) => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      return `Report: ${report.name}\nDisaster: ${report.disaster}\nDate: ${report.date}\nBarangay: ${(templateData as any).barangayName || 'All'}\n\n${csvContent}`;
    }
    
    if (report.type === 'Barangay Report' && (templateData as any).evacuationCenters) {
      const headers = ['Evacuation Center', 'Family Head', 'Purok', 'Male', 'Female', 'Total', 'Infant', 'Children', 'Youth', 'Adult', 'Senior Citizens', 'PWD', 'Pregnant', 'Lactating'];
      const centers = (templateData as any).evacuationCenters;
      const rows: string[][] = [];
      
      centers.forEach((center: any) => {
        center.evacuees?.forEach((evacuee: any) => {
          rows.push([
            center.name,
            evacuee.familyHead,
            evacuee.purok,
            evacuee.male.toString(),
            evacuee.female.toString(),
            evacuee.total.toString(),
            evacuee.infant.toString(),
            evacuee.children.toString(),
            evacuee.youth.toString(),
            evacuee.adult.toString(),
            evacuee.seniorCitizens.toString(),
            evacuee.pwd.toString(),
            evacuee.pregnant.toString(),
            evacuee.lactating.toString()
          ]);
        });
      });
      
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      return `Report: ${report.name}\nDisaster: ${report.disaster}\nDate: ${report.date}\nBarangay: ${(templateData as any).barangayName}\n\n${csvContent}`;
    }
    
    // Fallback to simple CSV
    const headers = ['Report Name', 'Type', 'Disaster', 'Format', 'Date', 'Size'];
    const values = [report.name, report.type, report.disaster, report.format, report.date, report.size];
    return `${headers.join(',')}\n${values.map(v => `"${v.replace(/"/g, '""')}"`).join(',')}`;
  };

  const generateAndDownloadReport = (r: Report) => {
    try {
      if (r.format === 'PDF') {
        // Use template-based PDF generation
        generatePDFFromTemplate(r);
        return;
      }

      let blob: Blob;
      // Use report name as filename (sanitize to remove unsafe characters)
      const sanitize = (s: string) => s.replace(/[^a-z0-9 _.-]/gi, '').trim().replace(/\s+/g, '_') || 'report';
      const ext = r.format.toLowerCase();
      const filename = `${sanitize(r.name)}.${ext}`;

      if (r.format === 'CSV') {
        const csv = generateCSVContent(r);
        blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      } else if (r.format === 'XLSX') {
        // For XLSX, we'll generate CSV content and save with xlsx mimetype
        // In a real app, you'd use a library like SheetJS (xlsx) to generate proper XLSX
        const csv = generateCSVContent(r);
        blob = new Blob([csv], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
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
      
      // Create a new date object with the selected date and time
      const formattedDate = date ? new Date(date) : new Date();
      if (time) {
        const [hours, minutes] = time.split(':').map(Number);
        // Create a new date with local date components but with the exact time
        formattedDate.setHours(hours, minutes, 0, 0);
      }
      
      // Format the date in the user's locale
      const displayDate = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(formattedDate);
      
      const size = '1MB';
      const newReport: Report = {
        id,
        name: reportName,
        type: reportType || 'Aggregated',
        disaster: reportType === 'Barangay Report' && selectedBarangay 
          ? `Barangay Report: ${selectedBarangay.name}` 
          : disasterEvent,
        format: fileFormat,
        date: displayDate,
        size,
        icon: fileFormat === 'PDF' ? 'PDF' : fileFormat === 'CSV' ? 'CSV' : 'XLSX'
      };

      setReports((prev) => [newReport, ...prev]);

      // Auto-download after creation (since the modal button is 'Download Report')
      generateAndDownloadReport(newReport);

      // Reset form
      setReportName('');
      setReportType('');
      setDisasterEvent('');
      setDate(undefined);
      setFileFormat('CSV');
      setBarangayQuery('');
      setSelectedBarangay(null);
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
        setFileFormat={setFileFormat}
        evacuationQuery=""
        setEvacuationQuery={() => {}}
        evacuationResults={[]}
        setEvacuationResults={() => {}}
        selectedCenter={null}
        setSelectedCenter={() => {}}
        barangayQuery={barangayQuery}
        setBarangayQuery={setBarangayQuery}
        barangayResults={barangayResults}
        setBarangayResults={setBarangayResults}
        selectedBarangay={selectedBarangay}
        setSelectedBarangay={setSelectedBarangay}
        formErrors={formErrors}
        isCreating={isCreating}
        onCreate={handleCreateReport}
        reportTypes={REPORT_TYPES}
        disasterEvents={DISASTER_EVENTS}
        fileFormats={FILE_FORMATS}
        date={date}
        setDate={setDate}
        time={time}
        setTime={setTime}
        clearFormError={(key) => {
          const newErrors = { ...formErrors };
          delete newErrors[key];
          setFormErrors(newErrors);
        }}
      />

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