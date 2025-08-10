// src/components/announcements/CreateAnnouncementModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";

type CreateAnnouncementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  formData: { title: string; body: string };
  onInputChange: (field: string, value: string) => void;
  onSave: () => void;
};

export default function CreateAnnouncementModal({
  isOpen,
  onClose,
  formData,
  onInputChange,
  onSave,
}: CreateAnnouncementModalProps) {
  const isFormValid = formData.title.trim() && formData.body.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-green-700 text-xl font-bold">
            Create Announcement
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium mb-2">Title:</label>
            <Input
              placeholder="Announcement Title"
              value={formData.title}
              onChange={(e) => onInputChange('title', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description:</label>
            <Textarea
              placeholder="Announcement description"
              value={formData.body}
              onChange={(e) => onInputChange('body', e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            className="bg-green-700 hover:bg-green-800 text-white"
            disabled={!isFormValid}
          >
            Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}