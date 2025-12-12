import React from "react";
import { useNavigate } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import { ChevronRight } from "lucide-react";

const useStyles = makeStyles(() => ({
  breadcrumbContainer: {
    backgroundColor: "#e0f2fe",
    padding: "10px 18px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#1d4ed8 ",
    fontSize: "16px",
    fontWeight: 500,
    marginBottom: "14px"
  },

  crumb: {
    cursor: "pointer",
    transition: "0.2s",
    "&:hover": {
      color: "#1e40af",
    },
  },

  crumbInactive: {
    color: "#3b82f6",
  },

  icon: {
    color: "#3b82f6",
    margin: "0 6px",
  },
}));

export default function Breadcrumb({ items }) {
  const classes = useStyles();
  const navigate = useNavigate();

  return (
    <div className={classes.breadcrumbContainer}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={index}>
            <span
              className={!isLast ? classes.crumb : classes.crumbInactive}
              onClick={() => {
                if (!isLast && item.link) navigate(item.link);
              }}
            >
              {item.label}
            </span>

            {/* Separator */}
            {!isLast && <ChevronRight size={16} className={classes.icon} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
