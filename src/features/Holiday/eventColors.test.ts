import { getEventColors } from "./eventColors";

test("event colors are stable for the same event and vary across event names", () => {
  const event = { eventType: "Event", eventName: "Company outing" };
  expect(getEventColors(event)).toEqual(getEventColors(event));

  const colors = new Set([
    "All hands meeting",
    "Team outing",
    "Product launch",
    "Office celebration",
    "Learning day",
    "Wellness event",
  ].map(eventName => getEventColors({ eventType: "Event", eventName }).dot));

  expect(colors.size).toBeGreaterThan(1);
});

test("holidays keep the semantic error color", () => {
  expect(getEventColors({ eventType: "Holiday", eventName: "New Year" }).dot).toBe("var(--error)");
});
