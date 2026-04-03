import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

function BreadcrumbItem({ item, isLast }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const isClickable = !isLast && item.link;

  return (
    <span
      onClick={() => { if (isClickable) navigate(item.link); }}
      onMouseEnter={() => { if (isClickable) setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontSize: 12.5,
        fontWeight: isLast ? 800 : 600,
        color: isLast ? "var(--primary)" : hovered ? "var(--primary)" : "var(--text-secondary)",
        cursor: isClickable ? "pointer" : "default",
        whiteSpace: "nowrap",
        transition: "color 0.15s",
        padding: "1px 0",
      }}
    >
      {item.label}
    </span>
  );
}

export default function Breadcrumb({ items, icon }) {
  return (
    <nav style={{
      display: "inline-flex", alignItems: "center", gap: 0, marginBottom: 10,
      background: "linear-gradient(135deg, var(--primary-ghost), #f0fdf4)",
      border: "1px solid var(--border-strong)", borderRadius: 10,
      padding: "7px 14px",
      boxShadow: "0 1px 4px rgba(108,63,197,0.1)",
    }}>
      {/* Page icon passed from parent */}
      {icon && (
        <span style={{ display: "flex", alignItems: "center", marginRight: 6, color: "var(--primary)" }}>
          {icon}
        </span>
      )}
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <ChevronRight size={12} color="var(--border-strong)" style={{ margin: "0 5px", flexShrink: 0 }} />
            )}
            <BreadcrumbItem item={item} isLast={isLast} />
          </React.Fragment>
        );
      })}
    </nav>
  );
}