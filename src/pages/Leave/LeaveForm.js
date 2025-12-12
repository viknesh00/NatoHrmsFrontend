import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, TextField, Button, Typography, Checkbox, FormControlLabel } from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { makeStyles } from "@mui/styles";
import Autocomplete from "@mui/material/Autocomplete";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
import { getCookie } from "../../services/Cookies";
import { postRequest } from "../../services/Apiservice";
import { format, toDate } from "date-fns";
import Breadcrumb from "../../services/Breadcrumb";

const useStyles = makeStyles({
  rootBox: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
  },
  container: {
    maxWidth: 500,
    margin: "0 auto 0 auto", // top 20px, bottom auto
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  title: {
    textAlign: "center",
    fontWeight: 500,
  },
  buttonsContainer: {
    display: "flex",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
  },
});

const leaveOptions = [
  { label: "Casual Leave", value: "Casual Leave" },
  { label: "Sick Leave", value: "Sick Leave" },
  { label: "Paid Leave", value: "Paid Leave" },
  { label: "Unpaid Leave", value: "Unpaid Leave" },
  { label: "Compensatory Off", value: "Compensatory Off" },
];

const dayTypeOptions = [
  { label: "Full Day", value: "Full Day" },
  { label: "Half Day", value: "Half Day" },
  { label: "Off Day", value: "Off Day" },
];

const LeaveForm = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const editData = location.state?.editData || null;
  const breadCrumb = !editData ? [{ label: "Leave", link: "/leave" }, { label: "Apply-Leave" }] : [{ label: "Leave", link: "/leave" }, { label: "Edit-Leave" }];

  // Form state
  const [formValues, setFormValues] = useState({
    leaveId: null,
    employeeName: getCookie("firstName") + " " + getCookie("lastName"),
    userName: getCookie("email"),
    fromDate: null,
    toDate: null,
    leaveType: null,
    dayType: "",        // NEW FIELD
    reason: "",
    isApproved: false,
    cancelLeave: false, // NEW FIELD
  });


  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.split("/");
    return new Date(`${year}-${month}-${day}`); // YYYY-MM-DD format
  };


  useEffect(() => {
    if (editData) {
      setFormValues({
        ...formValues,
        leaveId: editData.leaveId,
        employeeName: editData.employeeName,
        userName: editData.userName,
        fromDate: parseDate(editData.fromDate),
        toDate: parseDate(editData.toDate),
        leaveType: leaveOptions.find(x => x.value === editData.leaveType) || null,
        reason: editData.reason,
        isApproved: editData.isApproved,
        cancelLeave: editData.cancelLeave,
        dayType: dayTypeOptions.find(x => x.value === editData.dayType) || null, // keep object
      });
    }
  }, [editData]);


  const handleChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formValues.fromDate || !formValues.toDate || !formValues.leaveType || !formValues.dayType) {
      ToastError("Please fill all required fields");
      return;
    }
    let data = {
      ...formValues,
      leaveType: formValues.leaveType.value,
      dayType: formValues.dayType.value,
      fromDate: formValues.fromDate ? format(formValues.fromDate, "yyyy-MM-dd") : null,
      toDate: formValues.toDate ? format(formValues.toDate, "yyyy-MM-dd") : null
    }
    setLoading(true);
    const url = `User/ApplyLeave`;
    setLoading(true);
    postRequest(url, data)
      .then((res) => {
        if (res.status === 200) {
          ToastSuccess(res.data.message)
          navigate("/leave");
          setLoading(false);
        }
      })
      .catch((err) => {
        setLoading(false);
        console.error("Login error:", err);
      });

  };

  const handleCancel = () => navigate("/leave");

  return (
    <Box className={classes.rootBox}>
      <LoadingMask loading={loading} />
      <Breadcrumb items={breadCrumb} />
      <Box className={classes.container}>
        <Typography variant="h6" className={classes.title}>
          Employee Leave Form
        </Typography>

        <TextField
          label="Name"
          value={formValues.employeeName}
          disabled
          fullWidth
        />

        <TextField
          label="User Email"
          value={formValues.userName}
          disabled
          fullWidth
        />

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label={<span>From Date <span style={{ color: 'red' }}>*</span></span>}
            value={formValues.fromDate}
            format="dd/MM/yyyy"
            onChange={(newValue) => handleChange("fromDate", newValue)}
            renderInput={(params) => <TextField fullWidth {...params} />}
          />
        </LocalizationProvider>

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label={<span>To Date <span style={{ color: 'red' }}>*</span></span>}
            value={formValues.toDate}
            format="dd/MM/yyyy"
            minDate={formValues.fromDate || undefined} // <-- Prevent selecting before From Date
            onChange={(newValue) => handleChange("toDate", newValue)}
            renderInput={(params) => <TextField fullWidth {...params} />}
          />
        </LocalizationProvider>

        <Autocomplete
          fullWidth
          options={dayTypeOptions}
          getOptionLabel={(option) => option.label}
          value={formValues.dayType || null}  // just use the object directly
          onChange={(event, newValue) =>
            handleChange("dayType", newValue)
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label={<span>Day Type <span style={{ color: 'red' }}>*</span></span>}
            />
          )}
        />

        <Autocomplete
          fullWidth
          options={leaveOptions}
          getOptionLabel={(option) => option.label || ""}
          value={formValues.leaveType}
          onChange={(event, newValue) => handleChange("leaveType", newValue)}
          renderInput={(params) => <TextField {...params} label={<span>Leave Type <span style={{ color: 'red' }}>*</span></span>} />}
        />

        <TextField
          label="Reason"
          value={formValues.reason}
          onChange={(e) => handleChange("reason", e.target.value)}
          fullWidth
          multiline
          rows={2}
        />
        {editData && ( // Only show in EDIT MODE
          <FormControlLabel
            control={
              <Checkbox
                checked={formValues.cancelLeave}
                onChange={(e) => handleChange("cancelLeave", e.target.checked)}
              />
            }
            label="Cancel Leave"
          />
        )}


        <Box className={classes.buttonsContainer}>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
          <Button variant="outlined" onClick={handleCancel}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default LeaveForm;
