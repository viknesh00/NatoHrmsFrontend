import React, { useEffect, useState } from "react";
import {
    Stepper,
    Step,
    StepLabel,
    Button,
    Typography,
    Card,
    CardContent,
    Box,
    TextField,
} from "@mui/material";
import Autocomplete from '@mui/material/Autocomplete';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useNavigate, useParams } from "react-router-dom";
import { X } from "lucide-react";
import IconButton from "@mui/material/IconButton";
import { getRequest, postRequest } from "../../services/Apiservice";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import { format, parseISO } from "date-fns";
import LoadingMask from "../../services/LoadingMask";

const steps = [
    "Personal Details",
    "Employment Details",
    "Salary Details",
    "Education & Experience",
    "Documents & Other Info",
    "Other Details",
];

export default function AddEmployee() {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const { email } = useParams();
    const [loading, setLoading] = useState(false);
    const [departmentNames, setDepartmentNames] = useState([]);
    const [managerList, setManagerList] = useState([]);
    const isEditMode = !!email;
    const [formvalues, setFormvalues] = useState({
        firstName: null,
        lastName: null,
        gender: null,
        dob: null,
        maritalStatus: null,
        nationality: null,
        bloodGroup: null,
        contactNumber: null,
        email: null,
        address: null,
        employeeType: null,
        department: null,
        designation: null,
        doj: null,
        workLocation: null,
        reportingManager: null,
        accessRole: null,
        employmentStatus: null,
        employeeId: null,
        ctc: null,
        basicSalary: null,
        hra: null,
        employeePF: null,
        pfAccountNumber: null,
        medicalAllowance: null,
        conveyanceAllowance: null,
        esiNumber: null,
        specialAllowance: null,
        bankName: null,
        accountNumber: null,
        ifscCode: null,
        panNumber: null,
        uanNumber: null,
        highestQualification: null,
        specialization: null,
        university: null,
        yearOfPassing: null,
        previousCompany: null,
        totalExperience: null,
        emergencyContactName: null,
        emergencyContactNumber: null,
        relationShip: null,
        workShift: null,
        workMode: null,
        notes: null,
        profilePhoto: null,
        resume: null,
        aadharCard: null,
        panCard: null,
        offerLetter: null
    });

    useEffect(() => {
        if (isEditMode) {
            fetchEmployeeData(email);
        }
    }, [email]);

    useEffect(() => {
        getDepartmentName();
        getManagerLists();
    }, [])

    const getDepartmentName = () => {
        getRequest(`Account/GetDepartments`)
            .then((res) => {
                if (res.data && res.data.length > 0) {
                    setDepartmentNames(res.data);
                }
            })
            .catch((err) => {
                console.error("Error fetching user:", err);
            });
    }

    const getManagerLists = () => {
        getRequest(`Account/GetManagerLists`)
            .then((res) => {
                if (res.data && res.data.length > 0) {
                    setManagerList(res.data);
                }
            })
            .catch((err) => {
                console.error("Error fetching user:", err);
            });
    }


    const fetchEmployeeData = () => {
        getRequest(`User/GetUser/${email}`)
            .then((res) => {
                if (res.data && res.data.length > 0) {
                    const data = res.data[0];

                    setFormvalues({
                        ...data,
                        dob: data.dob ? new Date(data.dob) : null,
                        doj: data.doj ? new Date(data.doj) : null,
                        gender: data.gender
                            ? { label: data.gender === "M" ? "Male" : data.gender === "F" ? "Female" : "Other", value: data.gender }
                            : null,
                        maritalStatus: data.maritalStatus ? { label: data.maritalStatus, value: data.maritalStatus } : null,
                        bloodGroup: data.bloodGroup ? { label: data.bloodGroup, value: data.bloodGroup } : null,
                        department: data.department ? { label: data.department, value: data.department } : null,
                        accessRole: data.accessRole ? { label: data.accessRole, value: data.accessRole } : null,
                        employmentStatus: data.employmentStatus ? { label: data.employmentStatus, value: data.employmentStatus } : null,
                        reportingManager: data.reportingManager ? { label: data.reportingManager, value: data.reportingManager } : null,
                        workShift: data.workShift ? { label: data.workShift, value: data.workShift } : null,
                        workMode: data.workMode ? { label: data.workMode, value: data.workMode } : null,
                    });
                }
            })
            .catch((err) => {
                console.error("Error fetching user:", err);
            });
    };



    const extractValues = (data) => {
        const newObj = {};
        for (const key in data) {
            const item = data[key];
            let value = item && typeof item === "object" && "value" in item ? item.value : item;
            if (value && (key === "dob" || key === "doj")) {
                // If value is already a Date object
                if (value instanceof Date) {
                    value = format(value, "yyyy-MM-dd");
                }
                else if (typeof value === "string") {
                    const parsedDate = parseISO(value); // try ISO first
                    if (!isNaN(parsedDate)) {
                        value = format(parsedDate, "yyyy-MM-dd");
                    }
                }
            }
            newObj[key] = value;
        }
        return newObj;
    };

    const checkEmailExistAsync = async () => {
        const email = formvalues.email;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            ToastError("Please enter a valid email address!");
            return false;
        }

        const url = `User/CheckEmail?email=${email}`;
        setLoading(true);

        try {
            const res = await getRequest(url);
            setLoading(false);

            if (res.data?.emailExists) {
                ToastError("Entered Email already exists!");
                return false;
            }

            return true; // Email is valid and available
        } catch (err) {
            setLoading(false);
            console.error("Check email error:", err);
            ToastError(err.response?.data?.message || "Failed to check email");
            return false;
        }
    };


    const validateStep = async (step) => {
        switch (step) {
            case 0: // Personal Details
                if (!formvalues.firstName || !formvalues.lastName || !formvalues.email) {
                    ToastError("Please fill all mandatory fields");
                    return false;
                }

                // Directly call async email check
                if (!isEditMode) {
                    const emailValid = await checkEmailExistAsync();
                    if (!emailValid) return false;
                }

                return true;

            case 1: // Employment Details
                if (!formvalues.employeeId || !formvalues.department || !formvalues.workLocation || !formvalues.reportingManager || !formvalues.accessRole) {
                    ToastError("Please fill all mandatory fields");
                    return false;
                }
                return true;

            default:
                return true;
        }
    };


    const handleNext = async () => {
        const isValid = await validateStep(activeStep); // wait for async validation
        if (!isValid) return; // stop if validation fails

        if (activeStep === steps.length - 1) {
            const data = extractValues(formvalues);
            const url = isEditMode ? `User/Edit` : `User/Add`;
            postRequest(url, data)
                .then((res) => {
                    if (res.status === 200) {
                        navigate("/employees");
                        ToastSuccess(isEditMode ? "User Updated Successfully" : "User Added Successfully");
                    }
                })
                .catch((err) => {
                    if (err.response && err.response.status === 409) {
                        ToastError(err.response.data.message); // Email already exists
                    } else {
                        ToastError("Failed to save user data");
                    }
                });
        } else {
            setActiveStep((prev) => prev + 1);
        }
    };


    const handleCancel = () => {
        navigate("/employees");
    };

    const handleBack = () => setActiveStep((prev) => prev - 1);

    const getStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <>
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <TextField
                                fullWidth
                                label={<span>First Name <span style={{ color: 'red' }}>*</span></span>}
                                value={formvalues.firstName || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, firstName: e.target.value })
                                }
                            />
                            <TextField
                                fullWidth
                                label={<span>Last Name <span style={{ color: 'red' }}>*</span></span>}
                                value={formvalues.lastName || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, lastName: e.target.value })
                                }
                            />
                            <TextField
                                fullWidth
                                label={<span>Email (User ID) <span style={{ color: 'red' }}>*</span></span>}
                                type="email" // ensures browser-level email validation
                                value={formvalues.email || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, email: e.target.value })
                                }
                                disabled={isEditMode}
                            />
                        </Box>

                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                                <DatePicker
                                    fullWidth
                                    label="Date of Birth"
                                    value={formvalues.dob}
                                    format="dd/MM/yyyy"
                                    onChange={(newValue) => setFormvalues({ ...formvalues, dob: newValue })}
                                    renderInput={(params) => <TextField fullWidth  {...params} />}
                                    sx={{ flex: 1 }}
                                />
                            </LocalizationProvider>
                            <Autocomplete
                                fullWidth
                                options={[
                                    { label: 'Male', value: 'M' },
                                    { label: 'Female', value: 'F' },
                                    { label: 'Other', value: 'O' }
                                ]}
                                getOptionLabel={(option) => option.label || ""}
                                value={formvalues.gender} // should be {label, value} object
                                onChange={(event, newValue) => setFormvalues({ ...formvalues, gender: newValue })}
                                renderInput={(params) => <TextField {...params} label="Gender" />}
                                sx={{ flex: 1 }}
                            />
                            <Autocomplete
                                fullWidth
                                options={[
                                    { label: 'Single', value: 'Single' },
                                    { label: 'Married', value: 'Married' },
                                ]}
                                getOptionLabel={(option) => option.label || ""}
                                value={formvalues.maritalStatus} // should be {label, value} object
                                onChange={(event, newValue) => setFormvalues({ ...formvalues, maritalStatus: newValue })}
                                renderInput={(params) => <TextField {...params} label="Marital Status" />}
                                sx={{ flex: 1 }}
                            />
                        </Box>

                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <Autocomplete
                                fullWidth
                                options={[
                                    { label: 'A+', value: 'A+' },
                                    { label: 'A-', value: 'A-' },
                                    { label: 'B+', value: 'B+' },
                                    { label: 'B-', value: 'B-' },
                                    { label: 'AB+', value: 'AB+' },
                                    { label: 'AB-', value: 'AB-' },
                                    { label: 'O+', value: 'O+' },
                                    { label: 'O-', value: 'O-' },
                                ]}
                                getOptionLabel={(option) => option.label || ""}
                                value={formvalues.bloodGroup} // should be {label, value} object
                                onChange={(event, newValue) => setFormvalues({ ...formvalues, bloodGroup: newValue })}
                                renderInput={(params) => <TextField {...params} label="Blood Group" />}
                            />
                            <TextField
                                fullWidth
                                label="Nationality"
                                value={formvalues.nationality || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, nationality: e.target.value })
                                }
                            />
                            <TextField
                                fullWidth
                                label="Contact Number"
                                type="number"
                                value={formvalues.contactNumber || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, contactNumber: e.target.value })
                                }
                            />

                        </Box>

                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <TextField
                                fullWidth
                                label="Address"
                                value={formvalues.address || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, address: e.target.value })
                                }
                            />
                        </Box>
                    </>
                );

            case 1:
                return (
                    <>
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <TextField
                                fullWidth
                                label={<span>Employee Id <span style={{ color: 'red' }}>*</span></span>}
                                value={formvalues.employeeId || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, employeeId: e.target.value })
                                }
                            />
                            <Autocomplete
                                fullWidth
                                options={[
                                    { label: 'Permanent', value: 'Permanent' },
                                    { label: 'Contract', value: 'Contract' },
                                    { label: 'Intern', value: 'Intern' }
                                ]}
                                getOptionLabel={(option) => option.label || ""}
                                value={formvalues.employeeType} // should be {label, value} object
                                onChange={(event, newValue) => setFormvalues({ ...formvalues, employeeType: newValue })}
                                renderInput={(params) => <TextField {...params} label="Employee Type" />}
                            />
                            <TextField
                                fullWidth
                                label="Designation"
                                value={formvalues.designation || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, designation: e.target.value })
                                }
                            />
                        </Box>
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                                <DatePicker
                                    fullWidth
                                    label="Date of Joining"
                                    value={formvalues.doj}
                                    format="dd/MM/yyyy"
                                    onChange={(newValue) => setFormvalues({ ...formvalues, doj: newValue })}
                                    renderInput={(params) => <TextField fullWidth  {...params} />}
                                    sx={{ flex: 1 }}
                                />
                            </LocalizationProvider>
                            <Autocomplete
                                fullWidth
                                options={departmentNames}
                                getOptionLabel={(option) => option.label || ""}
                                value={formvalues.department} // should be {label, value} object
                                onChange={(event, newValue) => setFormvalues({ ...formvalues, department: newValue })}
                                renderInput={(params) => <TextField {...params} label={<span>Department <span style={{ color: 'red' }}>*</span></span>} />}
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                fullWidth
                                label={<span>Work Location <span style={{ color: 'red' }}>*</span></span>}
                                value={formvalues.workLocation || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, workLocation: e.target.value })
                                }
                                sx={{ flex: 1 }}
                            />

                        </Box>
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <Autocomplete
                                fullWidth
                                options={[
                                    { label: 'Active', value: 'Active' },
                                    { label: 'Probation', value: 'Probation' },
                                    { label: 'Resigned', value: 'Resigned' },
                                ]}
                                getOptionLabel={(option) => option.label || ""}
                                value={formvalues.employmentStatus} // should be {label, value} object
                                onChange={(event, newValue) => setFormvalues({ ...formvalues, employmentStatus: newValue })}
                                renderInput={(params) => <TextField {...params} label="Employement Status" />}
                            />
                            <Autocomplete
                                fullWidth
                                options={managerList}
                                getOptionLabel={(option) => option.label || ""}
                                value={formvalues.reportingManager} // should be {label, value} object
                                onChange={(event, newValue) => setFormvalues({ ...formvalues, reportingManager: newValue })}
                                renderInput={(params) => <TextField {...params} label={<span>Reporting Manager <span style={{ color: 'red' }}>*</span></span>} />}
                            />
                            <Autocomplete
                                fullWidth
                                options={[
                                    { label: 'Admin', value: 'Admin' },
                                    { label: 'Manager', value: 'Manager' },
                                    { label: 'Employee', value: 'Employee' }
                                ]}
                                getOptionLabel={(option) => option.label || ""}
                                value={formvalues.accessRole} // should be {label, value} object
                                onChange={(event, newValue) => setFormvalues({ ...formvalues, accessRole: newValue })}
                                renderInput={(params) => <TextField {...params} label={<span>Access Role <span style={{ color: 'red' }}>*</span></span>} />}
                            />
                        </Box>
                    </>
                )
            case 2:
                return (
                    <>
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <TextField
                                fullWidth
                                label="CTC"
                                type="number"
                                value={formvalues.ctc || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, ctc: e.target.value })
                                }
                            />
                            <TextField
                                fullWidth
                                label="Basic"
                                type="number"
                                value={formvalues.basicSalary || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, basicSalary: e.target.value })
                                }
                            />
                            <TextField
                                fullWidth
                                label="HRA"
                                type="number"
                                value={formvalues.hra || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, hra: e.target.value })
                                }
                            />
                        </Box>
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <TextField
                                fullWidth
                                label="Conveyance Allowance"
                                type="number"
                                value={formvalues.conveyanceAllowance || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, conveyanceAllowance: e.target.value })
                                }
                            />
                            <TextField
                                fullWidth
                                label="Medical Allowance"
                                type="number"
                                value={formvalues.medicalAllowance || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, medicalAllowance: e.target.value })
                                }
                            />
                            <TextField
                                fullWidth
                                label="Special Allowance"
                                type="number"
                                value={formvalues.specialAllowance || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, specialAllowance: e.target.value })
                                }
                            />
                        </Box>
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <TextField
                                fullWidth
                                label="Employee PF"
                                type="number"
                                value={formvalues.employeePF || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, employeePF: e.target.value })
                                }
                            />
                            <TextField
                                fullWidth
                                label="Bank Name"
                                type="text"
                                value={formvalues.bankName || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, bankName: e.target.value })
                                }
                            />
                            <TextField
                                fullWidth
                                label="Account Number"
                                type="number"
                                value={formvalues.accountNumber || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, accountNumber: e.target.value })
                                }
                            />
                        </Box>
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <TextField
                                fullWidth
                                label="IFSC Code"
                                type="text"
                                value={formvalues.ifscCode || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, ifscCode: e.target.value })
                                }
                            />
                            <TextField
                                fullWidth
                                label="PAN Number"
                                type="text"
                                value={formvalues.panNumber || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, panNumber: e.target.value })
                                }
                            />
                            <TextField
                                fullWidth
                                label="UAN Number"
                                type="number"
                                value={formvalues.uanNumber || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, uanNumber: e.target.value })
                                }
                            />
                        </Box>
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <TextField
                                fullWidth
                                label="PF Account Number"
                                type="text"
                                value={formvalues.pfAccountNumber || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, pfAccountNumber: e.target.value })
                                }
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                fullWidth
                                label="ESI Number"
                                type="text"
                                value={formvalues.esiNumber || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, esiNumber: e.target.value })
                                }
                                sx={{ flex: 1 }}
                            />
                            <Box sx={{ flex: 1 }} />
                        </Box>
                    </>
                )
            case 3:
                return (
                    <>
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <TextField
                                fullWidth
                                label="Highest Qualification"
                                type="text"
                                value={formvalues.highestQualification || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, highestQualification: e.target.value })
                                }
                            />
                            <TextField
                                fullWidth
                                label="Specialization"
                                type="text"
                                value={formvalues.specialization || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, specialization: e.target.value })
                                }
                            />
                            <TextField
                                fullWidth
                                label="University"
                                type="text"
                                value={formvalues.university || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, university: e.target.value })
                                }
                            />
                        </Box>
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <TextField
                                fullWidth
                                label="Year of Passing"
                                type="number"
                                value={formvalues.yearOfPassing || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, yearOfPassing: e.target.value })
                                }
                            />
                            <TextField
                                fullWidth
                                label="Previous Company"
                                type="text"
                                value={formvalues.previousCompany || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, previousCompany: e.target.value })
                                }
                            />
                            <TextField
                                fullWidth
                                label="Total Experience"
                                type="number"
                                value={formvalues.totalExperience || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, totalExperience: e.target.value })
                                }
                            />
                        </Box>
                    </>
                )
            case 4:
                return (
                    <>
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "100%",
                            }}
                        >
                            {[
                                { label: "Profile Photo", key: "profilePhoto", accept: ".jpg,.png" },
                                { label: "Resume", key: "resume", accept: ".pdf" },
                                { label: "Aadhar Card", key: "aadharCard", accept: ".pdf,.jpg" },
                                { label: "PAN Card", key: "panCard", accept: ".pdf,.jpg" },
                                { label: "Offer Letter", key: "offerLetter", accept: ".pdf" },
                            ].map((item, index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        width: "60%",
                                        mb: 2,
                                        border: "1px solid #ddd",
                                        borderRadius: "8px",
                                        padding: "10px 15px",
                                        backgroundColor: "#fafafa",
                                    }}
                                >
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                        {item.label}
                                    </Typography>
                                    <input
                                        type="file"
                                        accept={item.accept}
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file && file.size > 100 * 1024) {
                                                alert("File size exceeds 100 KB limit!");
                                                e.target.value = "";
                                                return;
                                            }

                                            // ✅ Store file in formValues
                                            setFormvalues((prev) => ({
                                                ...prev,
                                                [item.key]: file || null,
                                            }));
                                        }}
                                    />
                                </Box>
                            ))}
                        </Box>
                    </>
                );

            case 5:
                return (
                    <>
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <TextField
                                fullWidth
                                label="Emergency Contact Name"
                                type="text"
                                value={formvalues.emergencyContactName || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, emergencyContactName: e.target.value })
                                }
                            />
                            <TextField
                                fullWidth
                                label="Emergency Contact Number"
                                type="number"
                                value={formvalues.emergencyContactNumber || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, emergencyContactNumber: e.target.value })
                                }
                            />
                            <Autocomplete
                                fullWidth
                                options={[
                                    { label: 'Spouse', value: 'Spouse' },
                                    { label: 'Parent', value: 'Parent' },
                                    { label: 'Friend', value: 'Friend' },
                                ]}
                                getOptionLabel={(option) => option.label || ""}
                                value={formvalues.relationShip} // should be {label, value} object
                                onChange={(event, newValue) => setFormvalues({ ...formvalues, relationShip: newValue })}
                                renderInput={(params) => <TextField {...params} label="Relationship" />}
                            />
                        </Box>
                        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <Autocomplete
                                fullWidth
                                options={[
                                    { label: 'Day', value: 'Day' },
                                    { label: 'Night', value: 'Night' },
                                    { label: 'Rotational', value: 'Rotational' },
                                ]}
                                getOptionLabel={(option) => option.label || ""}
                                value={formvalues.workShift} // should be {label, value} object
                                onChange={(event, newValue) => setFormvalues({ ...formvalues, workShift: newValue })}
                                renderInput={(params) => <TextField {...params} label="Work Shift" />}
                            />
                            <Autocomplete
                                fullWidth
                                options={[
                                    { label: 'Office', value: 'Office' },
                                    { label: 'Remote', value: 'Remote' },
                                    { label: 'Hybrid', value: 'Hybrid' },
                                ]}
                                getOptionLabel={(option) => option.label || ""}
                                value={formvalues.workMode} // should be {label, value} object
                                onChange={(event, newValue) => setFormvalues({ ...formvalues, workMode: newValue })}
                                renderInput={(params) => <TextField {...params} label="Work Mode" />}
                            />
                            <TextField
                                fullWidth
                                label="Notes"
                                type="text"
                                value={formvalues.notes || ""}
                                onChange={(e) =>
                                    setFormvalues({ ...formvalues, notes: e.target.value })
                                }
                            />
                        </Box>
                    </>
                )
            default:
                return "Unknown step";
        }
    };

    return (
        <Box>
            <LoadingMask />
            <Card elevation={1} sx={{ height: "625px", borderRadius: 3, display: "flex", flexDirection: "column" }}>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        px: 3,
                        mt: 2,
                    }}
                >
                    <Box sx={{ width: 24 }} /> {/* Empty placeholder to keep title perfectly centered */}

                    <Typography variant="h5" sx={{ my: 3, fontWeight: 600, textAlign: "center" }}>
                        {isEditMode ? "Update Employee" : "Add Employee"}
                    </Typography>

                    <IconButton onClick={handleCancel}>
                        <X size={24} />
                    </IconButton>
                </Box>

                {/* Stepper */}
                <Stepper activeStep={activeStep} alternativeLabel>
                    {steps.map((label, index) => (
                        <Step key={index}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {/* Step content area */}
                <CardContent sx={{ flex: 1, overflowY: "auto", mt: 2, mb: 2 }}>
                    {getStepContent(activeStep)}
                </CardContent>

                {/* Buttons always at bottom */}
                <Box sx={{ display: "flex", justifyContent: "space-between", p: 2 }}>
                    <Button
                        disabled={activeStep === 0}
                        onClick={handleBack}
                        variant="outlined"
                    >
                        Previous
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleNext}
                    >
                        {activeStep === steps.length - 1 ? (isEditMode ? "Update" : "Save") : "Next"}
                    </Button>
                </Box>
            </Card>
        </Box>
    );
}
