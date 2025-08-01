
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

export const SearchEvacueeModal = ({
  isOpen,
  onClose,
  searchName,
  onSearchChange,
  searchResults,
  onSelectEvacuee,
  onManualRegister
}: any) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-green-700 text-xl font-bold">Search Registered Evacuee</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <Input
            placeholder="Search Name"
            value={searchName}
            onChange={onSearchChange}
            className="w-full"
          />
          {searchResults.length > 0 ? (
            <div className="space-y-1">
              {searchResults.map((evacuee: any) => (
                <div
                  key={evacuee.id}
                  className="cursor-pointer p-1 hover:bg-gray-100 rounded flex items-center justify-between px-3 text-sm"
                  onClick={() => onSelectEvacuee(evacuee)}
                >
                  <span>{evacuee.familyHead}</span>
                </div>
              ))}
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
