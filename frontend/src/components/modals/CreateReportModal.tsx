import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type EvacuationCenter = { id: string; name: string; barangay?: string; municipality?: string };

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
  evacuationQuery: string;
  setEvacuationQuery: (value: string) => void;
  evacuationResults: EvacuationCenter[];
  setEvacuationResults: (centers: EvacuationCenter[]) => void;
  selectedCenter: { id: string; name: string } | null;
  setSelectedCenter: (center: { id: string; name: string } | null) => void;
  formErrors: { [key: string]: string };
  isCreating: boolean;
  onCreate: () => void;
  reportTypes: string[];
  disasterEvents: string[];
  fileFormats: string[];
  clearFormError?: (key: string) => void;
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
    evacuationQuery,
    setEvacuationQuery,
    evacuationResults,
    setEvacuationResults,
    selectedCenter,
    setSelectedCenter,
    formErrors,
    isCreating,
    onCreate,
    reportTypes,
    disasterEvents,
    fileFormats,
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
            <Select value={reportType} onValueChange={(v: string) => { setReportType(v); clearFormError && clearFormError('reportType'); if (v !== 'Specific Evacuation') { setSelectedCenter(null); setEvacuationQuery(''); clearFormError && clearFormError('evacuation'); } }} required>
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

          {reportType === 'Specific Evacuation' && (
            <div>
              <label className="block text-sm font-semibold mb-2">Search Evacuation Center:</label>
              <Input
                placeholder="Evacuation Center"
                className="w-full"
                value={evacuationQuery}
                onChange={(e) => { setEvacuationQuery(e.target.value); setSelectedCenter(null); clearFormError && clearFormError('evacuation'); }}
              />

              {selectedCenter ? (
                <div className="text-sm mt-2 flex items-center gap-2">
                  <div className="font-medium">Selected: {selectedCenter.name}</div>
                  <button type="button" className="text-xs text-red-500 underline" onClick={() => { setSelectedCenter(null); setEvacuationQuery(''); }}>
                    Clear
                  </button>
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
            disabled={isCreating || !reportName || !reportType || (reportType === 'Specific Evacuation' ? !selectedCenter : !disasterEvent)}
          >
            {isCreating ? 'Generating...' : 'Download Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

