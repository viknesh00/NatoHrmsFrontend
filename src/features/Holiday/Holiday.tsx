import { cn } from "cn";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { Button } from "../../components/ui/button";
import { useCallback, useEffect, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Calendar, CalendarDays, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LoadingMask from "../../shared/services/LoadingMask";
import Breadcrumb from "../../shared/services/Breadcrumb";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { getRequest } from "../../shared/services/Apiservice";
import { getCookie } from "../../auth/Cookies";
import { getEventPresentation } from "./eventPresentation";

dayjs.extend(isoWeek);
dayjs.extend(isSameOrBefore);

export default function Holiday() {
  const navigate = useNavigate();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [view, setView] = useState("month");
  const [current, setCurrent] = useState(dayjs());
  const userRole = getCookie("role");
  const isAdminOrMgr = userRole === "Admin" || userRole === "Manager";

  const refreshEvents = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await getRequest("Holiday/GetHolidays");
      const events = Array.isArray(response.data) ? response.data : [];
      setHolidays(events.map((event) => ({ ...event, eventDate: dayjs(event.eventDate).format("YYYY-MM-DD") })));
      setLastUpdated(dayjs());
    } catch (error) {
      console.error("Failed to refresh company calendar:", error);
    } finally {
      if (initial) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshEvents(true);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshEvents();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [refreshEvents]);

  // Build 6-row × 7-col grid
  const firstDay = current.startOf("month").startOf("isoWeek");
  const days = Array.from({ length: 42 }, (_, i) => firstDay.add(i, "day"));
  const weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7));

  const getHoliday = (d) => holidays.find(h => h.eventDate === d.format("YYYY-MM-DD"));
  const isToday = (d) => d.format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD");
  const monthHolidays = holidays.filter(h => h.eventDate.startsWith(current.format("YYYY-MM"))).sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  const canGoNext = current.add(1, "month").isSameOrBefore(dayjs().endOf("year"), "month");

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div>
      <LoadingMask loading={loading} />
      <div className="page-header">
        <div>
          <Breadcrumb icon={<Calendar size={13} />} items={[{ label: "Calendar" }]} />
          <h1 className="page-title">Company Calendar</h1>
          <p className="page-subtitle">Holidays and company events</p>
        </div>
        {isAdminOrMgr && (
          <Button variant="default" type="button" className="btn btn-primary" onClick={() => navigate("/calendar/create-event")}>
            <Plus size={15} /> Add Event
          </Button>
        )}
      </div>

      <div className="company-calendar-layout">
        {/* Main Calendar */}
        <div className="card company-calendar-main">
          <div className="card-header company-calendar-header">
            <div className="flex items-center gap-[12px]" >
              <Button variant="ghost" type="button" aria-label="Previous month" className="calendar-nav-btn" onClick={() => setCurrent(c => c.subtract(1, "month"))}>
                <ChevronLeft size={16} />
              </Button>
              <span className={cn("calendar-month", "min-w-[150px] text-center")} >
                {current.format("MMMM YYYY")}
              </span>
              <Button variant="ghost" type="button" aria-label="Next month" disabled={!canGoNext} className="calendar-nav-btn" onClick={() => canGoNext && setCurrent(c => c.add(1, "month"))} style={{ opacity: canGoNext ? 1 : 0.35, cursor: canGoNext ? "pointer" : "not-allowed" }}>
                <ChevronRight size={16} />
              </Button>
            </div>
            <div className="calendar-toolbar">
              <span className="calendar-live-status"><i /> Live updates{lastUpdated && <small>Updated {lastUpdated.format("HH:mm")}</small>}</span>
              <Button variant="outline" size="icon" type="button" className="calendar-refresh-btn" aria-label="Refresh company events" title="Refresh events" onClick={() => refreshEvents()} disabled={refreshing}>
                <RefreshCw size={15} className={refreshing ? "calendar-refreshing" : ""} aria-hidden="true" />
              </Button>
              <Button variant="outline" size="icon" type="button" className="calendar-today-btn" aria-label="Go to today" title="Today" onClick={() => setCurrent(dayjs())}>
                <CalendarDays size={16} aria-hidden="true" />
              </Button>
              <Tabs value={view} onValueChange={setView}><TabsList className="calendar-view-switch" aria-label="Company calendar view"><TabsTrigger value="month">Month</TabsTrigger><TabsTrigger value="agenda">Agenda</TabsTrigger></TabsList></Tabs>
            </div>
            <div className="flex gap-[16px] w-[100%]" >
              {[["Holiday", "var(--error)"], ["Event", "var(--primary-light)"]].map(([t, color]) => (
                <div key={t} className="flex items-center gap-[8px] text-[13px] font-semibold text-[var(--text-secondary)]" >
                  <div className="w-[9px] h-[9px]" style={{borderRadius: "50%", background: color}} />
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Calendar grid - full width, equal columns */}
          {view === "agenda" ? <div className="calendar-agenda">
            {monthHolidays.length === 0 ? <div className="table-empty"><CalendarDays size={28} className="m-[0_auto_12px]" /><div className="table-empty-text">No events this month</div><p>Use the month controls to browse holidays and events.</p></div> : monthHolidays.map((event, index) => {
              const { colors: color, emoji, Icon } = getEventPresentation(event);
              return (
                <div className="calendar-agenda-row" key={`${event.eventDate}-${event.holidayId ?? index}`}>
                  <div className="calendar-agenda-date">{dayjs(event.eventDate).format("ddd, DD MMM")}</div>
                  <div className="min-w-0"><div className="flex items-center gap-2 text-[13px] font-medium"><Icon size={15} aria-hidden="true" style={{ color: color.text, flexShrink: 0 }} /><span aria-hidden="true">{emoji}</span><span className="truncate">{event.eventName}</span></div><Badge variant="outline" style={{ background: color.bg, color: color.text, borderColor: color.dot }}>{event.eventType}</Badge></div>
                  {isAdminOrMgr && <Button variant="outline" size="sm" aria-label={`Edit ${event.eventName}`} onClick={() => navigate("/calendar/edit-event", { state: { holiday: event } })}>Edit</Button>}
                </div>
              );
            })}
          </div> : <div className="company-calendar-scroll">
            <table className={cn("company-calendar-grid", "w-[100%]")} style={{borderCollapse: "collapse", tableLayout: "fixed"}}>
              <thead>
                <tr>
                  {DAYS.map(d => (
                    <th key={d} className="p-[12px_4px] text-center text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em] bg-[var(--bg)]" style={{borderBottom: "1px solid var(--border)", width: `${100 / 7}%`}}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, wi) => (
                  <tr key={wi}>
                    {week.map(day => {
                      const inMonth = day.month() === current.month();
                      const today2 = isToday(day);
                      const isWknd = day.day() === 0 || day.day() === 6;
                      const h = getHoliday(day);
                      const presentation = h ? getEventPresentation(h) : null;
                      const c = presentation?.colors;
                      const clickable = isAdminOrMgr && h && inMonth;

                      return (
                        <td key={day.format("YYYY-MM-DD")}
                          tabIndex={clickable ? 0 : undefined}
                          role={clickable ? "button" : undefined}
                          aria-label={clickable ? `Edit ${h.eventName} on ${day.format("DD MMMM YYYY")}` : undefined}
                          onKeyDown={e => { if (clickable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); navigate("/calendar/edit-event", { state: { holiday: h } }); } }}
                          onClick={() => clickable && navigate("/calendar/edit-event", { state: { holiday: h } })}
                          className={cn("company-calendar-cell", "p-[0px]")}
                          style={{border: "1px solid var(--border)", verticalAlign: "top", background: !inMonth ? "var(--bg)" : c ? c.cellBg : today2 ? "var(--primary-ghost)" : isWknd ? "var(--background)" : "var(--card)", cursor: clickable ? "pointer" : "default", transition: "background 0.15s"}}
                          onMouseEnter={e => { if (clickable) e.currentTarget.style.opacity = "0.88"; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
                          <div className="p-[8px_8px] flex flex-col h-[100%] gap-[4px]" >
                            {/* Date number */}
                            <div className="flex items-center justify-center" >
                              <div className={cn(`company-calendar-day-number${today2 ? " is-today" : ""}${!inMonth ? " is-outside" : ""}`, "text-[13px]")} style={{fontFamily: "var(--ui-font-heading)", fontWeight: today2 ? 600 : inMonth ? 600 : 400, color: !inMonth ? "var(--border-strong)" : today2 ? "var(--card)" : isWknd ? "var(--coral)" : "var(--text-primary)", background: today2 ? "var(--primary)" : "transparent"}}>
                                {day.format("D")}
                              </div>
                            </div>
                            {/* Holiday label */}
                            {h && inMonth && (
                              <div className="flex justify-center items-center" style={{flex: 1}}>
                                <div className={cn("company-calendar-event-pill", "text-[12px] font-semibold p-[4px_8px] overflow-hidden whitespace-nowrap leading-[1.4] max-w-[90%] text-center")} style={{background: c.bg, color: c.text, textOverflow: "ellipsis"}} title={h.eventName}>
                                  <span aria-hidden="true" className="mr-1">{presentation.emoji}</span>{h.eventName}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </div>

        {/* Events sidebar - compact */}
        <div className={cn("card company-calendar-events", "sticky top-[80px]")} >
          <div className={cn("card-header", "p-[12px_16px]")} >
            <span className={cn("card-title", "text-[14px] flex items-center gap-[8px]")} >
              <CalendarDays size={16} aria-hidden="true" /> Events this month
            </span>
            <span className="bg-[var(--primary-ghost)] text-primary text-[12px] font-semibold p-[4px_8px]" style={{borderRadius: "var(--radius)"}}>
              {monthHolidays.length}
            </span>
          </div>
          <div className="max-h-[480px] overflow-y-auto" >
            {monthHolidays.length === 0 ? (
              <div className="p-[24px_16px] text-center text-[var(--text-muted)] text-[13px]" >No events</div>
            ) : monthHolidays.map((h, i) => {
              const { colors: c, emoji, Icon } = getEventPresentation(h);
              const d = dayjs(h.eventDate);
              return (
                <div key={i} className="flex items-center gap-[12px] p-[12px_16px]" style={{borderBottom: "1px solid var(--border)", cursor: isAdminOrMgr ? "pointer" : "default", transition: "background 0.15s"}}
                  onClick={() => isAdminOrMgr && navigate("/calendar/edit-event", { state: { holiday: h } })}
                  onMouseEnter={e => { if (isAdminOrMgr) e.currentTarget.style.background = "var(--bg)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  <div className="relative w-[40px] h-[40px] flex flex-col items-center justify-center shrink-[0]" style={{borderRadius: "var(--radius)", background: c.bg}}>
                    <span className="text-[14px] font-semibold leading-[1.1]" style={{color: c.text}}>{d.format("DD")}</span>
                    <span className="text-[12px] font-semibold uppercase" style={{color: c.text}}>{d.format("MMM")}</span>
                  </div>
                  <div className="min-w-[0px]" style={{flex: 1}}>
                    <div className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-foreground"><Icon size={15} aria-hidden="true" style={{ color: c.text, flexShrink: 0 }} /><span aria-hidden="true">{emoji}</span><span className="overflow-hidden whitespace-nowrap" style={{textOverflow: "ellipsis"}}>{h.eventName}</span></div>
                    <div className="flex gap-[8px] mt-[4px]" >
                      <span className="text-[12px] font-semibold p-[4px_8px]" style={{background: c.bg, color: c.text, borderRadius: "var(--radius)"}}>{h.eventType}</span>
                      {h.workLocation && <span className="text-[12px] text-[var(--text-muted)]" >{h.workLocation}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
