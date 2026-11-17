import dayjs from "dayjs";
import { getRequest } from "../../shared/services/Apiservice";

export type HRMSNotification = {
  id: string;
  type: "announcement" | "holiday" | "leave";
  title: string;
  detail: string;
  date: string;
  href: string;
};

const storageKey = (email: string) => `hrms-notifications-read:${email || "user"}`;

export function getReadNotificationIds(email: string): Set<string> {
  try {
    const ids = JSON.parse(localStorage.getItem(storageKey(email)) || "[]");
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

export function markNotificationsRead(email: string, ids: string[]) {
  const read = getReadNotificationIds(email);
  ids.forEach((id) => read.add(id));
  try { localStorage.setItem(storageKey(email), JSON.stringify([...read])); } catch { /* Storage may be disabled. */ }
}

function recordId(record: Record<string, any>, keys: string[], fallback: string) {
  for (const key of keys) if (record[key] != null && String(record[key]).trim()) return String(record[key]);
  return fallback;
}

export async function fetchHRMSNotifications(): Promise<HRMSNotification[]> {
  const [announcementResult, holidayResult, leaveResult] = await Promise.allSettled([
    getRequest("Announcement/GetAnnouncement"),
    getRequest("Holiday/GetHolidays"),
    getRequest("User/GetEmployeeLeave"),
  ]);
  const notifications: HRMSNotification[] = [];
  const announcements = announcementResult.status === "fulfilled" && Array.isArray(announcementResult.value?.data)
    ? announcementResult.value.data : [];
  const holidays = holidayResult.status === "fulfilled" && Array.isArray(holidayResult.value?.data)
    ? holidayResult.value.data : [];
  const leaveResponse = leaveResult.status === "fulfilled" ? leaveResult.value?.data : null;
  const leaves = Array.isArray(leaveResponse?.leaves) ? leaveResponse.leaves : [];

  announcements.filter((item) => item.isActive !== false && item.isActive !== 0 && item.isActive !== "0").forEach((item) => {
    const detail = String(item.description || "A company announcement is available.");
    const date = item.announcementDate || item.createdDate || "";
    const id = recordId(item, ["announcementId", "id"], `${date}:${detail}`);
    notifications.push({ id: `announcement:${id}`, type: "announcement", title: "New announcement", detail, date, href: "/announcement" });
  });

  holidays.filter((item) => item.eventDate && !dayjs(item.eventDate).isBefore(dayjs(), "day")).forEach((item) => {
    const detail = [item.eventType, item.workLocation].filter(Boolean).join(" · ");
    const id = recordId(item, ["holidayId", "eventId", "id"], `${item.eventDate}:${item.eventName || "event"}`);
    notifications.push({ id: `holiday:${id}`, type: "holiday", title: item.eventName || "Upcoming company event", detail, date: item.eventDate, href: "/calendar" });
  });

  leaves.forEach((item) => {
    const status = !item.approvedBy ? "Pending" : item.isApproved ? "Approved" : "Declined";
    const owner = item.employeeName || item.userName || "Your";
    const isPending = status === "Pending";
    const title = isPending ? `${owner} leave request needs attention` : `Leave request ${status.toLowerCase()}`;
    const detail = [item.leaveType, item.fromDate && item.toDate ? `${item.fromDate} – ${item.toDate}` : item.fromDate || item.toDate].filter(Boolean).join(" · ");
    const date = item.updatedAt || item.createdDate || item.fromDate || "";
    const id = recordId(item, ["leaveId", "id"], `${item.userName || owner}:${date}:${status}`);
    notifications.push({ id: `leave:${id}:${status}`, type: "leave", title, detail, date, href: "/leave" });
  });

  return notifications.sort((a, b) => {
    const aDate = dayjs(a.date);
    const bDate = dayjs(b.date);
    if (a.type === "holiday" && b.type === "holiday") return aDate.valueOf() - bDate.valueOf();
    if (a.type === "holiday") return -1;
    if (b.type === "holiday") return 1;
    return bDate.valueOf() - aDate.valueOf();
  });
}
