import React, { useState, useEffect } from "react";
import MUIDataTable from "mui-datatables";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { makeStyles } from "@material-ui/core/styles";
import { Box, IconButton, Tabs, Tab, Tooltip, Button } from "@mui/material";
import { Check, Clock, RotateCcw } from "lucide-react";
import moment from "moment";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import { getCookie } from "../../services/Cookies";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../../services/Breadcrumb";

// Extend dayjs with plugins
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const getMuiTheme = () =>
  createTheme({
    components: {
      MUIDataTableHeadCell: {
        styleOverrides: {
          data: { textTransform: "none !important" },
          root: { textTransform: "none !important" },
        },
      },
    },
  });

const useStyles = makeStyles(() => ({
  rootBox: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
  },
  tabHeader: {
    borderBottom: "1px solid #e0e0e0",
    marginBottom: 16,
  },
  dateFilterBox: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 16,
    justifyContent: "flex-end",
  },
  iconApply: {
    backgroundColor: "#0c4a6e",
    color: "#fff",
    borderRadius: 4,
    height: 40,
    width: 40,
    "&:hover": { backgroundColor: "#085078" },
  },
  iconReset: {
    border: "1px solid #ccc",
    color: "#0c4a6e",
    height: 40,
    width: 40,
    borderRadius: 4,
    "&:hover": {
      borderColor: "#0c4a6e",
      backgroundColor: "rgba(12,74,110,0.04)",
    },
  },
  tableBody: {
    "& .Mui-active .MuiTableSortLabel-icon": {
      color: "#fff !important",
    },
    "& .tss-10rusft-MUIDataTableToolbar-icon": {
      color: "#0c4a6e",
      boxShadow:
        "0px -1px 2px 0 #065881 inset, 0px 1px 1px 1px #ccc, 0 0 0 6px #fff, 0 2px 12px 8px #ddd",
      borderRadius: "5px",
      marginLeft: "15px",
    },
    "& .tss-9z1tfs-MUIDataTableToolbar-iconActive": {
      color: "#0c4a6e",
      boxShadow:
        "0px -1px 2px 0 #065881 inset, 0px 1px 1px 1px #ccc, 0 0 0 6px #fff, 0 2px 12px 8px #ddd",
      borderRadius: "5px",
      marginLeft: "15px",
    },
    "& .tss-qbo1l6-MUIDataTableToolbar-actions": {
      justifyContent: "left",
      position: "absolute",
    },
    "& .tss-1ufdzki-MUIDataTableSearch-main": {
      marginRight: "10px",
      width: 500,
    },
    "& .tss-1fz5efq-MUIDataTableToolbar-left": {
      position: "absolute",
      right: 25,
    },
    "& .tss-1h5wt30-MUIDataTableSearch-searchIcon": {
      color: "#0c4a6e",
    },
  },
  statusChip: {
    padding: "2px 8px",
    fontWeight: 500,
    fontSize: 12,
    lineHeight: "18px",
    borderRadius: 16,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  statusWo: {
    backgroundColor: "#FFE5E5",
    color: "#B91C1C",
  },
  statusAnomaly: {
    backgroundColor: "#FFF4E5",
    color: "#F97316",
  },
  statusPresent: {
    backgroundColor: "#ECFDF3",
    color: "#027A48",
  },
  statusAbsent: {
    backgroundColor: "#FFF8CC",
    color: "#8A4B00",
  },
  statusLeave: {
    backgroundColor: "#E5F0FF",
    color: "#1D4ED8",
  },
  addButtonContainer: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "10px",
  },
  addButton: {
    backgroundColor: "#0c4a6e",
    gap: "8px",
    textTransform: "none",
  },
}));

export default function Attendance() {
  const classes = useStyles();
  const navigate = useNavigate();
  const [logType, setLogType] = useState("daily");
  const [fromDate, setFromDate] = useState(dayjs().subtract(1, "month"));
  const [toDate, setToDate] = useState(dayjs());
  const [singleDate, setSingleDate] = useState(dayjs());
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const userRole = getCookie("role");
  const isAdminOrManager = userRole === "Admin" || userRole === "Manager";
  const breadCrumb = [{ label: "Attendance" }];

  // Initialize filteredData when tab changes
  useEffect(() => {
    setFilteredData([]);
    if (logType === "daily") {
      const today = dayjs();
      setSingleDate(today);
      getDailyLog(today);
    } else {
      const startOfPrevMonth = dayjs().subtract(1, "month").startOf("day");
      const today = dayjs();
      setFromDate(startOfPrevMonth);
      setToDate(today);
      getMonthlyLog(startOfPrevMonth, today);
    }
  }, [logType]);

  const getDailyLog = (date) => {
    let data = {
      date: date.format("YYYY-MM-DD"),
    }
    const url = `Attendance/GetDailyAttendance`;
    setLoading(true);
    postRequest(url, data)
      .then((res) => {
        if (res.data) {
          setFilteredData(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        setLoading(false);
        console.error("Login error:", err);
      });
  };

  const getMonthlyLog = (start, end) => {
    let data = {
      fromDate: start.format("YYYY-MM-DD"),
      toDate: end.format("YYYY-MM-DD")
    }
    const url = `Attendance/GetMonthlyAttendance`;
    setLoading(true);
    postRequest(url, data)
      .then((res) => {
        if (res.data) {
          res.data.forEach((d) => {
            if (d.attendanceDate) {
              d.attendanceDate = moment(d.attendanceDate).format("DD/MM/YYYY");
            }
            if (d.firstClockIn) {
              d.firstClockIn = moment(d.firstClockIn).format("hh:mm A"); // e.g., 01:38 PM
            }
            if (d.latestClockOut) {
              d.latestClockOut = moment(d.latestClockOut).format("hh:mm A");
            }

          });
          setFilteredData(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        setLoading(false);
        console.error("Login error:", err);
      });
  };

  const handleTabChange = (event, newValue) => {
    setLogType(newValue);
  };

  const handleFilter = () => {
    if (logType === "daily") {
      getDailyLog(singleDate);
      ToastSuccess(`Filtered for ${singleDate.format("DD/MM/YYYY")}`);
    } else {
      if (!fromDate || !toDate) {
        ToastSuccess("Please select both From and To dates.");
        return;
      }
      if (toDate.isBefore(fromDate, "day")) {
        ToastSuccess("To date must be same or after From date.");
        return;
      }
      getMonthlyLog(fromDate, toDate);
      ToastSuccess(
        `Filtered from ${fromDate.format("DD/MM/YYYY")} to ${toDate.format("DD/MM/YYYY")}`
      );
    }
  };

  const handleReset = () => {
    if (logType === "daily") {
      const today = dayjs();
      setSingleDate(today);
      getDailyLog(today)
    } else {
      const startOfPrevMonth = dayjs().subtract(1, "month").startOf("day");
      const today = dayjs();
      setFromDate(startOfPrevMonth);
      setToDate(today);
      getMonthlyLog(startOfPrevMonth, today)
    }
    ToastSuccess("Filters reset");
  };


  const getStatusClass = (status) => {
    switch (status) {
      case "Holiday":
        return `${classes.statusChip} ${classes.statusWo}`;
      case "WO":
        return `${classes.statusChip} ${classes.statusWo}`;
      case "Anomaly":
        return `${classes.statusChip} ${classes.statusAnomaly}`;
      case "Present":
        return `${classes.statusChip} ${classes.statusPresent}`;
      case "Absent":
        return `${classes.statusChip} ${classes.statusAbsent}`;
      case "Leave":
        return `${classes.statusChip} ${classes.statusLeave}`;
      default:
        return classes.statusChip;
    }
  };

  const columnsDaily = [
    { name: "slNo", label: "Sl. No" },
    {
      name: "userName",
      label: "User Name",
      options: {
        display: (isAdminOrManager ? true : "excluded"),
      }
    },
    { name: "time", label: "Time" },
    { name: "type", label: "Type" },
    { name: "ipAddress", label: "IP Address" },
    { name: "location", label: "Location" },
  ];

  const columnsMonthly = [
    {
      name: 'attendanceDate',
      label: 'Attendance Date',
      options: {
        customBodyRender: (value, tableMeta) => {
          const status = tableMeta.rowData[1]; // index of 'status' column
          const color = status === 'WO' ? 'red' : 'inherit';
          return <span style={{ color }}>{value}</span>;
        },
      },
    },
    {
      name: 'status',
      label: 'Status',
      options: {
        customBodyRender: (value) => {
          return <span className={getStatusClass(value)}>{value}</span>;
        },
      },
    },
    {
      name: 'userEmail',
      label: 'User Name',
      options: {
        display: (isAdminOrManager ? true : "excluded"),
      }
    },
    { name: 'firstClockIn', label: 'First Clock In' },
    { name: 'latestClockOut', label: 'Last Clock Out' },
    { name: 'clockInIp', label: 'Clock In IP' },
    { name: 'clockOutIp', label: 'Clock Out IP' },
    { name: 'clockInLocation', label: 'Clock In Location' },
    { name: 'clockOutLocation', label: 'Clock Out Location' },
    { name: 'totalWorkDuration', label: 'Total Work Duration (hrs)' },
    { name: 'breakCount', label: 'Break Count' },
    { name: 'breakDuration', label: 'Break Duration (hrs)' },
  ];

  const options = {
    customToolbarSelect: () => { },
    selectableRows: "none",
    responsive: "standard",
    filterType: 'multiselect',
    download: true,
    print: true,
    search: true,
    filter: true,
    viewColumns: true,
    rowsPerPage: 10,
    rowsPerPageOptions: [10, 15, 50, 100],
  };

  return (
    <Box className={classes.rootBox}>
      <LoadingMask loading={loading} />
      <Breadcrumb items={breadCrumb} />
      <Box className={classes.tabHeader}>
        <Tabs
          value={logType}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          sx={{ mb: 2 }}
        >
          <Tab value="daily" label="Daily Log" />
          <Tab value="monthly" label="Monthly Log" />
        </Tabs>
      </Box>

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box className={classes.dateFilterBox}>
          {logType === "daily" ? (
            <DatePicker
              label="Select Date"
              value={singleDate}
              onChange={(newValue) => setSingleDate(newValue)}
              format="DD/MM/YYYY"
              slotProps={{ textField: { size: "small", sx: { height: 40 } } }}
            />
          ) : (
            <>
              <DatePicker
                label="From Date"
                value={fromDate}
                onChange={(newValue) => setFromDate(newValue)}
                format="DD/MM/YYYY"
                slotProps={{ textField: { size: "small", sx: { height: 40 } } }}
              />
              <DatePicker
                label="To Date"
                value={toDate}
                onChange={(newValue) => setToDate(newValue)}
                format="DD/MM/YYYY"
                slotProps={{ textField: { size: "small", sx: { height: 40 } } }}
              />
            </>
          )}

          <Tooltip title="Apply Filter" arrow>
            <IconButton onClick={handleFilter} className={classes.iconApply}>
              <Check size={20} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Reset Filters" arrow>
            <IconButton onClick={handleReset} className={classes.iconReset}>
              <RotateCcw size={20} />
            </IconButton>
          </Tooltip>
        </Box>
      </LocalizationProvider>
      <Box className="reportstablehead" style={{ overflowX: "auto" }}>
        <ThemeProvider theme={getMuiTheme()}>
          <MUIDataTable
            title={logType === "daily" ? "Daily Log" : "Monthly Log"}
            className={classes.tableBody}
            data={filteredData}
            columns={logType === "daily" ? columnsDaily : columnsMonthly}
            options={options}
          />
        </ThemeProvider>
      </Box>
    </Box>
  );
}
