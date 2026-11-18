import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import confetti from "canvas-confetti";
import { Cake, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playChime } from "@/shared/services/playChime";

const BIRTHDAY_NOTES = [523.25, 659.25, 783.99, 1046.5] as const;

type BirthdayCelebrationProps = {
  name: string;
  profileId: string;
  dateKey: string;
  onDismiss: () => void;
};

function readSession(key: string | undefined) {
  try { return key && sessionStorage.getItem(key); } catch { return undefined; }
}

function writeSession(key: string | undefined, dateKey: string) {
  try { if (key) sessionStorage.setItem(key, dateKey); } catch { /* Use the in-memory state. */ }
}

export default function BirthdayCelebration({ name, profileId, dateKey, onDismiss }: BirthdayCelebrationProps) {
  const visualKey = profileId ? `hrms-birthday-confetti:${profileId}` : undefined;
  const audioKey = profileId ? `hrms-birthday-sound:${profileId}` : undefined;
  const [burst, setBurst] = useState(() => readSession(visualKey) === dateKey ? 0 : 1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const autoSoundClaimed = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!burst || !canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const fire = confetti.create(canvas, { resize: true, disableForReducedMotion: true });
    const palette = getComputedStyle(document.documentElement);
    const colors = [
      palette.getPropertyValue("--accent").trim() || "#51bc8f",
      palette.getPropertyValue("--primary").trim() || "#2f7659",
      palette.getPropertyValue("--role-accent").trim() || "#51bc8f",
      "#f5c56d",
    ];

    void fire({ particleCount: 62, angle: 62, spread: 64, startVelocity: 47, origin: { x: 0.08, y: 0.72 }, colors });
    void fire({ particleCount: 62, angle: 118, spread: 64, startVelocity: 47, origin: { x: 0.92, y: 0.72 }, colors });
    return () => fire.reset();
  }, [burst]);

  useEffect(() => {
    writeSession(visualKey, dateKey);
  }, [visualKey, dateKey]);

  useEffect(() => {
    if (readSession(audioKey) === dateKey) return;
    let active = true;
    const removeListeners = () => {
      document.removeEventListener("click", onInteraction);
      document.removeEventListener("keydown", onInteraction);
    };
    const attempt = () => {
      void playChime(BIRTHDAY_NOTES, 0.18, () => {
        if (!active || autoSoundClaimed.current) return false;
        autoSoundClaimed.current = true;
        writeSession(audioKey, dateKey);
        removeListeners();
        return true;
      });
    };
    function onInteraction(event: Event) {
      if (event.target instanceof Element && event.target.closest(".birthday-banner")) return;
      if (navigator.userActivation?.isActive === false || autoSoundClaimed.current) return;
      attempt();
    }

    document.addEventListener("click", onInteraction);
    document.addEventListener("keydown", onInteraction);
    attempt();
    return () => {
      active = false;
      removeListeners();
    };
  }, [audioKey, dateKey]);

  const celebrate = () => {
    autoSoundClaimed.current = true;
    writeSession(audioKey, dateKey);
    setBurst(previous => previous + 1);
    void playChime(BIRTHDAY_NOTES, 0.18);
  };

  return (
    <section className="birthday-banner" aria-labelledby="birthday-heading">
      {burst > 0 && createPortal(
        <canvas ref={canvasRef} className="birthday-confetti" aria-hidden="true" />,
        document.body,
      )}
      <span className="birthday-icon"><Cake size={23} aria-hidden="true" /></span>
      <div className="birthday-copy">
        <h2 id="birthday-heading">{name ? `Happy birthday, ${name}!` : "Happy birthday!"}</h2>
        <p>Wishing you a wonderful day from the Natobotics team.</p>
      </div>
      <Button type="button" variant="outline" size="sm" className="birthday-chime" onClick={celebrate}>
        <Volume2 aria-hidden="true" /> Play birthday chime
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" className="birthday-dismiss" aria-label="Dismiss birthday celebration" onClick={onDismiss}>
        <X aria-hidden="true" />
      </Button>
    </section>
  );
}
