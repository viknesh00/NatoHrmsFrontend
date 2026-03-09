import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
    Box,
    Button,
    TextField,
    MenuItem,
    Typography
} from "@mui/material";
import moment from "moment";
import { postRequest, putRequest } from "../../services/Apiservice";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import { useLocation, useNavigate } from "react-router-dom";

const useStyles = makeStyles(() => ({
    rootBox: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
    },
    buttonsContainer: {
        margin: 16,
        display: "flex",
        justifyContent: "center",
        gap: 16,
    },

}));

export default function CreateJob() {

    const classes = useStyles();
    const navigate = useNavigate();
    const location = useLocation();
    const editData = location.state?.editData || null;
    const [editId, setEditId] = useState(editData?.id??null);
    const [loading, setLoading] = useState(false);
    const breadCrumb = editData
        ?  [
            { label: "Job Management", link: "/job-management" },
            { label: "Update Job Post" },
        ]
        :  [
            { label: "Job Management", link: "/job-management" },
            { label: "Create Job Post" },
        ];

       
    const defaultForm = {
        jobCode: editData?.jobCode || "",
        title: editData?.title || "",
        role: editData?.role || "",
        location: editData?.location || "",
        salary: editData?.salary || "",
        jobType: editData?.jobType || "",
        date: editData?.postedDate
            ? moment(editData.postedDate).format("YYYY-MM-DD")
            : moment().format("YYYY-MM-DD"),
        description: editData?.description || "",
        responsibilities: editData?.responsibilities.join(",") || "",
        qualifications: editData?.qualifications.join(",") || "",
    };
    const [form, setForm] = useState(defaultForm);
    
    const handleCreateJob = () => {

        const payload = {
            jobCode: form.jobCode,
            jobTitle: form.title,
            role: form.role,
            location: form.location,
            salary: form.salary,
            jobType: form.jobType,
            skills: "",
            description: form.description,
            responsibilities: form.responsibilities,
            qualifications: form.qualifications,
            postedDate: form.date
        };

        if (editId) {

            payload.jobId = editId;

            const url = `Jobs/UpdateJob`;

            putRequest(url, payload)
                .then((res) => {
                    setEditId(null);
                    setForm(defaultForm);
                    navigate("/job-management");
                    ToastSuccess("Job Updated Successfully");

                })
                .catch((err) => {
                    console.error("Update job error:", err);
                    ToastError(err.response?.data || "Job Code already exists")
                });

        }
        else {

            const url = `Jobs/CreateJob`;

            postRequest(url, payload)
                .then((res) => {
                    setForm(defaultForm);
                    navigate("/job-management");
                    ToastSuccess("Job Created Successfully")

                })
                .catch((err) => {
                    console.error("Create job error:", err);
                    ToastError(err.response?.data || "Job Code already exists")
                });

        }

    };


    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };


    const isFormValid = () => {
        return (
            form.jobCode.trim() &&
            form.title.trim() &&
            form.role.trim() &&
            form.location.trim() &&
            form.salary.trim() &&
            form.jobType.trim() &&
            form.date.trim() &&
            form.description.trim() &&
            form.responsibilities.trim() &&
            form.qualifications.trim()
        );
    };

    return (
        <Box className={classes.rootBox}>

            <LoadingMask loading={loading} />

           <Breadcrumb items={breadCrumb} />
                       <Box
                           sx={{
                               display: "flex",
                               justifyContent: "center",
                               alignItems: "center",
                               px: 3,
                               mt: 4,
                           }}
                       >
                           <Typography variant="h6" align="center">
                               {editId ? "Update Job Post" : "Create Job Post"}
                           </Typography>
                       </Box>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr 1fr",
                            gap: 2,
                            mt: 1
                        }}
                    >

                        <TextField
                            label={<span>Job Code <span style={{ color: 'red' }}>*</span></span>}
                            name="jobCode"
                            value={form.jobCode}
                            onChange={handleChange}
                            fullWidth
                        />
                        <TextField
                            label={<span>Job Title<span style={{ color: 'red' }}>*</span></span>}
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            fullWidth
                        />

                        <TextField
                            label={<span>Role <span style={{ color: 'red' }}>*</span></span>}
                            name="role"
                            value={form.role}
                            onChange={handleChange}
                            fullWidth
                        />

                        <TextField
                            label={<span>Location <span style={{ color: 'red' }}>*</span></span>}
                            name="location"
                            value={form.location}
                            onChange={handleChange}
                            fullWidth
                        />

                        <TextField
                            label={<span>Salary <span style={{ color: 'red' }}>*</span></span>}
                            name="salary"
                            value={form.salary}
                            onChange={handleChange}
                            fullWidth
                        />

                        <TextField
                            label={<span>Job Type <span style={{ color: 'red' }}>*</span></span>}
                            name="jobType"
                            select
                            value={form.jobType}
                            onChange={handleChange}
                            fullWidth
                        >
                            <MenuItem value="Full time">Full time</MenuItem>
                            <MenuItem value="Part time">Part time</MenuItem>
                            <MenuItem value="Contract">Contract</MenuItem>
                        </TextField>

                        <TextField
                            label={<span>Date Posted <span style={{ color: 'red' }}>*</span></span>}
                            type="date"
                            name="date"
                            InputLabelProps={{ shrink: true }}
                            value={form.date}
                            onChange={handleChange}
                            fullWidth
                        />

                    </Box>

                    <TextField
                        label={<span>Description <span style={{ color: 'red' }}>*</span></span>}
                        name="description"
                        multiline
                        rows={3}
                        value={form.description}
                        onChange={handleChange}
                        fullWidth
                        sx={{ mt: 2 }}
                    />

                    <TextField
                        label={<span>Key Responsibilities (comma separated) <span style={{ color: 'red' }}>*</span></span>}
                        name="responsibilities"
                        multiline
                        rows={3}
                        value={form.responsibilities}
                        onChange={handleChange}
                        fullWidth
                        sx={{ mt: 2 }}
                    />

                    <TextField
                        label={<span>Qualifications (comma separated) <span style={{ color: 'red' }}>*</span></span>}
                        name="qualifications"
                        multiline
                        rows={3}
                        value={form.qualifications}
                        onChange={handleChange}
                        fullWidth
                        sx={{ mt: 2 }}
                    />

              

                    
<Box className={classes.buttonsContainer}>
                    <Button
                        variant="contained"
                        onClick={handleCreateJob}
                        disabled={!isFormValid()}
                    >
                        {editId ? "Update Job" : "Save Job"}
                    </Button>
                    <Button 
                    variant="outlined"
                    onClick={() => navigate("/job-management")}
                    >
                        Cancel
                    </Button>
                    </Box>
        </Box>
    );
}