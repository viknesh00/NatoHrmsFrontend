// Dashed drag & drop upload box (shared by the public form and the onboarding edit screen)
import React, { useEffect, useState } from "react";
import { Upload, X } from "lucide-react";

export default function FileUploadBox({ id, label, hint, accept, file, error, onSelect, onRemove, icon, optional }) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview("");
  }, [file]);

  return (
    <div className="fc-group">
      <label className="fc-label">{label}{!optional && <span className="req">*</span>}</label>
      <div
        style={{
          border: `2px dashed ${error ? "var(--coral)" : file ? "var(--teal)" : "var(--border)"}`,
          borderRadius: 12, padding: "20px 16px", textAlign: "center",
          background: file ? "var(--teal-ghost)" : "var(--bg)", cursor: "pointer", transition: "all 0.2s",
        }}
        onClick={() => document.getElementById(id).click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onSelect(f); }}
      >
        <input
          id={id} type="file" accept={accept} style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files[0]; if (f) onSelect(f); e.target.value = ""; }}
        />
        {preview ? (
          <img src={preview} alt="Preview" style={{ maxHeight: 110, maxWidth: "100%", borderRadius: 8, margin: "0 auto 8px", display: "block", objectFit: "contain" }} />
        ) : (
          React.cloneElement(icon || <Upload />, { size: 28, color: file ? "var(--teal)" : "var(--text-muted)", style: { margin: "0 auto 8px", display: "block" } })
        )}
        {file ? (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--teal)", wordBreak: "break-all" }}>{file.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{(file.size / 1024 / 1024).toFixed(2)} MB — click to replace</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Click to browse or drag &amp; drop</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{hint}</div>
          </>
        )}
      </div>
      {file && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
          <button type="button" className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12, color: "var(--coral)" }} onClick={onRemove}>
            <X size={13} /> Remove
          </button>
        </div>
      )}
      {error && <div className="fc-error">{error}</div>}
    </div>
  );
}
