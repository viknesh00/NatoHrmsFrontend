import { lazy, Suspense } from 'react';
import { MessageCircleMore } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useAppStore } from '@/store/useAppStore';
const Chat = lazy(() => import('./Chat'));

export default function ChatWidget() {
  const open = useAppStore(state => state.chatOpen);
  const setOpen = useAppStore(state => state.setChatOpen);
  const { pathname } = useLocation();
  if (pathname === '/chat') return null;
  return <>
    <Button className="fixed bottom-5 right-5 z-40 size-12 border border-primary-foreground/20 shadow-md" size="icon" aria-label="Open HR assistant" aria-expanded={open} onClick={() => setOpen(true)}><MessageCircleMore className="size-5"/></Button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="chat-widget w-full gap-0 p-0 sm:max-w-[480px]" aria-describedby={undefined}>
        <SheetTitle className="sr-only">HR assistant</SheetTitle>
        <Suspense fallback={<p role="status" className="p-6">Loading assistant…</p>}><Chat embedded /></Suspense>
      </SheetContent>
    </Sheet>
  </>;
}
