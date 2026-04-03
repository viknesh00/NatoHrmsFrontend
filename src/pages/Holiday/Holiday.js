import React, { useEffect, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { getRequest } from "../../services/Apiservice";
import { getCookie } from "../../services/Cookies";

dayjs.extend(isoWeek);

const COLORS = {
  Holiday: { bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444", cellBg: "rgba(254,226,226,0.5)" },
  Event: { bg: "#ede9fe", text: "#6c3fc5", dot: "#8b5cf6", cellBg: "rgba(237,233,254,0.5)" },
};

export default function Holiday() {
  const navigate = useNavigate();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(dayjs());
  const userRole = getCookie("role");
  const isAdminOrMgr = userRole === "Admin" || userRole === "Manager";

  useEffect(() => {
    setLoading(true);
    getRequest("Holiday/GetHolidays").then(res => {
      if (res.data?.length) setHolidays(res.data.map(h => ({ ...h, eventDate: dayjs(h.eventDate).format("YYYY-MM-DD") })));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Build 6-row × 7-col grid
  const firstDay = current.startOf("month").startOf("isoWeek");
  const days = Array.from({ length: 42 }, (_, i) => firstDay.add(i, "day"));
  const weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7));

  const getHoliday = (d) => holidays.find(h => h.eventDate === d.format("YYYY-MM-DD"));
  const isToday = (d) => d.format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD");
  const monthHolidays = holidays.filter(h => h.eventDate.startsWith(current.format("YYYY-MM")));

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
          <button className="btn btn-primary" onClick={() => navigate("/calendar/create-event")}>
            <Plus size={15} /> Add Event
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 256px", gap: 16, alignItems: "start" }}>
        {/* Main Calendar */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="calendar-nav-btn" onClick={() => setCurrent(c => c.subtract(1, "month"))}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 800, color: "var(--text-primary)", minWidth: 150, textAlign: "center" }}>
                {current.format("MMMM YYYY")}
              </span>
              <button className="calendar-nav-btn" onClick={() => canGoNext && setCurrent(c => c.add(1, "month"))} style={{ opacity: canGoNext ? 1 : 0.35, cursor: canGoNext ? "pointer" : "not-allowed" }}>
                <ChevronRight size={16} />
              </button>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {[["Holiday", "#ef4444"], ["Event", "#8b5cf6"]].map(([t, color]) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)" }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: color }} />
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Calendar grid - full width, equal columns */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  {DAYS.map(d => (
                    <th key={d} style={{ padding: "10px 4px", textAlign: "center", fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)", background: "var(--bg)", width: `${100 / 7}%` }}>
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
                      const c = h ? (COLORS[h.eventType] || COLORS.Event) : null;
                      const clickable = isAdminOrMgr && h && inMonth;

                      return (
                        <td key={day.format("YYYY-MM-DD")}
                          onClick={() => clickable && navigate("/calendar/edit-event", { state: { holiday: h } })}
                          style={{
                            height: 80, border: "1px solid var(--border)", verticalAlign: "top", padding: 0,
                            background: !inMonth ? "var(--bg)" : c ? c.cellBg : today2 ? "var(--primary-ghost)" : isWknd ? "#fefbff" : "white",
                            cursor: clickable ? "pointer" : "default",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={e => { if (clickable) e.currentTarget.style.opacity = "0.88"; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
                          <div style={{ padding: "6px 8px", display: "flex", flexDirection: "column", height: "100%", gap: 4 }}>
                            {/* Date number */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13,
                                fontWeight: today2 ? 900 : inMonth ? 600 : 400,
                                color: !inMonth ? "#c9d0d8" : today2 ? "white" : isWknd ? "var(--coral)" : "var(--text-primary)",
                                background: today2 ? "var(--primary)" : "transparent",
                                boxShadow: today2 ? "0 2px 8px var(--primary-glow)" : "none",
                              }}>
                                {day.format("D")}
                              </div>
                            </div>
                            {/* Holiday label */}
                            {h && inMonth && (
                              <div style={{
                                display: "flex",
                                justifyContent: "center",   // ← center horizontally
                                alignItems: "center",
                                flex: 1,                    // ← take remaining cell height
                              }}>
                                <div style={{
                                  background: c.bg, color: c.text, fontSize: 10, fontWeight: 700,
                                  padding: "2px 6px", borderRadius: 5,
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  lineHeight: 1.4, maxWidth: "90%", textAlign: "center",
                                }} title={h.eventName}>
                                  {h.eventName}
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
          </div>
        </div>

        {/* Events sidebar - compact */}
        <div className="card" style={{ position: "sticky", top: 80 }}>
          <div className="card-header" style={{ padding: "12px 16px" }}>
            <span className="card-title" style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}>
              🗓️ Events this month
            </span>
            <span style={{ background: "var(--primary-ghost)", color: "var(--primary)", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 12 }}>
              {monthHolidays.length}
            </span>
          </div>
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {monthHolidays.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No events</div>
            ) : monthHolidays.map((h, i) => {
              const c = COLORS[h.eventType] || COLORS.Event;
              const d = dayjs(h.eventDate);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: "1px solid var(--border)", cursor: isAdminOrMgr ? "pointer" : "default", transition: "background 0.15s" }}
                  onClick={() => isAdminOrMgr && navigate("/calendar/edit-event", { state: { holiday: h } })}
                  onMouseEnter={e => { if (isAdminOrMgr) e.currentTarget.style.background = "var(--bg)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: c.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: c.text, lineHeight: 1.1 }}>{d.format("DD")}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: c.text, textTransform: "uppercase" }}>{d.format("MMM")}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.eventName}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                      <span style={{ background: c.bg, color: c.text, fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 12 }}>{h.eventType}</span>
                      {h.workLocation && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{h.workLocation}</span>}
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
