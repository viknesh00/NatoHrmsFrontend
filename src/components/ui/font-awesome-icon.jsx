import React from "react";

export default function FontAwesomeIcon({ icon, className = "" }) {
  return <i className={`fa-solid fa-${icon} ${className}`.trim()} aria-hidden="true" />;
}
