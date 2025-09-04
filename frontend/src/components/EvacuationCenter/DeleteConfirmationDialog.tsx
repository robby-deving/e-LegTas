// src/components/EvacuationCenter/DeleteConfirmationDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import LoadingSpinner from "../loadingSpinner";
import type { EvacuationCenter } from "../../types/evacuation";

type DeleteConfirmationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  center: EvacuationCenter | null;
  isDeleting?: boolean;
};

export default function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  center,
  isDeleting = false,
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-700 text-xl font-bold">
            Confirm Delete
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this evacuation center?
          </p>
          <p className="text-sm text-gray-600 mt-2">
            This action cannot be undone.
          </p>
          {center && (
            <p className="text-sm font-medium mt-2 text-gray-800">
              "{center.name}"
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-700 hover:bg-red-800 text-white disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <LoadingSpinner size="sm" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
