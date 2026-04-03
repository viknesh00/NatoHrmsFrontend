import React, { useState, useMemo, useRef } from "react";
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, X, FileSpreadsheet, Check } from "lucide-react";
import * as XLSX from "xlsx";

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

export default function ProTable({
  title = "",
  columns = [],
  data = [],
  actions,
  filterComponents,
  defaultRowsPerPage = 10,
  onExport,
  multiSelect = true,
  onSelectionChange,
}) {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [columnFilters, setColumnFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const visibleCols = columns.filter(c => c.hidden !== true);

  const filterOptions = useMemo(() => {
    const opts = {};
    visibleCols.forEach(col => {
      if (col.filterable && !col.renderCell) {
        const vals = [...new Set(data.map(row => row[col.field]).filter(Boolean))].sort();
        opts[col.field] = vals;
      }
    });
    return opts;
  }, [data, visibleCols]);

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
      if (val) rows = rows.filter(row => String(row[field]) === String(val));
    });
    if (sortCol) {
      rows.sort((a, b) => {
        const av = a[sortCol] ?? ""; const bv = b[sortCol] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [data, search, columnFilters, sortCol, sortDir, visibleCols]);

  const totalPages = Math.ceil(processed.length / rowsPerPage);
  const paged = processed.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const handleSort = (field) => {
    if (!field) return;
    if (sortCol === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(field); setSortDir("asc"); }
    setPage(0);
  };

  // Selection
  const allPageSelected = paged.length > 0 && paged.every((_, ri) => selected.has(page * rowsPerPage + ri));
  const toggleAll = () => {
    const s = new Set(selected);
    if (allPageSelected) paged.forEach((_, ri) => s.delete(page * rowsPerPage + ri));
    else paged.forEach((_, ri) => s.add(page * rowsPerPage + ri));
    setSelected(s);
    if (onSelectionChange) onSelectionChange([...s]);
  };
  const toggleRow = (globalIdx) => {
    const s = new Set(selected);
    if (s.has(globalIdx)) s.delete(globalIdx); else s.add(globalIdx);
    setSelected(s);
    if (onSelectionChange) onSelectionChange([...s]);
  };

  const selectedRows = processed.filter((_, i) => selected.has(i));
  const exportData = selectedRows.length > 0 ? selectedRows : processed;

  const handleExportCSV = () => {
    if (onExport) { onExport(exportData); return; }
    const headers = visibleCols.filter(c => !c.renderCell).map(c => c.label);
    const rows = exportData.map(row => visibleCols.filter(c => !c.renderCell).map(c => `"${row[c.field] ?? ""}"`));
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${title || "export"}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleExportExcel = () => {
    const headers = visibleCols.filter(c => !c.renderCell).map(c => c.label);
    const rows = exportData.map(row => visibleCols.filter(c => !c.renderCell).map(c => row[c.field] ?? ""));
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${title || "export"}.xlsx`);
  };

  const activeFilters = Object.entries(columnFilters).filter(([, v]) => v);
  const hasFilterOpts = Object.keys(filterOptions).length > 0;

  // Shared no-wrap style for all cells
  const cellStyle = { whiteSpace: "nowrap" };

  return (
    <div className="pro-table-wrap">
      {/* Toolbar */}
      <div className="pro-table-toolbar">
        {title && (
          <span className="pro-table-title">
            {title}
            <span className="pro-table-count">{processed.length}</span>
          </span>
        )}
        <div className="search-box">
          <Search size={14} color="var(--text-muted)" />
          <input placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); setSelected(new Set()); }} />
          {search && <button onClick={() => setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",display:"flex",color:"var(--text-muted)",padding:0 }}><X size={13}/></button>}
        </div>
        <div className="pro-table-actions">
          {selected.size > 0 && (
            <span style={{ fontSize:12, color:"var(--primary)", fontWeight:700, background:"var(--primary-ghost)", padding:"4px 10px", borderRadius:20 }}>
              {selected.size} selected
            </span>
          )}
          {(filterComponents || hasFilterOpts) && (
            <button className={`icon-btn ${showFilters ? "active" : ""}`} onClick={() => setShowFilters(s => !s)} title="Filters">
              <Filter size={15} />
            </button>
          )}
          <button className="icon-btn" onClick={handleExportExcel} title="Export to Excel" style={{ color:"var(--teal)" }}><FileSpreadsheet size={15} /> <span style={{fontSize:11,fontWeight:700}}>Excel</span></button>
          {actions}
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="filter-chips">
          {activeFilters.map(([field, val]) => {
            const col = visibleCols.find(c => c.field === field);
            return (
              <span key={field} className="filter-chip">
                {col?.label || field}: {val}
                <span className="filter-chip-x" onClick={() => setColumnFilters(f => { const n={...f}; delete n[field]; return n; })}><X size={11}/></span>
              </span>
            );
          })}
          <span className="filter-chip" style={{ background:"var(--bg)", color:"var(--text-muted)" }} onClick={() => setColumnFilters({})}>Clear all</span>
        </div>
      )}

      {/* Filter bar */}
      {showFilters && (filterComponents || hasFilterOpts) && (
        <div className="filter-bar">
          {filterComponents}
          {hasFilterOpts && visibleCols.filter(c => c.filterable && filterOptions[c.field]?.length).map(col => (
            <div key={col.field} style={{ display:"flex",flexDirection:"column",gap:4 }}>
              <span style={{ fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.05em" }}>{col.label}</span>
              <select className="rows-select" style={{ minWidth:130 }} value={columnFilters[col.field]||""} onChange={e => { setColumnFilters(f => ({...f,[col.field]:e.target.value})); setPage(0); }}>
                <option value="">All</option>
                {filterOptions[col.field].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table className="pro-table">
          <thead>
            <tr>
              {multiSelect && (
                <th style={{ width:44, textAlign:"center", whiteSpace:"nowrap" }}>
                  <div onClick={toggleAll} style={{ width:18,height:18,borderRadius:5,border:`2px solid ${allPageSelected ? "var(--primary)" : "var(--border)"}`,background:allPageSelected?"var(--primary)":"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",margin:"0 auto",transition:"all 0.2s" }}>
                    {allPageSelected && <Check size={11} color="white" />}
                  </div>
                </th>
              )}
              {visibleCols.map((col, i) => (
                <th
                  key={i}
                  onClick={() => !col.renderCell && handleSort(col.field)}
                  style={{
                    textAlign: col.align || "left",
                    width: col.width,
                    whiteSpace: "nowrap",
                    cursor: col.renderCell ? "default" : "pointer",
                  }}
                >
                  <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                    {col.label}
                    {!col.renderCell && sortCol===col.field
                      ? (sortDir==="asc"?<ChevronUp size={12}/>:<ChevronDown size={12}/>)
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
              const isSel = selected.has(globalIdx);
              return (
                <tr key={ri} style={{ background: isSel ? "var(--primary-ghost)" : "" }}>
                  {multiSelect && (
                    <td style={{ textAlign:"center", whiteSpace:"nowrap" }}>
                      <div onClick={() => toggleRow(globalIdx)} style={{ width:18,height:18,borderRadius:5,border:`2px solid ${isSel?"var(--primary)":"var(--border)"}`,background:isSel?"var(--primary)":"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",margin:"0 auto",transition:"all 0.2s" }}>
                        {isSel && <Check size={11} color="white"/>}
                      </div>
                    </td>
                  )}
                  {visibleCols.map((col, ci) => (
                    <td
                      key={ci}
                      style={{
                        textAlign: col.align || "left",
                        whiteSpace: "nowrap",
                        ...(col.maxWidth ? { maxWidth: col.maxWidth, overflow: "hidden" } : {}),
                      }}
                    >
                      {col.renderCell ? (
                        col.renderCell(row, globalIdx)
                      ) : col.maxWidth ? (
                        <span
                          title={String(row[col.field] ?? "")}
                          style={{
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
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

      {/* Pagination */}
      <div className="pro-table-footer">
        <span className="pro-table-info">
          {selected.size > 0 ? `${selected.size} of ${processed.length} selected` : `Showing ${processed.length===0?0:page*rowsPerPage+1}–${Math.min((page+1)*rowsPerPage,processed.length)} of ${processed.length}`}
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:12,color:"var(--text-muted)" }}>Show</span>
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