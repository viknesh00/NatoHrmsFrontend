import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

function AlertDialog({ ...props }: Record<string, any>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({ ...props }: Record<string, any>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({ ...props }: Record<string, any>) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({ className, ...props }: Record<string, any>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-[var(--overlay)] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogContent({ className, children, ...props }: Record<string, any>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto -translate-x-1/2 -translate-y-1/2 gap-4 rounded-md border bg-popover p-6 text-sm text-popover-foreground shadow-lg outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 sm:max-w-md",
          className
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: Record<string, any>) {
  return <div data-slot="alert-dialog-header" className={cn("flex flex-col gap-2", className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: Record<string, any>) {
  return <div data-slot="alert-dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

function AlertDialogTitle({ className, ...props }: Record<string, any>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg leading-7 font-semibold", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({ className, ...props }: Record<string, any>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function AlertDialogAction({ className, variant = "default", children, ...props }: Record<string, any>) {
  return (
    <AlertDialogPrimitive.Action asChild {...props}>
      <Button variant={variant} className={className}>{children}</Button>
    </AlertDialogPrimitive.Action>
  );
}

function AlertDialogCancel({ className, variant = "outline", children, ...props }: Record<string, any>) {
  return (
    <AlertDialogPrimitive.Cancel asChild {...props}>
      <Button variant={variant} className={className}>{children}</Button>
    </AlertDialogPrimitive.Cancel>
  );
}

function AlertDialogMedia({ className, ...props }: Record<string, any>) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn("mb-1 inline-flex size-10 items-center justify-center rounded-md bg-muted text-foreground", className)}
      {...props}
    />
  );
}

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
  AlertDialogMedia,
};
