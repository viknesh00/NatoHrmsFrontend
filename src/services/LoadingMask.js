import React from "react";
import { makeStyles } from "@mui/styles"; // If using MUI v5, @mui/styles is separate

const useStyles = makeStyles({
  mask: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(255, 255, 255, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  balls: {
    display: "flex",
    gap: "10px",
  },
  ball: {
    width: "15px",
    height: "15px",
    borderRadius: "50%",
    backgroundColor: "#3f51b5",
    animation: "$bounce 0.6s infinite alternate",
    "&:nth-child(2)": {
      animationDelay: "0.2s",
    },
    "&:nth-child(3)": {
      animationDelay: "0.4s",
    },
  },
  "@keyframes bounce": {
    "0%": { transform: "translateY(0)" },
    "100%": { transform: "translateY(-20px)" },
  },
});

const LoadingMask = ({ loading }) => {
  const classes = useStyles();
  if (!loading) return null;

  return (
    <div className={classes.mask}>
      <div className={classes.balls}>
        <div className={classes.ball}></div>
        <div className={classes.ball}></div>
        <div className={classes.ball}></div>
      </div>
    </div>
  );
};

export default LoadingMask;
