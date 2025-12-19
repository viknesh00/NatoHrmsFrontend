import React, { useEffect, useState } from "react";
import { Box, TextField, Button, Typography } from "@mui/material";
import { makeStyles } from "@material-ui/core/styles";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useNavigate } from "react-router-dom";
import Autocomplete from "@mui/material/Autocomplete";
import { FileText, RefreshCw } from "lucide-react";
import { getRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import moment from "moment";
import Breadcrumb from "../../services/Breadcrumb";

const useStyles = makeStyles({
  rootBox: { backgroundColor: "#fff", padding: 16, borderRadius: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.12)" },
  container: { maxWidth: 500, margin: "50px auto", padding: 16, display: "flex", flexDirection: "column", gap: 24, border: "1px solid #ccc", borderRadius: 8 },
  title: { textAlign: "center", fontWeight: 500 },
  buttonsContainer: { display: "flex", justifyContent: "center", gap: 16 },
});


const Payslip = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const breadCrumb = [{ label: "Payslip" }];
  const [loading, setLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [monthYear, setMonthYear] = useState(null);

  useEffect(() => {
      getUserSalary();
    }, []);
  
    const getUserSalary = () => {
      const url = `User/GetSalary`;
      setLoading(true);
      getRequest(url)
        .then((res) => {
          if (res.data) {
            res.data.forEach((d) => {
              if (d.doj) {
                d.doj = moment(d.doj).format("DD/MM/YYYY");
              }
            });
            setEmployeeData(res.data);
            setLoading(false);
          }
        })
        .catch((err) => {
          setLoading(false);
          console.error("Login error:", err);
        });
    };

  const handleGenerate = () => {
    if (!employee || !monthYear) {
      alert("Select employee and month first!");
      return;
    }
    navigate("/payslip/payslip-preview", { state: { employee, monthYear } });
  };

  const handleReset = () => {
    setEmployee(null);
    setMonthYear(null);
  };

  return (
    <Box className={classes.rootBox}>
      <LoadingMask loading={loading} />
      <Breadcrumb items={breadCrumb} />
      <Box className={classes.container}>
        <Typography variant="h6" className={classes.title}>Payslip Generation</Typography>

        <Autocomplete
          fullWidth
          options={employeeData}
          getOptionLabel={(option) => option.userName}
          value={employee}
          onChange={(e, newValue) => setEmployee(newValue)}
          renderInput={(params) => <TextField {...params} label="User Name" />}
        />

        <TextField
          label="Employee Name"
          value={employee ? employee.fullName : ""}
          InputProps={{ readOnly: true }}
          fullWidth
        />

        <TextField
          label="Employee Id"
          value={employee ? employee.employeeId : ""}
          InputProps={{ readOnly: true }}
          fullWidth
        />

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            views={["year", "month"]}
            label="Select Month & Year"
            maxDate={new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
            value={monthYear}
            format="MMM-yyyy"
            onChange={setMonthYear}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </LocalizationProvider>

        <Box className={classes.buttonsContainer}>
          <Button variant="contained" startIcon={<FileText />} onClick={handleGenerate}>Generate</Button>
          <Button variant="outlined" startIcon={<RefreshCw />} onClick={handleReset}>Reset</Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Payslip;
