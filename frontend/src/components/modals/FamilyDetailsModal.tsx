//FamilyDetailsModal.tsx
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { usePermissions } from "@/contexts/PermissionContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Pencil, Calendar, Clock } from "lucide-react";
import type { FamilyMember, FamilyEvacueeInformation } from "@/types/EvacuationCenterDetails";
import { formatDate } from "@/utils/dateFormatter";
import { RegisterBlockDialog } from "@/components/modals/RegisterBlockDialog";
import { DateTimePicker } from "../ui/date-time-picker";
import { startOfDayLocal, DateBound, formatMMDDYYYY, mergeDateAndTime, checkDateBounds } from "@/utils/dateInput";
import BirthdayMaskedInput from "../EvacuationCenterDetail/BirthdayMaskedInput";
import { toISODateLocal } from "@/utils/dateInput";
import { useSelector } from "react-redux";
import { selectToken, selectUserId } from "@/features/auth/authSlice";
import AddService from "../EvacuationCenterDetail/AddService";

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

type FamilyDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  evacuee: FamilyEvacueeInformation | null;
  centerName: string;
  onEditMember: (member: FamilyMember) => void | Promise<void>;
  canUpdateEvacuee?: boolean;
  canUpdateFamily?: boolean;
  disasterStartDate?: string | null;
  onSaved?: (patch?: { id: number; decampment_timestamp: string | null }) => void | Promise<void>;
  eventEnded?: boolean;
  onEndedAction?: () => void;
};

// local row type so you can use created_at without changing global types
type ServiceRow = { service_received: string; created_at?: string };

export const FamilyDetailsModal: React.FC<FamilyDetailsModalProps> = ({
  isOpen,
  onClose,
  evacuee,
  centerName,
  onEditMember,
  canUpdateEvacuee = true,
  canUpdateFamily = true,
  disasterStartDate,
  onSaved,
  eventEnded = false,
  onEndedAction,
}) => {
  const token = useSelector(selectToken);
  const userId = useSelector(selectUserId);
  const { hasPermission } = usePermissions();
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
  const [touched, setTouched] = useState<{ date: boolean; time: boolean }>({
    date: hadExistingDecamp,
    time: hadExistingDecamp,
  });
  const [decampDate, setDecampDate] = useState<Date | null>(() =>
    evacuee?.decampment_timestamp ? new Date(evacuee.decampment_timestamp) : null
  );

  const [userEdited, setUserEdited] = useState(false);
  const originalDecamp = evacuee?.decampment_timestamp ? new Date(evacuee.decampment_timestamp) : null;
  const hasChanges = (originalDecamp?.getTime() ?? null) !== (decampDate?.getTime() ?? null);

  const toLocalStart = (v: string | Date) => startOfDayLocal(new Date(v));
  const minDate = disasterStartDate ? toLocalStart(disasterStartDate) : undefined;
  const maxDate = useMemo(() => new Date(), []);
  const minDateMs = minDate?.getTime();

const displayCenterName =
  centerName && centerName.trim().toLowerCase() !== "unknown"
    ? centerName
    : (evacuee?.view_family?.evacuation_center_name ?? "Unknown");

  useEffect(() => {
    if (!isOpen) return;

    const ts = evacuee?.decampment_timestamp;
    if (ts) {
      const d = new Date(ts);
      if (!Number.isNaN(d.getTime())) {
        if (!decampDate || decampDate.getTime() !== d.getTime()) {
          setDecampDate(d);
          setTouched({ date: true, time: true });
          setDecampError(null);
        }
        return;
      }
    }
    const now = new Date();
    const clamped = new Date(now);
    if (minDate && clamped < minDate) clamped.setTime(minDate.getTime());
    if (clamped > maxDate) clamped.setTime(maxDate.getTime());
    if (!decampDate || decampDate.getTime() !== clamped.getTime()) {
      setDecampDate(clamped);
      setTouched({ date: true, time: true });
      setDecampError(null);
    }
  }, [isOpen, evacuee?.decampment_timestamp, minDateMs, maxDate]);

  useEffect(() => {
    if (!isOpen) return;
    setUserEdited(false);
  }, [isOpen, evacuee?.id]);

  const missingTimeForNew = !hadExistingDecamp && touched.date && !touched.time;
  const canSaveDecamp = userEdited && hasChanges && !savingDecamp && !missingTimeForNew;

  const fmtHHMM = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const [decampTime, setDecampTime] = useState<string>(() => (decampDate ? fmtHHMM(decampDate) : ""));

  useEffect(() => {
    setDecampTime(decampDate ? fmtHHMM(decampDate) : "");
  }, [decampDate]);

  const [transferOpen, setTransferOpen] = useState(false);
  const [newHeadEvacueeId, setNewHeadEvacueeId] = useState<string>("");
  const [oldHeadNewRel, setOldHeadNewRel] = useState<string>("");
  const [transferring, setTransferring] = useState(false);
  const fmtDateTime = (d: Date) =>
    d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  const members: any[] = evacuee?.list_of_family_members?.family_members ?? [];

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
    const isHead = (m: any) => m?.relationship_to_family_head === "Head" || m?.full_name === evacuee?.family_head_full_name;
    return [...members].sort((a, b) => Number(!isHead(a)) - Number(!isHead(b)));
  }, [members, evacuee?.family_head_full_name]);

  if (!isOpen || !evacuee) return null;

  const transferCandidates: any[] = members.filter((m) => m.full_name !== evacuee.family_head_full_name);
  const isDecamped = Boolean(evacuee?.decampment_timestamp);
  const canTransfer =
    !isDecamped && transferCandidates.length > 0 && Boolean(evacuee?.id) && Boolean(evacuee?.disaster_evacuation_event_id);

  const handleSelectNewHead = (value: string) => {
    setNewHeadEvacueeId(value);
    const cand = transferCandidates.find((m) => String(m.evacuee_id) === value);
    const relToOldHead: string | undefined = cand?.relationship_to_family_head;
    const inverse = relToOldHead && INVERSE_REL[relToOldHead] ? INVERSE_REL[relToOldHead] : "Relative";
    setOldHeadNewRel(inverse);
  };

  const handleConfirmTransfer = async () => {
    try {
      if (!newHeadEvacueeId) return;
      setTransferring(true);

      let rel = oldHeadNewRel;
      if (!rel) {
        const cand = transferCandidates.find((m: any) => String(m.evacuee_id) === String(newHeadEvacueeId));
        const toRel = cand?.relationship_to_family_head;
        rel = toRel && INVERSE_REL[toRel] ? INVERSE_REL[toRel] : "Relative";
        setOldHeadNewRel(rel);
      }

      const url = `/api/v1/evacuees/${Number(evacuee.disaster_evacuation_event_id)}/transfer-head`;

      const body = {
        from_family_head_id: Number(evacuee.id),
        to_evacuee_resident_id: Number(newHeadEvacueeId),
        old_head_new_relationship: rel,
      };

      await axios.post(url, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
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
    if (eventEnded) return;
    setDecampError(null);

    const eventId = Number(evacuee?.disaster_evacuation_event_id);
    const familyHeadId = Number(evacuee?.id);
    if (!eventId || !familyHeadId) {
      setDecampError("Missing event or family head id.");
      return;
    }

    const url = `/api/v1/evacuees/${eventId}/families/${familyHeadId}/decamp`;

    if (!decampDate) {
      setSavingDecamp(true);
      try {
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
          <b>{evacuee?.family_head_full_name}</b>: Decampment must be later than the family's latest arrival (
          {fmtDateTime(latestArrival)}).
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

      const probe = await fetch(`${url}?dry_run=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decampment_timestamp: decampDate.toISOString() }),
      });
      const probeJson = (await probe.json().catch(() => ({}))) as DecampAPIResponse;

      if (probeJson.allowed === false) {
        setDecampError(null);
        setDecampInvalidMsg(
          <>
            <b>{evacuee?.family_head_full_name}</b>: {probeJson.message || "Decampment time is not valid."}
          </>
        );
        setDecampInvalidOpen(true);
        return;
      }

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
        setDecampInvalidMsg(
          <>
            <b>{evacuee?.family_head_full_name}</b>: {data?.message || "Failed to save decampment."}
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
            Decampment cannot be before the disaster’s start (<b>{formatMMDDYYYY(res.bound)}</b>).
          </>
        );
      } else if (res.kind === DateBound.AfterMax) {
        setDecampInvalidMsg(
          <>
            Decampment cannot be in the future. Latest allowed is <b>{formatMMDDYYYY(res.bound)}</b>.
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
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent size="full">
          <DialogHeader>
            <DialogTitle className="text-green-700 text-xl font-bold">View Family</DialogTitle>
            <DialogDescription className="sr-only">
              View detailed information and demographics for the selected evacuee family.
            </DialogDescription>
          </DialogHeader>

          {/* SCROLLABLE BODY */}
          <div className="max-h-[70vh] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
            <div className="space-y-6">

              {/* Header section — EXACT 2x2 layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Row 1 / Col 1 — Evacuation Center */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Evacuation Center:</label>
                  <Input value={displayCenterName} readOnly className="w-full bg-gray-50" />
                </div>

                {/* Row 1 / Col 2 — Decampment */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Decampment:</label>
                  <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
                    {/* DATE (masked input + left calendar icon trigger) */}
                    <div className="relative flex-1 min-w-[14rem]">
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 z-30">
                        <DateTimePicker
                          value={decampDate ?? undefined}
                          onChange={(d) => {
                            if (eventEnded) return;
                            setTouched((t) => ({ ...t, date: true }));
                            if (!d) {
                              setDecampDate(null);
                              setTouched({ date: false, time: false });
                              setDecampError(null);
                              setUserEdited(true);
                              return;
                            }
                            const merged = mergeDateAndTime(d, decampDate);
                            if (!merged || !enforceDecampDateTimeBounds(merged)) {
                              setDecampDate(null);
                              setTouched({ date: false, time: false });
                              return;
                            }
                            setDecampDate(merged);
                            setDecampError(null);
                            setUserEdited(true);
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
                        value={decampDate ? toISODateLocal(decampDate) : ""}
                        onChange={(iso) => {
                          if (!iso) {
                            setDecampDate(null);
                            setTouched({ date: false, time: false });
                            setDecampError(null);
                            setUserEdited(true);
                            return;
                          }
                          const parsed = new Date(`${iso}T00:00:00`);
                          const merged = mergeDateAndTime(parsed, decampDate);
                          if (!merged || !enforceDecampDateTimeBounds(merged)) {
                            setDecampDate(null);
                            setTouched({ date: false, time: false });
                            return;
                          }
                          setDecampDate(merged);
                          setTouched((t) => ({ ...t, date: true }));
                          setDecampError(null);
                          setUserEdited(true);
                        }}
                        required={false}
                        className={`w-full pl-10 pr-10 h-10 ${eventEnded ? "opacity-60" : ""}`}
                        placeholder="MM/DD/YYYY"
                      />

                      {decampDate && (
                        <button
                          type="button"
                          aria-label="Clear decampment date"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDecampDate(null);
                            setTouched({ date: false, time: false });
                            setDecampError(null);
                            setUserEdited(true);
                          }}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 inline-flex h-5 w-5 items-center justify-center rounded-full ${
                            eventEnded ? "bg-gray-300 text-white" : "bg-green-700 text-white hover:bg-green-800"
                          }`}
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* TIME */}
                    <div className="relative w-40 sm:w-44 md:w-48 shrink-0">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Clock className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        type="time"
                        value={decampTime}
                        onChange={(e) => {
                          const val = e.target.value;
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
                          setUserEdited(true);
                        }}
                        className={`pl-9 h-10 ${!decampDate ? "opacity-60 cursor-not-allowed" : ""} ${eventEnded ? "opacity-60" : ""}`}
                        disabled={!decampDate}
                      />
                    </div>

                    {/* Save/Decamp Button */}
                    {canUpdateEvacuee && (
                      <div className="shrink-0">
                        <Button
                          className={`h-10 bg-green-700 hover:bg-green-800 text-white px-4 text-sm cursor-pointer ${
                            (eventEnded || !canSaveDecamp) ? "opacity-60" : ""
                          }`}
                          onClick={() => (eventEnded ? onEndedAction?.() : handleSaveDecampment())}
                          disabled={!eventEnded && !canSaveDecamp}
                          aria-disabled={eventEnded || !canSaveDecamp}
                          title={
                            eventEnded
                              ? "Evacuation operation already ended"
                              : (!hasChanges ? "No changes to save" : (missingTimeForNew ? "Please choose a time" : "Save decampment"))
                          }
                        >
                          {savingDecamp ? "Saving..." : "Decamp"}
                        </Button>
                        {!regBlockOpen && decampError && (
                          <span className="mt-1 block text-xs text-red-500" role="alert" aria-live="polite">
                            {decampError}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">To clear the decampment, clear the date and click "Decamp".</p>
                </div>

                {/* Row 2 / Col 1 — Head of the Family */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Head of the Family:</label>
                  <div className="flex items-center gap-2">
                    <Input value={evacuee.family_head_full_name} readOnly className="w-full bg-gray-50 min-w-0" />
                    {canUpdateFamily && (
                      <Button
                        className={`bg-green-700 hover:bg-green-800 text-white px-3 py-1 text-sm cursor-pointer ${
                          !canTransfer ? "opacity-60 cursor-not-allowed" : ""
                        } ${eventEnded ? "opacity-60 cursor-not-allowed" : ""}`}
                        onClick={() => {
                          if (eventEnded) {
                            onEndedAction?.();
                            return;
                          }
                          setTransferOpen(true);
                          setNewHeadEvacueeId("");
                          setOldHeadNewRel("");
                        }}
                        disabled={!canTransfer || eventEnded}
                        aria-disabled={!canTransfer || eventEnded}
                        title={
                          eventEnded
                            ? "Evacuation operation already ended"
                            : (!canTransfer
                                ? (isDecamped ? "Cannot transfer head: this family is already decamped." : "No other eligible members to transfer to.")
                                : "Transfer Head")
                        }
                      >
                        Transfer Head
                      </Button>
                    )}
                  </div>
                </div>

                {/* Row 2 / Col 2 — Services */}
                {hasPermission("add_relief_service") && (
                  <div>
                    <label className="block text-sm font-semibold mb-2">Services</label>
                    <AddService
                      onValueChange={() => {}}
                      familyId={Number(evacuee?.id)}
                      eventId={Number(evacuee?.disaster_evacuation_event_id)}
                      token={token!}
                      addedBy={Number(userId)}
                      onSuccess={async () => {
                        await onSaved?.();
                      }}
                      placeholder="Add Service(s)"
                      className="w-full"
                      showLabel={false}  
                    />
                  </div>
                )}
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
                          <TableHead className="text-center font-semibold">Infant<br />(1 yr below)</TableHead>
                          <TableHead className="text-center font-semibold">Children<br />(2-12 yrs)</TableHead>
                          <TableHead className="text-center font-semibold">Youth<br />(13-17 yrs)</TableHead>
                          <TableHead className="text-center font-semibold">Adult<br />(18-59 yrs)</TableHead>
                          <TableHead className="text-center font-semibold">Senior<br />(60+ yrs)</TableHead>
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
                          <TableCell className="text-center font-semibold">{evacuee.total_individuals}</TableCell>
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
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">None</span>
                              )}
                            </TableCell>
                            <TableCell>{member.room_name}</TableCell>
                            <TableCell>{formatDate(member.arrival_timestamp)}</TableCell>
                            <TableCell className="text-right flex justify-end items-center text-foreground">
                              {canUpdateFamily && (
                                <Pencil
                                  className="w-4 h-4 text-gray-400 group-hover:text-green-700 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (eventEnded) {
                                      onEndedAction?.();
                                      return;
                                    }
                                    if (isDecamped) {
                                      setEditBlockedName(member.full_name);
                                      setEditBlockedOpen(true);
                                      return;
                                    }
                                    onEditMember(member);
                                  }}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Service(s) Received */}
              <div>
                <label className="block text-sm font-semibold mb-3">Service(s) Received:</label>

                <div className="overflow-x-auto border rounded-lg">
                  <div className="max-h-[50vh] overflow-x-auto overflow-y-auto pr-2 pb-2">
                    <Table className="text-sm w-full">
                      <colgroup>
                        <col style={{ width: "70%" }} />
                        <col style={{ width: "30%" }} />
                      </colgroup>

                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-left font-semibold">Service(s)</TableHead>
                          <TableHead className="text-left font-semibold">Date Received</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {evacuee?.relief_goods_and_services &&
                        evacuee.relief_goods_and_services.length > 0 ? (
                          (evacuee.relief_goods_and_services as ServiceRow[]).map((service, index) => (
                            <TableRow key={index} className="border-b last:border-0">
                              <TableCell className="text-left align-top">
                                <span className="block leading-5 break-words">{service.service_received}</span>
                              </TableCell>
                              <TableCell className="text-left align-top">
                                {service.created_at ? formatDate(service.created_at) : "—"}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-gray-500">
                              No relief goods and services received
                            </TableCell>
                          </TableRow>
                        )}
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
        description={<>This family is already decamped. To edit this person, remove the decampment first.</>}
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
