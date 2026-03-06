import React, { useEffect, useRef, useState } from "react";
import MUIDataTable from "mui-datatables";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@mui/material/Box";
import { IconButton, Tooltip, Button } from "@mui/material";
import { Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { getRequest, postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import { getCookie } from "../../services/Cookies";
import { Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, TextField, Typography } from "@mui/material";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";

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
}));

export default function Jobapplied() {
    const classes = useStyles();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [applications, setApplications] = useState([]);
    const [selectedRowsData, setSelectedRowsData] = useState([]);
    const [employeesList, setEmployeesList] = useState([]);
    const [openStatusDialog, setOpenStatusDialog] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("New");
    const [assignedUserId, setAssignedUserId] = useState(null);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const statusOptions = [
        { label: "New", value: "New" },
        { label: "Still Searching", value: "Still Searching" },
        { label: "Interviewing", value: "Interviewing" },
        { label: "Placed", value: "Placed" },
        { label: "Rejected", value: "Rejected" }
    ];

    const calledOnce = useRef(false);

    useEffect(() => {
        if (calledOnce.current) return;  // skip if already called
        getJobApplications();
        getUsers();
        calledOnce.current = true;
    }, []);

    // ================= API FUNCTIONS =================

    const getUsers = () => {
    const url = `User/All`;
    setLoading(true);

    const loggedEmail = getCookie("email");
    const userRole = getCookie("role");

    getRequest(url)
        .then((res) => {
            if (res.data) {

                let emails = res.data.map((user) => ({
                    label: user.email,
                    value: user.email,
                }));

                // If NOT Admin or Manager → show only logged user email
                if (userRole !== "Admin" && userRole !== "Manager") {
                    emails = emails.filter(e => e.value === loggedEmail);
                }

                // Sort A-Z
                emails.sort((a, b) => a.label.localeCompare(b.label));

                setEmployeesList(emails);
            }
        })
        .finally(() => setLoading(false));
};

    const getJobApplications = () => {
        setLoading(true);
        getRequest("Jobs")
            .then((res) => {
                res.data.forEach((d) => {
                    if (d.updatedAt) {
                        d.updatedAt = moment(d.updatedAt).format("DD/MM/YYYY");
                    }
                    if (d.appliedOn) {
                        d.appliedOn = moment(d.appliedOn).format("DD/MM/YYYY");
                    }
                });
                setApplications(res.data || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };

    const downloadSingle = (id, fileName) => {
        setLoading(true);

        getRequest(`Jobs/Download/${id}`, null, true)
            .then((res) => {
                const contentType =
                    res.headers["content-type"] || "application/octet-stream";

                const blob = new Blob([res.data], { type: contentType });

                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");

                link.href = url;
                link.setAttribute("download", fileName);

                document.body.appendChild(link);
                link.click();

                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                getJobApplications();
                setSelectedRowsData([]);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };



    const downloadMultiple = (ids) => {
        setLoading(true);

        postRequest("Jobs/DownloadMultiple", ids.split(","), true)
            .then((res) => {
                const blob = new Blob([res.data], {
                    type: "application/zip",
                });

                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");

                link.href = url;
                link.setAttribute(
                    "download",
                    `JobsApplied_${new Date().getTime()}.zip`
                );

                document.body.appendChild(link);
                link.click();

                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                getJobApplications();
                setSelectedRowsData([]);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };


    // ================= HANDLERS =================

    const handleDownload = (selectedDocs) => {
        if (!selectedDocs || selectedDocs.length === 0) return;

        if (selectedDocs.length === 1) {
            const doc = selectedDocs[0];
            downloadSingle(doc.applicationId, doc.resumeFileName);
        } else {
            const ids = selectedDocs.map(d => d.applicationId).join(",");
            downloadMultiple(ids);
        }
    };




    const handleStatusChange = () => {

        if (!selectedStatus) {
            ToastError("Candidate Status is required");
            return;
        }

        if (!assignedUserId) {
            ToastError("Assigned To is required");
            return;
        }

        const payload = {
            applicationId: selectedApplication.applicationId,
            candidateStatus: selectedStatus,
            assignedTo: assignedUserId
        };
        const url = `Jobs/UpdateApplicationStaus`;
        setLoading(true);
        postRequest(url, payload)
            .then((res) => {
                if (res.status === 200) {

                    ToastSuccess(res.data.message)
                    setLoading(false);
                    getJobApplications();
                }
            })
            .catch((err) => {
                setLoading(false);
                console.error("Login error:", err);
                ToastError(err.response?.data?.message || "Failed to update status");
            });

        setOpenStatusDialog(false);
    };

    const handleStatusClick = (rowIndex, currentValue) => {

        const row = applications[rowIndex];

        const userEmail = getCookie("email");
        const userRole = getCookie("role");

        // Access conditions
        const isAdmin = userRole === "Admin";
        const isAssignedUser = row.assignedTo === userEmail;
        const isUnassigned = !row.assignedTo;

        if (isAdmin || isAssignedUser || isUnassigned) {

            setSelectedApplication(row);
            setSelectedStatus(currentValue || "New");
            setAssignedUserId(row.assignedTo || "");
            setOpenStatusDialog(true);

        } else {

            ToastError("You are not authorized to update this candidate status");

        }
    };

    const getStatusColor = (status) => {
        switch ((status || "new").toLowerCase()) {
            case "new":
                return "#1565C0"; // blue

            case "still searching":
                return "#F57C00"; // orange

            case "interviewing":
                return "#6A1B9A"; // purple

            case "placed":
                return "#0F7B0F"; // green

            case "rejected":
                return "#C62828"; // red

            default:
                return "#7D7D7D"; // gray
        }
    };

    const getBackgroundColor = (status) => {
        switch ((status || "new").toLowerCase()) {
            case "new":
                return "#E3F2FD"; // light blue

            case "still searching":
                return "#FFF3CD"; // light orange/yellow

            case "interviewing":
                return "#E8E1FF"; // light purple

            case "placed":
                return "#DFF5D8"; // light green

            case "rejected":
                return "#FDE0E0"; // light red

            default:
                return "#E9E9E9"; // fallback gray
        }
    };

    const StatusChip = ({ label }) => {
        return (
            <div
                style={{
                    backgroundColor: getBackgroundColor(label),
                    color: getStatusColor(label),
                    padding: "3px 10px",
                    fontWeight: 500,
                    fontSize: "12px",
                    borderRadius: "16px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textTransform: "capitalize",
                    cursor: "pointer"
                }}
            >
                {label}
            </div>
        );
    };

    // Columns
    const columns = [
        {
            name: "jobCode",
            label: "Job Code",
        },
        {
            name: "jobTitle",
            label: "Job Title",
        },
        {
            name: "role",
            label: "Role",
        },
        {
            name: "location",
            label: "Location",
        },
        {
            name: "jobType",
            label: "Job Type",
        },
        {
            name: "salary",
            label: "Salary",
        },
        {
            name: "firstName",
            label: "First Name",
        },
        {
            name: "lastName",
            label: "Last Name",
        },
        {
            name: "email",
            label: "Email",
        },
        {
            name: "phone",
            label: "Phone",
        },
        {
            name: "skills",
            label: "Skills",
        },
        { name: "readCount", label: "View Count" },
        {
            name: "appliedOn",
            label: "Applied On",
        },
        {
            name: "updatedAt",
            label: "updated At",
        },
        {
            name: "candidateStatus",
            label: "Status",
            options: {
                customBodyRenderLite: (dataIndex) => {
                    const value = applications[dataIndex]?.candidateStatus || "New";

                    let statusClass = classes.statusNew;

                    if (value === "StillSearching") statusClass = classes.statusSearching;
                    if (value === "Interviewing") statusClass = classes.statusInterviewing;
                    if (value === "Placed") statusClass = classes.statusPlaced;
                    if (value === "Rejected") statusClass = classes.statusRejected;

                    return (
                        <span
                            className={statusClass}
                            onClick={() => handleStatusClick(dataIndex, value)}
                        >
                            <StatusChip label={value} />
                        </span>
                    );
                },
            },
        },
        {
            name: "assignedTo",
            label: "assignedTo",
        },

    ];

    const custom = () => {
        return (
            <>
                <Tooltip title="Download Resumes">
                    <IconButton onClick={() => handleDownload(selectedRowsData)} className="tss-10rusft-MUIDataTableToolbar-icon">
                        <Download size={20} />
                    </IconButton>
                </Tooltip>
            </>
        );
    };

    const options = {
        customToolbarSelect: () => { },
        selectToolbarPlacement: "above",
        selectableRows: "multiple",
        customToolbar: custom,
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
            const selectedData = rowsSelected.map(index => applications[index]);
            console.log(selectedData)
            setSelectedRowsData(selectedData);

        },
    };

    return (
        <Box >
            <LoadingMask loading={loading} />
            <Box className="reportstablehead">
                <ThemeProvider theme={getMuiTheme()}>
                    <MUIDataTable
                        title="Job Applications"
                        data={applications}
                        className={classes.tableBody}
                        columns={columns}
                        options={options}
                    />
                </ThemeProvider>
            </Box>
            {/* ---- STATUS CHANGE DIALOG ---- */}
            <Dialog
                open={openStatusDialog}
                onClose={() => setOpenStatusDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    Update Candidate Status
                </DialogTitle>

                <DialogContent dividers>

                    {/* Candidate Info */}
                    <Box mb={3}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">
                                <strong>Candidate Name:</strong>
                            </Typography>
                            <Typography variant="body2">
                                {selectedApplication?.firstName} {selectedApplication?.lastName}
                            </Typography>
                        </Box>

                        <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">
                                <strong>Job Title:</strong>
                            </Typography>
                            <Typography variant="body2">
                                {selectedApplication?.jobTitle}
                            </Typography>
                        </Box>

                        <Box display="flex" justifyContent="space-between">
                            <Typography variant="body2">
                                <strong>Applied On:</strong>
                            </Typography>
                            <Typography variant="body2">
                                {new Date(selectedApplication?.appliedOn).toLocaleDateString()}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Candidate Status Autocomplete */}
                    <Box mb={3}>
                        <Autocomplete
                            options={statusOptions}
                            getOptionLabel={(option) => option.label}
                            value={
                                statusOptions.find(
                                    (s) => s.value === selectedStatus
                                ) || null
                            }
                            onChange={(event, newValue) => {
                                setSelectedStatus(newValue ? newValue.value : null);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label={<span>Candidate Status <span style={{ color: 'red' }}>*</span></span>}
                                    variant="outlined"
                                    fullWidth
                                />
                            )}
                        />
                    </Box>

                    {/* Assigned To Autocomplete */}
                    <Box mb={2}>
                        <Autocomplete
                            options={employeesList || []}
                            getOptionLabel={(option) => option.value || ""}
                            value={
                                employeesList?.find(
                                    (emp) => emp.value === assignedUserId
                                ) || null
                            }
                            onChange={(event, newValue) => {
                                setAssignedUserId(newValue ? newValue.value : null);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label={<span>Assigned To <span style={{ color: 'red' }}>*</span></span>}
                                    variant="outlined"
                                    fullWidth
                                />
                            )}
                        />
                    </Box>

                </DialogContent>

                <DialogActions>
                    <Button
                        variant="outlined"
                        onClick={() => setOpenStatusDialog(false)}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleStatusChange}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
