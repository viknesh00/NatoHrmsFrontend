import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { NativeSelect } from "./ui/native-select";
import { useState, useMemo, useEffect } from "react";
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, FileSpreadsheet, Check, SlidersHorizontal, RotateCcw, Inbox, SearchX, ChevronsUpDown, } from "lucide-react";
import { FormSelect, FormDate, FormInput } from "./FormComponents";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

/* ─── inject panel styles once ─── */


/* ─── helper: detect field type ─── */
function guessFieldType(values) {
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const allDates = values.length > 0 && values.every(v => dateRe.test(String(v)));
  if (allDates) return "date";
  return "select";
}

/* ─── smart sort comparator ─── */
function smartCompare(av, bv) {
  const s1 = String(av ?? ""), s2 = String(bv ?? "");

  // ISO / YYYY-MM-DD (and datetime variants like "2024-03-15 09:30")
  const isoRe = /^\d{4}-\d{2}-\d{2}/;
  if (isoRe.test(s1) && isoRe.test(s2)) return new Date(s1).getTime() - new Date(s2).getTime();

  // DD-MM-YYYY (hyphen-separated)
  const dmyHyphenRe = /^(\d{2})-(\d{2})-(\d{4})$/;
  const dh1 = s1.match(dmyHyphenRe), dh2 = s2.match(dmyHyphenRe);
  if (dh1 && dh2) {
    return new Date(`${dh1[3]}-${dh1[2]}-${dh1[1]}`).getTime() - new Date(`${dh2[3]}-${dh2[2]}-${dh2[1]}`).getTime();
  }

  // DD/MM/YYYY — reparse as YYYY-MM-DD for correct Date comparison
  const dmyRe = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const d1 = s1.match(dmyRe), d2 = s2.match(dmyRe);
  if (d1 && d2) {
    return new Date(`${d1[3]}-${d1[2]}-${d1[1]}`).getTime() - new Date(`${d2[3]}-${d2[2]}-${d2[1]}`).getTime();
  }

  // MM/DD/YYYY fallback (US style)
  const mdyRe = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const m1 = s1.match(mdyRe), m2 = s2.match(mdyRe);
  if (m1 && m2) return new Date(s1).getTime() - new Date(s2).getTime();

  // HH:MM or H:MM with optional seconds and AM/PM  e.g. "9:05 AM", "14:30", "09:30:00"
  const timeRe = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i;
  const t1 = s1.match(timeRe), t2 = s2.match(timeRe);
  if (t1 && t2) {
    const toSeconds = m => {
      let h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const sec = m[3] ? parseInt(m[3], 10) : 0;
      const period = (m[4] || "").toUpperCase();
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h * 3600 + min * 60 + sec;
    };
    return toSeconds(t1) - toSeconds(t2);
  }

  // fallback — locale-aware with numeric collation
  return s1.localeCompare(s2, undefined, { numeric: true, sensitivity: "base" });
}

/* ─── StatusChip ─── */
export function StatusChip({ label }: Record<string, any>) {
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
    completed:       { cls: "badge-teal" },    // ← added
    "on hold":       { cls: "badge-yellow" },  // ← added
    cancelled:       { cls: "badge-red" },     // ← added
  };
  const key = (label || "").toLowerCase();
  const c = map[key] || { cls: "badge-gray" };
  return <Badge className={`badge ${c.cls}`}>{label}</Badge>;
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
  externalFilters = [],  // [{ label, value }] active filters owned by parent (shown as chips)
  defaultRowsPerPage = 10,
  onExport,
  multiSelect = true,
  onSelectionChange,
}: Record<string, any>) {

  const [search, setSearch]               = useState("");
  const [sortCol, setSortCol]             = useState(null);
  const [sortDir, setSortDir]             = useState("asc");
  const [page, setPage]                   = useState(0);
  const [rowsPerPage, setRowsPerPage]     = useState(defaultRowsPerPage);
  const [columnFilters, setColumnFilters] = useState<Record<string, any>>({});
  const [showFilters, setShowFilters]     = useState(false);
  const [selected, setSelected]           = useState(new Set<any>());

  // draft state while panel is open
  const [draft, setDraft] = useState<Record<string, any>>({});

  const visibleCols = columns.filter(c => c.hidden !== true);

  /* auto-detect filterable columns */
  const filterMeta = useMemo(() => {
    const meta: Record<string, any> = {};
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

  const hasAutoFilters    = Object.keys(filterMeta).length > 0;
  const hasAnyFilter      = filterComponents || hasAutoFilters;
  const activeFilterCount = Object.values(columnFilters).filter(Boolean).length + externalFilters.filter(f => f.value).length;

  /* sync draft when panel opens */
  useEffect(() => {
    if (showFilters) setDraft({ ...columnFilters });
  }, [showFilters]);

  /* processed rows */
  const processed = useMemo(() => {
    let rows = [...data];

    // global search
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

    // column filters
    Object.entries(columnFilters).forEach(([field, val]) => {
      if (!val) return;
      const meta = filterMeta[field];
      if (meta?.type === "date") {
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

    // sort — uses smartCompare for correct date/time ordering
    if (sortCol) {
      rows.sort((a, b) => {
        const cmp = smartCompare(a[sortCol], b[sortCol]);
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

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
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
    setSelected(new Set<any>());
    onApplyFilters?.();
  };
  const clearAll = () => {
    setDraft({});
    setColumnFilters({});
    setPage(0);
    setSelected(new Set<any>());
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
  const hasSearchOrFilters = Boolean(search.trim()) || activeChips.length > 0 || externalFilters.some(f => f.value);

  return (
    <Card className="pro-table-wrap p-0 gap-0">

      {/* ── Toolbar ── */}
      <div className="pro-table-toolbar">
        {title && (
          <span className="pro-table-title">
            {title}
            <span className="pro-table-count">{processed.length}</span>
          </span>
        )}

        <div className="search-box pro-table-search">
          <Search size={16} className="pro-table-search-icon" aria-hidden="true" />
          <Input
            aria-label="Search records"
            placeholder="Search..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); setSelected(new Set<any>()); }}
          />
          {search && (
            <Button variant="ghost"
              type="button"
              className="pro-table-search-clear"
              aria-label="Clear search"
              onClick={() => { setSearch(""); setPage(0); setSelected(new Set<any>()); }}
            >
              <X size={14} aria-hidden="true" />
            </Button>
          )}
        </div>

        <div className="pro-table-actions">
          {selected.size > 0 && (
            <span className="text-[12px] text-primary font-semibold bg-[var(--primary-ghost)] p-[4px_12px]" style={{borderRadius:"var(--radius)"}}>
              {selected.size} selected
            </span>
          )}

          {hasAnyFilter && (
            <Button variant="ghost"
              className={`pt-filter-toggle${showFilters ? " active" : ""}`}
              type="button"
              aria-expanded={showFilters}
              onClick={() => setShowFilters(s => !s)}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              Filters
              {activeFilterCount > 0 && (
                <span className="pt-filter-toggle-badge">{activeFilterCount}</span>
              )}
            </Button>
          )}

          <Button variant="ghost"
            type="button"
            className="icon-btn pro-table-export"
            onClick={onExport ? () => onExport(exportData) : handleExportExcel}
            title="Export to Excel"
            aria-label="Export to Excel"
          >
            <FileSpreadsheet size={16} aria-hidden="true" />
            <span>Excel</span>
          </Button>

          {actions}
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {(activeChips.length > 0 || externalFilters.some(f => f.value)) && (
        <div className="pt-chip-row">
          {activeChips.map(([field, val]) => {
            const col = visibleCols.find(c => c.field === field);
            return (
              <span key={field} className="pt-chip">
                <span className="pt-chip-key">{col?.label || field}:</span>
                {chipLabel(field, val)}
                <button type="button" aria-label={`Remove ${col?.label || field} filter`} className="pt-chip-x" onClick={() => removeChip(field)}>
                  <X size={10}/>
                </button>
              </span>
            );
          })}
          {externalFilters.filter(f => f.value).map(f => (
            <span key={f.label} className="pt-chip">
              <span className="pt-chip-key">{f.label}:</span>
              {f.value}
            </span>
          ))}
          <Button variant="ghost" type="button" className="pt-chip-clear-all" onClick={clearAll}>
            <RotateCcw size={10}/> Clear all
          </Button>
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
            <Button variant="ghost"
              type="button"
              aria-label="Close filters"
              onClick={() => setShowFilters(false)}
              className="bg-[none] cursor-pointer text-[var(--text-muted)] flex p-[4px]" style={{border:"none", borderRadius:"var(--radius)"}}
            >
              <X size={16}/>
            </Button>
          </div>

          <div className="pt-filter-panel-body">

            {/* custom filterComponents from parent */}
            {filterComponents}

            {/* auto-generated fields from filterable columns */}
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
                  <div key={field} className="grid gap-[12px]" style={{gridTemplateColumns:"1fr 1fr"}}>
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
              <Button variant="ghost" type="button" className="pt-filter-btn-clear" onClick={() => { clearAll(); setShowFilters(false); }}>
                <RotateCcw size={13}/> Clear
              </Button>
              <Button variant="ghost" type="button" className="pt-filter-btn-apply" onClick={applyFilters}>
                <Check size={13}/> Apply Filters
              </Button>
            </div>
            <span className="pt-filter-panel-count">
              {processed.length} record{processed.length !== 1 ? "s" : ""} match
            </span>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto" >
        <table className={`pro-table${paged.length === 0 ? " pro-table-empty" : ""}`}>
          <thead>
            <tr>
              {multiSelect && (
                <th className="w-[44px] text-center whitespace-nowrap" >
                  <Checkbox aria-label="Select all rows on this page" checked={allPageSelected} onCheckedChange={toggleAll} className="mx-auto" />
                </th>
              )}
              {visibleCols.map((col, i) => (
                <th
                  key={i}
                  aria-sort={sortCol === col.field ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                  tabIndex={col.renderCell ? undefined : 0}
                  onKeyDown={event => { if (!col.renderCell && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); handleSort(col.field); } }}
                  onClick={() => !col.renderCell && handleSort(col.field)}
                  className="whitespace-nowrap" style={{textAlign:col.align||"left", width:col.width, cursor:col.renderCell?"default":"pointer"}}
                >
                  <span className="inline-flex items-center gap-[4px]" >
                    {col.label}
                    {!col.renderCell && sortCol === col.field
                      ? (sortDir==="asc" ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />)
                      : (!col.renderCell && <ChevronsUpDown size={14} aria-hidden="true" className="opacity-[0.4]" />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td className="table-empty-cell" colSpan={Math.max(1, visibleCols.length + (multiSelect ? 1 : 0))}>
                  <div className="table-empty" role="status">
                    <div className="table-empty-icon" aria-hidden="true">
                      {hasSearchOrFilters ? <SearchX size={28} /> : <Inbox size={28} />}
                    </div>
                    <div className="table-empty-text">No records found</div>
                    <p className="table-empty-description">
                      {hasSearchOrFilters ? "Try a different search or adjust your filters." : "Records will appear here when they are available."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : paged.map((row, ri) => {
              const globalIdx = page * rowsPerPage + ri;
              const isSel     = selected.has(globalIdx);
              return (
                <tr key={ri} style={{ background: isSel ? "var(--primary-ghost)" : "" }}>
                  {multiSelect && (
                    <td className="text-center whitespace-nowrap" >
                      <Checkbox aria-label={`Select row ${globalIdx + 1}`} checked={isSel} onCheckedChange={() => toggleRow(globalIdx)} className="mx-auto" />
                    </td>
                  )}
                  {visibleCols.map((col, ci) => (
                    <td
                      key={ci}
                      className="whitespace-nowrap" style={{textAlign:col.align||"left", ...(col.maxWidth ? { maxWidth:col.maxWidth, overflow:"hidden" } : {})}}
                    >
                      {col.renderCell ? (
                        col.renderCell(row, globalIdx)
                      ) : col.maxWidth ? (
                        <span title={String(row[col.field] ?? "")} className="block overflow-hidden whitespace-nowrap" style={{textOverflow:"ellipsis"}}>
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
        <div className="flex items-center gap-[12px]" >
          <span className="text-[12px] text-[var(--text-muted)]" >Show</span>
          <NativeSelect aria-label="Rows per page" className="rows-select" value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }}>
            {[5,10,25,50,100].map(n => <option key={n} value={n}>{n}</option>)}
          </NativeSelect>
          <div className="page-btns">
            <Button variant="ghost" type="button" className="page-btn" aria-label="First page" disabled={page===0} onClick={()=>setPage(0)}><ChevronsLeft size={16} aria-hidden="true" /></Button>
            <Button variant="ghost" type="button" className="page-btn" aria-label="Previous page" disabled={page===0} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={16} aria-hidden="true" /></Button>
            {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
              const p = Math.max(0,Math.min(page-2,totalPages-5))+i;
              return <Button variant="ghost" type="button" key={p} aria-label={`Page ${p + 1}`} aria-current={p === page ? "page" : undefined} className={`page-btn ${p===page?"active":""}`} onClick={()=>setPage(p)}>{p+1}</Button>;
            })}
            <Button variant="ghost" type="button" className="page-btn" aria-label="Next page" disabled={page>=totalPages-1} onClick={()=>setPage(p=>p+1)}><ChevronRight size={16} aria-hidden="true" /></Button>
            <Button variant="ghost" type="button" className="page-btn" aria-label="Last page" disabled={page>=totalPages-1} onClick={()=>setPage(totalPages-1)}><ChevronsRight size={16} aria-hidden="true" /></Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
