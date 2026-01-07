import React, { useEffect, useState } from "react";
import { Card, CardContent, Typography, Box, Avatar, Divider, Button } from "@mui/material";
import { File } from "lucide-react"
import { makeStyles } from "@material-ui/core/styles";
import { getCookie } from "../../services/Cookies";
import { getRequest } from "../../services/Apiservice";
import Breadcrumb from "../../services/Breadcrumb";
import { Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
    rootBox: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
    },
}));
const ViewEmployee = ({ employee }) => {
    const classes = useStyles();
    const navigate = useNavigate();
    const email = getCookie("email");
    const breadCrumb = [{ label: "View Profile" }]
    const [formvalues, setFormvalues] = useState({
        firstName: "",
        lastName: "",
        gender: "",
        dob: null,
        maritalStatus: "",
        nationality: "",
        bloodGroup: "",
        contactNumber: "",
        email: "",
        address: "",
        employeeType: "",
        department: "",
        designation: "",
        doj: null,
        workLocation: "",
        reportingManager: "",
        accessRole:"",
        employmentStatus: "",
        employeeId: "",
        ctc:"",
        basicSalary:"",
        hra:"",
        employeePF:"",
        pfAccountNumber:"",
        medicalAllowance:"",
        conveyanceAllowance:"",
        esiNumber:"",
        specialAllowance:"",
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        panNumber: "",
        uanNumber: "",
        highestQualification: "",
        specialization: "",
        university: "",
        yearOfPassing: "",
        previousCompany: "",
        totalExperience: "",
        emergencyContactName: "",
        emergencyContactNumber: "",
        relationShip: "",
        workShift: "",
        workMode: "",
        notes: "",
        profilePhoto: null,
        resume: null,
        aadharCard: null,
        panCard: null,
        offerLetter: null
    });

    useEffect(() => {
        fetchEmployeeData(email);
    }, [email]);

    const sanitize = (obj) => {
        const ignoreKeys = ["resume", "aadharCard", "panCard", "offerLetter"];
        const cleaned = {};

        for (const key in obj) {
            const value = obj[key];

            // Skip cleaning for file-related keys
            if (ignoreKeys.includes(key)) {
                cleaned[key] = value;
                continue;
            }

            cleaned[key] =
                value === null || value === "" ? "-" : value;
        }

        return cleaned;
    };


    const formatDate = (val) => {
        if (!val || val === "-") return "-";
        try {
            return new Date(val).toLocaleDateString("en-GB"); // DD/MM/YYYY
        } catch {
            return "-";
        }
    };

    const fetchEmployeeData = () => {
        getRequest(`User/GetUser/${email}`)
            .then((res) => {
                if (res.data && res.data.length > 0) {

                    const data = sanitize(res.data[0]);
                    setFormvalues({
                        ...data,
                        dob: formatDate(data.dob),
                        doj: formatDate(data.doj),
                       gender: data.gender && data.gender !== "-" ? 
                        (data.gender === "M" ? "Male" : data.gender === "F" ? "Female" : "Other") : "-",
                    });
                }
            })
            .catch((err) => {
                console.error("Error fetching user:", err);
            });
    };

    const handleUpdateProfile = (email) => {
        navigate(`/employees/edit-employee/${email}`);
    };


    const emp = employee || formvalues;

    return (
        <Box className={classes.rootBox} display="flex" flexDirection="column" gap={3}>
            <Breadcrumb items={breadCrumb} />
            <Card>
                <CardContent>
                    <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        mb={1}
                    >
                        <Typography variant="h6">
                            Personal Details
                        </Typography>

                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<Edit size={18} />}
                           onClick={() => handleUpdateProfile(email)}
                        >
                            Update Profile
                        </Button>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Box display="flex" gap={2} flexWrap="wrap">
                        {/* Avatar */}
                        <Box display="flex" flexDirection="column" alignItems="center" flex={1}>
                            <Avatar
                                src={emp.profilePhoto || ""}
                                sx={{
                                    width: 100,
                                    height: 100,
                                    mb: 1,
                                    border: "2px solid #1976d2",
                                    bgcolor: !emp.profilePhoto ? "#e0e0e0" : "transparent",
                                    color: "#1976d2",
                                    fontWeight: 500,
                                }}
                            >
                                {!emp.profilePhoto && emp.firstName
                                    ? emp.firstName.charAt(0) + emp.lastName.charAt(0)
                                    : ""}
                            </Avatar>

                            <Typography variant="subtitle1" align="center" sx={{ mb: 1 }}>
                                {emp.firstName} {emp.middleName} {emp.lastName}
                            </Typography>
                            <Typography variant="body2" align="center" sx={{ color: "#555" }}>
                                {emp.jobTitle}
                            </Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>First Name</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Last Name</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Gender</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Date of Birth</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Marital Status</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.firstName}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.lastName}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.gender}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.dob}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.maritalStatus}</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Nationality</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Blood Group</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Phone Number</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Email Address</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Address</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.nationality}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.bloodGroup}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.contactNumber}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.email}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.address}</Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Employment Details</Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Box display="flex" gap={2} flexWrap="wrap">

                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Employee ID</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Employee Type</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Designation</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.employeeId}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.employeeType}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.designation}</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Date of Joining</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Department</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Work Location (City)</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.doj}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.department}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.workLocation}</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Employement Status</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Reporting Manager</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Access Role</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.employmentStatus}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.reportingManager}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.accessRole}</Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Salary Details</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>CTC</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>PF Employer</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Conveyance Allowance</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Bank Name</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>PAN Number</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.ctc}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.employeePF}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.conveyanceAllowance}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.bankName}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.panNumber}</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Basic Salary</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>PF Account Number</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>ESI Number</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Account Number</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>UAN Number</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.basicSalary}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.pfAccountNumber}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.esiNumber}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.accountNumber}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.uanNumber}</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>HRA</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Medical Allowance</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Special Allowance</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>IFSC Code</Typography>                            
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.hra}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.medicalAllowance}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.specialAllowance}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.ifscCode}</Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Education & Experience</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Highest Qualification</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Year of Passing</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.highestQualification}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.yearOfPassing}</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Specialization</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Previous Company</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.specialization}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.previousCompany}</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>University</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Total Experience</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.university}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.totalExperience}</Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Documents & Other Info</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Resume</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Aadhar Card</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.resume ? <File /> : "-"}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.aadharCard ? <File /> : "-"}</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>PAN Card</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.panCard ? <File /> : "-"}</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Offer Letter</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.offerLetter ? <File /> : "-"}</Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card> */}

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Other Details</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box display="flex" gap={2} flexWrap="wrap">
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Emerg Contact Name</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Work Shift</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.emergencyContactName}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.workShift}</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Emerg Contact Number</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Work Mode</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.emergencyContactNumber}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.workMode}</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Relationship</Typography>
                            <Typography sx={{ fontWeight: 500, color: "#1976d2" }}>Notes</Typography>
                        </Box>
                        <Box display="flex" flexDirection="column" gap={1} flex={1}>
                            <Typography sx={{ color: "#555" }}>{emp.relationship}</Typography>
                            <Typography sx={{ color: "#555" }}>{emp.notes}</Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default ViewEmployee;
