import { MenuType } from "@/generated/prisma";

/**
 * Meal-period boundaries, in minutes since midnight IST. Each entry is
 * "at or after this minute, until the next boundary, show this menu type".
 * Order matters: evaluated top-to-bottom, first match wins.
 */
const SCHEDULE: { fromMinutes: number; type: MenuType }[] = [
  { fromMinutes: 0, type: MenuType.BREAKFAST }, // 12:00 AM – 11:29 AM
  { fromMinutes: 11 * 60 + 30, type: MenuType.LUNCH }, // 11:30 AM – 3:29 PM
  { fromMinutes: 15 * 60 + 30, type: MenuType.EVENING_SNACKS }, // 3:30 PM – 6:59 PM
  { fromMinutes: 19 * 60, type: MenuType.DINNER }, // 7:00 PM – 11:59 PM
];

/**
 * Which menu type should be active right now, in IST (Asia/Kolkata) —
 * every cafe in this deployment is in Bangalore. Independent of the
 * server's own timezone (Vercel runs UTC).
 */
export function resolveScheduledMenuType(date: Date = new Date()): MenuType {
  const istParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(istParts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(istParts.find((p) => p.type === "minute")?.value ?? "0");
  // Intl formats midnight hour as "24" with hour12: false in some engines — normalize.
  const minutesSinceMidnight = (hour % 24) * 60 + minute;

  let resolved: MenuType = MenuType.BREAKFAST;
  for (const entry of SCHEDULE) {
    if (minutesSinceMidnight >= entry.fromMinutes) {
      resolved = entry.type;
    }
  }
  return resolved;
}
