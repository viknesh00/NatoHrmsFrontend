import React, { useEffect, useState } from "react";
import MUIDataTable from "mui-datatables";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { makeStyles } from "@material-ui/core/styles";
import Box from "@mui/material/Box";
import moment from "moment";
import IconButton from "@mui/material/IconButton";
import { Pencil, Plus } from "lucide-react";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, RadioGroup, FormControlLabel, Radio } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getRequest, postRequest } from "../../services/Apiservice";
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
    cursor: "pointer",
  },
  statusInactive: {
    color: "#d32f2f",
    fontWeight: 500,
    cursor: "pointer",
  },
}));

export default function Employees() {
  const classes = useStyles();
  const navigate = useNavigate();
  const [employeeList, setEmployeeList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);

  useEffect(() => {
    getUsers();
  }, []);

  const getUsers = () => {
    const url = `User/All`;
    setLoading(true);
    getRequest(url)
      .then((res) => {
        if (res.data) {
          res.data.forEach((d) => {
            if (d.lastLoginAt) {
              d.lastLoginAt = moment(d.lastLoginAt).format("DD/MM/YYYY");
            }
          });
          setEmployeeList(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        setLoading(false);
        console.error("Login error:", err);
      });
  };

  const getUserByEmail = (email) => {
    navigate(`/employees/edit-employee/${email}`);
  };

  const handleAddEmployee = () => navigate("/employees/add-employee");

  const handleStatusClick = (rowIndex, currentValue) => {
    const row = employeeList[rowIndex];
    setSelectedStatus(currentValue);
    setSelectedUserName(row.email); 
    setOpenStatusDialog(true);
  };

  const handleSaveStatus = () => {
    let data = {
      userName: selectedUserName,
      isActive: selectedStatus
    }
    const url = `User/UpdateUserStaus`;
    setLoading(true);
    postRequest(url, data)
      .then((res) => {
        if (res.status === 200) {

          ToastSuccess(res.data.message)
          setLoading(false);
          getUsers(); 
        }
      })
      .catch((err) => {
        setLoading(false);
        console.error("Login error:", err);
        ToastError(err.response?.data?.message || "Failed to update status");
      });

    setOpenStatusDialog(false);
  };

  const columns = [
    { name: "userId", label: "ID", options: { display: false } },
    { name: "firstName", label: "First Name" },
    { name: "lastName", label: "Last Name" },
    { name: "email", label: "Email" },
    { name: "department", label: "Department" },
    { name: "accessRole", label: "Role" },
    { name: "lastLoginAt", label: "Last Login" },

    // ---- UPDATED STATUS COLUMN ----
    {
      name: "isActive",
      label: "Status",
      options: {
        customBodyRenderLite: (dataIndex) => {
          const value = employeeList[dataIndex]?.isActive;
          const statusText = value ? "Active" : "Inactive";
          const statusClass = value ? classes.statusActive : classes.statusInactive;

          return (
            <span
              className={statusClass}
              onClick={() => handleStatusClick(dataIndex, value)}
            >
              {statusText}
            </span>
          );
        },
      },
    },

    {
      name: "actions",
      label: "Actions",
      options: {
        filter: false,
        sort: false,
        empty: true,
        customBodyRenderLite: (dataIndex) => {
          const row = employeeList[dataIndex];
          return (
            <>
              <IconButton onClick={() => getUserByEmail(row.email)}>
                <Pencil size={20} />
              </IconButton>
            </>
          );
        },
      },
    },
  ];

  const options = {
    customToolbarSelect: () => { },
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

      <Box className={classes.addButtonContainer}>
        <Button
          variant="contained"
          onClick={handleAddEmployee}
          className={classes.addButton}
        >
          <Plus size={20} /> Add Employee
        </Button>
      </Box>

      <Box className="reportstablehead">
        <ThemeProvider theme={getMuiTheme()}>
          <MUIDataTable
            title={"Employee List"}
            className={classes.tableBody}
            data={employeeList}
            columns={columns}
            options={options}
          />
        </ThemeProvider>
      </Box>

      {/* ---- STATUS CHANGE DIALOG ---- */}
      <Dialog open={openStatusDialog} onClose={() => setOpenStatusDialog(false)}>
        <DialogTitle>
          Are you sure you want to change the status?
        </DialogTitle>

        <DialogContent dividers>
          <Box mb={2}>
            <strong>Status:</strong> 
          </Box>

          <RadioGroup
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value === "true")}
          >
            <Box display="flex" alignItems="center" gap={2}>
              <FormControlLabel value={true} control={<Radio />} label="Active" />
              <FormControlLabel value={false} control={<Radio />} label="Inactive" />
            </Box>

          </RadioGroup>
        </DialogContent>

        <DialogActions>
          <Button variant="outlined" onClick={() => setOpenStatusDialog(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSaveStatus}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
