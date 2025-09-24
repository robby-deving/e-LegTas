import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

interface SearchEvacuationProps {
  isOpen: boolean;
  onClose: () => void;
  searchName: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchResults: any[]; // TODO: Replace with proper type
  onSelectEvacuation: (evacuation: any) => void; // TODO: Replace with proper type
}

export const SearchEvacuation = ({
  isOpen,
  onClose,
  searchName,
  onSearchChange,
  searchResults,
  onSelectEvacuation,
}: SearchEvacuationProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-green-700 text-xl font-bold">
            Search Evacuation
          </DialogTitle>
          <DialogDescription>
            Search for an evacuation by name. Select one to view details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Input
            placeholder="Search Evacuation"
            value={searchName}
            onChange={onSearchChange}
            className="w-full"
            autoFocus
          />

          {searchResults.length > 0 ? (
            <div className="space-y-1 max-h-60 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
              {searchResults.map((evacuation, idx) => {
                // TODO: Replace with actual evacuation data structure
                const name = evacuation.name || "Unknown";
                const details = evacuation.details || "";

                return (
                  <button
                    key={evacuation.id ?? idx}
                    type="button"
                    className="w-full text-left cursor-pointer p-2 hover:bg-gray-100 rounded transition-colors"
                    onClick={() => onSelectEvacuation(evacuation)}
                  >
                    <div className="font-medium text-sm">{name}</div>
                    {details && <div className="text-xs text-gray-500">{details}</div>}
                  </button>
                );
              })}
            </div>
          ) : searchName.trim() ? (
            <p className="text-gray-500 text-center text-sm py-4">No results found</p>
          ) : null}
        </div>
        <div className="flex items-center justify-between h-8">
            <p className="text-black text-sm py-4">Juan Dela Cruz</p>
            <div className="bg-green-700 hover:bg-green-800 text-white text-xs rounded px-4 py-1 flex gap-2 items-center cursor-pointer">Activate</div>
        </div>
        <div className="flex items-center justify-between h-8">
            <p className="text-black text-sm py-4">Juan Dela Cruz</p>
            <div className="bg-[#0192D4]  text-white text-xs rounded px-4 py-1 flex gap-2 items-center cursor-pointer">Active</div>
        </div>
        <div className="flex items-center justify-between h-8">
            <p className="text-black text-sm py-4">Juan Dela Cruz</p>
            <div className="bg-[#BE1E2D]  text-white text-xs rounded px-4 py-1 flex gap-2 items-center">Ended</div>
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
