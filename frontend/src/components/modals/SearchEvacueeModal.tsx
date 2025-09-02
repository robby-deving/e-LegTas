// SearchEvacueeModal.tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { DuplicateWarningDialog } from "@/components/modals/DuplicateWarningDialog";
import { DuplicateInOtherECDialog } from "@/components/modals/DuplicateInOtherECDialog";
import type { Evacuee } from "@/types/EvacuationCenterDetails";

interface SearchEvacueeModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchName: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchResults: Evacuee[];
  onSelectEvacuee: (evacuee: Evacuee) => void;
  onManualRegister: () => void;
  eventEnded?: boolean;
onEndedAction?: () => void;

  registeredIds?: Set<number>;
  canCreateFamilyInformation?: boolean;
  currentEventId: number | string | null;
  currentEcId: number | null;
  currentDisasterId: number | string | null;
}

export const SearchEvacueeModal = ({
  isOpen,
  onClose,
  searchName,
  onSearchChange,
  searchResults,
  onSelectEvacuee,
  onManualRegister,
  registeredIds,
  canCreateFamilyInformation = true, 
  currentEventId,
  currentEcId,
  currentDisasterId,
  eventEnded,
onEndedAction,

}: SearchEvacueeModalProps) => {

  const [warnOpen, setWarnOpen] = useState(false);
  const [conflictName, setConflictName] = useState<string>("");
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [blockedName, setBlockedName] = useState<string>("");
  const [blockedEcName, setBlockedEcName] = useState<string | undefined>(undefined);
  const eventIdNum = currentEventId != null && currentEventId !== "" ? Number(currentEventId) : null;
  const disasterIdNum = currentDisasterId != null && currentDisasterId !== "" ? Number(currentDisasterId) : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-700 text-xl font-bold">
              Search Registered Evacuee
            </DialogTitle>
            <DialogDescription>
              Search for an evacuee by name. Select one to register, or proceed
              with manual registration if not found.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Input
              placeholder="Search Name"
              value={searchName}
              onChange={onSearchChange}
              className="w-full"
              autoFocus
            />

            {searchResults.length > 0 ? (
              <div className="space-y-1 max-h-60 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
                {searchResults.map((evacuee, idx) => {
                  const fullName = [
                    evacuee.first_name,
                    evacuee.middle_name,
                    evacuee.last_name,
                    evacuee.suffix,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim();

                  const raw = evacuee.barangay_name ?? evacuee.barangay_of_origin ?? "";
                  const barangayLabel = raw
                    ? /^\s*(bgy\.?|barangay)\b/i.test(String(raw))
                      ? String(raw)
                      : `Bgy. ${raw}`
                    : "Unknown";

                  const subline = [barangayLabel, evacuee.purok ? `Purok ${evacuee.purok}` : null]
                    .filter(Boolean)
                    .join(" • ");

                  return (
                    <button
                      key={evacuee.evacuee_resident_id ?? idx}
                      type="button"
                      className="w-full text-left cursor-pointer p-2 hover:bg-gray-100 rounded transition-colors"
                      onClick={() => {
                        const id = evacuee.evacuee_resident_id;

                        if (registeredIds?.has(id)) {
                          setConflictName(fullName);
                          setWarnOpen(true);
                          return;
                        }

                        // 2) Block if ACTIVE in a different EC within the SAME DISASTER (or same event as fallback)
                        const isActive =
                          evacuee.is_active ?? (evacuee.decampment_timestamp == null);
                        const activeEventId =
                          evacuee.active_event_id ?? evacuee.disaster_evacuation_event_id ?? null;
                        const activeDisasterId = (evacuee as any).active_disaster_id ?? null;
                        const activeEcId = evacuee.active_ec_id ?? null;
                        const activeEcName = evacuee.active_ec_name ?? "another evacuation center";

                        const sameDisaster =
                          disasterIdNum != null &&
                          activeDisasterId != null &&
                          Number(activeDisasterId) === Number(disasterIdNum);

                        const sameEvent =
                          eventIdNum != null &&
                          activeEventId != null &&
                          Number(activeEventId) === eventIdNum;

                        const matchesScope = sameDisaster || sameEvent;

                        const activeInOtherEC =
                          matchesScope &&
                          isActive &&
                          activeEcId != null &&
                          currentEcId != null &&
                          Number(activeEcId) !== Number(currentEcId);

                        if (activeInOtherEC) {
                          setBlockedName(fullName);
                          setBlockedEcName(activeEcName || undefined);
                          setBlockedOpen(true);
                          return;
                        }

                        console.info("[SearchEvacueeModal] Proceeding with selection", {
                          id,
                          name: fullName,
                        });
                        onSelectEvacuee(evacuee);
                      }}
                    >
                      <div className="font-medium text-sm">{fullName}</div>
                      {subline && <div className="text-xs text-gray-500">{subline}</div>}
                    </button>
                  );
                })}
              </div>
            ) : searchName.trim() ? (
              <p className="text-gray-500 text-center text-sm py-4">No results found</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6 cursor-pointer"
            >
              Cancel
            </Button>
            {/* Manual Register Button - Only visible with create_family_information permission */}
            {canCreateFamilyInformation && (
              <Button
                className="bg-green-700 hover:bg-green-800 text-white px-6 cursor-pointer disabled:opacity-60"
                disabled={!!eventEnded}
                
                onClick={() => (eventEnded ? onEndedAction?.() : onManualRegister())}
                title={eventEnded ? "Evacuation operation already ended" : "Manual Register"}
              >
                Manual Register
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate in this EC */}
      <DuplicateWarningDialog
        open={warnOpen}
        onOpenChange={setWarnOpen}
        personName={conflictName}
        onManualRegister={onManualRegister}
        centerLabel="this evacuation center"
      />

      {/* Active in another EC within the same disaster */}
      <DuplicateInOtherECDialog
        open={blockedOpen}
        onOpenChange={setBlockedOpen}
        personName={blockedName}
        ecName={blockedEcName}
      />
    </>
  );
};
