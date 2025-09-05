import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { XIcon } from "lucide-react";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; personName?: string; onManualRegister: () => void; centerLabel?: string; cancelLabel?: string; proceedLabel?: string; description?: string; };

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  personName,
  onManualRegister,
  centerLabel = "this evacuation center",
  cancelLabel = "Close",
  proceedLabel = "Manual Register",
  description,
}: Props) {
  const message = description ?? (
    <>
      {personName && (
        <span className="font-semibold text-gray-700">{personName}</span>
      )}{" "}
      is already registered in {centerLabel}. If this is a different individual
      with the same name, proceed with manual registration.
    </>
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {/* force true center & higher z-index */}
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
          <AlertDialogTitle className="text-red-700 text-xl font-bold">
            Already registered
          </AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer text-foreground border-border">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className="cursor-pointer bg-green-700 hover:bg-green-800 text-white"
            onClick={onManualRegister}
          >
            {proceedLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
