// src/components/modals/AlreadyEndedDialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { X } from "lucide-react";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function AlreadyEndedDialog({ open, onOpenChange }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="relative sm:max-w-[580px] p-0">
        {/* Close (X) */}
        <button
          type="button"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center
                     rounded-lg border border-gray-300 bg-white text-gray-500
                     hover:bg-gray-50 hover:text-gray-700 focus:outline-none
                     focus:ring-2 focus:ring-gray-300 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Body */}
        <div className="px-6 pt-6 pb-0">
          <AlertDialogTitle className="text-red-700 text-lg font-semibold">
            Evacuation Operation Already Ended
          </AlertDialogTitle>

          {/* AlertDialogDescription for accessibility */}
          <AlertDialogDescription className="mt-2 text-sm text-muted-foreground leading-relaxed">
            This evacuation event has ended. You can still view data, but the following actions are disabled:
            
            {/* Comma-separated items, all gray and bold */}
            <span className="mt-3 text-sm text-gray-600 font-semibold block">
              Register Evacuee, Manual Register, Edit Member, Transfer Head, Save/Clear Decampment
            </span>
          </AlertDialogDescription>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 flex justify-end">
          <AlertDialogAction className="cursor-pointer">Okay</AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AlreadyEndedDialog;
