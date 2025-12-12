import React, { useEffect, useState } from "react";
import MUIDataTable from "mui-datatables";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { getRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";

const getMuiTheme = () =>
    createTheme({
        components: {
            MUIDataTableHeadCell: {
                styleOverrides: {
                    data: {
                        textTransform: "none !important",
                    },
                    root: {
                        textTransform: "none !important",
                    },
                },
            },
            MUIDataTableViewCol: {
                styleOverrides: {
                    root: {
                        padding: "8px 12px !important",
                    },
                    label: {
                        textTransform: "none !important",
                    },
                },
            },
        },
    });

const useStyles = makeStyles((theme) => ({
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
    statusActive: {
        color: "#0a9949",
        fontWeight: 500,
    },
    statusInactive: {
        color: "#d32f2f",
        fontWeight: 500,
    },
    blinkText: {
        color: "red",
        fontWeight: "bold",
        marginLeft: 8,
        animation: "$blink 1s step-start infinite",
    },
    "@keyframes blink": {
        "50%": {
            opacity: 0,
        },
    },
}));

export default function WorkingHours() {
    const classes = useStyles();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [departmentTimeList, setDepartmentTimeList] = useState([]);
    useEffect(() => {
        getDepartmentTiming();
    }, []);

    const getDepartmentTiming = () => {
        const url = `Attendance/GetAllDepartments`;
        setLoading(true);
        getRequest(url)
            .then((res) => {
                if (res.data) {
                   
                    setDepartmentTimeList(res.data);
                    setLoading(false);
                }
            })
            .catch((err) => {
                setLoading(false);
                console.error("Login error:", err);
            });
    };


    const handleEdit = (rowData) => {
        navigate("/attendance/edit-working-hours", { state: { editData: rowData } });
    };

    const columns = [
        { name: "deptId", label: "Department ID" },
        { name: "departmentName", label: "Department Name" },
        { name: "startTime", label: "Start Time" },
        { name: "endTime", label: "End Time" },
        {
            name: "actions",
            label: "Actions",
            options: {
                filter: false,
                sort: false,
                empty: true,
                customBodyRender: (value, tableMeta) => {
                    const rowData = departmentTimeList[tableMeta.rowIndex];
                    return (
                        <IconButton onClick={() => handleEdit(rowData)}>
                            <Pencil size={20} />
                        </IconButton>
                    );
                },
            },
        },
    ];


    const options = {
        customToolbarSelect: () => { },
        selectToolbarPlacement: "above",
        selectableRows: "none",
        download: true,
        print: false,
        search: true,
        filter: true,
        viewColumns: true,
        rowsPerPage: 5,
        rowsPerPageOptions: [5, 10, 20],
    };

    return (
        <Box className={classes.rootBox}>
            <LoadingMask loading={loading} />
            <Box className="reportstablehead">
                <ThemeProvider theme={getMuiTheme()}>
                    <MUIDataTable
                        title={"Announcement List"}
                        className={classes.tableBody}
                        data={departmentTimeList}
                        columns={columns}
                        options={options}
                    />
                </ThemeProvider>
            </Box>
        </Box>
    );
}
