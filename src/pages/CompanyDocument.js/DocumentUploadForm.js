import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Box,
    TextField,
    Button,
    Typography,
    IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PreviewIcon from "@mui/icons-material/Visibility";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { makeStyles } from "@mui/styles";
import Autocomplete from "@mui/material/Autocomplete";
import { getRequest, postRequest } from "../../services/Apiservice";
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
        display: "flex",
        flexDirection: "column",
        gap: 20,
    },
    uploadBox: {
        border: "2px dashed #aaa",
        borderRadius: 8,
        padding: 20,
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
        display: "flex",
        justifyContent: "center",
        gap: 16,
    },
});

const yesNoOptions = [
    { label: "Yes", value: true },
    { label: "No", value: false },
];

const DocumentUploadForm = () => {
    const classes = useStyles();
    const navigate = useNavigate();
    const location = useLocation();
    const editData = location.state?.editData || null;

    const breadCrumb = editData
        ? [
            { label: "Company Document", link: "/company-documents" },
            { label: "Edit Document" },
        ]
        : [
            { label: "Company Document", link: "/company-documents" },
            { label: "Upload Document" },
        ];

    const [loading, setLoading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [removedExistingFile, setRemovedExistingFile] = useState(false);
    const [peopleOptions, setPeopleOptions] = useState([]);

    const [formValues, setFormValues] = useState({
        id: editData?.id ?? null,
        documentName: editData?.documentName || "",
        tags: editData?.tags || "",
        assignedPeople: editData?.assignedPeople
            ? editData.assignedPeople.split(",").map(e => ({ label: e, value: e }))
            : [],
        reviewDate: editData?.reviewDate
            ? new Date(editData.reviewDate)
            : null,
        isCurrent:
            editData?.isCurrent != null
                ? { label: editData.isCurrent ? "Yes" : "No", value: editData.isCurrent }
                : null,
        hasExistingFile: !!editData?.id,
        fileName: editData?.fileName || "",
    });

    useEffect(() => {
        getUsers();
    }, []);

    const getUsers = () => {
        const url = `User/All`;
        setLoading(true);
        getRequest(url)
            .then((res) => {
                if (res.data) {

                    // Map emails
                    const emails = res.data.map((user) => ({
                        label: user.email,
                        value: user.email,
                    }));

                    // Sort ascending (A–Z)
                    emails.sort((a, b) =>
                        a.label.localeCompare(b.label)
                    );

                    // Add "All" as first option
                    const optionsWithAll = [
                        { label: "All", value: "ALL" },
                        ...emails
                    ];

                    setPeopleOptions(optionsWithAll);
                }
            })
            .finally(() => setLoading(false));
    };

    /* ---------- FILE HANDLERS ---------- */
    const handleFileSelect = (file) => {
        if (!file) return;
        setUploadedFile(file);
        setRemovedExistingFile(true);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        handleFileSelect(e.dataTransfer.files[0]);
    };

    const previewNewFile = () => {
        const fileURL = URL.createObjectURL(uploadedFile);
        window.open(fileURL, "_blank");
    };

    const previewExistingFile = async () => {
        try {
            setLoading(true);

            const response = await getRequest(
                `CompanyDocument/Preview/${formValues.id}`,
                {},
                true   // 🔥 THIS FIXES IT
            );

            const fileURL = URL.createObjectURL(response.data);
            window.open(fileURL, "_blank");

        } catch (error) {
            console.error("Preview failed:", error);
        } finally {
            setLoading(false);
        }
    };




    const removeFile = () => {
        setUploadedFile(null);
        setRemovedExistingFile(true);
    };

    /* ---------- SAVE / UPDATE ---------- */
    const handleSave = () => {
        const formData = new FormData();

        formData.append("id", formValues.id ?? "");
        formData.append("documentName", formValues.documentName ?? "");
        formData.append(
            "tags",
            formValues.tags
                ?.split(",")
                .map(t => t.trim())
                .filter(Boolean)
                .join(",") ?? ""
        );
        formData.append(
            "assignedPeople",
            Array.isArray(formValues.assignedPeople)
                ? formValues.assignedPeople.map(p => p.value).join(",")
                : ""
        );
        formData.append(
            "reviewDate",
            formValues.reviewDate
                ? formValues.reviewDate.toISOString().split("T")[0]
                : ""
        );
        formData.append("isCurrent", formValues.isCurrent?.value ? "true" : "false");
        if (removedExistingFile) {
            formData.append("removeExistingFile", "true");
        }


        if (uploadedFile) {
            formData.append("document", uploadedFile);
        }

        setLoading(true);

        postRequest("CompanyDocument/SaveDocument", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        })
            .then((res) => {
                if (res.data) {
                    ToastSuccess("Uploaded Successfully");
                    navigate("/company-documents");
                }
            })
            .finally(() => setLoading(false));
    };

    return (
        <Box className={classes.rootBox}>
            <LoadingMask loading={loading} />
            <Breadcrumb items={breadCrumb} />

            <Box className={classes.container}>
                <Typography variant="h6" align="center">
                    {editData ? "Edit Company Document" : "Create Company Document"}
                </Typography>

                <TextField
                    label="Document Name"
                    value={formValues.documentName}
                    onChange={(e) =>
                        setFormValues({ ...formValues, documentName: e.target.value })
                    }
                    fullWidth
                />

                <TextField
                    label="Tags (comma separated)"
                    value={formValues.tags}
                    onChange={(e) =>
                        setFormValues({ ...formValues, tags: e.target.value })
                    }
                    fullWidth
                />

                <Autocomplete
                    multiple
                    options={peopleOptions}
                    getOptionLabel={(o) => o.label}
                    value={formValues.assignedPeople}
                    onChange={(event, newValue) => {

                        const isAllSelected = newValue.some(v => v.value === "ALL");

                        if (isAllSelected) {
                            // If "All" is selected, make it the only value
                            setFormValues({
                                ...formValues,
                                assignedPeople: [{ label: "All", value: "ALL" }]
                            });
                        } else {
                            // Remove "All" if previously selected
                            const filteredValues = newValue.filter(v => v.value !== "ALL");

                            setFormValues({
                                ...formValues,
                                assignedPeople: filteredValues
                            });
                        }
                    }}
                    // Disable other options when "All" is selected
                    getOptionDisabled={(option) =>
                        formValues.assignedPeople.some(v => v.value === "ALL") &&
                        option.value !== "ALL"
                    }
                    renderInput={(params) => (
                        <TextField {...params} label="Assign People" />
                    )}
                />


                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                        label="Review Date"
                        value={formValues.reviewDate}
                        onChange={(v) =>
                            setFormValues({ ...formValues, reviewDate: v })
                        }
                        renderInput={(params) => (
                            <TextField {...params} fullWidth />
                        )}
                    />
                </LocalizationProvider>

                <Autocomplete
                    options={yesNoOptions}
                    getOptionLabel={(o) => o.label}
                    value={formValues.isCurrent}
                    onChange={(e, v) =>
                        setFormValues({ ...formValues, isCurrent: v })
                    }
                    renderInput={(params) => (
                        <TextField {...params} label="Current" />
                    )}
                />

                {/* ---------- UPLOAD ---------- */}
                <Box
                    className={classes.uploadBox}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("fileInput").click()}
                >
                    <Typography variant="body2">
                        Drag & drop document here or click to upload
                    </Typography>
                    <input
                        id="fileInput"
                        type="file"
                        hidden
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
                        onChange={(e) => handleFileSelect(e.target.files[0])}
                    />
                </Box>

                {/* ---------- EXISTING FILE ---------- */}
                {editData && !removedExistingFile && !uploadedFile && (
                    <Box className={classes.fileRow}>
                        <Typography variant="body2">
                            {formValues.fileName || "Existing document"}
                        </Typography>
                        <Box>
                            <IconButton onClick={previewExistingFile}>
                                <PreviewIcon />
                            </IconButton>
                            <IconButton onClick={removeFile}>
                                <DeleteIcon />
                            </IconButton>
                        </Box>
                    </Box>
                )}

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
                    <Button variant="contained" onClick={handleSave}>
                        {editData ? "Update" : "Save"}
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => navigate("/company-documents")}
                    >
                        Cancel
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default DocumentUploadForm;
