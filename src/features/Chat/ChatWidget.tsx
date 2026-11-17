import { lazy, Suspense, useEffect } from "react";
import { MessageCircleMore, PanelRight, PictureInPicture2, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAppStore } from "@/store/useAppStore";

export function ChatWidgetLauncher() {
  const open = useAppStore(state => state.chatOpen);
  const setOpen = useAppStore(state => state.setChatOpen);
  const setPresentation = useAppStore(state => state.setChatPresentation);
  const { pathname } = useLocation();

  if (pathname === "/chat") return null;

  return (
    <Button
      className="header-chat-trigger"
      variant="ghost"
      size="icon"
      type="button"
      aria-label="Open HR assistant"
      aria-expanded={open}
      title="HR assistant"
      onClick={() => { setPresentation("sidepanel"); setOpen(true); }}
    >
      <MessageCircleMore size={18} aria-hidden="true" />
    </Button>
  );
}

const Chat = lazy(() => import("./Chat"));

export default function ChatWidget() {
  const open = useAppStore(state => state.chatOpen);
  const setOpen = useAppStore(state => state.setChatOpen);
  const { pathname } = useLocation();
  const presentation = useAppStore(state => state.chatPresentation);
  const setPresentation = useAppStore(state => state.setChatPresentation);

  useEffect(() => {
    if (!open || presentation !== "widget") return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        document.querySelector<HTMLButtonElement>(".header-chat-trigger")?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, presentation, setOpen]);

  if (pathname === "/chat") return null;

  const assistantContents = (sidePanel = false) => <>
    <header className="chat-widget-titlebar">
      {sidePanel ? <SheetTitle className="chat-widget-heading">HR Assistant</SheetTitle> : <strong className="chat-widget-heading">HR Assistant</strong>}
      <div className="chat-widget-window-actions">
        <Button type="button" variant="ghost" size="icon-sm" aria-label={sidePanel ? "Open as popup widget" : "Open in side panel"} title={sidePanel ? "Open as popup widget" : "Open in side panel"} onClick={() => setPresentation(sidePanel ? "widget" : "sidepanel")}>
          {sidePanel ? <PictureInPicture2 size={17} aria-hidden="true" /> : <PanelRight size={17} aria-hidden="true" />}
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Close HR assistant" onClick={() => setOpen(false)}><X size={17} aria-hidden="true" /></Button>
      </div>
    </header>
    <div className="chat-widget-content">
      <Suspense fallback={<div className="chat-widget-loading" role="status">Opening assistant…</div>}>
        <Chat embedded />
      </Suspense>
    </div>
  </>;

  return <>
    <Sheet open={open && presentation === "sidepanel"} onOpenChange={setOpen}>
      <SheetContent side="right" showCloseButton={false} className="chat-sidepanel-content" aria-describedby={undefined}>
        {assistantContents(true)}
      </SheetContent>
    </Sheet>
    {open && presentation === "widget" && <section className="chat-widget-panel" role="region" aria-label="HR assistant popup">
      {assistantContents(false)}
    </section>}
  </>;
}
