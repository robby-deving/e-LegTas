import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Clock } from "lucide-react";
import { DateTimePicker } from "../ui/date-time-picker";

type EvacuationCenter = { id: string; name: string; barangay?: string; municipality?: string };
type Barangay = { id: string; name: string; municipality: string };

export type CreateReportModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reportName: string;
  setReportName: (value: string) => void;
  reportType: string;
  setReportType: (value: string) => void;
  disasterEvent: string;
  setDisasterEvent: (value: string) => void;
  fileFormat: string;
  setFileFormat: (value: string) => void;
  // Legacy props - kept for compatibility but not used
  evacuationQuery: string;
  setEvacuationQuery: (value: string) => void;
  evacuationResults: EvacuationCenter[];
  setEvacuationResults: (centers: EvacuationCenter[]) => void;
  selectedCenter: { id: string; name: string } | null;
  setSelectedCenter: (center: { id: string; name: string } | null) => void;
  // Barangay search props for Barangay Report
  barangayQuery: string;
  setBarangayQuery: (value: string) => void;
  barangayResults: Barangay[];
  setBarangayResults: (barangays: Barangay[]) => void;
  selectedBarangay: { id: string; name: string } | null;
  setSelectedBarangay: (barangay: { id: string; name: string } | null) => void;
  formErrors: { [key: string]: string };
  isCreating: boolean;
  onCreate: () => void;
  reportTypes: string[];
  disasterEvents: string[];
  fileFormats: string[];
  clearFormError?: (key: string) => void;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  time: string;
  setTime: (time: string) => void;
};

export default function CreateReportModal(props: CreateReportModalProps) {
  const {
    isOpen,
    onOpenChange,
    reportName,
    setReportName,
    reportType,
    setReportType,
    disasterEvent,
    setDisasterEvent,
    fileFormat,
    setFileFormat,
    evacuationQuery: _evacuationQuery,
    setEvacuationQuery: _setEvacuationQuery,
    evacuationResults: _evacuationResults,
    setEvacuationResults: _setEvacuationResults,
    selectedCenter: _selectedCenter,
    setSelectedCenter: _setSelectedCenter,
    barangayQuery,
    setBarangayQuery,
    barangayResults,
    setBarangayResults,
    selectedBarangay,
    setSelectedBarangay,
    formErrors,
    isCreating,
    onCreate,
    reportTypes,
    disasterEvents,
    fileFormats,
    clearFormError,
    date,
    setDate,
    time,
    setTime,
  } = props;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="relative">
          <DialogTitle className="text-green-700 text-xl font-bold">Create Report</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onCreate(); }}>
          <div>
            <label className="block text-sm font-semibold mb-2">Report Name:</label>
            <Input
              placeholder="Enter report name"
              className="w-full"
              value={reportName}
              onChange={(e) => { setReportName(e.target.value); clearFormError && clearFormError('reportName'); }}
              required
            />
            {formErrors.reportName && <p className="text-red-600 text-sm mt-1">{formErrors.reportName}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Report Type:</label>
            <Select value={reportType} onValueChange={(v: string) => { setReportType(v); clearFormError && clearFormError('reportType'); if (v !== 'Barangay Report') { setSelectedBarangay(null); setBarangayQuery(''); clearFormError && clearFormError('barangay'); } }} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.reportType && <p className="text-red-600 text-sm mt-1">{formErrors.reportType}</p>}
          </div>

          {reportType === 'Barangay Report' && (
            <div>
              <label className="block text-sm font-semibold mb-2">Search Barangay:</label>
              <Input
                placeholder="Search barangay"
                className="w-full"
                value={barangayQuery}
                onChange={(e) => { setBarangayQuery(e.target.value); setSelectedBarangay(null); clearFormError && clearFormError('barangay'); }}
              />

              {selectedBarangay ? (
                <div className="text-sm mt-2 flex items-center gap-2">
                  <div className="font-medium">Selected: {selectedBarangay.name}</div>
                  <button type="button" className="text-xs text-red-500 underline" onClick={() => { setSelectedBarangay(null); setBarangayQuery(''); }}>
                    Clear
                  </button>
                </div>
              ) : (
                barangayQuery && (
                  <ul className="border rounded mt-2 max-h-40 overflow-auto bg-white">
                    {barangayResults.map(b => (
                      <li key={b.id} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => { setSelectedBarangay({ id: b.id, name: b.name }); setBarangayQuery(b.name); setBarangayResults([]); }}>
                        <div className="text-sm font-medium">{b.name}</div>
                        <div className="text-xs text-gray-500">{b.municipality}</div>
                      </li>
                    ))}
                    {barangayResults.length === 0 && <li className="p-2 text-sm text-gray-500">No results</li>}
                  </ul>
                )
              )}

              {formErrors.barangay && <p className="text-red-600 text-sm mt-1">{formErrors.barangay}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2">Disaster Event:</label>
            <Select value={disasterEvent} onValueChange={(v) => { setDisasterEvent(v); clearFormError && clearFormError('disasterEvent'); }} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {disasterEvents.map(disaster => (
                  <SelectItem key={disaster} value={disaster}>{disaster}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.disasterEvent && <p className="text-red-600 text-sm mt-1">{formErrors.disasterEvent}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Date &amp; Time:</label>
            <div className="flex gap-3">
              <div className="w-2/3">
                <DateTimePicker
                  value={date}
                  onChange={setDate}
                  showTime={false}
                  placeholder="Select date"
                  className="w-full"
                />
              </div>
              <div className="w-1/3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="pl-9 h-10"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">File Format:</label>
            <Select value={fileFormat} onValueChange={setFileFormat}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fileFormats.map(format => (
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
            onClick={onCreate}
            disabled={isCreating || !reportName || !reportType || (reportType === 'Barangay Report' ? !selectedBarangay : !disasterEvent)}
          >
            {isCreating ? 'Generating...' : 'Download Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

