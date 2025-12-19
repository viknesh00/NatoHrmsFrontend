import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Box,
    TextField,
    Button,
    Typography,
    IconButton
} from "@mui/material";
    import { Plus, Trash2 } from "lucide-react";
import Autocomplete from "@mui/material/Autocomplete";
import { makeStyles } from "@material-ui/core/styles";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import { deleteRequest, postRequest } from "../../services/Apiservice";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns";

const useStyles = makeStyles({
    rootBox: {
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
    },
    rowBox: {
        display: "flex",
        gap: 12,
        alignItems: "center",
        marginBottom: 16,
        flexWrap: "wrap",
    },
    fieldContainer: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
    },
    addRowButton: {
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: 16,
    },
    buttonsContainer: {
        display: "flex",
        justifyContent: "center",
        gap: 16,
        marginTop: 24,
    },
    trashButton: {
        backgroundColor: "#fee2e2",
        color: "#b91c1c",
        width: 40,
        height: 40,
        "&:hover": {
            backgroundColor: "#fecaca",
        },
    },
});

const CreateHoliday = () => {
    const classes = useStyles();
    const navigate = useNavigate();
    const location = useLocation();
    const editData = location.state?.holiday || null;

    const breadCrumb = [
        { label: "Calendar", link: "/calendar" },
        { label: editData ? "Edit-Event" : "Create-Event" },
    ];

    const [loading, setLoading] = useState(false);

    const [rows, setRows] = useState([
        { eventName: "", date: null, type: null, workLocation: "" }
    ]);

    const eventTypes = [
        { label: "Holiday", value: "Holiday" },
        { label: "Event", value: "Event" },
    ];

    // Load edit data
    useEffect(() => {
        if (editData) {
            setRows([
                {
                    holidayId: editData.holidayId,
                    eventName: editData.eventName,
                    date: new Date(editData.eventDate),
                    type: eventTypes.find(t => t.value === editData.eventType),
                    workLocation: editData.workLocation || ""
                }
            ]);
        }
    }, []);

    const addRow = () => {
        setRows([...rows, { eventName: "", date: null, type: null, workLocation: "" }]);
    };

    const deleteRow = (index) => {
        const updated = [...rows];
        updated.splice(index, 1);
        setRows(updated);
    };

    const handleDelete = () => {
        const url = `Holiday/DeleteHoliday?holidayId=${rows[0].holidayId}`;
        setLoading(true);
        deleteRequest(url)
            .then((res) => {
                if (res.status === 200) {
                    ToastSuccess("Deleted Successfully");
                    navigate("/calendar");
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const handleSave = () => {
        let isValid = true;

        rows.forEach((row) => {
            if (
                !row.eventName ||
                !row.date ||
                !row.type ||
                !row.workLocation ||
                row.workLocation.trim().length === 0
            ) {
                ToastError("Please fill all mandatory fields");
                isValid = false;
            }
        });

        if (!isValid) return;

        const payload = rows.map(row => ({
            HolidayId: row.holidayId || null,
            EventName: row.eventName,
            EventDate: row.date ? format(row.date, "yyyy-MM-dd") : null,
            EventType: row.type.value,
            workLocation: row.workLocation.trim()
        }));

        setLoading(true);

        postRequest(`Holiday/SaveHoliday`, payload)
            .then((res) => {
                if (res.status === 200) {
                    ToastSuccess("Saved Successfully");
                    navigate("/calendar");
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    return (
        <Box className={classes.rootBox}>
            <LoadingMask loading={loading} />
            <Breadcrumb items={breadCrumb} />

            <Typography
                variant="h6"
                style={{ textAlign: "center", marginBottom: 20, fontWeight: 600 }}
            >
                {editData ? "Edit Event" : "Create Event"}
            </Typography>

            {!editData && (
                <Box className={classes.addRowButton}>
                    <Button
                        variant="contained"
                        startIcon={<Plus size={20} />}
                        onClick={addRow}
                    >
                        Add Event
                    </Button>
                </Box>
            )}

            {rows.map((row, index) => (
                <Box key={index} className={classes.rowBox}>

                    {/* Event Name */}
                    <Box className={classes.fieldContainer}>
                        <TextField
                            label={<span>Event Name <span style={{ color: 'red' }}>*</span></span>}
                            value={row.eventName}
                            fullWidth
                            onChange={(e) => {
                                const updated = [...rows];
                                updated[index].eventName = e.target.value;
                                setRows(updated);
                            }}
                        />
                    </Box>

                    {/* Date */}
                    <Box className={classes.fieldContainer}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                                label={<span>Select Date <span style={{ color: 'red' }}>*</span></span>}
                                value={row.date}
                                format="dd/MM/yyyy"
                                onChange={(newValue) => {
                                    const updated = [...rows];
                                    updated[index].date = newValue;
                                    setRows(updated);
                                }}
                                renderInput={(params) => <TextField {...params} fullWidth />}
                            />
                        </LocalizationProvider>
                    </Box>

                    {/* Event Type */}
                    <Box className={classes.fieldContainer}>
                        <Autocomplete
                            options={eventTypes}
                            getOptionLabel={(o) => o.label}
                            value={row.type}
                            onChange={(event, newValue) => {
                                const updated = [...rows];
                                updated[index].type = newValue;
                                setRows(updated);
                            }}
                            renderInput={(params) => (
                                <TextField {...params} label={<span>Event Type <span style={{ color: 'red' }}>*</span></span>} fullWidth />
                            )}
                        />
                    </Box>

                    {/* City */}
                    <Box className={classes.fieldContainer}>
                        <TextField
                            label={<span>Work Location (City) <span style={{ color: 'red' }}>*</span></span>}
                            value={row.workLocation}
                            fullWidth
                            onChange={(e) => {
                                const updated = [...rows];
                                updated[index].workLocation = e.target.value;
                                setRows(updated);
                            }}
                        />
                    </Box>

                    {rows.length > 1 && (
                        <IconButton
                            onClick={() => deleteRow(index)}
                            className={classes.trashButton}
                        >
                            <Trash2 size={18} />
                        </IconButton>
                    )}
                </Box>
            ))}

            <Box className={classes.buttonsContainer}>
                {editData && (
                    <Button variant="contained" color="error" onClick={handleDelete}>
                        Delete
                    </Button>
                )}

                <Button variant="contained" onClick={handleSave}>
                    {editData ? "Update" : "Save"}
                </Button>

                <Button variant="outlined" onClick={() => navigate("/calendar")}>
                    Cancel
                </Button>
            </Box>
        </Box>
    );
};

export default CreateHoliday;
