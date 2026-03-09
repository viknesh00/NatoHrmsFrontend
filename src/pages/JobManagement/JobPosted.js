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
    Tooltip
} from "@mui/material";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import moment from "moment";
import { Plus, Pencil, Trash2, ChevronDown, Hash, Download, ChevronUp, MapPin, Calendar, Banknote } from "lucide-react";
import { deleteRequest, getRequest, } from "../../services/Apiservice";
import { ToastSuccess } from "../../services/ToastMsg";
import { getCookie } from "../../services/Cookies";
import LoadingMask from "../../services/LoadingMask";
import { useNavigate } from "react-router-dom";

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
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const userRole = getCookie("role");
    const isAdmin = userRole === "Admin";

    const [jobs, setJobs] = useState([]);

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

    const downloadExcel = () => {

        const exportData = jobs.map(j => ({
            "Job Code": j.jobCode,
            "Job Title": j.title,
            "Role": j.role,
            "Location": j.location,
            "Salary": j.salary,
            "Job Type": j.jobType,
            "Posted Date": moment(j.date).format("DD-MM-YYYY"),
            "Description": j.description,
            "Responsibilities": j.responsibilities.join(", "),
            "Qualifications": j.qualifications.join(", ")
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, "Jobs");

        const excelBuffer = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array"
        });

        const data = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

        saveAs(data, "Jobs.xlsx");
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

    const toggleExpand = (id) => {
        setExpanded(expanded === id ? null : id);
    };

    const filteredJobs = jobs.filter((job) => {
        const keyword = search.toLowerCase();

        return (
            (job.jobCode && job.jobCode.toLowerCase().includes(keyword)) ||
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
                        onClick={() => navigate("/job-management/create-job")}
                    >
                        <Plus size={18} />
                        Create Job
                    </Button>
                )}

            </Box>

            {/* Job Count */}
            <Box className={classes.rightSection} style={{ alignItems: "center", gap: "10px" }}>

                <div className={classes.jobCount}>
                    Jobs Posted ({filteredJobs.length})
                </div>
                <Tooltip title="Download Excel" arrow placement="bottom">
                <IconButton onClick={downloadExcel}>
                    <Download size={20} />
                </IconButton>
                </Tooltip>

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

                                {isAdmin && (
                                    <>
                                        <IconButton 
                                        onClick={() =>
                                navigate("/job-management/update-job", {
                                    state: { editData: job },
                                })
                            }>
                                            <Pencil size={18} />
                                        </IconButton>

                                        <IconButton onClick={() => handleDelete(job.id)}>
                                            <Trash2 size={18} color="#dc2626" />
                                        </IconButton>
                                    </>
                                )}

                            </Box>

                            <div className={classes.title}>
                                {job.title}
                            </div>
                            <div className={classes.title1}>
                                {job.role}
                            </div>

                            <Box className={classes.chipRow}>
                                <Chip icon={<Hash size={14} />} label={job.jobCode} />
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
        </Box>
    );
}