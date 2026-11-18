export function getDayPeriod(hour: number) {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function isBirthday(dateOfBirth: string | null, today: Date) {
  // Employee records use ISO dates. Compare the calendar date without shifting it to local time.
  const match = dateOfBirth?.match(/^\d{4}-(\d{2})-(\d{2})(?:T|$)/);
  return Boolean(match && Number(match[1]) === today.getMonth() + 1 && Number(match[2]) === today.getDate());
}
