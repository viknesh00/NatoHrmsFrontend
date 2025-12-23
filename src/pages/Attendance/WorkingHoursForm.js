import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, TextField, Button, Typography } from "@mui/material";
import { LocalizationProvider, TimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format, parse } from "date-fns";
import { makeStyles } from "@material-ui/core/styles";
import Autocomplete from "@mui/material/Autocomplete";
import { postRequest } from "../../services/Apiservice";
import { ToastSuccess } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
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
    margin: "50px auto",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  title: {
    textAlign: "center",
    fontWeight: 600,
    fontSize: 22,
    marginBottom: 16,
  },
  buttonsContainer: {
    display: "flex",
    justifyContent: "center",
    gap: 16,
    marginTop: 24,
  },
});

const WorkingHoursForm = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData || null;
  const breadCrumb = !editData ? [{ label: "Department List", link: "/employees/working-hours" }, { label: "Create-Department" }] : [{ label: "Department List", link: "/employees/working-hours" }, { label: "Edit-Department" }];
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState({
    deptId: editData?.deptId ?? null,
    //departmentName: editData?.departmentName ? { label: editData.departmentName, value: editData.departmentName }: null,
    departmentName:editData?.departmentName??null,
    startTime: editData?.startTime ? parse(editData.startTime, "HH:mm:ss", new Date()) : null,
    endTime: editData?.endTime ? parse(editData.endTime, "HH:mm:ss", new Date()) : null,
  });

  const departmentOptions = [
    { label: "HR", value: "HR" },
    { label: "Management", value: "Management" },
    { label: "IT", value: "IT" },
    { label: "All", value: "All" },
  ];

  const handleSave = () => {
    const saveData = {
      ...formValues,
      deptId: formValues.deptId,
      startTime: formValues.startTime ? format(formValues.startTime, "HH:mm:ss") : null,
      endTime: formValues.endTime ? format(formValues.endTime, "HH:mm:ss") : null,
      departmentName: formValues.departmentName?.value || "",
    };

    setLoading(true);
    const url = `Attendance/InsertOrUpdateDepartmentTiming`;
    postRequest(url, saveData)
      .then((res) => {
        if (res.status === 200) {
          ToastSuccess(res.data.message);
          navigate("/employees/working-hours");
        }
      })
      .catch((err) => {
        setLoading(false);
        console.error(err);
      });
  };

  const handleCancel = () => navigate("/employees/working-hours");

  return (
    <Box className={classes.rootBox}>
      <LoadingMask loading={loading} />
      <Breadcrumb items={breadCrumb} />
      <Box className={classes.container}>
       <Typography variant="h6" className={classes.title}>
          {editData ? "Edit Department Timings" : "Create Department Timings"}
        </Typography>

        {/* Department */}
        {/* <Autocomplete
          fullWidth
          options={departmentOptions}
          getOptionLabel={(option) => option.label || ""}
          value={formValues.departmentName}
          onChange={(event, newValue) =>
            setFormValues({ ...formValues, departmentName: newValue })
          }
          disabled={!!editData}
          renderInput={(params) => <TextField {...params} label="Department" fullWidth />}
        /> */}

        <TextField
          fullWidth
          label={<span>Department Name <span style={{ color: 'red' }}>*</span></span>}
          value={formValues.departmentName || ""}
          onChange={(e) =>
            setFormValues({ ...formValues, departmentName: e.target.value })
          }
        />

        {/* Start Time */}
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <TimePicker
            label="Start Time"
            value={formValues.startTime}
            onChange={(newValue) =>
              setFormValues({ ...formValues, startTime: newValue })
            }
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </LocalizationProvider>

        {/* End Time */}
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <TimePicker
            label="End Time"
            value={formValues.endTime}
            onChange={(newValue) =>
              setFormValues({ ...formValues, endTime: newValue })
            }
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </LocalizationProvider>

        {/* Buttons */}
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

export default WorkingHoursForm;