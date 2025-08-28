// CreateReportModal.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Clock, Loader2 } from "lucide-react";
import { DateTimePicker } from "../ui/date-time-picker";

type EvacuationCenter = { id: string; name: string; barangay?: string };
type Barangay = { id: string; name: string };
type IdName = { id: string; name: string };

export type CreateReportModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;

  reportName: string;
  setReportName: (value: string) => void;

  reportType: string;
  setReportType: (value: string) => void;

  // value to submit (name)
  disasterEvent: string;
  setDisasterEvent: (value: string) => void;

  fileFormat: string;
  setFileFormat: (value: string) => void;

  // Legacy props
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

  // Disaster Event search
  disasterQuery: string;
  setDisasterQuery: (value: string) => void;
  disasterResults: IdName[];
  setDisasterResults: (rows: IdName[]) => void;
  selectedDisaster: IdName | null;
  setSelectedDisaster: (row: IdName | null) => void;

  formErrors: { [key: string]: string };
  isCreating: boolean;
  onCreate: () => void;

  reportTypes: string[];
  fileFormats: string[];

  clearFormError?: (key: string) => void;

  date: Date | undefined;
  setDate: (date: Date | undefined) => void;

  time: string;
  setTime: (time: string) => void;

  /** Number of rows that will be exported (from a lightweight pre-check). If undefined, we allow download. */
  rowCount?: number;
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
    // Disaster search props
    disasterQuery,
    setDisasterQuery,
    disasterResults,
    setDisasterResults,
    selectedDisaster,
    setSelectedDisaster,
    formErrors,
    isCreating,
    onCreate,
    reportTypes,
    fileFormats,
    clearFormError,
    date,
    setDate,
    time,
    setTime,
    rowCount,
  } = props;

  // --- enable/disable logic ---
  const hasRequired =
    !!reportName &&
    !!reportType &&
    (reportType === "Barangay Report" ? !!selectedBarangay : !!disasterEvent);

  // If rowCount is undefined, we assume the pre-check isn't wired yet and allow download.
  const hasData = rowCount === undefined ? true : rowCount > 0;

  const canDownload = hasRequired && hasData && !isCreating;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="relative">
          <DialogTitle className="text-green-700 text-xl font-bold">Create Report</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Fill out the details below to generate and download a report.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canDownload) onCreate();
            }}
          >
            {/* Report Name */}
            <div>
              <label className="block text-sm font-semibold mb-2">Report Name:</label>
              <Input
                placeholder="Enter report name"
                className="w-full"
                value={reportName}
                onChange={(e) => {
                  setReportName(e.target.value);
                  clearFormError && clearFormError("reportName");
                }}
                required
              />
              {formErrors.reportName && (
                <p className="text-red-600 text-sm mt-1">{formErrors.reportName}</p>
              )}
            </div>

            {/* Report Type */}
            <div>
              <label className="block text-sm font-semibold mb-2">Report Type:</label>
              <Select
                value={reportType}
                onValueChange={(v: string) => {
                  setReportType(v);
                  clearFormError && clearFormError("reportType");

                  if (v !== "Barangay Report") {
                    setSelectedBarangay(null);
                    setBarangayQuery("");
                    clearFormError && clearFormError("barangay");
                  }
                }}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.reportType && (
                <p className="text-red-600 text-sm mt-1">{formErrors.reportType}</p>
              )}
            </div>

            {/* Barangay search (only for Barangay Report) */}
            {reportType === "Barangay Report" && (
              <div>
                <label className="block text-sm font-semibold mb-2">Search Barangay:</label>
                <Input
                  placeholder="Search barangay"
                  className="w-full"
                  value={barangayQuery}
                  onChange={(e) => {
                    setBarangayQuery(e.target.value);
                    setSelectedBarangay(null);
                    clearFormError && clearFormError("barangay");
                  }}
                />
                {barangayQuery && !selectedBarangay && (
                  <div
                    className="
                      mt-2 border rounded bg-white shadow-sm z-20
                      space-y-1
                      max-h-60 overflow-y-auto pr-2
                      [&::-webkit-scrollbar]:w-2
                      [&::-webkit-scrollbar-track]:rounded-full
                      [&::-webkit-scrollbar-track]:bg-gray-100
                      [&::-webkit-scrollbar-thumb]:rounded-full
                      [&::-webkit-scrollbar-thumb]:bg-gray-300
                      dark:[&::-webkit-scrollbar-track]:bg-neutral-700
                      dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500
                    "
                  >
                    {barangayResults.length > 0 ? (
                      barangayResults.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          className="w-full text-left p-2 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => {
                            setSelectedBarangay({ id: b.id, name: b.name });
                            setBarangayQuery(b.name); // reflect selection in the input
                            setBarangayResults([]); // hide list after pick
                          }}
                        >
                          <div className="text-sm font-medium">{b.name}</div>
                        </button>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-gray-500">No results</div>
                    )}
                  </div>
                )}
                {formErrors.barangay && (
                  <p className="text-red-600 text-sm mt-1">{formErrors.barangay}</p>
                )}
              </div>
            )}

            {/* Disaster Event search (same UX as Barangay) */}
            <div>
              <label className="block text-sm font-semibold mb-2">Search Disaster Event:</label>
              <Input
                placeholder="Search disaster"
                className="w-full"
                value={disasterQuery}
                onChange={(e) => {
                  setDisasterQuery(e.target.value);
                  setSelectedDisaster(null);
                  setDisasterEvent(""); // clear submit value until pick
                  clearFormError && clearFormError("disasterEvent");
                }}
              />
              {disasterQuery && !selectedDisaster && (
                <div
                  className="
                    mt-2 border rounded bg-white shadow-sm z-20
                    space-y-1
                    max-h-60 overflow-y-auto pr-2
                    [&::-webkit-scrollbar]:w-2
                    [&::-webkit-scrollbar-track]:rounded-full
                    [&::-webkit-scrollbar-track]:bg-gray-100
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    [&::-webkit-scrollbar-thumb]:bg-gray-300
                    dark:[&::-webkit-scrollbar-track]:bg-neutral-700
                    dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500
                  "
                >
                  {disasterResults.length > 0 ? (
                    disasterResults.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        className="w-full text-left p-2 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={() => {
                          setSelectedDisaster({ id: d.id, name: d.name });
                          setDisasterQuery(d.name);
                          setDisasterEvent(d.name);
                          setDisasterResults([]);
                        }}
                      >
                        <div className="text-sm font-medium">{d.name}</div>
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500">No results</div>
                  )}
                </div>
              )}
              {formErrors.disasterEvent && (
                <p className="text-red-600 text-sm mt-1">{formErrors.disasterEvent}</p>
              )}
            </div>

            {/* Date & Time */}
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

            {/* File Format */}
            <div>
              <label className="block text-sm font-semibold mb-2">File Format:</label>
              <Select value={fileFormat} onValueChange={setFileFormat}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fileFormats.map((format) => (
                    <SelectItem key={format} value={format}>
                      {format}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Empty-state hint (only after required fields are chosen) */}
            {hasRequired && rowCount === 0 && (
              <p className="text-sm text-muted-foreground">
                No data matches your selection.
              </p>
            )}
          </form>
        </div>

        <DialogFooter className="flex justify-between mt-6">
          <DialogClose asChild>
            <Button variant="outline" className="cursor-pointer">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit" // use form submit; remove onClick
          className="bg-green-700 text-white hover:bg-green-800
                      disabled:bg-green-700 disabled:text-white disabled:hover:bg-green-700
                      disabled:opacity-60 disabled:pointer-events-none disabled:cursor-default"
            disabled={!canDownload}
            aria-busy={isCreating}
            aria-live="polite"
            aria-disabled={!canDownload}
            title={!canDownload ? "Fill required fields and ensure there is data to export." : undefined}
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {isCreating ? "Generating…" : "Download Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
