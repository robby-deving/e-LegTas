// DecampAllModal.tsx
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, X } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import BirthdayMaskedInput from "@/components/EvacuationCenterDetail/BirthdayMaskedInput";
import {
  mergeDateAndTime,
  DateBound,
  formatMMDDYYYY,
  checkDateBounds,
  toISODateLocal,
} from "@/utils/dateInput";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  undecampedCount: number;
  minDate?: Date;
  maxDate?: Date;
  loading?: boolean;
  error?: string | null;
  onConfirm: (isoTimestamp: string) => Promise<void>;
};

export function DecampAllModal({
  open,
  onOpenChange,
  undecampedCount,
  minDate,
  maxDate = new Date(),
  loading,
  error,
  onConfirm,
}: Props) {
  const [date, setDate] = React.useState<Date | null>(null);
  const [time, setTime] = React.useState<string>("");
  const [touched, setTouched] = React.useState({ date: false, time: false });
  const [localError, setLocalError] = React.useState<string | null>(null);

  // Prefill with "now" when opening
  React.useEffect(() => {
    if (!open) return;
    const now = new Date();
    setDate(now);
    setTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    setTouched({ date: true, time: true });
    setLocalError(null);
  }, [open]);

  const enforceBounds = (dt: Date | null) => {
    if (!dt) return false;
    const res = checkDateBounds(dt, minDate, maxDate);
    if (!res.ok) {
      setLocalError(
        res.kind === DateBound.BeforeMin
          ? `Decampment cannot be before the disaster start (${formatMMDDYYYY(res.bound)}).`
          : `Decampment cannot be in the future (latest ${formatMMDDYYYY(res.bound)}).`
      );
      return false;
    }
    setLocalError(null);
    return true;
  };

  const canSubmit =
    undecampedCount > 0
      ? touched.date && touched.time && !loading && !localError
      : !loading && !localError;

  const handleSubmit = async () => {
    const ts = date ? date.toISOString() : new Date().toISOString();
    await onConfirm(ts);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {/* self-center ensures it doesn't stick to the bottom */}
      <AlertDialogContent className="relative self-center sm:max-w-[640px]">
        {/* top-right rounded-square X */}
        <button
          type="button"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center
                     rounded-lg border border-gray-300 bg-white text-gray-500
                     hover:bg-gray-50 hover:text-gray-700 focus:outline-none
                     focus:ring-2 focus:ring-gray-300 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-700">
            End Evacuation Operation
          </AlertDialogTitle>
          {undecampedCount > 0 ? (
            <AlertDialogDescription>
              There are <b>{undecampedCount}</b> evacuee(s) not decamped. You can decamp all of them and end the operation.
            </AlertDialogDescription>
          ) : (
            <AlertDialogDescription>
              All families are already decamped. Do you want to mark this evacuation operation as ended?
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {undecampedCount > 0 && (
          <div className="mt-4 space-y-2">
            <label className="block text-sm font-semibold">
              Decampment timestamp for “Decamp All”
            </label>

            {/* Equal-width fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* DATE */}
              <div className="relative w-full">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 z-30">
                  <DateTimePicker
                    value={date ?? undefined}
                    onChange={(d) => {
                      setTouched((t) => ({ ...t, date: true }));
                      if (!d) {
                        setDate(null);
                        setTouched({ date: false, time: false });
                        setLocalError(null);
                        return;
                      }
                      const merged = mergeDateAndTime(d, date);
                      if (!merged || !enforceBounds(merged)) {
                        setDate(null);
                        setTouched({ date: false, time: false });
                        return;
                      }
                      setDate(merged);
                    }}
                    showTime={false}
                    placeholder=" "
                    className="absolute inset-0 h-10 w-10 p-0 opacity-0 cursor-pointer"
                    minYear={(minDate ?? new Date(1900, 0, 1)).getFullYear()}
                    maxYear={maxDate.getFullYear()}
                  />
                  <Calendar className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-gray-400" />
                </div>

                <BirthdayMaskedInput
                  value={date ? toISODateLocal(date) : ""}
                  onChange={(iso) => {
                    if (!iso) {
                      setDate(null);
                      setTouched({ date: false, time: false });
                      setLocalError(null);
                      return;
                    }
                    const parsed = new Date(`${iso}T00:00:00`);
                    const merged = mergeDateAndTime(parsed, date);
                    if (!merged || !enforceBounds(merged)) {
                      setDate(null);
                      setTouched({ date: false, time: false });
                      return;
                    }
                    setDate(merged);
                    setTouched((t) => ({ ...t, date: true }));
                  }}
                  required={false}
                  className="w-full pl-10 pr-10 h-10"
                  placeholder="MM/DD/YYYY"
                />

                {date && (
                  <button
                    type="button"
                    aria-label="Clear date"
                    onClick={() => {
                      setDate(null);
                      setTouched({ date: false, time: false });
                      setLocalError(null);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 inline-flex h-5 w-5
                               items-center justify-center rounded-full bg-green-700 text-white
                               hover:bg-green-800"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* TIME */}
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Clock className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTime(val);
                    if (!date) return;
                    const [hh, mm] = val.split(":").map((x) => parseInt(x, 10));
                    if (Number.isNaN(hh) || Number.isNaN(mm)) return;
                    const next = new Date(date);
                    next.setHours(hh, mm, 0, 0);
                    if (!enforceBounds(next)) return;
                    setDate(next);
                    setTouched((t) => ({ ...t, time: true }));
                  }}
                  className={`pl-9 h-10 ${!date ? "opacity-60 cursor-not-allowed" : ""}`}
                  disabled={!date}
                />
              </div>
            </div>

            {(localError || error) && (
              <p className="text-xs text-red-600">{localError || error}</p>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            className="cursor-pointer border border-gray-300 bg-white text-gray-700
                       hover:bg-gray-50 hover:text-gray-900"
          >
            Cancel
          </AlertDialogCancel>

          {undecampedCount > 0 ? (
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer disabled:opacity-60"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {loading ? "Processing…" : "Decamp All & End"}
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white cursor-pointer disabled:opacity-60"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? "Ending…" : "End Now"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DecampAllModal;
