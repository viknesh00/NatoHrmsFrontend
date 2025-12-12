import React, { useEffect, useState } from "react";
import MUIDataTable from "mui-datatables";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { Pencil, Plus } from "lucide-react";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio } from "@mui/material";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { getRequest, postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import { getCookie } from "../../services/Cookies";

const getMuiTheme = () =>
    createTheme({
        components: {
            MUIDataTableHeadCell: {
                styleOverrides: {
                    data: {
                        textTransform: "none !important",
                    },
                    root: {
                        textTransform: "none !important",
                    },
                },
            },
            MUIDataTableViewCol: {
                styleOverrides: {
                    root: {
                        padding: "8px 12px !important",
                    },
                    label: {
                        textTransform: "none !important",
                    },
                },
            },
        },
    });

const useStyles = makeStyles((theme) => ({
    rootBox: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
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
    statusPending: {
        color: "#1976d2", // blue
        fontWeight: 500,
        cursor: "pointer",
    },
    statusActive: {
        color: "#0a9949",
        fontWeight: 500,
        cursor: "pointer",
    },
    statusInactive: {
        color: "#d32f2f",
        fontWeight: 500,
        cursor: "pointer",
    },
    blinkText: {
        color: "red",
        fontWeight: "bold",
        marginLeft: 8,
        animation: "$blink 1s step-start infinite",
    },
    "@keyframes blink": {
        "50%": {
            opacity: 0,
        },
    },
}));

export default function Leave() {
    const classes = useStyles();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [hover, setHover] = useState(false);
    const [leaveList, setLeaveList] = useState([]);
    const [selectedRow, setSelectedRow] = useState([]);
    const [openStatusDialog, setOpenStatusDialog] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(true);
    const userRole = getCookie("role");
    const isAdmin = userRole === "Admin";

    useEffect(() => {
        getLeave();
    }, []);

    const getLeave = () => {
        const url = `User/GetEmployeeLeave`;
        setLoading(true);
        getRequest(url)
            .then((res) => {
                if (res.data) {
                    res.data.forEach((d) => {
                        if (d.fromDate) {
                            d.fromDate = moment(d.fromDate).format("DD/MM/YYYY");
                        }
                        if (d.toDate) {
                            d.toDate = moment(d.toDate).format("DD/MM/YYYY");
                        }
                    });
                    setLeaveList(res.data);
                    setLoading(false);
                }
            })
            .catch((err) => {
                setLoading(false);
                console.error("Login error:", err);
            });
    };


    const handleEdit = (rowData) => {
        navigate("/leave/apply-leave", { state: { editData: rowData } });
    };

    const handleAddEmployee = () => navigate("/leave/apply-leave");

    const handleStatusClick = (rowIndex, currentValue) => {
        const row = leaveList[rowIndex];
        setSelectedStatus(currentValue);
        setSelectedRow(row);
        setOpenStatusDialog(true);
    };

    const convertDMYtoYMD = (dateStr) => {
        if (!dateStr) return null;

        const parts = dateStr.split("/");
        if (parts.length !== 3) return null;

        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
    };

    const handleSaveStatus = () => {
        let data = {
            leaveId: selectedRow.leaveId,
            employeeName: selectedRow.employeeName,
            userName: selectedRow.userName,
            fromDate: convertDMYtoYMD(selectedRow.fromDate),
            toDate: convertDMYtoYMD(selectedRow.toDate),
            leaveType: selectedRow.leaveType,
            reason: selectedRow.reason,
            isApproved: selectedStatus,
            dayType: selectedRow.dayType,
            cancelLeave: selectedRow.cancelLeave
        }
        const url = `User/ApplyLeave`;
        setLoading(true);
        postRequest(url, data)
            .then((res) => {
                if (res.status === 200) {

                    ToastSuccess("Status updated successfully")
                    setLoading(false);
                    getLeave();
                }
            })
            .catch((err) => {
                setLoading(false);
                console.error("Login error:", err);
                ToastError(err.response?.data?.message || "Failed to update status");
            });

        setOpenStatusDialog(false);
    };



    const columns = [
        {
            name: "leaveId",
            label: "Leave ID",
        },
        { name: "employeeName", label: "Name" },
        {
            name: "userName",
            label: "Email",
        },
        {
            name: "fromDate",
            label: "From Date",
        },
        {
            name: "toDate",
            label: "To Date",
        },
        {
            name: "leaveType",
            label: "Leave Type",
        },
        {
            name: "reason",
            label: "Reason",
        },
        {
            name: "isApproved",
            label: "Approved",
            options: {
                customBodyRenderLite: (dataIndex) => {
                    const row = leaveList[dataIndex];

                    const isApproved = row?.isApproved;
                    const approvedBy = row?.approvedBy;

                    let statusText = "";
                    let statusClass = "";

                    if (!approvedBy) {
                        statusText = "Update Status";
                        statusClass = classes.statusPending;
                    } else {
                        statusText = isApproved ? "Approved" : "Declined";
                        statusClass = isApproved
                            ? classes.statusActive
                            : classes.statusInactive;
                    }

                    return (
                        <span
                            className={statusClass}
                            style={{
                                cursor: isAdmin ? "pointer" : "not-allowed",
                                opacity: isAdmin ? 1 : 0.6,
                                textDecoration: hover && isAdmin ? "underline" : "none",
                            }}
                            onMouseEnter={() => {
                                if (isAdmin) setHover(true);
                            }}
                            onMouseLeave={() => {
                                if (isAdmin) setHover(false);
                            }}
                            onClick={() => {
                                if (!isAdmin) return; // ❌ block click if not admin
                                handleStatusClick(dataIndex, isApproved);
                            }}
                        >
                            {statusText}
                        </span>
                    );
                },
            },
        },
        {
            name: "actions",
            label: "Actions",
            options: {
                filter: false,
                sort: false,
                empty: true,
                display: !isAdmin,
                customBodyRender: (value, tableMeta) => {
                    const rowData = leaveList[tableMeta.rowIndex];

                    if (rowData.approvedBy !== null) {
                        return null;
                    }

                    return (
                        <IconButton onClick={() => handleEdit(rowData)}>
                            <Pencil size={20} />
                        </IconButton>
                    );
                },
            },
        }
    ];


    const options = {
        customToolbarSelect: () => { },
        selectToolbarPlacement: "above",
        selectableRows: "none",
        download: true,
        print: false,
        search: true,
        filter: true,
        viewColumns: true,
        rowsPerPage: 5,
        rowsPerPageOptions: [5, 10, 20],
    };

    return (
        <Box className={classes.rootBox}>
            <LoadingMask loading={loading} />
            <Box className={classes.addButtonContainer}>
                {!isAdmin && (
                    <Button
                        variant="contained"
                        onClick={handleAddEmployee}
                        className={classes.addButton}
                    >
                        <Plus size={20} /> Apply Leave
                    </Button>
                )}
            </Box>

            <Box className="reportstablehead">
                <ThemeProvider theme={getMuiTheme()}>
                    <MUIDataTable
                        title={"Leave Request"}
                        className={classes.tableBody}
                        data={leaveList}
                        columns={columns}
                        options={options}
                    />
                </ThemeProvider>
            </Box>
            <Dialog open={openStatusDialog} onClose={() => setOpenStatusDialog(false)}>
                <DialogTitle>
                    Do you want to approve this leave request?
                </DialogTitle>

                <DialogContent dividers>
                    <Box mb={2}>
                        <strong>Status:</strong>
                    </Box>

                    <RadioGroup
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value === "true")}
                    >
                        <Box display="flex" alignItems="center" gap={2}>
                            <FormControlLabel value={true} control={<Radio />} label="Approved" />
                            <FormControlLabel value={false} control={<Radio />} label="Declined" />
                        </Box>

                    </RadioGroup>
                </DialogContent>

                <DialogActions>
                    <Button variant="outlined" onClick={() => setOpenStatusDialog(false)}>Cancel</Button>
                    <Button variant="contained" color="primary" onClick={handleSaveStatus}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
