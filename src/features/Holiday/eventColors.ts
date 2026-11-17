type EventColorScheme = {
  bg: string;
  text: string;
  dot: string;
  cellBg: string;
};

const EVENT_PALETTE: EventColorScheme[] = [
  { bg: "var(--primary-ghost)", text: "var(--primary)", dot: "var(--primary)", cellBg: "color-mix(in srgb, var(--primary) 9%, var(--card))" },
  { bg: "var(--success-subtle)", text: "var(--success)", dot: "var(--success)", cellBg: "color-mix(in srgb, var(--success) 9%, var(--card))" },
  { bg: "var(--information-subtle)", text: "var(--information)", dot: "var(--information)", cellBg: "color-mix(in srgb, var(--information) 9%, var(--card))" },
  { bg: "var(--warning-subtle)", text: "var(--warning)", dot: "var(--warning)", cellBg: "color-mix(in srgb, var(--warning) 9%, var(--card))" },
  { bg: "var(--accent)", text: "var(--accent-foreground)", dot: "var(--accent)", cellBg: "color-mix(in srgb, var(--accent) 12%, var(--card))" },
];

const HOLIDAY_COLORS: EventColorScheme = {
  bg: "var(--error-subtle)",
  text: "var(--error)",
  dot: "var(--error)",
  cellBg: "color-mix(in srgb, var(--error) 9%, var(--card))",
};

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/** Return a stable semantic color for an event so the same event matches in every calendar view. */
export function getEventColors(event: Record<string, unknown> = {}): EventColorScheme {
  const type = String(event.eventType ?? "").trim().toLowerCase();
  if (type === "holiday") return HOLIDAY_COLORS;

  const identity = `${type}:${String(event.eventName ?? event.holidayId ?? event.eventDate ?? "event")}`.toLowerCase();
  return EVENT_PALETTE[stableHash(identity) % EVENT_PALETTE.length];
}
