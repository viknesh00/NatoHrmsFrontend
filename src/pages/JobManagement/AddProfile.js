import React, { useEffect, useRef, useState } from "react";

import { makeStyles } from "@material-ui/core/styles";
import Box from "@mui/material/Box";
import { IconButton, Button } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PreviewIcon from "@mui/icons-material/Visibility";
import { useNavigate } from "react-router-dom";
import { getRequest, postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import { Autocomplete, TextField, Typography } from "@mui/material";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import Breadcrumb from "../../services/Breadcrumb";


const useStyles = makeStyles(() => ({
    rootBox: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
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
    uploadBox: {
        marginTop: 8,
        border: "2px dashed #aaa",
        borderRadius: 8,
        padding: 60,
        textAlign: "center",
        cursor: "pointer",
        background: "#fafafa",
    },
    fileRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 8,
    },
    buttonsContainer: {
        margin: 16,
        display: "flex",
        justifyContent: "center",
        gap: 16,
    },
}));

export default function AddProfile() {
    const classes = useStyles();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [jobs, setJobs] = useState([]);
    const [uploadedFile, setUploadedFile] = useState(null);
    const breadCrumb =
        [
            { label: "Job Management", link: "/job-management" },
            { label: "Add Profile" },
        ];
    const defaultForm = {
        jobId: null,      // new field
        jobCode: "",
        title: "",
        role: "",
        location: "",
        salary: "",
        jobType: "",
        firstName: "",
        lastName: "",
        candidateStatus: "",
        email: "",
        phone: "",
        skill: "",
    };
    const [form, setForm] = useState(defaultForm);
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
        getJobs();
        calledOnce.current = true;
    }, []);

    // ================= API FUNCTIONS =================

    const getJobs = () => {

        const url = `Jobs/GetJobs`;

        setLoading(true);

        getRequest(url)
            .then((res) => {

                if (res.data) {

                    res.data.forEach((j) => {
                        j.id = j.jobId;
                        j.title = j.jobTitle;
                    });

                    setJobs(res.data);
                    setLoading(false);

                }

            })
            .catch((err) => {
                setLoading(false);
                console.error("Jobs error:", err);
            });

    };

    // ================= HANDLERS =================

    const handleSaveProfile = () => {
        if (!form.jobCode || !form.firstName ||
            !form.email || !form.firstName ||
            !form.lastName || !form.phone ||
            !form.skill || !uploadedFile) {
            ToastError("Please fill all required fields and upload a file");
            return;
        }

        // build FormData for file upload
        const payload = new FormData();

        payload.append("JobId", form.jobId);
        payload.append("FirstName", form.firstName);
        payload.append("LastName", form.lastName);
        payload.append("Email", form.email);
        payload.append("Phone", form.phone || "");
        payload.append("Skills", form.skill || "");
        payload.append("ResumeFileName", uploadedFile?.name || "");
        payload.append("ResumeFileType", uploadedFile?.type || "");
        payload.append("CandidateStatus", form.candidateStatus || "New");

        if (uploadedFile) payload.append("Resume", uploadedFile); // actual file

        const url = "Jobs/AddApplication";
        setLoading(true);
        postRequest(url, payload, {
            headers: { "Content-Type": "multipart/form-data" },
        })
            .then(res => {
                ToastSuccess("Profile added successfully");
                setForm(defaultForm);
                setUploadedFile(null);
                navigate("/job-management", { state: { tab: "jobApplied" } });
            })
            .catch(err => {
                ToastError("This Profile is already applied for this job");
                console.error(err);
            })
            .finally(() => setLoading(false));
    };

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleFileSelect = (file) => {
        if (!file) return;
        setUploadedFile(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        handleFileSelect(e.dataTransfer.files[0]);
    };

    const removeFile = () => {
        setUploadedFile(null);
    };

    const previewNewFile = () => {
        const fileURL = URL.createObjectURL(uploadedFile);
        window.open(fileURL, "_blank");
    };

    return (
        <Box className={classes.rootBox} >
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
                    Add New Profile
                </Typography>
            </Box>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 2,
                    mt: 1
                }}
            >

                <Autocomplete
                    options={jobs || []}
                    getOptionLabel={(option) => option.jobCode || ""}
                    value={jobs.find(j => j.jobCode === form.jobCode) || null}
                    onChange={(event, newValue) => {

                        if (newValue) {
                            setForm({
                                jobId: newValue.jobId,
                                jobCode: newValue.jobCode,
                                title: newValue.jobTitle,
                                role: newValue.role,
                                location: newValue.location,
                                salary: newValue.salary,
                                jobType: newValue.jobType
                            });
                        } else {
                            setForm(defaultForm);
                        }

                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label={
                                <span>
                                    Job Code <span style={{ color: "red" }}>*</span>
                                </span>
                            }
                            variant="outlined"
                            fullWidth
                        />
                    )}
                />
                <TextField label="Job Title" value={form.title} fullWidth disabled />
                <TextField label="Role" value={form.role} fullWidth disabled />
                <TextField label="Location" value={form.location} fullWidth disabled />
                <TextField label="Salary" value={form.salary} fullWidth disabled />
                <TextField label="Job Type" value={form.jobType} fullWidth disabled />

                <TextField
                    label={
                        <span>
                            First Name <span style={{ color: "red" }}>*</span>
                        </span>
                    }
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    fullWidth
                />

                <TextField
                    label={
                        <span>
                            Last Name <span style={{ color: "red" }}>*</span>
                        </span>
                    }
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    fullWidth
                />

                <TextField
                    label={
                        <span>
                            Email <span style={{ color: "red" }}>*</span>
                        </span>
                    }
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    fullWidth
                />

                <TextField
                    label={
                        <span>
                            Phone Number <span style={{ color: "red" }}>*</span>
                        </span>
                    }
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    fullWidth
                />
                <TextField
                    label={
                        <span>
                            Primary Skill Set <span style={{ color: "red" }}>*</span>
                        </span>
                    }
                    name="skill"
                    value={form.skill}
                    onChange={handleChange}
                    fullWidth
                />
                <Autocomplete
                    options={statusOptions}
                    getOptionLabel={(option) => option.label}
                    value={
                        statusOptions.find(
                            (s) => s.value === form.candidateStatus
                        ) || null
                    }
                    onChange={(event, newValue) => {
                        setForm({
                            ...form,
                            candidateStatus: newValue ? newValue.value : ""
                        });
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
            <Box
                className={classes.uploadBox}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => document.getElementById("fileInput").click()}
            >
                <Typography variant="body2">
                    Drag & drop document here or click to upload <span style={{ color: 'red' }}>*</span>
                </Typography>
                <input
                    id="fileInput"
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                />
            </Box>
            {/* ---------- NEW FILE ---------- */}
            {uploadedFile && (
                <Box className={classes.fileRow}>
                    <Typography variant="body2">{uploadedFile.name}</Typography>
                    <Box>
                        <IconButton onClick={previewNewFile}>
                            <PreviewIcon />
                        </IconButton>
                        <IconButton onClick={removeFile}>
                            <DeleteIcon />
                        </IconButton>
                    </Box>
                </Box>
            )}

            <Box className={classes.buttonsContainer}>


                <Button
                    variant="contained"
                    onClick={handleSaveProfile}
                >
                    Save Profile
                </Button>
                <Button
                    variant="outlined"
                    onClick={() => {
                        setForm(defaultForm);
                        setUploadedFile(null);   // clear file
                        navigate("/job-management", { state: { tab: "jobApplied" } });
                    }}>
                    Cancel
                </Button>
            </Box>

        </Box>
    );
}
