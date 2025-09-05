// components/ui/alert-dialog.tsx
import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { Button } from "./button";

// Root
function AlertDialog(props: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger(
  props: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>
) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal(
  props: React.ComponentProps<typeof AlertDialogPrimitive.Portal>
) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  children,
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  size?: "small" | "default" | "large" | "xl" | "full";
}) {
  const sizeClasses = {
    small: "sm:max-w-sm",
    default: "sm:max-w-lg",
    large: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
    full: "sm:max-w-[95vw]",
  };

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      {/* Center on all breakpoints */}
      <div className="fixed inset-0 z-50 grid place-items-center p-4">
        <AlertDialogPrimitive.Content
          data-slot="alert-dialog-content"
          className={cn(
            "w-full max-w-[calc(100%-2rem)]",
            "rounded-lg border bg-background shadow-lg",
            "overflow-y-auto max-h-[90vh]",
            "p-6",
            // animations
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            sizeClasses[size],
            className
          )}
          {...props}
        >
          {children}
        </AlertDialogPrimitive.Content>
      </div>
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-left", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold leading-none", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

// Buttons
const AlertDialogAction = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button>) => (
  <AlertDialogPrimitive.Action asChild>
    <Button
      className={cn("bg-green-700 hover:bg-green-800 text-white", className)}
      {...props}
    >
      {children}
    </Button>
  </AlertDialogPrimitive.Action>
);

const AlertDialogCancel = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button>) => (
  <AlertDialogPrimitive.Cancel asChild>
    <Button
      // visible label + hand cursor by default
      variant="outline"
      className={cn(
        "border border-gray-300 bg-background text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  </AlertDialogPrimitive.Cancel>
);

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
