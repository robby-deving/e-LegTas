// FamilyHeadSearchModal.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import type { FamilyHeadResult } from "@/types/EvacuationCenterDetails";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchResults: FamilyHeadResult[];
  onSelectFamilyHead: (fh: FamilyHeadResult) => void;
  loading?: boolean;
};

export const FamilyHeadSearchModal = ({
  isOpen,
  onClose,
  searchTerm,
  onSearchChange,
  searchResults,
  onSelectFamilyHead,
  loading,
}: Props) => {
  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-green-700 text-xl font-bold">
            Search Family Head
          </DialogTitle>
          <DialogDescription>
            Search for the family head by name. Select from the results to
            pre-fill family head information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Input
            placeholder="Search Family Head"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)} 
            className="w-full"
            autoFocus
          />


          {loading && <p className="text-sm text-gray-500">Searching…</p>}

          {!loading && searchResults.length > 0 ? (
            <div className="space-y-1 max-h-60 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
              {searchResults.map((fh) => (
                <button
                  key={fh.family_head_id}
                  type="button"
                  className="w-full text-left cursor-pointer p-2 hover:bg-gray-100 rounded transition-colors"
                  onClick={() => onSelectFamilyHead(fh)}
                >
                  <div className="font-medium text-sm">
                    {fh.family_head_full_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {fh.barangay || "Unknown"}
                    {fh.purok ? ` • Purok ${fh.purok}` : ""}
                    {fh.evacuation_room ? ` • Room: ${fh.evacuation_room}` : ""}
                  </div>
                </button>
              ))}
            </div>
          ) : !loading && searchTerm.trim() ? (
            <p className="text-gray-500 text-center text-sm py-4">
              No family heads found
            </p>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
