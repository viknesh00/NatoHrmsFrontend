import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  BriefcaseBusiness,
  Cake,
  CalendarDays,
  Gift,
  Heart,
  MoonStar,
  PartyPopper,
  Sparkles,
  TreePine,
  UsersRound,
} from "lucide-react";
import { getEventColors } from "./eventColors";

type EventPresentation = {
  colors: ReturnType<typeof getEventColors>;
  emoji: string;
  Icon: LucideIcon;
};

/** Stable event marker based on the event's saved type and name. */
export function getEventPresentation(event: Record<string, unknown> = {}): EventPresentation {
  const type = String(event.eventType ?? "").toLowerCase();
  const name = String(event.eventName ?? "").toLowerCase();
  let emoji = type === "holiday" ? "🗓️" : "📌";
  let Icon: LucideIcon = type === "holiday" ? CalendarDays : BriefcaseBusiness;

  if (/christmas|xmas/.test(name)) { emoji = "🎄"; Icon = TreePine; }
  else if (/diwali|deepavali|dīpāvali/.test(name)) { emoji = "🪔"; Icon = Sparkles; }
  else if (/eid|ramadan/.test(name)) { emoji = "🌙"; Icon = MoonStar; }
  else if (/birthday|birth day/.test(name)) { emoji = "🎂"; Icon = Cake; }
  else if (/anniversary|wedding/.test(name)) { emoji = "💝"; Icon = Heart; }
  else if (/training|learning|workshop/.test(name)) { emoji = "📚"; Icon = BookOpen; }
  else if (/meeting|town hall|all hands/.test(name)) { emoji = "👥"; Icon = UsersRound; }
  else if (/team|outing|celebration|party|festival/.test(name)) { emoji = "🎉"; Icon = PartyPopper; }
  else if (/new year|year end/.test(name)) { emoji = "🎆"; Icon = Sparkles; }
  else if (/gift|giving/.test(name)) { emoji = "🎁"; Icon = Gift; }
  else if (type === "holiday") { emoji = "🌴"; Icon = CalendarDays; }

  return { colors: getEventColors(event), emoji, Icon };
}
