import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CalendarDays, Check, CheckCheck, Megaphone, UserRoundCheck } from "lucide-react";
import dayjs from "dayjs";
import { Button } from "../../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import Breadcrumb from "../../shared/services/Breadcrumb";
import { getCookie } from "../../auth/Cookies";
import { fetchHRMSNotifications, getReadNotificationIds, markNotificationsRead } from "./notificationService";

const ICONS = {
  announcement: Megaphone,
  holiday: CalendarDays,
  leave: UserRoundCheck,
};

export default function Notifications() {
  const navigate = useNavigate();
  const email = getCookie("email") || "";
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => getReadNotificationIds(email));
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let active = true;
    fetchHRMSNotifications()
      .then((items) => { if (active) setNotifications(items); })
      .catch((error) => console.error("Failed to load notifications:", error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const unreadCount = notifications.filter((item) => !readIds.has(item.id)).length;
  const visibleNotifications = useMemo(
    () => filter === "unread" ? notifications.filter((item) => !readIds.has(item.id)) : notifications,
    [filter, notifications, readIds]
  );

  const markRead = useCallback((ids: string[]) => {
    markNotificationsRead(email, ids);
    setReadIds(getReadNotificationIds(email));
    window.dispatchEvent(new Event("hrms:notifications-read"));
  }, [email]);

  const openNotification = (item) => {
    if (!readIds.has(item.id)) markRead([item.id]);
    navigate(item.href);
  };

  return (
    <main className="notifications-page">
      <div className="page-header">
        <div>
          <Breadcrumb icon={<Bell size={13} />} items={[{ label: "Notifications" }]} />
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Announcements, upcoming events, and leave updates visible to your account.</p>
        </div>
        <Button variant="outline" type="button" onClick={() => markRead(notifications.map((item) => item.id))} disabled={!unreadCount}>
          <CheckCheck size={16} aria-hidden="true" /> Mark all as read
        </Button>
      </div>

      <section className="card notifications-card" aria-label="Notification list">
        <div className="notifications-toolbar">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="app-tab-list" aria-label="Filter notifications">
              <TabsTrigger value="all">All <span className="notifications-tab-count">{notifications.length}</span></TabsTrigger>
              <TabsTrigger value="unread">Unread <span className="notifications-tab-count">{unreadCount}</span></TabsTrigger>
            </TabsList>
          </Tabs>
          <span className="notifications-count" aria-live="polite">{unreadCount} unread</span>
        </div>

        {loading ? <div className="notifications-empty" role="status">Loading notifications…</div>
          : visibleNotifications.length === 0 ? (
            <div className="notifications-empty">
              <span className="notifications-empty-icon"><Bell size={22} aria-hidden="true" /></span>
              <strong>{filter === "unread" ? "You’re all caught up" : "No notifications yet"}</strong>
              <span>New announcements, events, or leave updates will appear here.</span>
            </div>
          ) : <ul className="notification-list">
            {visibleNotifications.map((item) => {
              const Icon = ICONS[item.type];
              const isRead = readIds.has(item.id);
              const date = dayjs(item.date);
              return (
                <li key={item.id} className={`notification-row${isRead ? " is-read" : " is-unread"}`}>
                  <span className={`notification-icon is-${item.type}`}><Icon size={18} aria-hidden="true" /></span>
                  <button type="button" className="notification-content" onClick={() => openNotification(item)}>
                    <span className="notification-title-row"><strong>{item.title}</strong>{!isRead && <span className="notification-unread-dot" aria-label="Unread" />}</span>
                    {item.detail && <span className="notification-detail">{item.detail}</span>}
                    {date.isValid() && <time className="notification-date" dateTime={date.toISOString()}>{date.format("DD MMM YYYY")}</time>}
                  </button>
                  {!isRead && <Button variant="ghost" size="icon-sm" type="button" className="notification-read-button" aria-label="Mark as read" title="Mark as read" onClick={() => markRead([item.id])}><Check size={16} /></Button>}
                </li>
              );
            })}
          </ul>}
      </section>
    </main>
  );
}
