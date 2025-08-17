// src/components/modals/RegisterBlockDialog.tsx
import * as React from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { XIcon } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personName?: string;
  ecName?: string;                    
  description?: React.ReactNode;      
  onSecondaryAction?: () => void;     
  secondaryLabel?: string;
  closeLabel?: string;
  title?: string | null;              
};

export function RegisterBlockDialog({
  open,
  onOpenChange,
  personName,
  ecName,
  description,
  onSecondaryAction,
  secondaryLabel = "OK",
  closeLabel = "Close",
  title = "Cannot register this evacuee",
}: Props) {
  const message =
    description ?? (
      <>
        <span className="font-semibold text-gray-700">{personName}</span>{" "}
        is still actively registered
        {ecName ? (
          <>
            {" "}in{" "}
            <span className="font-semibold text-gray-700">{ecName}</span>
          </>
        ) : (
          " in another event"
        )}
        . Please decamp them there first before registering here.
      </>
    );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {/* Let Radix manage aria-labelledby/aria-describedby via Title/Description */}
      <AlertDialogContent className="relative fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform z-[60]">
        {/* Top-right close “x” */}
        <button
          type="button"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          <XIcon className="h-4 w-4" />
        </button>

        <AlertDialogHeader>
          {/* Always render a Title; if empty, keep it screen-reader-only */}
          {title && title.trim() ? (
            <AlertDialogTitle className="text-red-700 text-xl font-bold">
              {title}
            </AlertDialogTitle>
          ) : (
            <AlertDialogTitle>
              <span className="sr-only">Registration blocked</span>
            </AlertDialogTitle>
          )}

          {/* Always render a Description */}
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer text-foreground border-border">
            {closeLabel}
          </AlertDialogCancel>

          {onSecondaryAction && (
            <AlertDialogAction
              className="cursor-pointer bg-green-700 hover:bg-green-800 text-white"
              onClick={onSecondaryAction}
            >
              {secondaryLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
