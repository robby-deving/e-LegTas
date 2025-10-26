import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "../ui/dialog";
import { Button } from "../ui/button";
import LoadingSpinner from "../loadingSpinner";
import type { Disaster } from "@/types/disaster";

type DeleteDisasterModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  disaster: Disaster | null;
  onConfirm: (disaster: Disaster) => void;
  deleting?: boolean;
};

export default function DeleteDisasterModal({ 
  isOpen, 
  onOpenChange, 
  disaster, 
  onConfirm,
  deleting = false 
}: DeleteDisasterModalProps) {
  if (!disaster) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-700 text-xl font-bold">Delete Incident</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          <p className="text-gray-700">
            Are you sure you want to delete this disaster?
          </p>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="font-medium text-gray-900">
              {disaster.name}
            </p>
            <p className="text-sm text-gray-600">
              {disaster.type}
            </p>
          </div>
          <p className="text-sm text-red-600">
            This action cannot be undone. All associated evacuation data will be lost.
          </p>
        </div>

        <DialogFooter className="flex justify-end gap-3 pt-2">
          <DialogClose asChild>
            <Button 
              variant="outline" 
              className="cursor-pointer"
              disabled={deleting}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            className="cursor-pointer flex items-center gap-2"
            onClick={() => onConfirm(disaster)}
            disabled={deleting}
          >
            {deleting && <LoadingSpinner size="sm" />}
            {deleting ? "Deleting..." : "Delete Incident"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
