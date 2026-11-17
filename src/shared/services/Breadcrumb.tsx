import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

function BreadcrumbItem({ item, isLast }: Record<string, any>) {
  return !isLast && item.link ? (
    <Link to={item.link} className="breadcrumb-link">{item.label}</Link>
  ) : (
    <span aria-current={isLast ? "page" : undefined}>{item.label}</span>
  );
}

export default function Breadcrumb({ items, icon }: Record<string, any>) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb flex flex-wrap items-center gap-1">
      {/* Page icon passed from parent */}
      {icon && (
        <span className="flex items-center mr-[8px] text-primary" >
          {icon}
        </span>
      )}
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <ChevronRight size={12} color="var(--border-strong)" className="m-[0_4px] shrink-[0]"  />
            )}
            <BreadcrumbItem item={item} isLast={isLast} />
          </React.Fragment>
        );
      })}
    </nav>
  );
}
