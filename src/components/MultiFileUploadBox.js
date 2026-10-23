// Dashed drag & drop box for several files at once (e.g. certificates) with a list of the chosen files
import React from "react";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";

export default function MultiFileUploadBox({ id, label, hint, accept, files, max, maxTotalMb, error, onAdd, onRemove }) {
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const full = files.length >= max || (maxTotalMb && totalBytes >= maxTotalMb * 1024 * 1024);

  const pick = (list) => {
    const arr = Array.from(list || []);
    if (arr.length) onAdd(arr);
  };

  return (
    <div className="fc-group">
      <label className="fc-label">
        {label}
        <span style={{ marginLeft: 8, fontWeight: 500, fontSize: 12, color: "var(--text-muted)" }}>{files.length} / {max} files{maxTotalMb ? ` · ${(totalBytes / 1024 / 1024).toFixed(2)} / ${maxTotalMb} MB` : ""}</span>
      </label>
      <div
        style={{
          border: `2px dashed ${error ? "var(--coral)" : files.length ? "var(--teal)" : "var(--border)"}`,
          borderRadius: 12, padding: "20px 16px", textAlign: "center",
          background: files.length ? "var(--teal-ghost)" : "var(--bg)",
          cursor: full ? "not-allowed" : "pointer", opacity: full ? 0.7 : 1, transition: "all 0.2s",
        }}
        onClick={() => { if (!full) document.getElementById(id).click(); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (!full) pick(e.dataTransfer.files); }}
      >
        <input
          id={id} type="file" accept={accept} multiple style={{ display: "none" }}
          onChange={(e) => { pick(e.target.files); e.target.value = ""; }}
        />
        <Upload size={28} color="var(--text-muted)" style={{ margin: "0 auto 8px", display: "block" }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
          {full ? "Upload limit reached" : "Click to browse or drag & drop – you can select several files at once"}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{hint}</div>
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {files.map((f, i) => (
            <div key={`${f.name}-${f.size}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 10, background: "#fff" }}>
              {f.type.startsWith("image/") ? <ImageIcon size={18} color="var(--primary)" /> : <FileText size={18} color="var(--primary)" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", wordBreak: "break-all" }}>{f.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{(f.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
              <button type="button" className="btn btn-ghost" style={{ padding: "4px 8px", color: "var(--coral)" }} title="Remove" onClick={() => onRemove(i)}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <div className="fc-error">{error}</div>}
    </div>
  );
}
