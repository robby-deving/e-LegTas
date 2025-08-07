
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

export const FamilyHeadSearchModal = ({
  isOpen,
  onClose,
  searchTerm,
  onSearchChange,
  searchResults,
  onSelectFamilyHead
}: any) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-green-700 text-xl font-bold">Search Family Head</DialogTitle>
        <DialogDescription>
        Search for the family head by name. Select from the results to pre-fill family head information.
      </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <Input
            placeholder="Search Family Head"
            value={searchTerm}
            onChange={onSearchChange}
            className="w-full"
            autoFocus
          />
          {searchResults.length > 0 ? (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {searchResults.map((evacuee: any) => (
                <div
                  key={evacuee.id}
                  className="cursor-pointer p-2 hover:bg-gray-100 rounded flex items-center justify-between text-sm"
                  onClick={() => onSelectFamilyHead(evacuee)}
                >
                  <span>{evacuee.familyHead}</span>
                  <span className="text-gray-500 text-xs">{evacuee.barangay}</span>
                </div>
              ))}
            </div>
          ) : searchTerm.trim() ? (
            <p className="text-gray-500 text-center text-sm py-4">No family heads found</p>
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
