// src/components/announcements/ConfirmPostDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";

type ConfirmPostDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onBackToEdit: () => void;
  formData: { title: string; body: string };
};

export default function ConfirmPostDialog({
  isOpen,
  onClose,
  onConfirm,
  onBackToEdit,
  formData,
}: ConfirmPostDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-green-700 text-xl font-bold">
            Review Announcement
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-600">
            Please review your announcement before posting:
          </p>
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-900 mt-1 font-bold">{formData.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{formData.body}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Once posted, this announcement will be visible to the users.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onBackToEdit}>
            Back to Edit
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-green-700 hover:bg-green-800 text-white"
          >
            Confirm & Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}