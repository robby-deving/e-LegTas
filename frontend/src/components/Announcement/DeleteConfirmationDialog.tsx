// src/components/announcements/DeleteConfirmationDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import LoadingSpinner from "../loadingSpinner";

// Type definition for Announcement
type Announcement = {
  id: number;
  title: string;
  body: string;
  date: string;
  created_by: number;
  created_at: string;
};

type DeleteConfirmationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  announcement: Announcement | null;
  isDeleting?: boolean;
};

export default function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  announcement,
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
            Are you sure you want to delete this announcement?
          </p>
          {announcement && (
            <p className="text-sm font-medium mt-2 text-gray-800">
              "{announcement.title}"
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