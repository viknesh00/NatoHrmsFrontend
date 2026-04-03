import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Filter, X, FileSpreadsheet, Check,
  SlidersHorizontal, RotateCcw,
} from "lucide-react";
import * as XLSX from "xlsx";
import { FormSelect, FormDate, FormInput } from "./FormComponents";

/* ─── inject panel styles once ─── */
const PANEL_CSS = `
@keyframes filterPanelIn {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes chipPop {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}

.pt-filter-panel {
  background: #fff;
  border: 1.5px solid var(--border);
  border-radius: 16px;
  margin: 0 0 16px 0;
  box-shadow: 0 8px 32px rgba(80,60,180,0.10), 0 2px 8px rgba(80,60,180,0.06);
  overflow: visible;
  animation: filterPanelIn 0.22s cubic-bezier(.22,.68,0,1.2);
}
.pt-filter-panel-header {
  border-radius: 14px 14px 0 0;
  overflow: hidden;
}

.pt-filter-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 12px;
  background: linear-gradient(105deg, var(--primary-ghost) 0%, #f0f9ff 100%);
  border-bottom: 1.5px solid var(--border);
}

.pt-filter-panel-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.pt-filter-panel-title-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-ghost);
}

.pt-filter-panel-body {
  padding: 20px 20px 4px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0 20px;
}

.pt-filter-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 14px;
  border-top: 1px solid var(--border);
  background: #faf8ff;
  border-radius: 0 0 14px 14px;
}

.pt-filter-panel-count {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

.pt-filter-panel-actions {
  display: flex;
  gap: 8px;
}

.pt-filter-btn-clear {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: white;
  color: var(--text-secondary);
  font-family: 'DM Sans', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
}
.pt-filter-btn-clear:hover {
  border-color: var(--coral);
  color: var(--coral);
  background: #fff1f2;
}

.pt-filter-btn-apply {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  border-radius: 9px;
  border: none;
  background: linear-gradient(135deg, var(--primary), var(--primary-light, #6366f1));
  color: white;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 3px 12px var(--primary-glow, rgba(99,102,241,0.25));
  transition: all 0.18s;
}
.pt-filter-btn-apply:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px var(--primary-glow, rgba(99,102,241,0.35));
}

/* filter toggle btn */
.pt-filter-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: white;
  color: var(--text-secondary);
  font-family: 'DM Sans', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s;
  position: relative;
}
.pt-filter-toggle:hover,
.pt-filter-toggle.active {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-ghost);
}
.pt-filter-toggle-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  font-size: 10px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Plus Jakarta Sans', sans-serif;
  border: 2px solid white;
  animation: chipPop 0.2s ease;
}

/* active filter chips */
.pt-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 0 14px 0;
  align-items: center;
}
.pt-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px 4px 12px;
  background: var(--primary-ghost);
  border: 1px solid rgba(99,102,241,0.2);
  color: var(--primary);
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  animation: chipPop 0.18s ease;
}
.pt-chip-key {
  opacity: 0.65;
  font-weight: 500;
  margin-right: 1px;
}
.pt-chip-x {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--primary);
  opacity: 0.6;
  transition: opacity 0.15s, background 0.15s;
  flex-shrink: 0;
}
.pt-chip-x:hover { opacity: 1; background: rgba(99,102,241,0.15); }

.pt-chip-clear-all {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px dashed var(--border);
  background: transparent;
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  transition: all 0.15s;
}
.pt-chip-clear-all:hover { border-color: var(--coral); color: var(--coral); }

/* fc-group override — no bottom margin inside panel grid */
.pt-filter-panel-body .fc-group { margin-bottom: 16px; }

@media (max-width: 640px) {
  .pt-filter-panel-body { grid-template-columns: 1fr; }
}
`;

let ptStylesInjected = false;
function injectPTStyles() {
  if (ptStylesInjected) return;
  const el = document.createElement("style");
  el.innerHTML = PANEL_CSS;
  document.head.appendChild(el);
  ptStylesInjected = true;
}

/* ─── helper: detect field type ─── */
function guessFieldType(values) {
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const allDates = values.length > 0 && values.every(v => dateRe.test(String(v)));
  if (allDates) return "date";
  return "select";
}

/* ─── StatusChip ─── */
export function StatusChip({ label }) {
  const map = {
    active:          { cls: "badge-green" },
    inactive:        { cls: "badge-red" },
    approved:        { cls: "badge-green" },
    declined:        { cls: "badge-red" },
    pending:         { cls: "badge-yellow" },
    "update status": { cls: "badge-gray" },
    present:         { cls: "badge-green" },
    absent:          { cls: "badge-yellow" },
    leave:           { cls: "badge-blue" },
    anomaly:         { cls: "badge-orange" },
    wo:              { cls: "badge-red" },
    holiday:         { cls: "badge-red" },
    new:             { cls: "badge-purple" },
  };
  const key = (label || "").toLowerCase();
  const c = map[key] || { cls: "badge-gray" };
  return <span className={`badge ${c.cls}`}>{label}</span>;
}

/* ════════════════════════════════════════
   ProTable
════════════════════════════════════════ */
export default function ProTable({
  title = "",
  columns = [],
  data = [],
  actions,
  filterComponents,      // custom JSX filter fields (from parent)
  onApplyFilters,        // called when user clicks Apply Filters
  onResetFilters,        // called when user clicks Clear
  defaultRowsPerPage = 10,
  onExport,
  multiSelect = true,
  onSelectionChange,
}) {
  injectPTStyles();

  const [search, setSearch]               = useState("");
  const [sortCol, setSortCol]             = useState(null);
  const [sortDir, setSortDir]             = useState("asc");
  const [page, setPage]                   = useState(0);
  const [rowsPerPage, setRowsPerPage]     = useState(defaultRowsPerPage);
  const [columnFilters, setColumnFilters] = useState({});
  const [showFilters, setShowFilters]     = useState(false);
  const [selected, setSelected]           = useState(new Set());

  // draft state while panel is open
  const [draft, setDraft] = useState({});

  const visibleCols = columns.filter(c => c.hidden !== true);

  /* auto-detect filterable columns */
  const filterMeta = useMemo(() => {
    const meta = {};
    visibleCols.forEach(col => {
      if (!col.filterable) return;
      if (col.options) {
        // static options provided — works even on renderCell columns
        meta[col.field] = { label: col.label, type: "select", options: col.options };
      } else if (!col.renderCell) {
        const vals = [...new Set(data.map(r => r[col.field]).filter(v => v != null && v !== ""))].sort();
        const type = guessFieldType(vals);
        meta[col.field] = { label: col.label, type, options: vals };
      }
    });
    return meta;
  }, [data, visibleCols]);

  const hasAutoFilters   = Object.keys(filterMeta).length > 0;
  const hasAnyFilter     = filterComponents || hasAutoFilters;
  const activeFilterCount = Object.values(columnFilters).filter(Boolean).length;

  /* sync draft when panel opens */
  useEffect(() => {
    if (showFilters) setDraft({ ...columnFilters });
  }, [showFilters]);

  /* processed rows */
  const processed = useMemo(() => {
    let rows = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(row =>
        visibleCols.some(col => {
          if (col.renderCell) return false;
          const val = row[col.field];
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }
    Object.entries(columnFilters).forEach(([field, val]) => {
      if (!val) return;
      const meta = filterMeta[field];
      if (meta?.type === "date") {
        // date range support: val can be { from, to } or plain string
        if (val.from || val.to) {
          rows = rows.filter(row => {
            const rv = row[field];
            if (!rv) return false;
            if (val.from && rv < val.from) return false;
            if (val.to   && rv > val.to)   return false;
            return true;
          });
        } else if (typeof val === "string") {
          rows = rows.filter(row => String(row[field] ?? "") === val);
        }
      } else {
        rows = rows.filter(row => String(row[field] ?? "") === String(val));
      }
    });
    if (sortCol) {
      rows.sort((a, b) => {
        const av = a[sortCol] ?? ""; const bv = b[sortCol] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [data, search, columnFilters, sortCol, sortDir, visibleCols, filterMeta]);

  const totalPages = Math.ceil(processed.length / rowsPerPage);
  const paged      = processed.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const handleSort = field => {
    if (!field) return;
    if (sortCol === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(field); setSortDir("asc"); }
    setPage(0);
  };

  /* selection */
  const allPageSelected = paged.length > 0 && paged.every((_, ri) => selected.has(page * rowsPerPage + ri));
  const toggleAll = () => {
    const s = new Set(selected);
    if (allPageSelected) paged.forEach((_, ri) => s.delete(page * rowsPerPage + ri));
    else paged.forEach((_, ri) => s.add(page * rowsPerPage + ri));
    setSelected(s);
    onSelectionChange?.([...s]);
  };
  const toggleRow = idx => {
    const s = new Set(selected);
    s.has(idx) ? s.delete(idx) : s.add(idx);
    setSelected(s);
    onSelectionChange?.([...s]);
  };

  const selectedRows = processed.filter((_, i) => selected.has(i));
  const exportData   = selectedRows.length > 0 ? selectedRows : processed;

  const handleExportExcel = () => {
    const headers = visibleCols.filter(c => !c.renderCell).map(c => c.label);
    const rows    = exportData.map(row => visibleCols.filter(c => !c.renderCell).map(c => row[c.field] ?? ""));
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${title || "export"}.xlsx`);
  };

  /* apply / clear draft */
  const applyFilters = () => {
    setColumnFilters({ ...draft });
    setShowFilters(false);
    setPage(0);
    setSelected(new Set());
    onApplyFilters?.();
  };
  const clearAll = () => {
    setDraft({});
    setColumnFilters({});
    setPage(0);
    setSelected(new Set());
    onResetFilters?.();
  };
  const removeChip = field => {
    setColumnFilters(f => { const n = { ...f }; delete n[field]; return n; });
    setPage(0);
  };

  /* chip label helper */
  const chipLabel = (field, val) => {
    if (val && typeof val === "object") {
      if (val.from && val.to)  return `${val.from} → ${val.to}`;
      if (val.from)             return `≥ ${val.from}`;
      if (val.to)               return `≤ ${val.to}`;
    }
    return String(val);
  };

  const activeChips = Object.entries(columnFilters).filter(([, v]) => {
    if (!v) return false;
    if (typeof v === "object") return v.from || v.to;
    return true;
  });

  return (
    <div className="pro-table-wrap">

      {/* ── Toolbar ── */}
      <div className="pro-table-toolbar">
        {title && (
          <span className="pro-table-title">
            {title}
            <span className="pro-table-count">{processed.length}</span>
          </span>
        )}

        <div className="search-box">
          <Search size={14} color="var(--text-muted)" />
          <input
            placeholder="Search..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); setSelected(new Set()); }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",display:"flex",color:"var(--text-muted)",padding:0 }}>
              <X size={13}/>
            </button>
          )}
        </div>

        <div className="pro-table-actions">
          {selected.size > 0 && (
            <span style={{ fontSize:12, color:"var(--primary)", fontWeight:700, background:"var(--primary-ghost)", padding:"4px 10px", borderRadius:20 }}>
              {selected.size} selected
            </span>
          )}

          {hasAnyFilter && (
            <button
              className={`pt-filter-toggle${showFilters ? " active" : ""}`}
              onClick={() => setShowFilters(s => !s)}
            >
              <SlidersHorizontal size={14}/>
              Filters
              {activeFilterCount > 0 && (
                <span className="pt-filter-toggle-badge">{activeFilterCount}</span>
              )}
            </button>
          )}

          <button
            className="icon-btn"
            onClick={handleExportExcel}
            title="Export to Excel"
            style={{ color:"var(--teal)" }}
          >
            <FileSpreadsheet size={15}/>
            <span style={{ fontSize:11, fontWeight:700 }}>Excel</span>
          </button>

          {actions}
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {activeChips.length > 0 && (
        <div className="pt-chip-row">
          {activeChips.map(([field, val]) => {
            const col = visibleCols.find(c => c.field === field);
            return (
              <span key={field} className="pt-chip">
                <span className="pt-chip-key">{col?.label || field}:</span>
                {chipLabel(field, val)}
                <span className="pt-chip-x" onClick={() => removeChip(field)}>
                  <X size={10}/>
                </span>
              </span>
            );
          })}
          <button className="pt-chip-clear-all" onClick={clearAll}>
            <RotateCcw size={10}/> Clear all
          </button>
        </div>
      )}

      {/* ── Filter Panel ── */}
      {showFilters && hasAnyFilter && (
        <div className="pt-filter-panel">

          <div className="pt-filter-panel-header">
            <div className="pt-filter-panel-title">
              <span className="pt-filter-panel-title-dot"/>
              Filter Records
            </div>
            <button
              onClick={() => setShowFilters(false)}
              style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", display:"flex", padding:4, borderRadius:7 }}
            >
              <X size={16}/>
            </button>
          </div>

          <div className="pt-filter-panel-body">

            {/* custom filterComponents from parent — flows inline with auto-fields in the same grid */}
            {filterComponents}

            {/* auto-generated FormComponent fields from filterable columns */}
            {hasAutoFilters && Object.entries(filterMeta).map(([field, meta]) => {

              if (meta.type === "select") {
                return (
                  <FormSelect
                    key={field}
                    label={meta.label}
                    placeholder="All"
                    value={draft[field] || ""}
                    options={meta.options.map(v => typeof v === "object" ? v : { value: v, label: v })}
                    onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))}
                  />
                );
              }

              if (meta.type === "date") {
                return (
                  <div key={field} style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    <FormDate
                      label={`${meta.label} From`}
                      value={draft[field]?.from || ""}
                      onChange={e => setDraft(d => ({ ...d, [field]: { ...(d[field] || {}), from: e.target.value } }))}
                    />
                    <FormDate
                      label={`${meta.label} To`}
                      value={draft[field]?.to || ""}
                      onChange={e => setDraft(d => ({ ...d, [field]: { ...(d[field] || {}), to: e.target.value } }))}
                    />
                  </div>
                );
              }

              // text fallback
              return (
                <FormInput
                  key={field}
                  label={meta.label}
                  placeholder={`Filter by ${meta.label}...`}
                  value={draft[field] || ""}
                  onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))}
                />
              );
            })}
          </div>

          <div className="pt-filter-panel-footer">
            <div className="pt-filter-panel-actions">
              <button className="pt-filter-btn-clear" onClick={() => { clearAll(); setShowFilters(false); }}>
                <RotateCcw size={13}/> Clear
              </button>
              <button className="pt-filter-btn-apply" onClick={applyFilters}>
                <Check size={13}/> Apply Filters
              </button>
            </div>
            <span className="pt-filter-panel-count">
              {processed.length} record{processed.length !== 1 ? "s" : ""} match
            </span>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ overflowX:"auto" }}>
        <table className="pro-table">
          <thead>
            <tr>
              {multiSelect && (
                <th style={{ width:44, textAlign:"center", whiteSpace:"nowrap" }}>
                  <div
                    onClick={toggleAll}
                    style={{ width:18, height:18, borderRadius:5, border:`2px solid ${allPageSelected ? "var(--primary)" : "var(--border)"}`, background:allPageSelected?"var(--primary)":"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", margin:"0 auto", transition:"all 0.2s" }}
                  >
                    {allPageSelected && <Check size={11} color="white"/>}
                  </div>
                </th>
              )}
              {visibleCols.map((col, i) => (
                <th
                  key={i}
                  onClick={() => !col.renderCell && handleSort(col.field)}
                  style={{ textAlign:col.align||"left", width:col.width, whiteSpace:"nowrap", cursor:col.renderCell?"default":"pointer" }}
                >
                  <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                    {col.label}
                    {!col.renderCell && sortCol === col.field
                      ? (sortDir==="asc" ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)
                      : (!col.renderCell && <ChevronUp size={12} style={{ opacity:0.25 }}/>)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={visibleCols.length + (multiSelect ? 1 : 0)}>
                  <div className="table-empty">
                    <div className="table-empty-icon"><Search size={36}/></div>
                    <div className="table-empty-text">No records found</div>
                  </div>
                </td>
              </tr>
            ) : paged.map((row, ri) => {
              const globalIdx = page * rowsPerPage + ri;
              const isSel     = selected.has(globalIdx);
              return (
                <tr key={ri} style={{ background: isSel ? "var(--primary-ghost)" : "" }}>
                  {multiSelect && (
                    <td style={{ textAlign:"center", whiteSpace:"nowrap" }}>
                      <div
                        onClick={() => toggleRow(globalIdx)}
                        style={{ width:18, height:18, borderRadius:5, border:`2px solid ${isSel?"var(--primary)":"var(--border)"}`, background:isSel?"var(--primary)":"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", margin:"0 auto", transition:"all 0.2s" }}
                      >
                        {isSel && <Check size={11} color="white"/>}
                      </div>
                    </td>
                  )}
                  {visibleCols.map((col, ci) => (
                    <td
                      key={ci}
                      style={{ textAlign:col.align||"left", whiteSpace:"nowrap", ...(col.maxWidth ? { maxWidth:col.maxWidth, overflow:"hidden" } : {}) }}
                    >
                      {col.renderCell ? (
                        col.renderCell(row, globalIdx)
                      ) : col.maxWidth ? (
                        <span title={String(row[col.field] ?? "")} style={{ display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {row[col.field] ?? "—"}
                        </span>
                      ) : (
                        row[col.field] ?? "—"
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="pro-table-footer">
        <span className="pro-table-info">
          {selected.size > 0
            ? `${selected.size} of ${processed.length} selected`
            : `Showing ${processed.length===0?0:page*rowsPerPage+1}–${Math.min((page+1)*rowsPerPage,processed.length)} of ${processed.length}`}
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:12, color:"var(--text-muted)" }}>Show</span>
          <select className="rows-select" value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }}>
            {[5,10,25,50,100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <div className="page-btns">
            <button className="page-btn" disabled={page===0} onClick={()=>setPage(0)}><ChevronsLeft size={13}/></button>
            <button className="page-btn" disabled={page===0} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={13}/></button>
            {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
              const p = Math.max(0,Math.min(page-2,totalPages-5))+i;
              return <button key={p} className={`page-btn ${p===page?"active":""}`} onClick={()=>setPage(p)}>{p+1}</button>;
            })}
            <button className="page-btn" disabled={page>=totalPages-1} onClick={()=>setPage(p=>p+1)}><ChevronRight size={13}/></button>
            <button className="page-btn" disabled={page>=totalPages-1} onClick={()=>setPage(totalPages-1)}><ChevronsRight size={13}/></button>
          </div>
        </div>
      </div>
    </div>
  );
}