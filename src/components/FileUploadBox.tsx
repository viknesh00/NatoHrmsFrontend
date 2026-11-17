import { cn } from "cn";
import { Button } from "./ui/button";
// Dashed drag & drop upload box (shared by the public form and the onboarding edit screen)
// Dashed drag & drop upload box (shared by the public form and the onboarding edit screen)
import React, { useEffect, useState } from "react";
import { Upload, X } from "lucide-react";

export default function FileUploadBox({ id, label, hint, accept, file, error, onSelect, onRemove, icon, optional }: Record<string, any>) {
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
      <label htmlFor={id} className="fc-label">{label}{!optional && <span className="req">*</span>}</label>
      <div
        className="p-[20px_16px] text-center cursor-pointer" style={{border: `2px dashed ${error ? "var(--coral)" : file ? "var(--teal)" : "var(--border)"}`, borderRadius: "var(--radius)", background: file ? "var(--teal-ghost)" : "var(--bg)", transition: "all 0.2s"}}
        onClick={() => document.getElementById(id).click()}
        tabIndex={0}
        role="button"
        aria-label={label || "Upload files"}
        onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); document.getElementById(id)?.click(); } }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onSelect(f); }}
      >
        <input
          id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} type="file" accept={accept} className="sr-only" 
          onChange={(e) => { const f = e.target.files[0]; if (f) onSelect(f); e.target.value = ""; }}
        />
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-[110px] max-w-[100%] m-[0_auto_8px] block" style={{borderRadius: "var(--radius)", objectFit: "contain"}} />
        ) : (
          React.cloneElement(icon || <Upload />, { size: 28, color: file ? "var(--teal)" : "var(--text-muted)", style: { margin: "0 auto 8px", display: "block" } })
        )}
        {file ? (
          <>
            <div className="text-[14px] font-semibold text-[var(--teal)]" style={{wordBreak: "break-all"}}>{file.name}</div>
            <div className="text-[12px] text-[var(--text-muted)] mt-[4px]" >{(file.size / 1024 / 1024).toFixed(2)} MB — click to replace</div>
          </>
        ) : (
          <>
            <div className="text-[14px] font-semibold text-[var(--text-secondary)]" >Click to browse or drag &amp; drop</div>
            <div className="text-[12px] text-[var(--text-muted)] mt-[4px]" >{hint}</div>
          </>
        )}
      </div>
      {file && (
        <div className="flex justify-end mt-[8px]" >
          <Button variant="outline" type="button" className={cn("btn btn-ghost", "p-[4px_12px] text-[12px] text-[var(--coral)]")}  onClick={onRemove}>
            <X size={13} /> Remove
          </Button>
        </div>
      )}
      {error && <div id={`${id}-error`} className="fc-error">{error}</div>}
    </div>
  );
}
