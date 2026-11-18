import { cn } from "cn";
import { Calendar as DateCalendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { NativeSelect } from "./ui/native-select";
// Shared form components - pure CSS, no MUI

// Shared form components - pure CSS, no MUI
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Calendar, Eye, EyeOff, Check, Trash2 } from "lucide-react";

/* Shared presentation is loaded once from styles/forms.css. */

/* ── FormInput ── */
export function FormInput({ label, required, hint, error, icon, type = "text", readOnly, ...props }: Record<string, any>) {
  const [showPwd, setShowPwd] = useState(false);
  const isPwd = type === "password";
  const generatedId = React.useId();
  const id = props.id || generatedId;
  return (
    <div className="fc-group">
      {label && <label htmlFor={id} className="fc-label">{label}{required && <span className="req">*</span>}</label>}
      <div className="fc-input-wrap">
        <Input
          {...props}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          type={isPwd ? (showPwd ? "text" : "password") : type}
          className={`fc-input${readOnly ? " fc-readonly" : ""}`}
          readOnly={readOnly}
        />
        {icon && !isPwd && <span className="fc-input-icon">{icon}</span>}
        {isPwd && (
          <Button variant="ghost" type="button" aria-label={showPwd ? "Hide password" : "Show password"} className="fc-input-icon-btn" onClick={() => setShowPwd(s => !s)}>
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </Button>
        )}
      </div>
      {error && <div id={`${id}-help`} className="fc-error">{error}</div>}
      {hint && !error && <div id={`${id}-help`} className="fc-hint">{hint}</div>}
    </div>
  );
}

/* ── FormTextarea ── */
export function FormTextarea({ label, required, hint, error, ...props }: Record<string, any>) {
  const generatedId = React.useId();
  const id = props.id || generatedId;
  return (
    <div className="fc-group">
      {label && <label htmlFor={id} className="fc-label">{label}{required && <span className="req">*</span>}</label>}
      <Textarea id={id} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-help` : undefined} {...props} className="fc-input" />
      {error && <div id={`${id}-help`} className="fc-error">{error}</div>}
      {hint && !error && <div id={`${id}-help`} className="fc-hint">{hint}</div>}
    </div>
  );
}

/* ── FormMultiSelect ── */
export function FormMultiSelect({ label, required, hint, error, options = [], value = [], onChange, disabled, placeholder = "Select..." }: Record<string, any>) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // value is always an array of selected values e.g. ["Proj A", "Proj B"]
  const selected = options.filter(o => value.includes(o.value ?? o));

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = (opt) => {
    const val = opt.value ?? opt;
    const next = value.includes(val) ? value.filter(v => v !== val) : [...value, val];
    onChange && onChange(next);
  };

  const remove = (val, e) => {
    e.stopPropagation();
    onChange && onChange(value.filter(v => v !== val));
  };

  return (
    <div className="fc-group" ref={ref}>
      {label && <label className="fc-label">{label}{required && <span className="req">*</span>}</label>}
      <div className="fc-dd">
        <Button variant="ghost"
          type="button"
          disabled={disabled}
          aria-label={label}
          onClick={() => !disabled && setOpen(o => !o)}
          className={cn(`fc-dd-trigger${open ? " open" : ""}${disabled ? " disabled" : ""}`, "flex-wrap h-[auto] min-h-[42px] min-w-0 gap-[4px] items-center overflow-hidden")}
          
        >
          {selected.length === 0 ? (
            <span className="text-[var(--text-muted)] font-normal" >{placeholder}</span>
          ) : (
            <div className="flex min-w-0 flex-1 flex-wrap gap-[4px]">
              {selected.map(o => {
                const val = o.value ?? o; const lbl = o.label ?? o;
                return (
                  <span key={val} title={String(lbl)} className="inline-flex min-w-0 max-w-full box-border items-center gap-[4px] bg-[var(--primary-ghost)] text-primary p-[4px_8px] text-[12px] font-semibold leading-[1.6]" style={{borderRadius: "var(--radius)", border: "1px solid var(--primary)"}}>
                    <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{lbl}</span>
                    {!disabled && (
                      <span role="button" tabIndex={0} aria-label={`Remove ${lbl}`} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); remove(val, e); } }} onClick={(e) => remove(val, e)} className="ml-[4px] flex shrink-0 cursor-pointer items-center" >
                        <X size={11} />
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
          <ChevronDown size={15} color="var(--text-muted)" className="shrink-[0] ml-[auto]" style={{transform: open ? "rotate(180deg)" : "", transition: "transform 0.2s"}} />
        </Button>

        {open && (
          <div className="fc-dd-menu overflow-x-hidden">
            {options.length === 0
              ? <div className="fc-dd-empty">No options</div>
              : options.map(o => {
                  const val = o.value ?? o; const lbl = o.label ?? o;
                  const isSel = value.includes(val);
                  return (
                    <div key={val} title={String(lbl)} className={cn(`fc-dd-item${isSel ? " selected" : ""}`, "min-w-0 gap-[8px]")} onClick={() => toggle(o)}>
                      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{lbl}</span>
                      {isSel && <Check size={14} className="shrink-0" />}
                    </div>
                  );
                })
            }
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="text-[12px] text-[var(--text-muted)] mt-[4px]" >
          {selected.length} selected
        </div>
      )}
      {error && <div className="fc-error">{error}</div>}
      {hint && !error && <div className="fc-hint">{hint}</div>}
    </div>
  );
}

/* ── FormCreatableMultiSelect ── */
export function FormCreatableMultiSelect({ label, required, hint, error, options = [], value = [], onChange, onCreate, onDeleteOption, placeholder = "Select or add...", disabled, maxLength = 100 }: Record<string, any>) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  const id = React.useId();
  const typed = text.trim();
  const query = typed.toLocaleLowerCase();
  const shown = options.filter((option) => String(option).toLocaleLowerCase().includes(query));
  const exists = options.some((option) => String(option).toLocaleLowerCase() === query)
    || value.some((item) => String(item).toLocaleLowerCase() === query);
  const canAdd = Boolean(onCreate && typed && !exists);

  useEffect(() => {
    const closeOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
        setText("");
      }
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  const toggle = (option) => onChange?.(
    value.includes(option) ? value.filter((item) => item !== option) : [...value, option]
  );
  const addNew = async () => {
    if (busy || !canAdd) return;
    setBusy(true);
    try {
      const saved = await onCreate(typed);
      if (saved == null) return;
      const option = typeof saved === "string" && saved ? saved : typed;
      if (!value.some((item) => String(item).toLocaleLowerCase() === option.toLocaleLowerCase())) {
        onChange?.([...value, option]);
      }
      setText("");
    } catch {
      // The caller owns API error feedback.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fc-group" ref={ref}>
      {label && <label htmlFor={`${id}-trigger`} className="fc-label">{label}{required && <span className="req">*</span>}</label>}
      <div className="fc-dd">
        <Button
          id={`${id}-trigger`}
          variant="outline"
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          onClick={() => !disabled && setOpen((current) => !current)}
          className={cn(`fc-dd-trigger${open ? " open" : ""}${disabled ? " disabled" : ""}`, "h-auto min-h-[42px] min-w-0 flex-wrap items-center gap-[4px] overflow-hidden")}
        >
          {value.length === 0 ? (
            <span className="font-normal text-muted-foreground">{placeholder}</span>
          ) : (
            <span className="flex min-w-0 flex-1 flex-wrap gap-[4px]">
              {value.map((item) => (
                <span key={item} title={item} className="inline-flex min-w-0 max-w-full box-border items-center gap-[4px] rounded-sm border border-primary bg-[var(--primary-ghost)] px-[8px] py-[2px] text-[12px] font-semibold leading-[1.6] text-primary">
                  <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{item}</span>
                  {!disabled && (
                    <span role="button" tabIndex={0} aria-label={`Remove ${item}`} className="ml-[2px] flex shrink-0 cursor-pointer items-center" onClick={(event) => { event.stopPropagation(); onChange?.(value.filter((entry) => entry !== item)); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); onChange?.(value.filter((entry) => entry !== item)); } }}>
                      <X size={11} />
                    </span>
                  )}
                </span>
              ))}
            </span>
          )}
          <ChevronDown size={15} aria-hidden="true" className={cn("ml-auto shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </Button>

        {open && (
          <div className="fc-dd-menu overflow-x-hidden" role="listbox" aria-label={label} aria-multiselectable="true">
            <div className="p-[8px_8px_4px]">
              <Input
                autoFocus
                autoComplete="off"
                maxLength={maxLength}
                aria-label={`Search ${label || "options"}`}
                placeholder={onCreate ? "Search or type a new value" : "Search"}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canAdd) { event.preventDefault(); void addNew(); }
                  if (event.key === "Escape") setOpen(false);
                }}
                className="fc-input px-[10px] py-[7px] text-[13px]"
              />
            </div>
            {shown.map((option) => {
              const selected = value.includes(option);
              return (
                <div key={option} title={option} role="option" aria-selected={selected} className={cn(`fc-dd-item${selected ? " selected" : ""}`, "min-w-0")} onClick={() => toggle(option)}>
                  <span className="inline-flex min-w-0 flex-1 items-center gap-[8px]">
                    <span aria-hidden="true" className={cn("inline-flex size-4 shrink-0 items-center justify-center rounded-sm border", selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent")}>
                      {selected && <Check size={11} />}
                    </span>
                    <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{option}</span>
                  </span>
                  {onDeleteOption && (
                    <Button variant="ghost" size="icon-xs" type="button" aria-label={`Remove ${option} from options`} title="Remove from options" onClick={(event) => { event.stopPropagation(); onDeleteOption(option); }}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              );
            })}
            {shown.length === 0 && !canAdd && <div className="fc-dd-empty">No options</div>}
            {canAdd && (
              <button type="button" disabled={busy} className="fc-dd-item w-full border-t border-border text-left font-semibold text-primary disabled:opacity-50" onClick={() => void addNew()}>
                <span className="inline-flex min-w-0 items-center gap-[8px]">
                  <span aria-hidden="true" className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-current">+</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">Add “{typed}”</span>
                </span>
              </button>
            )}
          </div>
        )}
      </div>
      {error && <div id={`${id}-help`} className="fc-error">{error}</div>}
      {hint && !error && <div id={`${id}-help`} className="fc-hint">{hint}</div>}
    </div>
  );
}

/* ── FormSelect (native) ── */
export function FormSelect({ label, required, hint, error, options = [], placeholder, ...props }: Record<string, any>) {
  const generatedId = React.useId();
  const id = props.id || generatedId;
  return (
    <div className="fc-group">
      {label && <label htmlFor={id} className="fc-label">{label}{required && <span className="req">*</span>}</label>}
      <div className="fc-select-wrap">
        <NativeSelect id={id} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-help` : undefined} {...props} className={cn("fc-input", "pr-[36px]")} >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
          ))}
        </NativeSelect>
        <span className="fc-input-icon"><ChevronDown size={15} /></span>
      </div>
      {error && <div id={`${id}-help`} className="fc-error">{error}</div>}
      {hint && !error && <div id={`${id}-help`} className="fc-hint">{hint}</div>}
    </div>
  );
}

/* ── FormDropdown (searchable) ── */
export function FormDropdown({ label, required, hint, error, options = [], value, onChange, placeholder = "Select...", disabled }: Record<string, any>) {
  const id = React.useId();
  const selected = value?.value ?? value;
  return <div className="fc-group">
    {label && <label htmlFor={id} className="fc-label">{label}{required && <span className="req">*</span>}</label>}
    <Select value={selected == null ? "" : String(selected)} disabled={disabled} onValueChange={val => onChange?.(options.find(o => String(o.value ?? o) === val))}>
      <SelectTrigger id={id} aria-invalid={!!error} className="w-full"><SelectValue placeholder={placeholder}/></SelectTrigger>
      <SelectContent className="z-[10100]" >{options.filter(o => String(o.value ?? o) !== "").map(o => <SelectItem key={String(o.value ?? o)} value={String(o.value ?? o)}>{o.label ?? o}</SelectItem>)}</SelectContent>
    </Select>
    {error && <div className="fc-error">{error}</div>}{hint && !error && <div className="fc-hint">{hint}</div>}
  </div>;
}

/* ── FormCombo: dropdown list (same look as FormDropdown) that also lets the user type a value not in the list ── */
export function FormCombo({ label, required, hint, error, options = [], value = "", onChange, placeholder = "Select or type", disabled, maxLength }: Record<string, any>) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const id = React.useId();

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const labelOf = o => String(o.label ?? o);
  const q = (value || "").trim().toLowerCase();
  const exact = options.some(o => labelOf(o).toLowerCase() === q);
  const shown = !q || exact ? options : options.filter(o => labelOf(o).toLowerCase().includes(q));

  return (
    <div className="fc-group" ref={ref}>
      {label && <label htmlFor={id} className="fc-label">{label}{required && <span className="req">*</span>}</label>}
      <div className="fc-dd">
        <Input
          id={id} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-help` : undefined}
          onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}
          className={cn("fc-input", "pr-[36px]")}  autoComplete="off"
          value={value} placeholder={placeholder} disabled={disabled} maxLength={maxLength}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        <span className={cn("fc-input-icon", "cursor-pointer")}  onClick={() => !disabled && setOpen(o => !o)}>
          <ChevronDown size={15} style={{ transform: open ? "rotate(180deg)" : "", transition: "transform 0.2s" }} />
        </span>
        {open && shown.length > 0 && (
          <div className="fc-dd-menu">
            {shown.map(o => {
              const lbl = labelOf(o);
              const isSel = lbl === value;
              return (
                <button type="button" key={lbl} className={`fc-dd-item${isSel ? " selected" : ""}`}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { onChange(lbl); setOpen(false); }}>
                  {lbl} {isSel && <Check size={14} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {error && <div id={`${id}-help`} className="fc-error">{error}</div>}
      {hint && !error && <div id={`${id}-help`} className="fc-hint">{hint}</div>}
    </div>
  );
}

/* ── FormDate (custom calendar picker) ── */
export function FormDate({ label, required, hint, error, value, onChange, disabled, min, max, placeholder = "Select date" }: Record<string, any>) {
  const [open, setOpen] = useState(false);
  const id = React.useId();
  const parse = iso => iso ? new Date(`${iso}T00:00:00`) : undefined;
  const selected = parse(value);
  const validSelected = selected && !Number.isNaN(selected.getTime()) ? selected : undefined;
  const earliest = parse(min);
  const latest = parse(max);
  return <div className="fc-group">
    {label && <label htmlFor={id} className="fc-label">{label}{required && <span className="req">*</span>}</label>}
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" disabled={disabled} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-help` : undefined} className={cn("fc-cal-trigger", "w-[100%] justify-between")} >
          <span>{validSelected ? validSelected.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : placeholder}</span><Calendar size={15}/>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn("w-auto p-0", "z-[10100]")} >
        <DateCalendar mode="single" selected={validSelected} defaultMonth={validSelected || latest || new Date()} captionLayout="dropdown" startMonth={earliest || new Date(1900, 0)} endMonth={latest || new Date(new Date().getFullYear() + 20, 11)} disabled={date => !!((earliest && date < earliest) || (latest && date > latest))} onSelect={date => {
          if (!date) return;
          const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          onChange?.({ target: { value: iso } });
          setOpen(false);
        }}/>
      </PopoverContent>
    </Popover>
    {(error || hint) && <div id={`${id}-help`} className={error ? "fc-error" : "fc-hint"}>{error || hint}</div>}
  </div>;
}

/* ── FormTime ── */
export function FormTime({ label, required, hint, error, ...props }: Record<string, any>) {
  const generatedId = React.useId();
  const id = props.id || generatedId;
  return (
    <div className="fc-group">
      {label && <label htmlFor={id} className="fc-label">{label}{required && <span className="req">*</span>}</label>}
      <div className="fc-input-wrap">
        <Input id={id} aria-invalid={!!error} aria-describedby={error || hint ? `${id}-help` : undefined} type="time" {...props} className={cn("fc-input", "pr-[12px]")}  />
      </div>
      {hint && !error && <div id={`${id}-help`} className="fc-hint">{hint}</div>}
      {error && <div id={`${id}-help`} className="fc-error">{error}</div>}
    </div>
  );
}

/* ── FormMonth (custom month/year picker — matches FormDate UI) ── */
export function FormMonth({ label, required, hint, error, value, onChange, disabled, min, max, placeholder = "Select month" }: Record<string, any>) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("month"); // "month" | "year"
  const id = React.useId();

  const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MONTHS_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const parsed = value ? { year: parseInt(value.split("-")[0]), month: parseInt(value.split("-")[1]) - 1 } : null;
  const today  = new Date();

  const [viewYear, setViewYear] = useState(parsed ? parsed.year : today.getFullYear());
  const [yearPage, setYearPage] = useState(Math.floor((parsed ? parsed.year : today.getFullYear()) / 12) * 12);


  useEffect(() => {
    if (value) { const year = Number(value.split("-")[0]); setViewYear(year); setYearPage(Math.floor(year / 12) * 12); }
  }, [value]);

  const displayValue = parsed
    ? `${MONTHS_FULL[parsed.month]} ${parsed.year}`
    : null;

  // optional limits as "YYYY-MM": months / years outside them are greyed out and cannot be picked
  const toIdx = (ym) => (ym ? parseInt(ym.split("-")[0], 10) * 12 + parseInt(ym.split("-")[1], 10) - 1 : null);
  const minIdx = toIdx(min), maxIdx = toIdx(max);
  const monthBlocked = (year, m) => (minIdx !== null && year * 12 + m < minIdx) || (maxIdx !== null && year * 12 + m > maxIdx);
  const yearBlocked = (year) => (minIdx !== null && year * 12 + 11 < minIdx) || (maxIdx !== null && year * 12 > maxIdx);
  const blockedStyle: import("react").CSSProperties = { opacity: 0.35, cursor: "not-allowed", pointerEvents: "none" };

  function selectMonth(monthIdx) {
    if (monthBlocked(viewYear, monthIdx)) return;
    const mm = String(monthIdx + 1).padStart(2, "0");
    onChange && onChange({ target: { value: `${viewYear}-${mm}` } });
    setOpen(false);
    setMode("month");
  }

  return (
    <div className="fc-group">
      {label && <label htmlFor={id} className="fc-label">{label}{required && <span className="req">*</span>}</label>}
      <Popover open={open} onOpenChange={next => { setOpen(next); setMode("month"); }}>
        <PopoverTrigger asChild>
        <Button id={id} variant="outline"
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          type="button"
          disabled={disabled}
          className={`fc-cal-trigger${open ? " open" : ""}${!displayValue ? " placeholder" : ""}`}
        >
          <span>{displayValue || placeholder}</span>
          <Calendar size={15} color="var(--text-muted)" />
        </Button>
        </PopoverTrigger>

        {open && (
          <PopoverContent align="start" className="month-picker-popup">
            {/* ── Header ── */}
            <div className="fc-cal-header">
              <Button variant="ghost" className="fc-cal-nav" aria-label="Previous period" type="button" onClick={() => {
                if (mode === "month") setViewYear(y => y - 1);
                else setYearPage(y => y - 12);
              }}>
                <ChevronDown size={15} style={{ transform: "rotate(90deg)" }} />
              </Button>

              <div className="fc-cal-title">
                {mode === "month" && (
                  <Button variant="ghost" className="fc-cal-year-btn" type="button"
                    onClick={() => { setYearPage(Math.floor(viewYear / 12) * 12); setMode("year"); }}>
                    {viewYear}
                  </Button>
                )}
                {mode === "year" && (
                  <span className="text-[var(--text-primary)]" >{yearPage} – {yearPage + 11}</span>
                )}
              </div>

              <Button variant="ghost" className="fc-cal-nav" aria-label="Next period" type="button" onClick={() => {
                if (mode === "month") setViewYear(y => y + 1);
                else setYearPage(y => y + 12);
              }}>
                <ChevronDown size={15} style={{ transform: "rotate(-90deg)" }} />
              </Button>
            </div>

            {/* ── Month grid ── */}
            {mode === "month" && (
              <div className="fc-cal-overlay">
                {MONTHS_SHORT.map((m, i) => (
                  <Button variant="ghost" key={m}
                    type="button"
                    disabled={monthBlocked(viewYear, i)}
                    aria-pressed={!!(parsed && parsed.month === i && parsed.year === viewYear)}
                    className={`fc-cal-overlay-item${parsed && parsed.month === i && parsed.year === viewYear ? " active" : ""}${today.getMonth() === i && today.getFullYear() === viewYear && !(parsed && parsed.month === i && parsed.year === viewYear) ? " fc-cal-day-today" : ""}`}
                    style={monthBlocked(viewYear, i) ? blockedStyle : undefined}
                    onClick={() => selectMonth(i)}
                  >{m}</Button>
                ))}
              </div>
            )}

            {/* ── Year grid ── */}
            {mode === "year" && (
              <div className="fc-cal-overlay">
                {Array.from({ length: 12 }, (_, i) => yearPage + i).map(y => (
                  <Button variant="ghost" key={y}
                    type="button"
                    disabled={yearBlocked(y)}
                    aria-pressed={viewYear === y}
                    className={`fc-cal-overlay-item${viewYear === y ? " active" : ""}`}
                    style={yearBlocked(y) ? blockedStyle : undefined}
                    onClick={() => { if (!yearBlocked(y)) { setViewYear(y); setMode("month"); } }}
                  >{y}</Button>
                ))}
              </div>
            )}
          </PopoverContent>
        )}
      </Popover>
      {error && <div id={`${id}-help`} className="fc-error">{error}</div>}
      {hint && !error && <div id={`${id}-help`} className="fc-hint">{hint}</div>}
    </div>
  );
}

/* ── FormCheckbox ── */
export function FormCheckbox({ label, checked, onChange, disabled }: Record<string, any>) {
  const id = React.useId();
  return <div className="fc-checkbox-wrap"><Checkbox id={id} checked={checked} onCheckedChange={onChange} disabled={disabled}/><label htmlFor={id} className="fc-checkbox-label">{label}</label></div>;
}

/* ── FormSection ── */
export function FormSection({ title, icon, children }: Record<string, any>) {
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
export function FormRow({ cols = 2, children }: Record<string, any>) {
  return <div className={`fc-row fc-row-${cols}`}>{children}</div>;
}

/* ── PasswordStrength ── */
export function PasswordStrength({ password }: Record<string, any>) {
  let score = 0;
  if (password.length >= 6) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const colors = ["var(--error)", "var(--warning)", "var(--primary)", "var(--success)"];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  return (
    <div className="mt-[8px] mb-[12px]" >
      <div className="fc-strength">
        <div className="fc-strength-fill" style={{ width: `${(score / 4) * 100}%`, background: colors[score - 1] || "var(--error)" }} />
      </div>
      {password && <div className="text-[12px] font-semibold mt-[4px]" style={{color: colors[score - 1] || "var(--error)"}}>{labels[score - 1] || "Very Weak"}</div>}
    </div>
  );
}

/* ── FormCard container ── */
export function FormCard({ icon, title, subtitle, children, footer }: Record<string, any>) {
  return (
    <div className="form-card">
      {(icon || title) && (
        <div className="form-card-header">
          {icon && <div className="form-card-icon">{React.cloneElement(icon, { size: 20, color: "var(--card)" })}</div>}
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
