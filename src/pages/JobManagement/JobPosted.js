import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
    Box,
    Button,
    Card,
    CardContent,
    IconButton,
    TextField,
    Collapse,
    Chip,
    Pagination,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem
} from "@mui/material";

import moment from "moment";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, MapPin, Calendar, Banknote } from "lucide-react";
import { deleteRequest, getRequest, postRequest, putRequest } from "../../services/Apiservice";
import { ToastSuccess } from "../../services/ToastMsg";
import { getCookie } from "../../services/Cookies";
import LoadingMask from "../../services/LoadingMask";

const useStyles = makeStyles(() => ({

    topRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10
    },

    rightSection: {
        display: "flex",
        justifyContent: "flex-end",
        padding: "8px"
    },

    jobCount: {
        fontSize: "14px",
        fontWeight: 500,
        color: "#64748b",
        marginRight: "15px"
    },

    searchBox: {
        width: 320,
        background: "#fff",
        borderRadius: 8
    },

    addButton: {
        backgroundColor: "#0c4a6e",
        gap: "8px",
        textTransform: "none"
    },

    card: {
        width: "100%",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        position: "relative",
        marginBottom: 16,

        "&:hover": {
            boxShadow: "0 6px 16px rgba(0,0,0,0.08)"
        }
    },


    title: {
        fontSize: 18,

        color: "#3b49df",
        marginBottom: 10
    },

    title1: {
        fontSize: 14,

        color: "#666",
        marginBottom: 10
    },

    chipRow: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 10
    },

    iconActions: {
        position: "absolute",
        right: 8,
        top: 8,
        display: "flex",
        gap: 4
    },

    expandedBox: {
        width: "100%",
        marginTop: 14,
        borderTop: "1px solid #e2e8f0",
        paddingTop: 14
    },

    sectionTitle: {
        fontWeight: 600,
        marginTop: 10,
        color: "#334155"
    },

    paginationBox: {
        display: "flex",
        justifyContent: "center",
        marginTop: 20
    }

}));

export default function JobPosted() {

    const classes = useStyles();
    const [editId, setEditId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [openCreate, setOpenCreate] = useState(false);
    const userRole = getCookie("role");
    const isAdmin = userRole === "Admin";

    const [jobs, setJobs] = useState([]);

    const defaultForm = {
        title: "",
        role: "",
        location: "",
        salary: "",
        jobType: "",
        date: moment().format("YYYY-MM-DD"),
        description: "",
        responsibilities: "",
        qualifications: ""
    };
    const [form, setForm] = useState(defaultForm);

    const jobsPerPage = 5;

    useEffect(() => {
        getJobs();
    }, []);

    const getJobs = () => {

        const url = `Jobs/GetJobs`;

        setLoading(true);

        getRequest(url)
            .then((res) => {

                if (res.data) {

                    res.data.forEach((j) => {

                        if (j.postedDate) {
                            j.date = moment(j.postedDate).format("YYYY-MM-DD");
                        }

                        j.id = j.jobId;
                        j.title = j.jobTitle;
                        j.responsibilities = j.responsibilities
                            ? j.responsibilities.split(",")
                            : [];

                        j.qualifications = j.qualifications
                            ? j.qualifications.split(",")
                            : [];

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

    const handleCreateJob = () => {

        const payload = {
            jobTitle: form.title,
            role: form.role,
            location: form.location,
            salary: form.salary,
            jobType: form.jobType,
            skills: "",
            description: form.description,
            responsibilities: form.responsibilities,
            qualifications: form.qualifications
        };

        if (editId) {

            payload.jobId = editId;

            const url = `Jobs/UpdateJob`;

            putRequest(url, payload)
                .then((res) => {

                    getJobs();
                    setOpenCreate(false);
                    setEditId(null);
                    setForm(defaultForm);
                    ToastSuccess("Job Updated Successfully")

                })
                .catch((err) => {
                    console.error("Update job error:", err);
                });

        }
        else {

            const url = `Jobs/CreateJob`;

            postRequest(url, payload)
                .then((res) => {

                    getJobs();
                    setForm(defaultForm);
                    setOpenCreate(false);
                    ToastSuccess("Job Created Successfully")

                })
                .catch((err) => {
                    console.error("Create job error:", err);
                });

        }

    };

    const handleEdit = (job) => {

        setEditId(job.id);

        setForm({
            title: job.title,
            role: job.role,
            location: job.location,
            salary: job.salary,
            jobType: job.jobType,
            date: job.date,
            description: job.description,
            responsibilities: job.responsibilities.join(","),
            qualifications: job.qualifications.join(",")
        });

        setOpenCreate(true);

    };

    const handleDelete = (id) => {
        const url = `Jobs/DeleteJob?jobId=${id}`;
        deleteRequest(url)
            .then((res) => {
                getJobs();
                ToastSuccess("Job Removed Successfully")
            })
            .catch((err) => {
                console.error("Delete job error:", err);
            });

    };



    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const toggleExpand = (id) => {
        setExpanded(expanded === id ? null : id);
    };

    const filteredJobs = jobs.filter((job) => {
        const keyword = search.toLowerCase();

        return (
            (job.title && job.title.toLowerCase().includes(keyword)) ||
            (job.role && job.role.toLowerCase().includes(keyword)) ||
            (job.location && job.location.toLowerCase().includes(keyword)) ||
            (job.salary && job.salary.toLowerCase().includes(keyword)) ||
            (job.jobType && job.jobType.toLowerCase().includes(keyword)) ||
            (job.description && job.description.toLowerCase().includes(keyword)) ||
            (job.responsibilities && job.responsibilities.join(" ").toLowerCase().includes(keyword)) ||
            (job.qualifications && job.qualifications.join(" ").toLowerCase().includes(keyword))
        );
    });

    const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);

    const paginatedJobs = filteredJobs.slice(
        (page - 1) * jobsPerPage,
        page * jobsPerPage
    );

    const isFormValid = () => {
        return (
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
        <Box>

            <LoadingMask loading={loading} />

            {/* Top Row */}
            <Box className={classes.topRow}>

                <TextField
                    placeholder="Search jobs..."
                    size="small"
                    className={classes.searchBox}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                {isAdmin && (
                    <Button
                        variant="contained"
                        className={classes.addButton}
                        onClick={() => setOpenCreate(true)}
                    >
                        <Plus size={18} />
                        Create Job
                    </Button>
                )}

            </Box>

            {/* Job Count */}
            <Box className={classes.rightSection}>
                <div className={classes.jobCount}>
                    Jobs Posted ({filteredJobs.length})
                </div>
            </Box>

            {/* Job Cards */}
            <Box>

                {paginatedJobs.map((job) => (

                    <Card key={job.id} className={classes.card}>

                        <CardContent>

                            <Box className={classes.iconActions}>

                                <IconButton onClick={() => toggleExpand(job.id)}>
                                    {expanded === job.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </IconButton>

                                <IconButton onClick={() => handleEdit(job)}>
                                    <Pencil size={18} />
                                </IconButton>

                                <IconButton onClick={() => handleDelete(job.id)}>
                                    <Trash2 size={18} color="#dc2626" />
                                </IconButton>

                            </Box>

                            <div className={classes.title}>
                                {job.title}
                            </div>
                            <div className={classes.title1}>
                                {job.role}
                            </div>

                            <Box className={classes.chipRow}>
                                <Chip icon={<MapPin size={14} />} label={job.location} />
                                <Chip icon={<Banknote size={14} />} label={job.salary} />
                                <Chip
                                    icon={<Calendar size={14} />}
                                    label={moment(job.date).format("DD MMM YYYY")}
                                />
                            </Box>

                            <Collapse in={expanded === job.id}>

                                <Box className={classes.expandedBox}>

                                    <div className={classes.sectionTitle}>
                                        Description
                                    </div>

                                    <div>{job.description}</div>

                                    <div className={classes.sectionTitle}>
                                        Key Responsibilities
                                    </div>

                                    <ul>
                                        {job.responsibilities.map((r, i) => (
                                            <li key={i}>{r}</li>
                                        ))}
                                    </ul>

                                    <div className={classes.sectionTitle}>
                                        Qualifications
                                    </div>

                                    <ul>
                                        {job.qualifications.map((q, i) => (
                                            <li key={i}>{q}</li>
                                        ))}
                                    </ul>

                                </Box>

                            </Collapse>

                        </CardContent>

                    </Card>

                ))}

            </Box>

            {/* Pagination */}
            <Box className={classes.paginationBox}>

                <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(e, value) => setPage(value)}
                    color="primary"
                />

            </Box>

            {/* Create Job Modal */}

            <Dialog
                open={openCreate}
                onClose={() => {
                    setOpenCreate(false);
                    setEditId(null);
                    setForm(defaultForm);
                }}
                fullWidth
                maxWidth="md"
            >

                <DialogTitle>
                    {editId ? "Update Job" : "Create Job"}
                </DialogTitle>

                <DialogContent>

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 2,
                            mt: 1
                        }}
                    >

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
                            <MenuItem value="Fulltime">Fulltime</MenuItem>
                            <MenuItem value="Parttime">Parttime</MenuItem>
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

                </DialogContent>

                <DialogActions>

                    <Button onClick={() => {
                        setForm(defaultForm);
                        setEditId(null);
                        setOpenCreate(false);
                    }}>
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleCreateJob}
                        disabled={!isFormValid()}
                    >
                        {editId ? "Update Job" : "Save Job"}
                    </Button>

                </DialogActions>

            </Dialog>

        </Box>
    );
}