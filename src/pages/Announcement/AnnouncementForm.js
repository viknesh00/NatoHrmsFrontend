import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, TextField, Button, Typography } from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
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
    justifyContent: "center", // center buttons
    gap: 16,
    marginTop: 16,
  },
});

const AnnouncementForm = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData || null;
  const breadCrumb = !editData ? [{ label: "Announcement", link: "/announcement" }, { label: "Create-Announcement" }] : [{ label: "Announcement", link: "/announcement" }, { label: "Edit-Announcement" }];
  const [loading, setLoading] = useState(false);
  const initialDate = editData?.announcementDate
  ? parse(editData.announcementDate, "dd/MM/yyyy", new Date())
  : null;
  const [formValues, setFormValues] = useState({
    id: editData?.id ?? null,
    announcementdate: initialDate,
    description: editData?.description || "",
    department: editData?.department
      ? { label: editData.department, value: editData.department }
      : null,
    isActive: editData?.isActive != null
    ? { label: editData.isActive ? "Active" : "Inactive", value: editData.isActive }
    : null,
  });

  const departmentOptions = [
    { label: "HR", value: "HR" },
    { label: "Management", value: "Management" },
    { label: "IT", value: "IT" },
    { label: "All", value: "All" },
  ];

  const statusOptions = [
    { label: "Active", value: true },
    { label: "Inactive", value: false },
  ];

  const handleSave = () => {
    const saveData = {
      ...formValues,
      id:formValues.id,
      announcementdate: formValues.announcementdate ? format(formValues.announcementdate, "yyyy-MM-dd") : null,
      department: formValues.department?.value || "",
      isActive: formValues.isActive?.value ?? true,
    };
    const url = `Announcement/SaveAnnouncement`;
    setLoading(true);
    postRequest(url, saveData)
      .then((res) => {
        if (res.status === 200) {
          console.log("Saved data:", saveData);
          ToastSuccess(res.data.message)
          navigate("/announcement");
        }
      })
      .catch((err) => {
        setLoading(false);
        console.error("Login error:", err);
      });
  };

  const handleCancel = () => navigate("/announcement");

  return (
    <Box className={classes.rootBox}>
      <LoadingMask loading={loading} />
      <Breadcrumb items={breadCrumb} />
      <Box className={classes.container}>
        <Typography variant="h6" className={classes.title}>
          {editData ? "Edit Announcement" : "Create Announcement"}
        </Typography>

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Announcement Date"
            value={formValues.announcementdate}
            onChange={(newValue) => setFormValues({ ...formValues, announcementdate: newValue })}
            format="dd/MM/yyyy"
            renderInput={(params) => <TextField fullWidth {...params} />}
          />
        </LocalizationProvider>

        <TextField
          label="Description"
          value={formValues.description}
          onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
          fullWidth
        />

        {/* Department as Autocomplete */}
        <Autocomplete
          fullWidth
          options={departmentOptions}
          getOptionLabel={(option) => option.label || ""}
          value={formValues.department}
          onChange={(event, newValue) =>
            setFormValues({ ...formValues, department: newValue })
          }
          renderInput={(params) => <TextField {...params} label="Department" />}
        />

        {/* Status only on edit */}
        {editData && (
          <Autocomplete
            fullWidth
            options={statusOptions}
            getOptionLabel={(option) => option.label || ""}
            value={formValues.isActive}
            onChange={(event, newValue) =>
              setFormValues({ ...formValues, isActive: newValue })
            }
            renderInput={(params) => <TextField {...params} label="Status" />}
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

export default AnnouncementForm;
