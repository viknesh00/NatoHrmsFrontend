import { useRef, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";

/* Shared accessible frame for existing workflow content. The owning feature
   retains its state, validation, confirmation and asynchronous save handler. */
export default function WorkflowDialog({ title, onClose, busy = false, dismissible = true, width = "460px", children }: {
  title: string;
  onClose?: () => void;
  busy?: boolean;
  dismissible?: boolean;
  width?: string;
  children: ReactNode;
}) {
  const returnFocus = useRef<HTMLElement | null>(document.activeElement as HTMLElement);
  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose?.(); }}>
      <DialogContent
        className="workflow-dialog"
        style={{ maxWidth: width }}
        showCloseButton={false}
        aria-describedby={undefined}
        aria-busy={busy}
        onPointerDownOutside={event => { if (busy || !dismissible) event.preventDefault(); }}
        onEscapeKeyDown={event => { if (busy || !onClose) event.preventDefault(); }}
        onCloseAutoFocus={event => {
          event.preventDefault();
          if (returnFocus.current?.isConnected) returnFocus.current.focus();
        }}
        onMouseDownCapture={event => { if (busy) { event.preventDefault(); event.stopPropagation(); } }}
        onClickCapture={event => { if (busy) { event.preventDefault(); event.stopPropagation(); } }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
