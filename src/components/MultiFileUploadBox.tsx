import { cn } from "cn";
import { Button } from "./ui/button";
// Dashed drag & drop box for several files at once (e.g. certificates) with a list of the chosen files
// Dashed drag & drop box for several files at once (e.g. certificates) with a list of the chosen files
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";

export default function MultiFileUploadBox({ id, label, hint, accept, files, max, maxTotalMb, error, onAdd, onRemove }: Record<string, any>) {
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const full = files.length >= max || (maxTotalMb && totalBytes >= maxTotalMb * 1024 * 1024);

  const pick = (list) => {
    const arr = Array.from(list || []);
    if (arr.length) onAdd(arr);
  };

  return (
    <div className="fc-group">
      <label htmlFor={id} className="fc-label">
        {label}
        <span className="ml-[8px] font-medium text-[12px] text-[var(--text-muted)]" >{files.length} / {max} files{maxTotalMb ? ` · ${(totalBytes / 1024 / 1024).toFixed(2)} / ${maxTotalMb} MB` : ""}</span>
      </label>
      <div
        className="p-[20px_16px] text-center" style={{border: `2px dashed ${error ? "var(--coral)" : files.length ? "var(--teal)" : "var(--border)"}`, borderRadius: "var(--radius)", background: files.length ? "var(--teal-ghost)" : "var(--bg)", cursor: full ? "not-allowed" : "pointer", opacity: full ? 0.7 : 1, transition: "all 0.2s"}}
        onClick={() => { if (!full) document.getElementById(id).click(); }}
        tabIndex={full ? -1 : 0}
        aria-disabled={!!full}
        role="button"
        aria-label={label || "Upload files"}
        onKeyDown={event => { if (!full && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); document.getElementById(id)?.click(); } }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (!full) pick(e.dataTransfer.files); }}
      >
        <input
          id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} type="file" accept={accept} multiple className="sr-only" 
          onChange={(e) => { pick(e.target.files); e.target.value = ""; }}
        />
        <Upload size={28} color="var(--text-muted)" className="m-[0_auto_8px] block"  />
        <div className="text-[14px] font-semibold text-[var(--text-secondary)]" >
          {full ? "Upload limit reached" : "Click to browse or drag & drop – you can select several files at once"}
        </div>
        <div className="text-[12px] text-[var(--text-muted)] mt-[4px]" >{hint}</div>
      </div>

      {files.length > 0 && (
        <div className="mt-[12px] flex flex-col gap-[8px]" >
          {files.map((f, i) => (
            <div key={`${f.name}-${f.size}-${i}`} className="flex items-center gap-[12px] p-[8px_12px] bg-card" style={{border: "1px solid var(--border)", borderRadius: "var(--radius)"}}>
              {f.type.startsWith("image/") ? <ImageIcon size={18} color="var(--primary)" /> : <FileText size={18} color="var(--primary)" />}
              <div className="min-w-[0px]" style={{flex: 1}}>
                <div className="text-[13px] font-semibold text-[var(--text-primary)]" style={{wordBreak: "break-all"}}>{f.name}</div>
                <div className="text-[12px] text-[var(--text-muted)]" >{(f.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
              <Button variant="outline" type="button" className={cn("btn btn-ghost", "p-[4px_8px] text-[var(--coral)]")}  title="Remove" onClick={() => onRemove(i)}>
                <X size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
      {error && <div id={`${id}-error`} className="fc-error">{error}</div>}
    </div>
  );
}
