import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "../ui/dialog";
import { Button } from "../ui/button";

type DeleteReportModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reportName?: string;
  onConfirm: () => void;
};

export default function DeleteReportModal({ isOpen, onOpenChange, reportName, onConfirm }: DeleteReportModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-red-700 text-xl font-bold">Delete Report</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-gray-700">
          {`Delete report "${reportName ?? ''}"? This action cannot be undone.`}
        </div>
        <DialogFooter className="flex justify-end space-x-2 pt-2">
          <DialogClose asChild>
            <Button variant="outline" className="cursor-pointer">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            className="cursor-pointer"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

