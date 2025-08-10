// SearchEvacueeModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import type { Evacuee } from "@/types/EvacuationCenterDetails";

interface SearchEvacueeModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchName: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchResults: Evacuee[];
  onSelectEvacuee: (evacuee: Evacuee) => void;
  onManualRegister: () => void;
}

export const SearchEvacueeModal = ({
  isOpen,
  onClose,
  searchName,
  onSearchChange,
  searchResults,
  onSelectEvacuee,
  onManualRegister
}: SearchEvacueeModalProps) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-green-700 text-xl font-bold">Search Registered Evacuee</DialogTitle>
          <DialogDescription>
            Search for an evacuee by name. Select one to register, or proceed with manual registration if not found.
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
            <div
              className="space-y-1 max-h-60 overflow-y-auto pr-2
                         [&::-webkit-scrollbar]:w-2
                         [&::-webkit-scrollbar-track]:rounded-full
                         [&::-webkit-scrollbar-track]:bg-gray-100
                         [&::-webkit-scrollbar-thumb]:rounded-full
                         [&::-webkit-scrollbar-thumb]:bg-gray-300
                         dark:[&::-webkit-scrollbar-track]:bg-neutral-700
                         dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
            >
              {searchResults.map((evacuee: Evacuee) => {
                const fullName = [evacuee.first_name, evacuee.middle_name, evacuee.last_name, evacuee.suffix]
                  .filter(Boolean)
                  .join(" ")
                  .replace(/\s+/g, " ")
                  .trim();
                const raw = (evacuee as any).barangay_name ?? evacuee.barangay_of_origin ?? "";
                const barangayLabel = raw
                  ? (/^\s*(bgy\.?|barangay)\b/i.test(String(raw)) ? String(raw) : `Bgy. ${raw}`)
                  : "Unknown";

                const subline = [
                  barangayLabel,
                  evacuee.purok ? `Purok ${evacuee.purok}` : null
                ]
                  .filter(Boolean)
                  .join(" • ");

                return (
                  <button
                    key={evacuee.evacuee_resident_id}
                    type="button"
                    className="w-full text-left cursor-pointer p-2 hover:bg-gray-100 rounded transition-colors"
                    onClick={() => onSelectEvacuee(evacuee)}
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
          <Button variant="outline" onClick={onClose} className="px-6 cursor-pointer">
            Cancel
          </Button>
          <Button
            onClick={onManualRegister}
            className="bg-green-700 hover:bg-green-800 text-white px-6 cursor-pointer"
          >
            Manual Register
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
