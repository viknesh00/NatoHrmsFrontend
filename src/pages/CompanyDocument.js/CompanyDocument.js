import React, { useEffect, useState } from "react";
import MUIDataTable from "mui-datatables";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@mui/material/Box";
import { IconButton, Tooltip, Button } from "@mui/material";
import { Pencil, Plus, Download, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { getRequest, postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import { getCookie } from "../../services/Cookies";

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

export default function CompanyDocument() {
    const classes = useStyles();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [documents, setDocuments] = useState([]);
    const [selectedRowsData, setSelectedRowsData] = useState([]);
    const userRole = getCookie("role");
    const isAdminOrManager = userRole === "Admin" || userRole === "Manager";

    useEffect(() => {
        getCompanyDocuments();
    }, []);

    // ================= API FUNCTIONS =================

    const getCompanyDocuments = () => {
        setLoading(true);
        getRequest("CompanyDocument/GetAll")
            .then((res) => {
                setDocuments(res.data || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };

    const downloadSingle = (id, fileName) => {
        setLoading(true);

        getRequest(`CompanyDocument/Download/${id}`, null, true)
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
                getCompanyDocuments();
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

        postRequest("CompanyDocument/DownloadMultiple", ids.split(","), true)
            .then((res) => {
                const blob = new Blob([res.data], {
                    type: "application/zip",
                });

                const url = window.URL.createObjectURL(blob);
                const link = document.createElement("a");

                link.href = url;
                link.setAttribute(
                    "download",
                    `CompanyDocuments_${new Date().getTime()}.zip`
                );

                document.body.appendChild(link);
                link.click();

                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                getCompanyDocuments();
                setSelectedRowsData([]);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };


    const deleteDocuments = (idsArray) => {

    };


    // ================= HANDLERS =================

    const handleDownload = (selectedDocs) => {
        if (!selectedDocs || selectedDocs.length === 0) return;

        if (selectedDocs.length === 1) {
            const doc = selectedDocs[0];
            downloadSingle(doc.id, doc.fileName);
        } else {
            const ids = selectedDocs.map(d => d.id).join(",");
            downloadMultiple(ids);
        }
    };


    const handleDelete = (selectedDocs) => {
        if (!selectedDocs || selectedDocs.length === 0) return;

        const ids = selectedDocs.map(d => d.id);

        setLoading(true);

        postRequest("CompanyDocument/Delete", ids)
            .then(() => {
                getCompanyDocuments();
                setSelectedRowsData([]);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };


    // ================= TABLE =================

    const columns = [
        { name: "documentName", label: "Name" },
        {
            name: "lastUpdated",
            label: "Last Updated",
            options: {
                customBodyRender: (v) =>
                    v ? moment(v).format("DD/MM/YYYY") : "-",
            },
        },
        {
            name: "tags",
            label: "Tags",
            options: {
                customBodyRender: (v) => v || "-",
            },
        },
        { name: "assignedCount", label: "# Assigned" },
        { name: "readCount", label: "# Read" },
        {
            name: "reviewDate",
            label: "Review Date",
            options: {
                customBodyRender: (v) =>
                    v ? moment(v).format("DD/MM/YYYY") : "-",
            },
        },
        {
            name: "isCurrent",
            label: "Current",
            options: {
                customBodyRender: (v) => (v ? "Yes" : "No"),
            },
        },
        {
            name: "actions",
            label: "Actions",
            options: {
                display: (isAdminOrManager ? true : "excluded"),
                sort: false,
                filter: false,
                customBodyRenderLite: (index) => {
                    const row = documents[index];
                    return (
                        <IconButton
                            onClick={() =>
                                navigate("/company-documents/edit", {
                                    state: { editData: row },
                                })
                            }
                        >
                            <Pencil size={18} />
                        </IconButton>
                    );
                },
            },
        },
    ];

    const custom = () => {
        return (
            <>
                <Tooltip title="Download">
                    <IconButton onClick={() => handleDownload(selectedRowsData)} className="tss-10rusft-MUIDataTableToolbar-icon">
                        <Download size={20} />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Delete">
                    <IconButton onClick={() => handleDelete(selectedRowsData)} className="tss-10rusft-MUIDataTableToolbar-icon">
                        <Trash2 size={20} />
                    </IconButton>
                </Tooltip>
            </>
        );
    };

    const options = {
        customToolbarSelect: () => { },
        selectToolbarPlacement: "none",
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
            const selectedData = rowsSelected.map(index => documents[index]);
            console.log(selectedData)
            setSelectedRowsData(selectedData);

        },
    };

    return (
        <Box className={classes.rootBox}>
            <LoadingMask loading={loading} />
            <Breadcrumb items={[{ label: "Company Document" }]} />

            {isAdminOrManager && (
                <Box className={classes.addButtonContainer}>
                    <Button
                        variant="contained"
                        className={classes.addButton}
                        onClick={() => navigate("/company-documents/upload")}
                    >
                        <Plus size={20} /> Upload Document
                    </Button>
                </Box>
            )}
            <Box className="reportstablehead">
                <ThemeProvider theme={getMuiTheme()}>
                    <MUIDataTable
                        title="Company Documents"
                        data={documents}
                        className={classes.tableBody}
                        columns={columns}
                        options={options}
                    />
                </ThemeProvider>
            </Box>
        </Box>
    );
}
