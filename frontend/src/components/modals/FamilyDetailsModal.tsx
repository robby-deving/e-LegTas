//FamilyDetailsModal.tsx
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Pencil, Calendar, Clock } from "lucide-react";
import type { FamilyMember } from "@/types/EvacuationCenterDetails";
import { formatDate } from "@/utils/dateFormatter";
// import "react-datepicker/dist/react-datepicker.css";
// import ReactDatePicker from "react-datepicker";
import { RegisterBlockDialog } from "@/components/modals/RegisterBlockDialog";
// import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
// import { Calendar as DateCalendar } from "../ui/calendar";
import { DateTimePicker } from "../ui/date-time-picker";
import { startOfDayLocal, DateBound, formatMMDDYYYY, parseMMDDYYYY, mergeDateAndTime, checkDateBounds } from "@/utils/dateInput";

const INVERSE_REL: Record<string, string> = {
  Spouse: "Spouse",
  Partner: "Partner",
  Sibling: "Sibling",
  Child: "Parent",
  Parent: "Child",
  Grandparent: "Grandchild",
  Grandchild: "Grandparent",
  "In-law": "In-law",
  Relative: "Relative",
  "Household Member": "Household Member",
  Boarder: "Boarder",
};

type FamilyDetailsModalProps = { isOpen: boolean; onClose: () => void; evacuee: any; centerName: string; onEditMember: (m: any) => void; disasterStartDate?: string | null; onSaved?: () => void | Promise<void>; };

export const FamilyDetailsModal: React.FC<FamilyDetailsModalProps> = ({
  isOpen,
  onClose,
  evacuee,
  centerName,
  onEditMember,
  disasterStartDate,
  onSaved,
}) => {
const [savingDecamp, setSavingDecamp] = useState(false);
const [decampError, setDecampError] = useState<string | null>(null);

const [regBlockOpen, setRegBlockOpen] = useState(false);
const [regBlockName, setRegBlockName] = useState<string | undefined>();
const [regBlockEcName, setRegBlockEcName] = useState<string | undefined>();
const [regBlockDisaster, setRegBlockDisaster] = useState<string | undefined>();
const [regBlockDisasterId, setRegBlockDisasterId] = useState<number | undefined>();
const [regBlockDisasterType, setRegBlockDisasterType] = useState<string | undefined>();

const [editBlockedOpen, setEditBlockedOpen] = useState(false);
const [editBlockedName, setEditBlockedName] = useState<string | undefined>();

const [decampInvalidOpen, setDecampInvalidOpen] = useState(false);
const [decampInvalidMsg, setDecampInvalidMsg] = useState<React.ReactNode>(null);

const hadExistingDecamp = Boolean(evacuee?.decampment_timestamp);
const [touched, setTouched] = useState<{date: boolean; time: boolean}>({ date: hadExistingDecamp, time: hadExistingDecamp });
const [decampDate, setDecampDate] = useState<Date | null>(() =>
  evacuee?.decampment_timestamp ? new Date(evacuee.decampment_timestamp) : null
);

useEffect(() => {
  const raw = evacuee?.decampment_timestamp
    ? new Date(evacuee.decampment_timestamp)
    : null;
  const d = raw && !Number.isNaN(raw.getTime()) ? raw : null;
  setDecampDate(d);
  setTouched({ date: !!d, time: !!d });
}, [evacuee?.decampment_timestamp]);

const originalDecamp = evacuee?.decampment_timestamp ? new Date(evacuee.decampment_timestamp) : null;
const hasChanges = (originalDecamp?.getTime() ?? null) !== (decampDate?.getTime() ?? null);

const toLocalStart = (v: string | Date) => startOfDayLocal(new Date(v));
const minDate =
  disasterStartDate ? toLocalStart(disasterStartDate)
  : evacuee?.disaster_start_date ? toLocalStart(evacuee.disaster_start_date)
  : undefined;

const maxDate = useMemo(() => new Date(), []);
const missingTimeForNew = !hadExistingDecamp && touched.date && !touched.time;
const canSaveDecamp = hasChanges && !savingDecamp && !missingTimeForNew;

const fmtHHMM = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const [decampTime, setDecampTime] = useState<string>(() =>
  decampDate ? fmtHHMM(decampDate) : ""
);

// keep time field in sync when date changes programmatically
useEffect(() => {
  setDecampTime(decampDate ? fmtHHMM(decampDate) : "");
}, [decampDate]);


const [transferOpen, setTransferOpen] = useState(false);
const [newHeadEvacueeId, setNewHeadEvacueeId] = useState<string>("");
const [oldHeadNewRel, setOldHeadNewRel] = useState<string>("");
const [transferring, setTransferring] = useState(false);
const fmtDateTime = (d: Date) => d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const members: any[] = evacuee?.list_of_family_members?.family_members ?? [];
const [decampText, setDecampText] = useState<string>(
  decampDate ? formatMMDDYYYY(decampDate) : ""
);

useEffect(() => {
  setDecampText(decampDate ? formatMMDDYYYY(decampDate) : "");
}, [decampDate]);
const latestArrival = useMemo(() => {
  const members = evacuee?.list_of_family_members?.family_members ?? [];
  let maxMs = -Infinity;
  for (const m of members) {
    const t = Date.parse(m?.arrival_timestamp ?? "");
    if (!Number.isNaN(t)) maxMs = Math.max(maxMs, t);
  }
  return Number.isFinite(maxMs) ? new Date(maxMs) : null;
}, [evacuee]);

const orderedMembers = useMemo(() => {
  const isHead = (m: any) =>
    m?.relationship_to_family_head === "Head" ||
    m?.full_name === evacuee?.family_head_full_name;

  return [...members].sort((a, b) => Number(!isHead(a)) - Number(!isHead(b)));
}, [members, evacuee?.family_head_full_name]);

if (!isOpen || !evacuee) return null;

const transferCandidates: any[] = members.filter(
  (m) => m.full_name !== evacuee.family_head_full_name
);

const isDecamped = Boolean(evacuee?.decampment_timestamp);
const canTransfer =
  !isDecamped &&
  transferCandidates.length > 0 &&
  Boolean(evacuee?.id) &&
  Boolean(evacuee?.disaster_evacuation_event_id);

  const handleSelectNewHead = (value: string) => {
  setNewHeadEvacueeId(value);
  const cand = transferCandidates.find((m) => String(m.evacuee_id) === value);
  const relToOldHead: string | undefined = cand?.relationship_to_family_head;
  const inverse =
    relToOldHead && INVERSE_REL[relToOldHead] ? INVERSE_REL[relToOldHead] : "Relative";
  setOldHeadNewRel(inverse);
};

const handleConfirmTransfer = async () => {
try {
  if (!newHeadEvacueeId) return;
  setTransferring(true);

  let rel = oldHeadNewRel;
  if (!rel) {
    const cand = transferCandidates.find(
      (m: any) => String(m.evacuee_id) === String(newHeadEvacueeId)
    );
    const toRel = cand?.relationship_to_family_head;
    rel = toRel && INVERSE_REL[toRel] ? INVERSE_REL[toRel] : "Relative";
    setOldHeadNewRel(rel);
  }

  const url = `http://localhost:3000/api/v1/evacuees/${Number(
    evacuee.disaster_evacuation_event_id
  )}/transfer-head`;

  const body = {
    from_family_head_id: Number(evacuee.id),
    to_evacuee_resident_id: Number(newHeadEvacueeId),
    old_head_new_relationship: rel,
  };

    await axios.post(url, body);
    setTransferOpen(false);
    onClose();
    await onSaved?.(); 
  } catch (e: any) {
    console.error("Transfer head failed", e?.response?.data || e);
  } finally {
    setTransferring(false);
  }
};

const handleSaveDecampment = async () => {
  setDecampError(null);

  const eventId = Number(evacuee?.disaster_evacuation_event_id);
  const familyHeadId = Number(evacuee?.id);
  if (!eventId || !familyHeadId) {
    setDecampError("Missing event or family head id.");
    return;
  }

  const url = `http://localhost:3000/api/v1/evacuees/${eventId}/families/${familyHeadId}/decamp`;

if (!decampDate) {
  setSavingDecamp(true);
  try {
    // 1) DRY-RUN (always 200 from backend)
    const probe = await fetch(`${url}?dry_run=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decampment_timestamp: null }),
    });
    const probeJson = (await probe.json().catch(() => ({}))) as {
      allowed?: boolean;
      code?: string;
      error?: { code?: string };
      ec_name?: string;
      disaster_name?: string;
      disaster_id?: number;
      disaster_type_name?: string;
      message?: string;
    };

    if (
      probeJson.allowed === false ||
      probeJson.code === "UndecampConflict" ||
      probeJson.error?.code === "UndecampConflict"
    ) {
      setDecampError(null);
      setRegBlockName(evacuee?.family_head_full_name);
      setRegBlockEcName(probeJson.ec_name || undefined);
      setRegBlockDisaster(probeJson.disaster_name || undefined);
      setRegBlockDisasterId(probeJson.disaster_id || undefined);
      setRegBlockDisasterType(probeJson.disaster_type_name || undefined);
      setRegBlockOpen(true);
      return;
    }

    // 2) Allowed → perform the real write (should be 200)
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decampment_timestamp: null }),
    });

    if (res.ok) {
      onClose();
      await onSaved?.();
    } else {
      const data = await res.json().catch(() => ({}));
      setDecampError(data?.message || "Failed to clear decampment.");
    }
  } finally {
    setSavingDecamp(false);
  }
  return;
}

if (latestArrival && decampDate <= latestArrival) {
  setDecampError(null);
  setDecampInvalidMsg(
    <>
      <b>{evacuee?.family_head_full_name}</b>: Decampment must be later than the
      family's latest arrival ({fmtDateTime(latestArrival)}).
    </>
  );
  setDecampInvalidOpen(true);
  return;
}

setSavingDecamp(true);
try {
  type DecampAPIResponse = {
    allowed?: boolean;
    code?: string;
    error?: { code?: string };
    message?: string;
    ec_name?: string;
    disaster_name?: string;
    disaster_id?: number;
    disaster_type_name?: string;
  };

  // 1) DRY-RUN probe 
  const probe = await fetch(`${url}?dry_run=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decampment_timestamp: decampDate.toISOString() }),
  });
  const probeJson = (await probe.json().catch(() => ({}))) as DecampAPIResponse;

  if (probeJson.allowed === false) {
    // Show modal instead of inline error
    setDecampError(null);
    setDecampInvalidMsg(
      <>
        <b>{evacuee?.family_head_full_name}</b>:{" "}
        {probeJson.message || "Decampment time is not valid."}
      </>
    );
    setDecampInvalidOpen(true);
    return; 
  }

  // 2) Real write (should succeed now)
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decampment_timestamp: decampDate.toISOString() }),
  });

  if (res.ok) {
    onClose();
    await onSaved?.();
  } else {
    const data = (await res.json().catch(() => ({}))) as DecampAPIResponse;
    // Fallback: show modal even if backend didn’t support dry_run yet
    setDecampInvalidMsg(
      <>
        <b>{evacuee?.family_head_full_name}</b>:{" "}
        {data?.message || "Failed to save decampment."}
      </>
    );
    setDecampInvalidOpen(true);
  }
} finally {
  setSavingDecamp(false);
}
};

function enforceDecampDateTimeBounds(dt: Date | null): boolean {
  if (!dt) return false;

  const res = checkDateBounds(dt, minDate, maxDate);
  if (res.ok === false) {
    if (res.kind === DateBound.BeforeMin) {
      setDecampInvalidMsg(
        <>
          Decampment cannot be before the disaster’s start (
          <b>{formatMMDDYYYY(res.bound)}</b>).
        </>
      );
    } else if (res.kind === DateBound.AfterMax) {
      setDecampInvalidMsg(
        <>
          Decampment cannot be in the future. Latest allowed is{" "}
          <b>{formatMMDDYYYY(res.bound)}</b>.
        </>
      );
    }
    setDecampInvalidOpen(true);
    return false;
  }
  const now = new Date();
  if (startOfDayLocal(dt).getTime() === startOfDayLocal(now).getTime() && dt.getTime() > now.getTime()) {
    setDecampInvalidMsg(<>Decampment time can’t be in the future.</>);
    setDecampInvalidOpen(true);
    return false;
  }
  return true;
}

  return (
    <>
      <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
        <DialogContent size="full">
          <DialogHeader>
            <DialogTitle className="text-green-700 text-xl font-bold">
              View Family
            </DialogTitle>
            <DialogDescription className="sr-only">
              View detailed information and demographics for the selected evacuee family.
            </DialogDescription>
          </DialogHeader>
          
          {/* SCROLLABLE BODY */}
          <div className="max-h-[70vh] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
          <div className="space-y-6">
            {/* Header section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Evacuation Center:</label>
                <Input value={centerName} readOnly className="w-full bg-gray-50" />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Head of the Family:</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input value={evacuee.family_head_full_name} readOnly className="w-full bg-gray-50 min-w-0" />
                  <Button
                    className={`bg-green-700 hover:bg-green-800 text-white px-3 py-1 text-sm cursor-pointer ${
                      !canTransfer ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                    onClick={() => {
                      setTransferOpen(true);
                      setNewHeadEvacueeId("");
                      setOldHeadNewRel("");
                    }}
                    disabled={!canTransfer}
                    title={
                      !canTransfer
                        ? (isDecamped
                            ? "Cannot transfer head: this family is already decamped."
                            : "No other eligible members to transfer to.")
                        : "Transfer Head"
                    }
                    aria-disabled={!canTransfer}
                  >
                    Transfer Head
                  </Button>
                </div>
              </div>
              
              <div className="w-full md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-semibold mb-2">Decampment:</label>
                <div className="flex flex-wrap items-center gap-3">
                {/* DATE (typeable + left calendar icon trigger) */}
                <div className="relative flex-1 min-w-[12rem]">
                  {/* LEFT calendar trigger (DateTimePicker is invisible; icon is visible) */}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 z-30">
                    <DateTimePicker
                      value={decampDate ?? undefined}
                      onChange={(d) => {
                        setTouched((t) => ({ ...t, date: true }));
                        if (!d) {
                          setDecampText("");
                          setDecampDate(null);
                          setTouched({ date: false, time: false });
                          setDecampError(null);
                          return;
                        }
                        // keep the currently-chosen time component
                        const merged = mergeDateAndTime(d, decampDate);
                        if (!merged || !enforceDecampDateTimeBounds(merged)) {
                          setDecampText("");
                          setDecampDate(null);
                          setTouched({ date: false, time: false });
                          return;
                        }
                        setDecampDate(merged);
                        setDecampText(formatMMDDYYYY(merged));
                        setDecampError(null);
                      }}
                      showTime={false}
                      placeholder=" "
                      className="absolute inset-0 h-10 w-10 p-0 opacity-0 cursor-pointer"
                      // Year bounds (days still enforced by enforceDecampDateTimeBounds)
                      minYear={(minDate ?? new Date(1900, 0, 1)).getFullYear()}
                      maxYear={maxDate.getFullYear()}
                    />
                    {/* Visible icon (non-interactive) */}
                    <Calendar className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-gray-400" />
                  </div>

                  {/* Typeable input MM/DD/YYYY (same look as other <Input> fields) */}
                  <Input
                    value={decampText}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDecampText(v);
                      const parsed = parseMMDDYYYY(v);
                      if (parsed) {
                        const merged = mergeDateAndTime(parsed, decampDate);
                        if (!merged || !enforceDecampDateTimeBounds(merged)) {
                          setDecampText("");
                          setDecampDate(null);
                          setTouched({ date: false, time: false });
                          setDecampError(null);
                          return;
                        }
                        setDecampDate(merged);
                        setDecampError(null);
                      }
                    }}
                    placeholder="MM/DD/YYYY"
                    className="w-full pl-10 pr-10 h-10"
                    inputMode="numeric"
                    pattern="\d{2}/\d{2}/\d{4}"
                    onBlur={() => {
                      const parsed = parseMMDDYYYY(decampText);
                      if (!parsed) {
                        setDecampText("");
                        setDecampDate(null);
                        setTouched({ date: false, time: false });
                        return;
                      }
                      const merged = mergeDateAndTime(parsed, decampDate);
                      if (!merged || !enforceDecampDateTimeBounds(merged)) {
                        setDecampText("");
                        setDecampDate(null);
                        setTouched({ date: false, time: false });
                        return;
                      }
                      setDecampDate(merged);
                      setDecampText(formatMMDDYYYY(merged));
                      setTouched((t) => ({ ...t, date: true }));
                    }}
                  />

                  {/* Clear × button */}
                  {decampDate && (
                    <button
                      type="button"
                      aria-label="Clear decampment date"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDecampDate(null);
                        setDecampText("");
                        setTouched({ date: false, time: false });
                        setDecampError(null);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-20 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-700 text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>


                {/* TIME (match CreateReportModal style) */}
                <div className="relative w-40 sm:w-44 md:w-48">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Clock className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    type="time"
                    value={decampTime}
                    onChange={(e) => {
                      const val = e.target.value; // "HH:MM"
                      setDecampTime(val);
                      if (!decampDate) return;

                      const [hhStr, mmStr] = val.split(":");
                      const hh = parseInt(hhStr ?? "", 10);
                      const mm = parseInt(mmStr ?? "", 10);
                      if (Number.isNaN(hh) || Number.isNaN(mm)) return;

                      const merged = new Date(decampDate);
                      merged.setHours(hh, mm, 0, 0);

                      if (!enforceDecampDateTimeBounds(merged)) return;

                      setDecampDate(merged);
                      setTouched((t) => ({ ...t, time: true }));
                      setDecampError(null);
                    }}
                    className={`pl-9 h-10 ${!decampDate ? "opacity-60 cursor-not-allowed" : ""}`}
                    disabled={!decampDate}
                  />
                </div>
                
                  {/* SAVE */}
                  <Button
                    className="h-10 bg-green-700 hover:bg-green-800 text-white px-4 text-sm cursor-pointer disabled:opacity-60"
                    onClick={handleSaveDecampment}
                    disabled={!canSaveDecamp}
                    title={
                      !hasChanges
                        ? "No changes to save"
                        : missingTimeForNew
                        ? "Please choose a time"
                        : "Save decampment"
                    }
                  >
                    {savingDecamp ? "Saving..." : "Save Decampment"}
                  </Button>
                  {!regBlockOpen && decampError && (
                    <span className="mt-1 block text-xs text-red-500" role="alert" aria-live="polite">
                      {decampError}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  To clear the decampment, clear the date and click “Save Decampment”.
                </p>
              </div>
            </div>
            
            {/* Breakdown table */}
            <div>
              <label className="block text-sm font-semibold mb-3">Individual Breakdown:</label>
              <div className="overflow-x-auto border rounded-lg">
              <div className="max-h-[50vh] overflow-x-auto overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-corner]:bg-transparent dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [scrollbar-width:thin] [scrollbar-color:rgb(209_213_219)_transparent] dark:[scrollbar-color:rgb(115_115_115)_transparent]">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-center font-semibold">Male</TableHead>
                        <TableHead className="text-center font-semibold">Female</TableHead>
                        <TableHead className="text-center font-semibold">Total</TableHead>
                        <TableHead className="text-center font-semibold">Infant<br/>(1 yr below)</TableHead>
                        <TableHead className="text-center font-semibold">Children<br/>(2-12 yrs)</TableHead>
                        <TableHead className="text-center font-semibold">Youth<br/>(13-17 yrs)</TableHead>
                        <TableHead className="text-center font-semibold">Adult<br/>(18-59 yrs)</TableHead>
                        <TableHead className="text-center font-semibold">Senior<br/>(60+ yrs)</TableHead>
                        <TableHead className="text-center font-semibold">PWD</TableHead>
                        <TableHead className="text-center font-semibold">Pregnant</TableHead>
                        <TableHead className="text-center font-semibold">Lactating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-center">
                          {members.filter((m: FamilyMember) => m.sex === "Male").length}
                        </TableCell>
                        <TableCell className="text-center">
                          {members.filter((m: FamilyMember) => m.sex === "Female").length}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {evacuee.total_individuals}
                        </TableCell>
                        <TableCell className="text-center">
                          {members.filter((m: any) => Number(m.age) < 2).length}
                        </TableCell>
                        <TableCell className="text-center">
                          {members.filter((m: any) => Number(m.age) >= 2 && Number(m.age) <= 12).length}
                        </TableCell>
                        <TableCell className="text-center">
                          {members.filter((m: any) => Number(m.age) >= 13 && Number(m.age) <= 17).length}
                        </TableCell>
                        <TableCell className="text-center">
                          {members.filter((m: any) => Number(m.age) >= 18 && Number(m.age) <= 59).length}
                        </TableCell>
                        <TableCell className="text-center">
                          {members.filter((m: any) => Number(m.age) >= 60).length}
                        </TableCell>
                        <TableCell className="text-center">
                          {members.filter((m: any) => m.vulnerability_types?.includes("Person with Disability")).length}
                        </TableCell>
                        <TableCell className="text-center">
                          {members.filter((m: any) => m.vulnerability_types?.includes("Pregnant Woman")).length}
                        </TableCell>
                        <TableCell className="text-center">
                          {members.filter((m: any) => m.vulnerability_types?.includes("Lactating Woman")).length}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Members table */}
            <div>
              <label className="block text-sm font-semibold mb-3">List of Family Members:</label>
              <div className="overflow-x-auto border rounded-lg">
                 <div className="max-h-[50vh] overflow-x-auto overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-corner]:bg-transparent dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500 [scrollbar-width:thin] [scrollbar-color:rgb(209_213_219)_transparent] dark:[scrollbar-color:rgb(115_115_115)_transparent]">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Full Name</TableHead>
                        <TableHead className="font-semibold">Age</TableHead>
                        <TableHead className="font-semibold">Barangay of Origin</TableHead>
                        <TableHead className="font-semibold">Sex</TableHead>
                        <TableHead className="font-semibold">Type of Vulnerability</TableHead>
                        <TableHead className="font-semibold">Room Name</TableHead>
                        <TableHead className="font-semibold">Time of Arrival</TableHead>
                        <TableHead className="font-semibold"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderedMembers.map((member: any, idx: number) => (
                        <TableRow key={idx} className="group hover:bg-gray-50">
                          <TableCell className="font-medium">{member.full_name}</TableCell>
                          <TableCell>{member.age}</TableCell>
                          <TableCell>{member.barangay_of_origin}</TableCell>
                          <TableCell>{member.sex}</TableCell>
                          <TableCell>
                            {(member.vulnerability_types?.length ?? 0) > 0 ? (
                              member.vulnerability_types.map((v: string, vIdx: number) => {
                                let colorClass = "bg-gray-100 text-gray-600";
                                if (v === "Infant") colorClass = "bg-pink-100 text-pink-600";
                                else if (v === "Child") colorClass = "bg-blue-100 text-blue-600";
                                else if (v === "Youth") colorClass = "bg-green-100 text-green-600";
                                else if (v === "Adult") colorClass = "bg-purple-100 text-purple-600";
                                else if (v === "Senior Citizen") colorClass = "bg-orange-100 text-orange-600";
                                else if (v === "Pregnant Woman") colorClass = "bg-red-100 text-red-600";
                                else if (v === "Lactating Woman") colorClass = "bg-rose-100 text-rose-600";
                                else if (v === "Person with Disability") colorClass = "bg-yellow-100 text-yellow-600";
                                return (
                                  <span
                                    key={vIdx}
                                    className={`inline-block px-2 py-1 mr-1 mb-1 rounded-full text-xs font-medium ${colorClass}`}
                                  >
                                    {v}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                None
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{member.room_name}</TableCell>
                          <TableCell>{formatDate(member.arrival_timestamp)}</TableCell>
                          <TableCell className="text-right flex justify-end items-center text-foreground">
                          <Pencil
                            className="w-4 h-4 text-gray-400 group-hover:text-green-700 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isDecamped) {
                                setEditBlockedName(member.full_name);
                                setEditBlockedOpen(true);
                                return;
                              }
                              onEditMember(member);
                            }}
                          />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Transfer Head Modal */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader className="mb-2">
            <DialogTitle className="text-green-700 text-xl font-bold">Transfer Head</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Reassign the family head.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Select new head</label>
              <Select value={newHeadEvacueeId} onValueChange={handleSelectNewHead}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a family member" />
                </SelectTrigger>
                <SelectContent>
                  {transferCandidates.map((m: any) => (
                    <SelectItem key={m.evacuee_id} value={String(m.evacuee_id)}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">Old head new relationship</label>
              <Input value={oldHeadNewRel} readOnly className="w-full bg-gray-50" />
              <p className="mt-1 text-xs text-gray-500">
                Auto-set from the selected member’s current relationship.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTransferOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              className="bg-green-700 hover:bg-green-800 text-white cursor-pointer disabled:cursor-not-allowed"
              disabled={!newHeadEvacueeId || !canTransfer || transferring || !oldHeadNewRel}
              onClick={handleConfirmTransfer}
            >
              {transferring ? "Transferring..." : "Confirm Transfer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    
      <RegisterBlockDialog
        open={regBlockOpen}
        onOpenChange={(open) => {
          setRegBlockOpen(open);
          if (!open) {
            setRegBlockDisaster(undefined);
            setRegBlockDisasterId(undefined);
            setRegBlockDisasterType(undefined); 
          }
        }}
        personName={regBlockName}
        ecName={regBlockEcName}
        title="Cannot remove decampment"
        secondaryLabel="OK"
        description={
          <>
            This family is already active
            {regBlockEcName ? <> in <b>{regBlockEcName}</b></> : " in another event"}
            {regBlockDisasterType || regBlockDisaster ? (
              <>
                {" "}for <b>{[regBlockDisasterType, regBlockDisaster].filter(Boolean).join(" ")}</b>
              </>
            ) : regBlockDisasterId ? (
              <> for disaster ID <b>{regBlockDisasterId}</b></>
            ) : null}
            . Only one active event is allowed. Decamp them there first.
          </>
        }
      />

      <RegisterBlockDialog
        open={editBlockedOpen}
        onOpenChange={setEditBlockedOpen}
        personName={editBlockedName}
        title="Cannot edit this evacuee"
        secondaryLabel="OK"
        description={
          <>This family is already decamped. To edit this person, remove the decampment first.</>
        }
      />
      <RegisterBlockDialog
        open={decampInvalidOpen}
        onOpenChange={setDecampInvalidOpen}
        personName={evacuee?.family_head_full_name}
        title="Cannot save decampment"
        secondaryLabel="OK"
        description={decampInvalidMsg}
      />
    </>
  );
};