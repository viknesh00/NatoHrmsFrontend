// Card with the title sitting on its top border (used by the employee details screens)

export const GROUP_STYLES = `
.gf-group { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:24px 24px 8px; margin:0 0 24px; min-width:0; box-shadow:var(--shadow-sm); }
.gf-legend { padding:0 8px; margin-left:-2px; font-family:var(--ui-font-sans); font-size:14px; font-weight:600; color:var(--text-secondary); }
.gf-group .fc-row { column-gap:20px; }
.gf-group .fc-label { text-transform:none; letter-spacing:0; font-size:14px; font-weight:600; color:var(--text-primary); }
@media (max-width:600px) { .gf-group { padding:20px 16px 4px; } .gf-group .fc-row-2 { grid-template-columns:1fr; } }
`;

export default function Group({ title, children }: Record<string, any>) {
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
