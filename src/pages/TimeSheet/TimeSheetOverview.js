import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import MUIDataTable from "mui-datatables";
import LoadingMask from "../../services/LoadingMask";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { makeStyles } from "@material-ui/core/styles";
import { getRequest } from "../../services/Apiservice";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { IconButton, Tooltip } from "@mui/material";
import { Check, RotateCcw } from "lucide-react";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../../services/Breadcrumb";

const getMuiTheme = () =>
    createTheme({
        components: {
            MUIDataTableHeadCell: {
                styleOverrides: {
                    data: { textTransform: "none !important" },
                    root: { textTransform: "none !important" },
                },
            },
            MUIDataTableViewCol: {
                styleOverrides: {
                    root: { padding: "8px 12px !important" },
                    label: { textTransform: "none !important" },
                },
            },
        },
    });

const useStyles = makeStyles(() => ({
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
    rootBox: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
    },
    dateFilterBox: {
        display: "flex",
        gap: 12,
        alignItems: "center",
        marginBottom: 16,
        justifyContent: "flex-end",
    },
}));

export default function TimeSheetOverview() {
    const classes = useStyles();
    const navigate = useNavigate();
    const breadCrumb = [{ label: "TimeSheet" }];
    const [loading, setLoading] = useState(false);
    const [singleDate, setSingleDate] = useState(dayjs());
    const [tableData, setTableData] = useState([]);
    const [selectedRowsData, setSelectedRowsData] = useState([]);

    useEffect(() => {
        if (!singleDate) return;
        getTimeSheetEntries(singleDate);
    }, [singleDate]);

    const decimalHoursToHHMM = (hours) => {
        if (!hours || isNaN(hours)) return "0.00";

        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);

        return `${h}.${String(m).padStart(2, "0")}`;
    };
  
    const groupByUser = (data) => {
        const grouped = {};

        data.forEach((item) => {
            const uid = item.userId;

            if (!grouped[uid]) {
                grouped[uid] = {
                    employeeName: item.employeeName,
                    employeeId: item.employeeId,
                    username: item.username,
                    totalWorkingHours: 0,   // <-- ADD THIS
                    timesheet: [],
                };
            }

            // Push timesheet entry
            grouped[uid].timesheet.push(item);

            // Accumulate total working hours
            grouped[uid].totalWorkingHours += Number(item.workingHours || 0);
        });

        return Object.values(grouped).map((item) => ({
            ...item,
            totalWorkingHours: decimalHoursToHHMM(item.totalWorkingHours),
        }));
    };

    const getTimeSheetEntries = (monthObj) => {
        if (!monthObj) return;
        const selectedMonth = monthObj.format("YYYY-MM"); // e.g. 2025-11
        const url = `TimeSheet/GetTimeSheet?month=${selectedMonth}`;

        setLoading(true);
        getRequest(url)
            .then((res) => {
                if (res && res.data) {
                    const grouped = groupByUser(res.data);
                    setTableData(grouped);
                } else {
                    setTableData([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("API Error:", err);
                setLoading(false);
            });
    };

    const handleReset = () => {
        const today = dayjs();
        setSingleDate(today);
        getTimeSheetEntries(today);
        setSelectedRowsData([]);
    };

    const handleFilter = () => {
        if (!singleDate) return;
        getTimeSheetEntries(singleDate);
    };

    const columns = [
        { name: "employeeId", label: "Employee Id" },
        { name: "employeeName", label: "EmployeeName" },
        { name: "username", label: "Email" },
        { name: "totalWorkingHours", label: "Working Hours" },
        {
            name: "action",
            label: "Action",
            options: {
                customBodyRender: (value, tableMeta) => {
                    const rowData = tableData[tableMeta.rowIndex]; // get full row data

                    return (
                        <IconButton
                            onClick={() => navigate("/timesheet/timesheet-view", { state: { viewData: rowData, selectedMonth: singleDate.format("MMM-YYYY"), } })}
                        >
                            <Eye size={18} />
                        </IconButton>
                    );
                },
            },
        },
    ];

    const options = {
        customToolbarSelect: () => { },
        selectToolbarPlacement:"above",
        selectableRows: "multiple",
        responsive: "standard",
        filterType: 'multiselect',
        download: true,
        print: true,
        search: true,
        filter: true,
        viewColumns: true,
        rowsPerPage: 10,
        rowsPerPageOptions: [10, 15, 50, 100],
          
    onRowSelectionChange: (currentRowsSelected, allRowsSelected, rowsSelected) => {
        const selectedData = rowsSelected.map(index => tableData[index]);
        console.log(selectedData)
        setSelectedRowsData(selectedData);

    },
        onDownload: (buildHead, buildBody, columns, data) => {
            const rowsToExport = selectedRowsData.length > 0 ? selectedRowsData : tableData;
            if (!rowsToExport || rowsToExport.length === 0) return false;
            

            const monthStart = singleDate.startOf("month");
            const monthEnd = singleDate.endOf("month");

            const allDates = [];
            let d = monthStart;
            while (d.isBefore(monthEnd) || d.isSame(monthEnd, "day")) {
                allDates.push(d.format("DD-MM-YYYY"));
                d = d.add(1, "day");
            }

            const excelData = rowsToExport.map(emp => {
                const row = {
                    "Employee Name": emp.employeeName,
                    "Employee ID": emp.employeeId,
                    "Email": emp.username,
                };

                let totalHours = 0;

                allDates.forEach(dateStr => {
                    const entry = emp.timesheet.find(
                        t => dayjs(t.entryDate).format("DD-MM-YYYY") === dateStr
                    );
                    const hours = entry ? entry.workingHours : 0;
                    row[dateStr] = decimalHoursToHHMM(hours);
                    totalHours += hours;
                });

                row["TOTAL"] = decimalHoursToHHMM(totalHours);
                return row;
            });

            // Insert blank row before total
            const blankRow = {};
            Object.keys(excelData[0]).forEach(k => blankRow[k] = "");
            excelData.push(blankRow);

            // Add final total row
            const finalTotalRow = { "Employee Name": "Total", "Employee ID": "", "Email": "" };
            allDates.forEach(dateStr => {
                let sum = 0;
                rowsToExport.forEach(emp => {
                    const entry = emp.timesheet.find(
                        t => dayjs(t.entryDate).format("DD-MM-YYYY") === dateStr
                    );
                    sum += entry ? entry.workingHours : 0;
                });
                finalTotalRow[dateStr] = decimalHoursToHHMM(sum);
            });
            const grandTotal = Object.values(finalTotalRow)
                .slice(3)
                .reduce((a, b) => a + (parseFloat(b) || 0), 0);

            finalTotalRow["TOTAL"] = decimalHoursToHHMM(grandTotal);
            excelData.push(finalTotalRow);

            // Build CSV string
            const header = Object.keys(excelData[0]);
            const csvRows = [
                header.join(","), // header
                ...excelData.map(r => header.map(h => r[h]).join(",")) // rows
            ];
            const csvString = csvRows.join("\n");

            // Trigger download
            const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `Timesheet_${singleDate.format("MMM-YYYY")}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            return false; // prevent default MUIDataTable download
        }
    };

    return (
        <Box className={classes.rootBox}>
            <LoadingMask loading={loading} />
            <Breadcrumb items={breadCrumb} />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box className={classes.dateFilterBox}>
                    <DatePicker
                        label="Select Month"
                        value={singleDate}
                        onChange={(newValue) => setSingleDate(newValue)}
                        views={["year", "month"]} // only month & year
                        openTo="month" // open month view first
                        inputFormat="MM/YYYY" // display format
                        slotProps={{ textField: { size: "small", sx: { height: 40 } } }}
                    />

                    <Tooltip title="Apply Filter" arrow>
                        <IconButton onClick={handleFilter}>
                            <Check size={20} />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Reset Filters" arrow>
                        <IconButton onClick={handleReset}>
                            <RotateCcw size={20} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </LocalizationProvider>
            <Box className="reportstablehead">
            <ThemeProvider theme={getMuiTheme()}>
                <MUIDataTable
                    title={"Employee Timesheet"}
                    className={classes.tableBody}
                    data={tableData}
                    columns={columns}
                    options={options}
                />
            </ThemeProvider>
            </Box>
        </Box>
    );
}
