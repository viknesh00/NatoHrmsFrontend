// Shared form components - pure CSS, no MUI

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Calendar, Clock, Eye, EyeOff, Check } from "lucide-react";

/* ── CSS injected once ── */
const FORM_STYLES = `
.fc-group { margin-bottom: 18px; }
.fc-label {
  display: block; font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 11.5px; font-weight: 700; color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px;
}
.fc-label .req { color: var(--coral); margin-left: 2px; }
.fc-input {
  width: 100%; padding: 10px 13px; border-radius: 10px;
  border: 1.5px solid var(--border); background: var(--bg);
  font-family: 'DM Sans', sans-serif; font-size: 13.5px;
  color: var(--text-primary); outline: none; transition: all 0.2s;
  appearance: none; -webkit-appearance: none;
}
.fc-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ghost); background: #fff; }
.fc-input:disabled { opacity: 0.55; cursor: not-allowed; background: var(--bg); }
.fc-input::placeholder { color: var(--text-muted); }
textarea.fc-input { resize: vertical; min-height: 80px; line-height: 1.6; }
.fc-input-wrap { position: relative; }
.fc-input-icon { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-muted); }
.fc-input-icon-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; padding: 4px; border-radius: 6px; }
.fc-input-icon-btn:hover { color: var(--primary); background: var(--primary-ghost); }
.fc-error { font-size: 12px; color: var(--coral); margin-top: 5px; display: flex; align-items: center; gap: 4px; }
.fc-hint { font-size: 12px; color: var(--text-muted); margin-top: 5px; }
.fc-row { display: grid; gap: 16px; }
.fc-row-2 { grid-template-columns: 1fr 1fr; }
.fc-row-3 { grid-template-columns: 1fr 1fr 1fr; }
.fc-section { margin-bottom: 28px; }
.fc-section-title {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 800;
  color: var(--primary); text-transform: uppercase; letter-spacing: 0.08em;
  padding-bottom: 10px; border-bottom: 2px solid var(--primary-ghost);
  margin-bottom: 18px; display: flex; align-items: center; gap: 8px;
}
/* Custom select dropdown */
.fc-select-wrap { position: relative; }
.fc-select-wrap .fc-input { padding-right: 36px; cursor: pointer; }
.fc-select-wrap .fc-input-icon { pointer-events: none; }
/* Custom dropdown */
.fc-dd { position: relative; }
.fc-dd-trigger {
  width: 100%; padding: 10px 36px 10px 13px; border-radius: 10px;
  border: 1.5px solid var(--border); background: var(--bg);
  font-family: 'DM Sans', sans-serif; font-size: 13.5px;
  color: var(--text-primary); outline: none; transition: all 0.2s;
  cursor: pointer; text-align: left; display: flex; align-items: center; justify-content: space-between;
}
.fc-dd-trigger.open { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ghost); background: #fff; }
.fc-dd-trigger.placeholder { color: var(--text-muted); }
.fc-dd-trigger.disabled { opacity: 0.55; cursor: not-allowed; }
.fc-dd-menu {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 500;
  background: #fff; border-radius: 12px; border: 1.5px solid var(--border);
  box-shadow: var(--shadow-lg); max-height: 240px; overflow-y: auto;
  animation: slideUp 0.18s ease;
}
.fc-dd-item {
  padding: 10px 14px; font-size: 13.5px; color: var(--text-primary);
  cursor: pointer; transition: background 0.15s; display: flex; align-items: center; justify-content: space-between;
}
.fc-dd-item:hover { background: var(--primary-ghost); color: var(--primary); }
.fc-dd-item.selected { background: var(--primary-ghost); color: var(--primary); font-weight: 600; }
.fc-dd-empty { padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px; }
/* ── Custom Calendar Picker ── */
.fc-cal-wrap { position: relative; }
.fc-cal-trigger {
  width: 100%; padding: 10px 13px; border-radius: 10px;
  border: 1.5px solid var(--border); background: var(--bg);
  font-family: 'DM Sans', sans-serif; font-size: 13.5px;
  color: var(--text-primary); outline: none; transition: all 0.2s;
  cursor: pointer; text-align: left; display: flex; align-items: center;
  justify-content: space-between; gap: 8px;
}
.fc-cal-trigger.open { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ghost); background: #fff; }
.fc-cal-trigger.placeholder { color: var(--text-muted); }
.fc-cal-trigger:disabled { opacity: 0.55; cursor: not-allowed; }
.fc-cal-popup {
  position: absolute; top: calc(100% + 6px); left: 0; z-index: 600;
  background: #fff; border-radius: 16px; border: 1.5px solid var(--border);
  box-shadow: 0 8px 32px rgba(80,60,180,0.13); padding: 14px 16px 16px;
  width: 280px; animation: slideUp 0.18s ease;
}
.fc-cal-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.fc-cal-nav {
  background: none; border: none; cursor: pointer; border-radius: 8px;
  padding: 5px 8px; color: var(--text-muted); display: flex; align-items: center;
  transition: background 0.15s, color 0.15s;
}
.fc-cal-nav:hover { background: var(--primary-ghost); color: var(--primary); }
.fc-cal-title {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; font-weight: 700;
  color: var(--text-primary); display: flex; gap: 4px;
}
.fc-cal-month-btn, .fc-cal-year-btn {
  background: none; border: none; cursor: pointer; font-family: inherit;
  font-size: inherit; font-weight: inherit; color: var(--primary);
  padding: 0 2px; border-radius: 4px; transition: background 0.15s;
}
.fc-cal-month-btn:hover, .fc-cal-year-btn:hover { background: var(--primary-ghost); }
.fc-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.fc-cal-dow {
  text-align: center; font-size: 11px; font-weight: 700;
  color: var(--text-muted); padding: 4px 0 6px; letter-spacing: 0.03em;
}
.fc-cal-day {
  text-align: center; font-size: 13px; padding: 5px 2px; border-radius: 8px;
  cursor: pointer; transition: background 0.12s, color 0.12s; color: var(--text-primary);
  font-family: 'DM Sans', sans-serif;
}
.fc-cal-day:hover:not(.fc-cal-day-empty):not(.fc-cal-day-selected) { background: var(--primary-ghost); color: var(--primary); }
.fc-cal-day-empty { cursor: default; color: var(--text-muted); opacity: 0.4; }
.fc-cal-day-selected { background: var(--primary) !important; color: #fff !important; font-weight: 700; }
.fc-cal-day-today:not(.fc-cal-day-selected) { background: var(--primary-ghost); color: var(--primary); font-weight: 700; border-radius: 8px; }
/* month/year picker overlay */
.fc-cal-overlay {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 6px;
}
.fc-cal-overlay-item {
  padding: 7px 4px; text-align: center; border-radius: 8px; cursor: pointer;
  font-size: 13px; font-family: 'DM Sans', sans-serif; color: var(--text-primary);
  transition: background 0.12s, color 0.12s;
}
.fc-cal-overlay-item:hover { background: var(--primary-ghost); color: var(--primary); }
.fc-cal-overlay-item.active { background: var(--primary); color: #fff; font-weight: 700; }
.fc-cal-overlay-nav {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
}
.fc-cal-overlay-title {
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px;
  font-weight: 700; color: var(--text-primary);
}
/* Checkbox */
.fc-checkbox-wrap { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; }
.fc-checkbox {
  width: 18px; height: 18px; border-radius: 5px; border: 2px solid var(--border);
  background: var(--bg); display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all 0.2s; cursor: pointer;
}
.fc-checkbox.checked { background: var(--primary); border-color: var(--primary); }
.fc-checkbox-label { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }
/* Toggle */
.fc-toggle {
  width: 42px; height: 24px; border-radius: 12px; border: none; cursor: pointer;
  position: relative; transition: background 0.2s; flex-shrink: 0;
}
.fc-toggle-knob {
  position: absolute; top: 3px; left: 3px; width: 18px; height: 18px;
  border-radius: 50%; background: white; transition: transform 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
}
/* Strength bar */
.fc-strength { height: 4px; border-radius: 4px; background: var(--border); overflow: hidden; margin-top: 7px; }
.fc-strength-fill { height: 100%; border-radius: 4px; transition: width 0.3s, background 0.3s; }
/* Readonly */
.fc-readonly { background: #f8f7ff !important; color: var(--text-secondary); }
/* Form card */
.form-card {
  background: var(--bg-card); border-radius: var(--radius-xl); border: 1px solid var(--border);
  box-shadow: var(--shadow-sm); overflow: hidden;
}
.form-card-header {
  padding: 20px 24px; border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, var(--primary-ghost), #f0fdf4 80%);
  display: flex; align-items: center; gap: 12px;
}
.form-card-icon {
  width: 42px; height: 42px; border-radius: 12px;
  background: linear-gradient(135deg, var(--primary), var(--teal));
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.form-card-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 17px; font-weight: 800; color: var(--text-primary); }
.form-card-subtitle { font-size: 12.5px; color: var(--text-muted); margin-top: 2px; }
.form-card-body { padding: 24px; }
.form-card-footer {
  padding: 16px 24px; border-top: 1px solid var(--border); background: #faf8ff;
  display: flex; justify-content: flex-end; gap: 10px;
}
@media (max-width: 640px) { .fc-row-2, .fc-row-3 { grid-template-columns: 1fr; } }
`;

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  const el = document.createElement("style");
  el.innerHTML = FORM_STYLES;
  document.head.appendChild(el);
  stylesInjected = true;
}

/* ── FormInput ── */
export function FormInput({ label, required, hint, error, icon, type = "text", readOnly, ...props }) {
  injectStyles();
  const [showPwd, setShowPwd] = useState(false);
  const isPwd = type === "password";
  return (
    <div className="fc-group">
      {label && <label className="fc-label">{label}{required && <span className="req">*</span>}</label>}
      <div className="fc-input-wrap">
        <input
          {...props}
          type={isPwd ? (showPwd ? "text" : "password") : type}
          className={`fc-input${readOnly ? " fc-readonly" : ""}`}
          readOnly={readOnly}
        />
        {icon && !isPwd && <span className="fc-input-icon">{icon}</span>}
        {isPwd && (
          <button type="button" className="fc-input-icon-btn" onClick={() => setShowPwd(s => !s)}>
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <div className="fc-error">{error}</div>}
      {hint && !error && <div className="fc-hint">{hint}</div>}
    </div>
  );
}

/* ── FormTextarea ── */
export function FormTextarea({ label, required, hint, error, ...props }) {
  injectStyles();
  return (
    <div className="fc-group">
      {label && <label className="fc-label">{label}{required && <span className="req">*</span>}</label>}
      <textarea {...props} className="fc-input" />
      {error && <div className="fc-error">{error}</div>}
      {hint && !error && <div className="fc-hint">{hint}</div>}
    </div>
  );
}

/* ── FormSelect (native) ── */
export function FormSelect({ label, required, hint, error, options = [], placeholder, ...props }) {
  injectStyles();
  return (
    <div className="fc-group">
      {label && <label className="fc-label">{label}{required && <span className="req">*</span>}</label>}
      <div className="fc-select-wrap">
        <select {...props} className="fc-input" style={{ paddingRight: 36 }}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
          ))}
        </select>
        <span className="fc-input-icon"><ChevronDown size={15} /></span>
      </div>
      {error && <div className="fc-error">{error}</div>}
      {hint && !error && <div className="fc-hint">{hint}</div>}
    </div>
  );
}

/* ── FormDropdown (searchable) ── */
export function FormDropdown({ label, required, hint, error, options = [], value, onChange, placeholder = "Select...", disabled }) {
  injectStyles();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => (o.value ?? o) === (value?.value ?? value));

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="fc-group" ref={ref}>
      {label && <label className="fc-label">{label}{required && <span className="req">*</span>}</label>}
      <div className="fc-dd">
        <button type="button" disabled={disabled} onClick={() => !disabled && setOpen(o => !o)}
          className={`fc-dd-trigger${open ? " open" : ""}${!selected ? " placeholder" : ""}${disabled ? " disabled" : ""}`}>
          <span>{selected ? (selected.label ?? selected) : placeholder}</span>
          <ChevronDown size={15} color="var(--text-muted)" style={{ transform: open ? "rotate(180deg)" : "", transition: "transform 0.2s", flexShrink: 0 }} />
        </button>
        {open && (
          <div className="fc-dd-menu">
            {options.length === 0
              ? <div className="fc-dd-empty">No options</div>
              : options.map(o => {
                  const val = o.value ?? o; const lbl = o.label ?? o;
                  const isSel = val === (value?.value ?? value);
                  return (
                    <div key={val} className={`fc-dd-item${isSel ? " selected" : ""}`}
                      onClick={() => { onChange(o); setOpen(false); }}>
                      {lbl} {isSel && <Check size={14} />}
                    </div>
                  );
                })
            }
          </div>
        )}
      </div>
      {error && <div className="fc-error">{error}</div>}
      {hint && !error && <div className="fc-hint">{hint}</div>}
    </div>
  );
}

/* ── FormDate (custom calendar picker) ── */
export function FormDate({ label, required, hint, error, value, onChange, disabled, min, max, placeholder = "Select date" }) {
  injectStyles();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("day"); // "day" | "month" | "year"
  const ref = useRef(null);

  const today = new Date();
  const parsed = value ? new Date(value + "T00:00:00") : null;

  const [view, setView] = useState({
    month: parsed ? parsed.getMonth() : today.getMonth(),
    year: parsed ? parsed.getFullYear() : today.getFullYear(),
  });
  const [yearPage, setYearPage] = useState(Math.floor((view.year) / 12) * 12);

  // Close on outside click
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setMode("day"); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Sync view when value changes externally
  useEffect(() => {
    if (parsed) setView({ month: parsed.getMonth(), year: parsed.getFullYear() });
  }, [value]);

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAYS = ["Mo","Tu","We","Th","Fr","Sa","Su"];

  const displayValue = parsed
    ? `${parsed.getDate()} ${MONTHS_SHORT[parsed.getMonth()]} ${parsed.getFullYear()}`
    : null;

  function buildDays() {
    const first = new Date(view.year, view.month, 1);
    // 0=Sun→6, we want Mon=0
    let startDow = first.getDay() - 1;
    if (startDow < 0) startDow = 6;
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const prevDays = new Date(view.year, view.month, 0).getDate();
    const cells = [];
    for (let i = startDow - 1; i >= 0; i--) cells.push({ day: prevDays - i, current: false });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
    while (cells.length % 7 !== 0) cells.push({ day: cells.length - startDow - daysInMonth + 1, current: false });
    return cells;
  }

  function selectDay(day) {
    const mm = String(view.month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const iso = `${view.year}-${mm}-${dd}`;
    if (min && iso < min) return;
    if (max && iso > max) return;
    onChange && onChange({ target: { value: iso } });
    setOpen(false);
    setMode("day");
  }

  function isSelected(day) {
    if (!parsed) return false;
    return parsed.getDate() === day && parsed.getMonth() === view.month && parsed.getFullYear() === view.year;
  }
  function isToday(day) {
    return today.getDate() === day && today.getMonth() === view.month && today.getFullYear() === view.year;
  }
  function isDisabled(day) {
    const mm = String(view.month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const iso = `${view.year}-${mm}-${dd}`;
    return (min && iso < min) || (max && iso > max);
  }

  const cells = buildDays();

  return (
    <div className="fc-group" ref={ref}>
      {label && <label className="fc-label">{label}{required && <span className="req">*</span>}</label>}
      <div className="fc-cal-wrap">
        <button
          type="button"
          disabled={disabled}
          onClick={() => { if (!disabled) { setOpen(o => !o); setMode("day"); } }}
          className={`fc-cal-trigger${open ? " open" : ""}${!displayValue ? " placeholder" : ""}`}
        >
          <span>{displayValue || placeholder}</span>
          <Calendar size={15} color="var(--text-muted)" />
        </button>

        {open && (
          <div className="fc-cal-popup">
            {/* ── Header ── */}
            <div className="fc-cal-header">
              <button className="fc-cal-nav" type="button" onClick={() => {
                if (mode === "day") setView(v => v.month === 0 ? { month: 11, year: v.year - 1 } : { ...v, month: v.month - 1 });
                else if (mode === "year") setYearPage(y => y - 12);
              }}>
                <ChevronDown size={15} style={{ transform: "rotate(90deg)" }} />
              </button>

              <div className="fc-cal-title">
                {mode === "day" && (
                  <>
                    <button className="fc-cal-month-btn" type="button" onClick={() => setMode("month")}>{MONTHS[view.month]}</button>
                    <button className="fc-cal-year-btn" type="button" onClick={() => { setYearPage(Math.floor(view.year / 12) * 12); setMode("year"); }}>{view.year}</button>
                  </>
                )}
                {mode === "month" && <span style={{ color: "var(--text-primary)" }}>{view.year}</span>}
                {mode === "year" && <span style={{ color: "var(--text-primary)" }}>{yearPage} – {yearPage + 11}</span>}
              </div>

              <button className="fc-cal-nav" type="button" onClick={() => {
                if (mode === "day") setView(v => v.month === 11 ? { month: 0, year: v.year + 1 } : { ...v, month: v.month + 1 });
                else if (mode === "year") setYearPage(y => y + 12);
              }}>
                <ChevronDown size={15} style={{ transform: "rotate(-90deg)" }} />
              </button>
            </div>

            {/* ── Day grid ── */}
            {mode === "day" && (
              <div className="fc-cal-grid">
                {DAYS.map(d => <div key={d} className="fc-cal-dow">{d}</div>)}
                {cells.map((c, i) => (
                  <div key={i}
                    className={`fc-cal-day${!c.current ? " fc-cal-day-empty" : ""}${c.current && isSelected(c.day) ? " fc-cal-day-selected" : ""}${c.current && isToday(c.day) ? " fc-cal-day-today" : ""}${c.current && isDisabled(c.day) ? " fc-cal-day-empty" : ""}`}
                    onClick={() => c.current && !isDisabled(c.day) && selectDay(c.day)}
                  >{c.day}</div>
                ))}
              </div>
            )}

            {/* ── Month picker ── */}
            {mode === "month" && (
              <div className="fc-cal-overlay">
                {MONTHS_SHORT.map((m, i) => (
                  <div key={m}
                    className={`fc-cal-overlay-item${view.month === i ? " active" : ""}`}
                    onClick={() => { setView(v => ({ ...v, month: i })); setMode("day"); }}
                  >{m}</div>
                ))}
              </div>
            )}

            {/* ── Year picker ── */}
            {mode === "year" && (
              <div className="fc-cal-overlay">
                {Array.from({ length: 12 }, (_, i) => yearPage + i).map(y => (
                  <div key={y}
                    className={`fc-cal-overlay-item${view.year === y ? " active" : ""}`}
                    onClick={() => { setView(v => ({ ...v, year: y })); setMode("day"); }}
                  >{y}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {error && <div className="fc-error">{error}</div>}
      {hint && !error && <div className="fc-hint">{hint}</div>}
    </div>
  );
}

/* ── FormTime ── */
export function FormTime({ label, required, hint, error, ...props }) {
  injectStyles();
  return (
    <div className="fc-group">
      {label && <label className="fc-label">{label}{required && <span className="req">*</span>}</label>}
      <div className="fc-input-wrap">
        <input type="time" {...props} className="fc-input" style={{ paddingRight: 13 }} />
      </div>
      {error && <div className="fc-error">{error}</div>}
    </div>
  );
}

/* ── FormMonth (custom month/year picker — matches FormDate UI) ── */
export function FormMonth({ label, required, hint, error, value, onChange, disabled, placeholder = "Select month" }) {
  injectStyles();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("month"); // "month" | "year"
  const ref = useRef(null);

  const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MONTHS_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const parsed = value ? { year: parseInt(value.split("-")[0]), month: parseInt(value.split("-")[1]) - 1 } : null;
  const today  = new Date();

  const [viewYear, setViewYear] = useState(parsed ? parsed.year : today.getFullYear());
  const [yearPage, setYearPage] = useState(Math.floor((parsed ? parsed.year : today.getFullYear()) / 12) * 12);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setMode("month"); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (parsed) { setViewYear(parsed.year); setYearPage(Math.floor(parsed.year / 12) * 12); }
  }, [value]);

  const displayValue = parsed
    ? `${MONTHS_FULL[parsed.month]} ${parsed.year}`
    : null;

  function selectMonth(monthIdx) {
    const mm = String(monthIdx + 1).padStart(2, "0");
    onChange && onChange({ target: { value: `${viewYear}-${mm}` } });
    setOpen(false);
    setMode("month");
  }

  return (
    <div className="fc-group" ref={ref}>
      {label && <label className="fc-label">{label}{required && <span className="req">*</span>}</label>}
      <div className="fc-cal-wrap">
        <button
          type="button"
          disabled={disabled}
          onClick={() => { if (!disabled) { setOpen(o => !o); setMode("month"); } }}
          className={`fc-cal-trigger${open ? " open" : ""}${!displayValue ? " placeholder" : ""}`}
        >
          <span>{displayValue || placeholder}</span>
          <Calendar size={15} color="var(--text-muted)" />
        </button>

        {open && (
          <div className="fc-cal-popup">
            {/* ── Header ── */}
            <div className="fc-cal-header">
              <button className="fc-cal-nav" type="button" onClick={() => {
                if (mode === "month") setViewYear(y => y - 1);
                else setYearPage(y => y - 12);
              }}>
                <ChevronDown size={15} style={{ transform: "rotate(90deg)" }} />
              </button>

              <div className="fc-cal-title">
                {mode === "month" && (
                  <button className="fc-cal-year-btn" type="button"
                    onClick={() => { setYearPage(Math.floor(viewYear / 12) * 12); setMode("year"); }}>
                    {viewYear}
                  </button>
                )}
                {mode === "year" && (
                  <span style={{ color: "var(--text-primary)" }}>{yearPage} – {yearPage + 11}</span>
                )}
              </div>

              <button className="fc-cal-nav" type="button" onClick={() => {
                if (mode === "month") setViewYear(y => y + 1);
                else setYearPage(y => y + 12);
              }}>
                <ChevronDown size={15} style={{ transform: "rotate(-90deg)" }} />
              </button>
            </div>

            {/* ── Month grid ── */}
            {mode === "month" && (
              <div className="fc-cal-overlay">
                {MONTHS_SHORT.map((m, i) => (
                  <div key={m}
                    className={`fc-cal-overlay-item${parsed && parsed.month === i && parsed.year === viewYear ? " active" : ""}${today.getMonth() === i && today.getFullYear() === viewYear && !(parsed && parsed.month === i && parsed.year === viewYear) ? " fc-cal-day-today" : ""}`}
                    onClick={() => selectMonth(i)}
                  >{m}</div>
                ))}
              </div>
            )}

            {/* ── Year grid ── */}
            {mode === "year" && (
              <div className="fc-cal-overlay">
                {Array.from({ length: 12 }, (_, i) => yearPage + i).map(y => (
                  <div key={y}
                    className={`fc-cal-overlay-item${viewYear === y ? " active" : ""}`}
                    onClick={() => { setViewYear(y); setMode("month"); }}
                  >{y}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {error && <div className="fc-error">{error}</div>}
      {hint && !error && <div className="fc-hint">{hint}</div>}
    </div>
  );
}

/* ── FormCheckbox ── */
export function FormCheckbox({ label, checked, onChange, disabled }) {
  injectStyles();
  return (
    <label className="fc-checkbox-wrap" onClick={() => !disabled && onChange(!checked)}>
      <div className={`fc-checkbox${checked ? " checked" : ""}`}>
        {checked && <Check size={12} color="white" />}
      </div>
      <span className="fc-checkbox-label">{label}</span>
    </label>
  );
}

/* ── FormSection ── */
export function FormSection({ title, icon, children }) {
  injectStyles();
  return (
    <div className="fc-section">
      {title && (
        <div className="fc-section-title">
          {icon && React.cloneElement(icon, { size: 14 })} {title}
        </div>
      )}
      {children}
    </div>
  );
}

/* ── FormRow ── */
export function FormRow({ cols = 2, children }) {
  injectStyles();
  return <div className={`fc-row fc-row-${cols}`}>{children}</div>;
}

/* ── PasswordStrength ── */
export function PasswordStrength({ password }) {
  injectStyles();
  let score = 0;
  if (password.length >= 6) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  return (
    <div style={{ marginTop: 6, marginBottom: 12 }}>
      <div className="fc-strength">
        <div className="fc-strength-fill" style={{ width: `${(score / 4) * 100}%`, background: colors[score - 1] || "#ef4444" }} />
      </div>
      {password && <div style={{ fontSize: 11, color: colors[score - 1] || "#ef4444", fontWeight: 600, marginTop: 3 }}>{labels[score - 1] || "Very Weak"}</div>}
    </div>
  );
}

/* ── FormCard container ── */
export function FormCard({ icon, title, subtitle, children, footer }) {
  injectStyles();
  return (
    <div className="form-card">
      {(icon || title) && (
        <div className="form-card-header">
          {icon && <div className="form-card-icon">{React.cloneElement(icon, { size: 20, color: "white" })}</div>}
          <div>
            {title && <div className="form-card-title">{title}</div>}
            {subtitle && <div className="form-card-subtitle">{subtitle}</div>}
          </div>
        </div>
      )}
      <div className="form-card-body">{children}</div>
      {footer && <div className="form-card-footer">{footer}</div>}
    </div>
  );
}