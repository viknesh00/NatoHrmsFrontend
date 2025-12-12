import React, { useState, useEffect } from "react";
import { Box, Typography, Divider, TextField, Button } from "@mui/material";
import { FileDown } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { makeStyles } from "@mui/styles";
import { useLocation } from "react-router-dom";
import Breadcrumb from "../../services/Breadcrumb";

// --- Utility: Convert number to words ---
const numberToWords = (num) => {
    const a = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
        "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
        "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const convert = (n) => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
        if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 === 0 ? "" : " and " + convert(n % 100));
        if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 === 0 ? "" : " " + convert(n % 1000));
        if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 === 0 ? "" : " " + convert(n % 100000));
        return "";
    };
    return `Indian Rupees ${convert(num)} Only`;
};

// --- Styling ---
const useStyles = makeStyles({
    rootBox: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
    },
    logo: { width: 100, height: "auto" },
    headerBox: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    centerContent: { textAlign: "center", fontSize: 12 },
    detailBox: { marginTop: 10 },
    detailRow: { display: "flex", justifyContent: "space-between", marginBottom: 3 },
    column: { display: "flex", flexDirection: "column", gap: 4, width: "45%" },
    rowFlex: { display: "flex", justifyContent: "space-between" },
    label: { fontWeight: "bold", minWidth: 120, fontSize: 12 },
});

const PayslipPreview = () => {
    const classes = useStyles();
    const location = useLocation();
    const breadCrumb = [{ label: "Payslip", link: "/payslip" }, { label: "Generate Payslip" }];
    const { employee, monthYear } = location.state || {};
    const selectedYear = monthYear?.getFullYear();
    const selectedMonth = monthYear?.getMonth();
    const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const [payslipData, setPayslipData] = useState({
        employeeName: employee.fullName,
        employeeId: employee.employeeId,
        designation: employee.designation,
        department: employee.department,
        location: employee.workLocation,
        bankDetails: employee.accountNumber,
        dateOfJoining: employee.doj,
        taxRegime: "Regular Tax Regime",
        panNumber: employee.panNumber,
        uanNumber: employee.uanNumber,
        pfNumber: employee.pfAccountNumber,
        esiNumber: employee.esiNumber,
        pranNumber: "",
        payMonth: `${monthYear.toLocaleString("default", { month: "long" })}-${selectedYear}`,

        calendarMonth: totalDays.toString(),
        paidDays: totalDays.toString(),
        lopDays: "0",

        // Earnings
        basicSalary: employee.basicSalary,
        hra: employee.hra,
        conveyanceAllowance: employee.conveyanceAllowance,
        medicalAllowance: employee.medicalAllowance,
        specialAllowance: employee.specialAllowance,

        // Deductions
        employeePf: "1800.00",
        professionalTax: "1250.00",

        totalEarnings: "0.00",
        totalDeductions: "0.00",
        netAmount: "0.00",
        netInWords: "",
    });

    // Auto calculate totals and net
    useEffect(() => {
        const toNum = (val) => parseFloat(val) || 0;

        const earnings = [
            payslipData.basicSalary,
            payslipData.hra,
            payslipData.conveyanceAllowance,
            payslipData.medicalAllowance,
            payslipData.specialAllowance,
        ].map(toNum);

        const deductions = [
            payslipData.employeePf,
            payslipData.professionalTax,
        ].map(toNum);

        const totalEarnings = earnings.reduce((a, b) => a + b, 0);
        const totalDeductions = deductions.reduce((a, b) => a + b, 0);
        const netAmount = totalEarnings - totalDeductions;

        setPayslipData((prev) => ({
            ...prev,
            totalEarnings: totalEarnings.toFixed(2),
            totalDeductions: totalDeductions.toFixed(2),
            netAmount: `₹${netAmount.toFixed(2)}`,
            netInWords: numberToWords(Math.round(netAmount)),
        }));
    }, [
        payslipData.basicSalary,
        payslipData.hra,
        payslipData.conveyanceAllowance,
        payslipData.medicalAllowance,
        payslipData.specialAllowance,
        payslipData.employeePf,
        payslipData.professionalTax,
    ]);

    const handleChange = (field, value) => {
        setPayslipData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleDownload = async () => {
        const input = document.getElementById("payslip-content");
        if (!input) return;

        // Capture as canvas
        const canvas = await html2canvas(input, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");

        // Create PDF
        const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgProps = pdf.getImageProperties(imgData);
        const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);

        pdf.addImage(imgData, "PNG", 0, 0, imgProps.width * ratio, imgProps.height * ratio);

        // Save PDF
        const fileName = `${payslipData.employeeName.replace(/\s+/g, "_")}_${payslipData.payMonth}.pdf`;
        pdf.save(fileName);
    };



    return (
        <Box className={classes.rootBox}>
            <Breadcrumb items={breadCrumb} />
            <Box id="payslip-content" p={2} border={1} borderRadius={2} borderColor="grey.300" sx={{ width: "100%", maxWidth: 900, margin: "auto", fontSize: 12, overflow: "hidden" }}>
                {/* Header */}
                <Box className={classes.headerBox}>
                    <img src="/assets/images/natobotics-logo.png" alt="Logo" className={classes.logo} />
                    <Box className={classes.centerContent}>
                        <Typography variant="subtitle2" fontWeight="bold">Natobotics Technologies Pvt Ltd</Typography>
                        <Typography>No: 9/1, Madhavamani Avenue</Typography>
                        <Typography>Velachery</Typography>
                        <Typography>Chennai</Typography>
                        <Typography variant="subtitle2" fontWeight="bold">Pay Slip</Typography>
                        <Typography>for {payslipData.payMonth}</Typography>
                        <Typography fontWeight="bold">{payslipData.employeeName}</Typography>
                    </Box>
                    <Box width={80} />
                </Box>

                <Divider />

                {/* Employee Details */}
                <Box className={classes.detailBox}>
                    <Box className={classes.rowFlex}>
                        <Box className={classes.column}>
                            {[
                                ["Employee Number", payslipData.employeeId],
                                ["Function", payslipData.department],
                                ["Designation", payslipData.designation],
                                ["Location", payslipData.location],
                                ["Bank Details", payslipData.bankDetails],
                                ["Date of Joining", payslipData.dateOfJoining],
                            ].map(([label, value], i) => (
                                <Box key={i} className={classes.detailRow}>
                                    <Typography className={classes.label}>{label} :</Typography>
                                    <Typography>{value}</Typography>
                                </Box>
                            ))}
                        </Box>

                        <Box className={classes.column}>
                            {[
                                ["Tax Regime", payslipData.taxRegime],
                                ["PAN", payslipData.panNumber],
                                ["UAN", payslipData.uanNumber],
                                ["PF Number", payslipData.pfNumber],
                                ["ESI Number", payslipData.esiNumber],
                                ["PRAN", payslipData.pranNumber],
                            ].map(([label, value], i) => (
                                <Box key={i} className={classes.detailRow}>
                                    <Typography className={classes.label}>{label} :</Typography>
                                    <Typography>{value}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Box>

                <Divider />

                {/* Attendance + Salary */}
                <Box mt={2} border={1} borderColor="grey.400">
                    {/* Attendance */}
                    <Box display="flex" borderBottom={1} borderColor="grey.300">
                        <Box flex={1} p={1} borderRight={1} borderColor="grey.300">
                            <Typography fontWeight="bold">Attendance Details</Typography>
                        </Box>
                        <Box flex={1} p={1}>
                            <Typography fontWeight="bold">Value</Typography>
                        </Box>
                    </Box>

                    {[
                        ["Calendar Month", payslipData.calendarMonth],
                    ].map(([label, value]) => (
                        <Box display="flex" borderBottom={1} borderColor="grey.300" key={label}>
                            <Box flex={1} p={1} borderRight={1} borderColor="grey.300">
                                <Typography>{label}</Typography>
                            </Box>
                            <Box flex={1} p={1}>
                                <Typography>{value}</Typography>
                            </Box>
                        </Box>
                    ))}

                    {/* Earnings and Deductions */}
                    <Box display="flex" borderTop={1} borderColor="grey.300">
                        {/* Earnings */}
                        <Box flex={1} borderRight={1} borderColor="grey.300">
                            <Box display="flex" p={1} borderBottom={1} borderColor="grey.300">
                                <Typography flex={1} fontWeight="bold">Earnings</Typography>
                                <Typography fontWeight="bold">Amount</Typography>
                            </Box>
                            {[
                                ["Basic Salary", "basicSalary"],
                                ["HRA", "hra"],
                                ["Conveyance Allowance", "conveyanceAllowance"],
                                ["Medical Allowance", "medicalAllowance"],
                                ["Special Allowance", "specialAllowance"],
                            ].map(([label, field]) => (
                                <Box display="flex" justifyContent="space-between" p={1} key={field}>
                                    <Typography>{label}</Typography>
                                    <TextField
                                        size="small"
                                        type="number"
                                        value={payslipData[field]}
                                        onChange={(e) => handleChange(field, e.target.value)}
                                        onBlur={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            handleChange(field, val.toFixed(2));
                                        }}
                                    />
                                </Box>
                            ))}
                        </Box>

                        {/* Deductions */}
                        <Box flex={1}>
                            <Box display="flex" p={1} borderBottom={1} borderColor="grey.300">
                                <Typography flex={1} fontWeight="bold">Deductions</Typography>
                                <Typography fontWeight="bold">Amount</Typography>
                            </Box>
                            {[
                                ["Employee PF", "employeePf"],
                                ["Professional Tax", "professionalTax"],
                            ].map(([label, field]) => (
                                <Box display="flex" justifyContent="space-between" p={1} key={field}>
                                    <Typography>{label}</Typography>
                                    <TextField
                                        size="small"
                                        type="number"
                                        value={payslipData[field]}
                                        onChange={(e) => handleChange(field, e.target.value)}
                                        onBlur={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            handleChange(field, val.toFixed(2));
                                        }}
                                    />
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    {/* Totals */}
                    <Box display="flex" borderTop={1} borderColor="grey.300">
                        <Box flex={1} borderRight={1} borderColor="grey.300" display="flex" justifyContent="space-between" p={1}>
                            <Typography fontWeight="bold">Total Earnings</Typography>
                            <Typography fontWeight="bold">{payslipData.totalEarnings}</Typography>
                        </Box>
                        <Box flex={1} display="flex" justifyContent="space-between" p={1}>
                            <Typography fontWeight="bold">Total Deductions</Typography>
                            <Typography fontWeight="bold">{payslipData.totalDeductions}</Typography>
                        </Box>
                    </Box>

                    {/* Net Amount */}
                    <Box display="flex" borderTop={1} borderColor="grey.300">
                        <Box flex={1} /> {/* empty to match left half */}
                        <Box flex={1} display="flex" justifyContent="space-between" p={1}>
                            <Typography fontWeight="bold">Net Amount</Typography>
                            <Typography fontWeight="bold">{payslipData.netAmount}</Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Amount in Words */}
                <Box mt={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                            <Typography fontWeight="bold">Amount (in words):</Typography>
                            <Typography>{payslipData.netInWords}</Typography>
                        </Box>
                        <Box textAlign="right">
                            <Typography fontWeight="bold">for Natobotics Technologies Private Limited</Typography>
                        </Box>
                    </Box>

                    <Box mt={4} display="flex" justifyContent="flex-end">
                        <Typography>Authorised Signatory</Typography>
                    </Box>

                    <Box mt={2} textAlign="center">
                        <Typography fontSize={10}>This is a computer-generated document and does not require signature</Typography>
                    </Box>
                </Box>


            </Box>
            <Box mt={2} display="flex" justifyContent="center">
                <Button
                    variant="contained"
                    startIcon={<FileDown />}
                    onClick={handleDownload}
                >
                    Download PDF
                </Button>
            </Box>
        </Box>
    );
};

export default PayslipPreview;