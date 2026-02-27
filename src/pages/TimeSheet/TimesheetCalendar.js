import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { makeStyles } from "@material-ui/core/styles";
import {
    Paper,
    Typography,
    Box,
    Button,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormLabel,
    Autocomplete,
    TextField,
    IconButton
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import LoadingMask from "../../services/LoadingMask";
import moment from "moment/moment";
import { getRequest, postRequest } from "../../services/Apiservice";
import { useLocation } from "react-router-dom";
import Breadcrumb from "../../services/Breadcrumb";

dayjs.extend(isoWeek);

const useStyles = makeStyles({
    rootBox: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)"
    },
    calendarWrapper: {
        maxWidth: 600,
        margin: "0 auto",
        padding: 16,
        display: "flex",
        flexDirection: "column"
    },
    table: {
        borderCollapse: "collapse",
        textAlign: "center",
        fontSize: 18,
        width: "100%"
    },
    th: {
        padding: "10px 15px",
        border: "1px solid #ddd",
        backgroundColor: "#e0e0e0"
    },
    td: {
        padding: 15,
        width: 50,
        height: 50,
        border: "1px solid #ddd",
        cursor: "pointer",
        position: "relative"
    },
    weekend: {
        backgroundColor: "#f5f5dc"
    },
    outsideMonth: {
        color: "#999",
        cursor: "not-allowed",
        backgroundColor: "#f8f8f8",
    },
    pastMonth: {
        color: "#999",
        cursor: "not-allowed",
    },
    futureDay: {
        color: "#999",
        cursor: "not-allowed",
    },
    weeklyTotal: {
        padding: 15,
        fontWeight: "bold",
        border: "1px solid #ddd"
    },
    modalField: {
        width: "100%",
        marginBottom: 16,
    },
    modalFieldWrapper: {
        marginBottom: 16,
        width: "100%",
    },
    tdContent: {
        position: "absolute",
        top: 4,
        left: 4,
        fontSize: 12,
        fontWeight: 600,
    },
    hoursCenter: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: 24,
        fontWeight: "bold",
        color: "#016795",
    },
    legendWrapper: {
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        justifyContent: "center",
    },

    legendItem: {
        display: "flex",
        alignItems: "center",
        padding: "8px 14px",
        borderRadius: 20,
        boxShadow: "0 2px 4px rgba(0,0,0,0.12)",
        fontSize: 14,
        fontWeight: 500,
        transition: "0.2s",
        cursor: "default",
        border: "1px solid #ddd",
        '&:hover': {
            transform: "scale(1.05)",
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
        }
    },

    legendColorBox: {
        width: 16,
        height: 16,
        marginRight: 8,
        borderRadius: "50%",
        border: "1px solid #fff",
    },

    filled: { backgroundColor: "#e0f7fa" },
    notFilled: { backgroundColor: "#ffe5b4" },
    partiallyFilled: { backgroundColor: "#b3e5fc" },
    appliedLeave: { backgroundColor: "#e1bee7" },
    approvedLeave: { backgroundColor: "#a5d6a7", cursor: "not-allowed" },
    holiday: { backgroundColor: "#ffcccc", cursor: "not-allowed" },

});



const TimesheetCalendar = () => {
    const classes = useStyles();
    const navigate = useNavigate();
    const [currentMonth, setCurrentMonth] = useState(dayjs());
    const [entries, setEntries] = useState({});
    const [selectedDate, setSelectedDate] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [taskDetails, setTaskDetails] = useState("");
    const [hours, setHours] = useState(0);
    const [copyOption, setCopyOption] = useState(""); // default none selected
    const [otherDays, setOtherDays] = useState([]);
    const [leaveType, setLeaveType] = useState(null); // leave type state
    const leaveOptions = ["Sick Leave", "Casual Leave", "Other Leave"];
    const [loading, setLoading] = useState(false);
    const [leaveList, setLeaveList] = useState([]);
    const [holidayList, setHolidayList] = useState([]);
    const startDay = currentMonth.startOf("month").startOf("isoWeek");
    const endDay = currentMonth.endOf("month").endOf("isoWeek");
    const totalDays = [];
    const location = useLocation();
    const { viewData, selectedMonth } = location.state || {};
    const breadCrumb = !viewData ? [{ label: "TimeSheet" }] : [{ label: "TimeSheet", link: "/timesheet" }, { label: `${viewData.username} - Timesheet for ${moment(viewData.monthYear).format("MMM-YYYY")}` }];

    let day = startDay;
    while (day.isBefore(endDay, "day") || day.isSame(endDay, "day")) {
        totalDays.push(day);
        day = day.add(1, "day");
    }

    useEffect(() => {
        getLeave();
        if (!viewData) {
            getTimeSheetEntries();
        } else {
            const formattedEntries = viewData.timesheet.reduce((acc, item) => {
                // Ensure entryDate exists
                if (item.entryDate) {
                    const date = item.entryDate.split("T")[0];
                    acc[date] = {
                        task: item.taskDetails || "",
                        hours: item.workingHours ?? 0,
                        leaveType: item.leaveType ?? null,
                    };
                }
                return acc;
            }, {});

            console.log("Converted Entries:", formattedEntries);
            setEntries(formattedEntries);
        }
    }, [currentMonth]);

    const getLeave = () => {
        const url = !viewData ? `User/GetEmployeeLeave` : `User/GetEmployeeLeave?userName=${viewData.username}`;
        setLoading(true);
        getRequest(url)
            .then((res) => {
                if (res.data) {
                    res.data.leaves.forEach((d) => {
                        if (d.fromDate) {
                            d.fromDate = moment(d.fromDate).format("YYYY-MM-DD");
                        }
                        if (d.toDate) {
                            d.toDate = moment(d.toDate).format("YYYY-MM-DD");
                        }
                    });
                    setLeaveList(res.data.leaves);
                    setHolidayList(
                        res.data.holidays
                            .filter(x => x.eventType === "Holiday")
                            .map(h => ({
                                ...h,
                                eventDate: dayjs(h.eventDate).format("YYYY-MM-DD") // format here
                            }))
                    );
                    setLoading(false);
                }
            })
            .catch((err) => {
                setLoading(false);
                console.error("Login error:", err);
            });
    };

    const getTimeSheetEntries = () => {
        const selectedMonth = currentMonth.format("YYYY-MM");
        const url = `TimeSheet/GetTimeSheet?month=${selectedMonth}`;
        setLoading(true);

        getRequest(url)
            .then((res) => {
                if (res.data && Array.isArray(res.data)) {

                    const formattedEntries = res.data.reduce((acc, item) => {
                        // Ensure entryDate exists
                        if (item.entryDate) {
                            const date = item.entryDate.split("T")[0];
                            acc[date] = {
                                task: item.taskDetails || "",
                                hours: item.workingHours ?? 0,
                                leaveType: item.leaveType ?? null,
                            };
                        }
                        return acc;
                    }, {});

                    console.log("Converted Entries:", formattedEntries);
                    setEntries(formattedEntries);
                } else {
                    console.warn("No data received from API");
                }

                setLoading(false);
            })
            .catch((err) => {
                console.error("API Error:", err);
                setLoading(false);
            });
    };


    const weeks = [];
    for (let i = 0; i < totalDays.length; i += 7) weeks.push(totalDays.slice(i, i + 7));

    const convertHHMMToMinutes = (value) => {
        if (!value) return 0;

        const parts = value.toString().split(".");
        const hrs = parseInt(parts[0] || 0);
        const mins = parseInt(parts[1] || 0);

        return (hrs * 60) + mins;
    };

    const convertMinutesToHHMM = (totalMinutes) => {
        const hrs = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;

        // If minutes = 0 → return only hours
        if (mins === 0) {
            return `${hrs}`;
        }

        return `${hrs}.${mins.toString().padStart(2, "0")}`;
    };

    const getWeeklyTotal = (week) => {
        let totalMinutes = 0;

        week.forEach((d) => {
            const entry = entries[d.format("YYYY-MM-DD")];
            if (entry?.hours) {
                totalMinutes += convertHHMMToMinutes(entry.hours);
            }
        });

        return convertMinutesToHHMM(totalMinutes);
    };

    const handleCellClick = (date) => {
        const today = dayjs();
        if (date.month() !== currentMonth.month()) return;
        if (date.isAfter(today, "day")) return;
        if (currentMonth.isBefore(today, "month")) return;
        if (holidayList.includes(date.format("YYYY-MM-DD"))) return;
        const leave = leaveList.find(l => {
            const from = dayjs(l.fromDate, "YYYY-MM-DD");
            const to = dayjs(l.toDate, "YYYY-MM-DD");

            return date.isSame(from, "day") ||
                date.isSame(to, "day") ||
                (date.isAfter(from, "day") && date.isBefore(to, "day"));
        });

        // 🚫 If leave exists AND no approverReason → approved or pending → do NOT open modal
        if (leave && !leave.approverReason) {
            return; // Block modal
        }

        // open modal
        setSelectedDate(date);
        const entry = entries[date.format("YYYY-MM-DD")];
        setTaskDetails(entry?.task || "");
        setHours(entry?.hours || 0);
        setCopyOption("");
        setOtherDays([]);
        setModalVisible(true);
    };


    const saveEntry = () => {
        const newEntries = { ...entries };
        newEntries[selectedDate.format("YYYY-MM-DD")] = { task: taskDetails, hours: parseFloat(hours), leaveType: hours === 0 ? leaveType : null, };

        if (copyOption === "day") {
            otherDays.forEach((d) => {
                newEntries[d.format("YYYY-MM-DD")] = { task: taskDetails, hours: parseFloat(hours) };
            });
        } else if (copyOption === "week") {
            const weekStart = selectedDate.startOf("isoWeek");
            const weekEnd = selectedDate.endOf("isoWeek");
            let d = weekStart;
            while (d.isBefore(weekEnd) || d.isSame(weekEnd, "day")) {
                newEntries[d.format("YYYY-MM-DD")] = { task: taskDetails, hours: parseFloat(hours) };
                d = d.add(1, "day");
            }
        } else if (copyOption === "month") {
            const monthStart = selectedDate.startOf("month"); // start from the 1st of the month
            let d = monthStart;
            while (d.isBefore(selectedDate) || d.isSame(selectedDate, "day")) {
                newEntries[d.format("YYYY-MM-DD")] = { task: taskDetails, hours: parseFloat(hours) };
                d = d.add(1, "day");
            }
        }

        const payloadArray = Object.keys(newEntries).map(date => ({
            entryDate: date,
            taskDetails: newEntries[date].task || "",
            workingHours: newEntries[date].hours ?? 0,
            leaveType: newEntries[date].leaveType || null
        }));

        const url = `TimeSheet/InsertOrUpdateTimeSheet`;
        setLoading(true);
        postRequest(url, payloadArray)
            .then((res) => {
                if (res.data) {
                    getTimeSheetEntries();
                    setModalVisible(false);
                    setLoading(false);
                }
            })
            .catch((err) => {
                setLoading(false);
                console.error("Login error:", err);
            });
    };

    const toggleOtherDay = (date) => {
        const exists = otherDays.find((d) => d.isSame(date, "day"));
        if (exists) setOtherDays(otherDays.filter((d) => !d.isSame(date, "day")));
        else setOtherDays([...otherDays, date]);
    };

    const getStatusClass = (entry, date) => {
        // Defensive: ensure date exists and is a dayjs object
        if (!date) return "";
        const dt = dayjs.isDayjs(date) ? date : dayjs(date);

        if (!dt.isValid()) return "";

        // If leaveList not ready, return timesheet status only
        if (!leaveList || !Array.isArray(leaveList) || leaveList.length === 0) {
            if (!entry) return "";
            if (entry.hours >= 8) return classes.filled;
            if (entry.hours > 0 && entry.hours < 8) return classes.partiallyFilled;
            if (entry.hours === 0) return classes.notFilled;
            return "";
        }

        // Find leave record whose range includes this date (safe checks)
        const leave = leaveList.find(l => {
            const from = dayjs(l.fromDate, "YYYY-MM-DD");
            const to = dayjs(l.toDate, "YYYY-MM-DD");

            if (!from.isValid() || !to.isValid()) return false;

            return dt.isSame(from, "day") ||
                dt.isSame(to, "day") ||
                (dt.isAfter(from, "day") && dt.isBefore(to, "day"));
        });

        if (leave && leave.approverReason) {
            if (!entry) return "";
            if (entry.hours >= 8) return classes.filled;
            if (entry.hours > 0 && entry.hours < 8) return classes.partiallyFilled;
            if (entry.hours === 0) return classes.notFilled;
            return "";
        }

        // 🟢 Approved leave
        if (leave && leave.isApproved === true) {
            return classes.approvedLeave;
        }

        // 🟣 Pending leave
        if (leave && leave.isApproved === false) {
            return classes.appliedLeave;
        }

        // fallback to entry-based styling
        if (!entry) return "";
        if (entry.hours >= 8) return classes.filled;
        if (entry.hours > 0 && entry.hours < 8) return classes.partiallyFilled;
        if (entry.hours === 0) return classes.notFilled;
        return "";
    };




    const downloadExcel = () => {
        const monthStart = currentMonth.startOf("month");
        const monthEnd = currentMonth.endOf("month");

        const allDates = [];
        let day = monthStart;

        while (day.isBefore(monthEnd) || day.isSame(monthEnd, "day")) {
            allDates.push(day.format("YYYY-MM-DD"));
            day = day.add(1, "day");
        }

        // Prepare data for Excel
        const monthEntries = allDates.map(date => ({
            Date: date,
            Task: entries[date]?.task || "-",
            Hours: entries[date]?.hours ?? "-",
            LeaveType: entries[date]?.leaveType || "-",
        }));

        // Calculate total hours (only valid numbers)
        const totalHours = Object.values(entries).reduce((sum, entry) => {
            return sum + (entry.hours ? parseFloat(entry.hours) : 0);
        }, 0);

        // Add total at bottom
        monthEntries.push({
            Date: "TOTAL",
            Task: "",
            Hours: totalHours,   // 🔥 Total Hours here
            LeaveType: ""
        });

        const worksheet = XLSX.utils.json_to_sheet(monthEntries);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Timesheet");

        const fileName = `Timesheet_${currentMonth.format("MMMM_YYYY")}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };


    return (
        <div className={classes.rootBox}>
            <LoadingMask loading={loading} />
            <Breadcrumb items={breadCrumb} />
            {!viewData ? (
                // Show month navigation when NO viewData
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <ArrowLeft
                        onClick={() => setCurrentMonth(currentMonth.subtract(1, "month"))}
                        size={30}
                        style={{ cursor: "pointer" }}
                    />
                    <Typography variant="h5">{currentMonth.format("MMMM YYYY")}</Typography>
                    <ArrowRight
                        onClick={() => {
                            if (!currentMonth.add(1, "month").isAfter(dayjs(), "month")) {
                                setCurrentMonth(currentMonth.add(1, "month"));
                            }
                        }}
                        size={30}
                        style={{ cursor: "pointer" }}
                    />
                </Box>
            ) : (
                ""
                // // Show custom text when viewData exists
                // <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                //     <Box width={40} />
                //     <Typography variant="h6" color="primary" textAlign="center">
                //         Timesheet for {viewData.employeeName} - {selectedMonth}
                //     </Typography>
                //     <IconButton onClick={() => navigate("/timesheet")}>
                //         <X />
                //     </IconButton>
                // </Box>
            )}


            {/* Calendar table */}
            <div className={classes.calendarWrapper}>
                <table className={classes.table}>
                    <thead>
                        <tr>
                            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su", "Weekly"].map((d) => (
                                <th key={d} className={classes.th}>
                                    {d}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {weeks.map((week, i) => (
                            <tr key={i}>
                                {week.map((d) => {
                                    const today = dayjs();
                                    const isCurrentMonth = d.month() === currentMonth.month();
                                    const isWeekend = d.day() === 6 || d.day() === 0;
                                    const entry = entries[d.format("YYYY-MM-DD")];
                                    const isPastMonth = d.isBefore(today.startOf("month"), "day");
                                    const isFutureDate = d.isAfter(today, "day");
                                    const isHoliday = holidayList.some(h => h.eventDate === d.format("YYYY-MM-DD"));


                                    return (
                                        <td
                                            key={d.format("YYYY-MM-DD")}
                                            onClick={() => handleCellClick(d)}
                                            className={`${classes.td} ${isWeekend ? classes.weekend : ""} ${isFutureDate ? classes.futureDay : ""} ${isHoliday ? classes.holiday : ""} ${isPastMonth ? classes.pastMonth : ""} ${!isCurrentMonth ? classes.outsideMonth : ""} ${getStatusClass(entry, d)}`}
                                        >
                                            <div className={classes.tdContent}>{d.format("DD")}</div>
                                            {entry && (
                                                <div className={classes.hoursCenter}>
                                                    {entry.hours}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                                <td className={classes.weeklyTotal}>{getWeeklyTotal(week)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend Section */}
            <Box className={classes.legendWrapper}>

                <Box className={classes.legendItem} sx={{ backgroundColor: "#a5d6a7" }}>
                    <div className={classes.legendColorBox} style={{ backgroundColor: "#4caf50" }} />
                    Approved Leave
                </Box>

                <Box className={classes.legendItem} sx={{ backgroundColor: "#e1bee7" }}>
                    <div className={classes.legendColorBox} style={{ backgroundColor: "#ba68c8" }} />
                    Leave Applied (Pending)
                </Box>

                <Box className={classes.legendItem} sx={{ backgroundColor: "#e0f7fa" }}>
                    <div className={classes.legendColorBox} style={{ backgroundColor: "#009688" }} />
                    Filled Hours
                </Box>

                <Box className={classes.legendItem} sx={{ backgroundColor: "#ffcccc" }}>
                    <div className={classes.legendColorBox} style={{ backgroundColor: "#990000" }} />
                    Holiday
                </Box>

                <Box className={classes.legendItem} sx={{ backgroundColor: "#ffe5b4" }}>
                    <div className={classes.legendColorBox} style={{ backgroundColor: "#ff9800" }} />
                    Not Filled Hours
                </Box>

                <Box className={classes.legendItem} sx={{ backgroundColor: "#b3e5fc" }}>
                    <div className={classes.legendColorBox} style={{ backgroundColor: "#4fc3f7" }} />
                    Partially Filled Hours
                </Box>

            </Box>


            <Box display="flex" justifyContent="center" mt={3}>
                <Button variant="contained" onClick={downloadExcel}>
                    Download Excel (Current Month)
                </Button>
            </Box>



            {/* Modal for task entry */}
            {!viewData && modalVisible && (
                <>
                    <Box sx={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 1200 }} />
                    <Paper
                        elevation={6}
                        sx={{
                            width: 450,
                            p: 4,
                            borderRadius: 3,
                            textAlign: "left",
                            position: "fixed",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            zIndex: 1301,
                        }}
                    >
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                            <Typography variant="h6">{selectedDate.format("DD MMM YYYY")}</Typography>
                            <X onClick={() => setModalVisible(false)} style={{ cursor: "pointer" }} />
                        </Box>

                        <div className={classes.modalFieldWrapper}>
                            <TextField
                                label="Task Details"
                                variant="outlined"
                                multiline
                                minRows={3}
                                value={taskDetails}
                                onChange={(e) => setTaskDetails(e.target.value)}
                                fullWidth
                            />
                        </div>

                        <div className={classes.modalFieldWrapper}>
                            <TextField
                                label="Working Hours"
                                variant="outlined"
                                type="number"
                                inputProps={{ min: 0, max: 24 }} // ✅ max set to 8
                                value={hours}
                                onChange={(e) => {
                                    let val = e.target.value;

                                    setLeaveType(null);

                                    if (!val) {
                                        setHours("");
                                        return;
                                    }

                                    // Allow only numbers and one dot
                                    if (!/^\d{0,2}(\.\d{0,2})?$/.test(val)) return;

                                    const parts = val.split(".");
                                    const hrs = parseInt(parts[0] || 0);
                                    const mins = parseInt(parts[1] || 0);

                                    if (hrs > 24) return;
                                    if (mins >= 60) return;

                                    // Restrict max 24:00
                                    if (hrs === 24 && mins > 0) return;

                                    setHours(val);
                                }}
                                fullWidth
                            />
                        </div>

                        {hours === 0 && (
                            <div className={classes.modalFieldWrapper}>
                                <Autocomplete
                                    disablePortal
                                    options={leaveOptions}
                                    value={leaveType}
                                    onChange={(e, newValue) => setLeaveType(newValue)}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Leave Type" fullWidth />
                                    )}
                                    PopperProps={{ style: { zIndex: 2000 } }}
                                />


                            </div>
                        )}

                        <FormLabel>Copy this day's efforts to:</FormLabel>
                        <RadioGroup value={copyOption} onChange={(e) => setCopyOption(e.target.value)}>
                            <FormControlLabel value="day" control={<Radio />} label="Other day(s)" />
                            <FormControlLabel
                                value="week"
                                control={<Radio />}
                                label={`Current week (${selectedDate.startOf("isoWeek").format("DD MMM")} to ${selectedDate.endOf("isoWeek").format("DD MMM")})`}
                            />
                            <FormControlLabel
                                value="month"
                                control={<Radio />}
                                label={`Current month (till ${selectedDate.format("DD MMM YYYY")})`}
                            />
                        </RadioGroup>

                        {/* Show small calendar for selecting other days */}
                        {copyOption === "day" && (
                            <Box sx={{ border: "1px solid #ddd", borderRadius: 1, mt: 2, p: 1 }}>
                                <Typography>Select other day(s)</Typography>
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
                                    {weeks
                                        .flat()
                                        .filter(
                                            (d) =>
                                                d.month() === currentMonth.month() &&
                                                !d.isSame(selectedDate, "day")
                                        )
                                        .map((d) => {
                                            const isFuture = d.isAfter(dayjs(), "day"); // 🔹 Check future here

                                            return (
                                                <Box
                                                    key={d.format("YYYY-MM-DD")}
                                                    onClick={() => {
                                                        if (!isFuture) toggleOtherDay(d); // ❌ Block future clicks
                                                    }}
                                                    sx={{
                                                        width: 30,
                                                        height: 30,
                                                        lineHeight: "30px",
                                                        textAlign: "center",
                                                        borderRadius: 1,
                                                        cursor: isFuture ? "not-allowed" : "pointer",  // ❌ Cursor blocked
                                                        backgroundColor: isFuture
                                                            ? "#e0e0e0" // ❌ Grey for disabled
                                                            : otherDays.some((od) => od.isSame(d, "day")) ? "#1976d2" : "#f0f0f0",
                                                        color: isFuture
                                                            ? "#999" // ❌ Disabled text color
                                                            : otherDays.some((od) => od.isSame(d, "day")) ? "#fff" : "#000",
                                                        pointerEvents: isFuture ? "none" : "auto" // ❌ Block click
                                                    }}
                                                >
                                                    {d.format("DD")}
                                                </Box>
                                            );
                                        })}


                                </Box>
                            </Box>
                        )}

                        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}>
                            <Button variant="outlined" onClick={() => setModalVisible(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                onClick={saveEntry}
                                disabled={Number(hours) === 0 && !leaveType}// Save only enabled if leaveType is selected when hours = 0
                            >
                                Save
                            </Button>
                        </Box>
                    </Paper>
                </>
            )}
        </div>
    );
};

export default TimesheetCalendar;
