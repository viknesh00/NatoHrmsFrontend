// Card with the title sitting on its top border (used by the employee details screens)
import React from "react";

export const GROUP_STYLES = `
.gf-group { background:#fff; border:1px solid var(--border); border-radius:12px; padding:22px 24px 8px; margin:0 0 22px; min-width:0; box-shadow:var(--shadow-sm); }
.gf-legend { padding:0 8px; margin-left:-2px; font-family:'DM Sans',sans-serif; font-size:13.5px; font-weight:600; color:var(--text-secondary); }
.gf-group .fc-row { column-gap:20px; }
.gf-group .fc-label { text-transform:none; letter-spacing:0; font-size:13.5px; font-weight:700; color:var(--text-primary); }
@media (max-width:600px) { .gf-group { padding:20px 16px 4px; } .gf-group .fc-row-2 { grid-template-columns:1fr; } }
`;

export default function Group({ title, children }) {
  return (
    <>
      <style>{GROUP_STYLES}</style>
      <fieldset className="gf-group">
        <legend className="gf-legend">{title}</legend>
        {children}
      </fieldset>
    </>
  );
}
