import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRequest, postRequest } from "../../services/Apiservice";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import { Users, X } from "lucide-react";
import { getCookie } from "../../services/Cookies";
import { FormInput, FormSelect, FormRow, FormSection, FormDate } from "../../components/FormComponents";

/* ── Input styles (same as DocumentUploadForm) ── */
const IS = {
  label: { display:"block", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:11.5, fontWeight:700, color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:7 },
  input: { width:"100%", padding:"10px 13px", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--bg)", fontFamily:"'DM Sans',sans-serif", fontSize:13.5, color:"var(--text-primary)", outline:"none", transition:"all 0.2s", boxSizing:"border-box" },
  error: { fontSize:12, color:"var(--coral)", marginTop:4 },
};

function FocusInput({ style: s, disabled, ...props }) {
  return (
    <input
      {...props}
      disabled={disabled}
      style={{ ...IS.input, ...(disabled ? { opacity:0.5, cursor:"not-allowed" } : {}), ...s }}
      onFocus={(e) => { if (!disabled) { e.target.style.borderColor="var(--primary)"; e.target.style.boxShadow="0 0 0 3px var(--primary-ghost)"; e.target.style.background="#fff"; } }}
      onBlur={(e)  => { e.target.style.borderColor="var(--border)"; e.target.style.boxShadow="none"; e.target.style.background= disabled ? "var(--bg)" : "var(--bg)"; }}
    />
  );
}

/* ──────────────────────────────────────────────
   Constants
   ────────────────────────────────────────────── */
const steps = [
  "Personal Details",
  "Employment Details",
  "Salary Details",
  "Education & Experience",
  "Other Details",
];

const GENDER_OPTIONS      = [{ label: "Male", value: "M" }, { label: "Female", value: "F" }, { label: "Other", value: "O" }];
const MARITAL_OPTIONS     = [{ label: "Single", value: "Single" }, { label: "Married", value: "Married" }];
const BLOOD_OPTIONS       = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => ({ label: g, value: g }));
const EMP_TYPE_OPTIONS    = [{ label: "Permanent", value: "Permanent" }, { label: "Contract", value: "Contract" }, { label: "Intern", value: "Intern" }];
const EMP_STATUS_OPTIONS  = [{ label: "Active", value: "Active" }, { label: "Probation", value: "Probation" }, { label: "Resigned", value: "Resigned" }];
const ACCESS_ROLE_OPTIONS = [{ label: "Admin", value: "Admin" }, { label: "Manager", value: "Manager" }, { label: "Employee", value: "Employee" }];
const WORK_SHIFT_OPTIONS  = [{ label: "Day", value: "Day" }, { label: "Night", value: "Night" }, { label: "Rotational", value: "Rotational" }];
const WORK_MODE_OPTIONS   = [{ label: "Office", value: "Office" }, { label: "Remote", value: "Remote" }, { label: "Hybrid", value: "Hybrid" }];
const RELATION_OPTIONS    = [{ label: "Spouse", value: "Spouse" }, { label: "Parent", value: "Parent" }, { label: "Friend", value: "Friend" }];

const withPlaceholder = (label, options) => [{ label, value: "" }, ...options];

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */
export default function AddEmployee() {
  const navigate = useNavigate();
  const { email } = useParams();

  const [activeStep,      setActiveStep]      = useState(0);
  const [loading,         setLoading]         = useState(false);
  const [departmentNames, setDepartmentNames] = useState([]);
  const [managerList,     setManagerList]     = useState([]);
  const [projectList,     setProjectList]     = useState([]); // { label, value, department }

  /* ── Inline project multi-select state (same pattern as DocumentUploadForm) ── */
  const [projectSearch,   setProjectSearch]   = useState("");
  const [showProjectDrop, setShowProjectDrop] = useState(false);
  const projectDropdownRef                    = useRef(null);

  const userRole         = getCookie("role");
  const isEditMode       = !!email;
  const isAdminOrManager = userRole === "Admin" || userRole === "Manager";

  const breadCrumb = !isAdminOrManager
    ? [{ label: "View Profile", link: "/view-employee" }, { label: "Edit-Employee" }]
    : !isEditMode
      ? [{ label: "Employee", link: "/employees" }, { label: "Add-Employee" }]
      : [{ label: "Employee", link: "/employees" }, { label: "Edit-Employee" }];

  /* ── form state ── */
  const [formvalues, setFormvalues] = useState({
    // Personal
    firstName: "", lastName: "", gender: "", dob: "",
    maritalStatus: "", nationality: "", bloodGroup: "",
    contactNumber: "", email: "", address: "",
    // Employment
    employeeId: "", employeeType: "", designation: "", doj: "",
    department: "", workLocation: "", employmentStatus: "",
    reportingManager: "", accessRole: "",
    projects: [],          // array of projectName strings
    // Salary
    ctc: "", basicSalary: "", hra: "", conveyanceAllowance: "",
    medicalAllowance: "", specialAllowance: "", employeePF: "",
    bankName: "", accountNumber: "", ifscCode: "", panNumber: "",
    uanNumber: "", pfAccountNumber: "", esiNumber: "",
    // Education
    highestQualification: "", specialization: "", university: "",
    yearOfPassing: "", previousCompany: "", totalExperience: "",
    // Other
    emergencyContactName: "", emergencyContactNumber: "",
    relationship: "", workShift: "", workMode: "", notes: "",
  });

  /* ── close project dropdown on outside click ── */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target))
        setShowProjectDrop(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── lifecycle ── */
  useEffect(() => { if (isEditMode) fetchEmployeeData(); }, [email]);
  useEffect(() => { getDepartmentName(); getManagerLists(); getProjectList(); }, []);

  /* ── API helpers ── */
  const getDepartmentName = () => {
    getRequest("Account/GetDepartments")
      .then((res) => {
        if (res.data?.length > 0)
          setDepartmentNames(res.data.map((d) => ({ label: d.label || d, value: d.value || d })));
      })
      .catch((err) => console.error("Error fetching departments:", err));
  };

  const getManagerLists = () => {
    getRequest("Account/GetManagerLists")
      .then((res) => {
        if (res.data?.length > 0)
          setManagerList(res.data.map((m) => ({ label: m.label || m, value: m.value || m })));
      })
      .catch((err) => console.error("Error fetching managers:", err));
  };

  const getProjectList = () => {
    getRequest("Project/All")
      .then((res) => {
        if (res.data?.length > 0)
          // ── Store department alongside each project for filtering ──
          setProjectList(res.data.map((p) => ({
            label:      p.projectName,
            value:      p.projectName,
            department: p.department || "", // comma-separated string e.g. "IT,HR Onsite"
          })));
      })
      .catch((err) => console.error("Error fetching projects:", err));
  };

  const fetchEmployeeData = () => {
    getRequest(`User/GetUser/${email}`)
      .then((res) => {
        if (res.data?.length > 0) {
          const d = res.data[0];
          setFormvalues({
            firstName:              d.firstName              || "",
            lastName:               d.lastName               || "",
            gender:                 d.gender                 || "",
            dob:                    d.dob    ? d.dob.split("T")[0]  : "",
            maritalStatus:          d.maritalStatus          || "",
            nationality:            d.nationality            || "",
            bloodGroup:             d.bloodGroup             || "",
            contactNumber:          d.contactNumber          || "",
            email:                  d.email                  || "",
            address:                d.address                || "",
            employeeId:             d.employeeId             || "",
            employeeType:           d.employeeType           || "",
            designation:            d.designation            || "",
            doj:                    d.doj    ? d.doj.split("T")[0]  : "",
            department:             d.department             || "",
            workLocation:           d.workLocation           || "",
            employmentStatus:       d.employmentStatus       || "",
            reportingManager:       d.reportingManager       || "",
            accessRole:             d.accessRole             || "",
            projects: Array.isArray(d.projectAssigned)
              ? d.projectAssigned
              : d.projectAssigned ? d.projectAssigned.split(",").map(s => s.trim()).filter(Boolean) : [],
            ctc:                    d.ctc                    ?? "",
            basicSalary:            d.basicSalary            ?? "",
            hra:                    d.hra                    ?? "",
            conveyanceAllowance:    d.conveyanceAllowance    ?? "",
            medicalAllowance:       d.medicalAllowance       ?? "",
            specialAllowance:       d.specialAllowance       ?? "",
            employeePF:             d.employeePF             ?? "",
            bankName:               d.bankName               || "",
            accountNumber:          d.accountNumber          ?? "",
            ifscCode:               d.ifscCode               || "",
            panNumber:              d.panNumber              || "",
            uanNumber:              d.uanNumber              ?? "",
            pfAccountNumber:        d.pfAccountNumber        || "",
            esiNumber:              d.esiNumber              || "",
            highestQualification:   d.highestQualification   || "",
            specialization:         d.specialization         || "",
            university:             d.university             || "",
            yearOfPassing:          d.yearOfPassing          ?? "",
            previousCompany:        d.previousCompany        || "",
            totalExperience:        d.totalExperience        ?? "",
            emergencyContactName:   d.emergencyContactName   || "",
            emergencyContactNumber: d.emergencyContactNumber || "",
            relationship:           d.relationship           || "",
            workShift:              d.workShift              || "",
            workMode:               d.workMode               || "",
            notes:                  d.notes                  || "",
          });
        }
      })
      .catch((err) => console.error("Error fetching user:", err));
  };

  const extractValues = (data) => {
    const newObj = {};
    for (const key in data) {
      let value = data[key];
      if (key === "dob" || key === "doj") {
        if (value && value !== "") {
          const parsed = new Date(value + "T12:00:00.000Z");
          value = isNaN(parsed) ? null : parsed.toISOString();
        } else {
          value = null;
        }
      } else if (key === "projects") {
        newObj["projectAssigned"] = Array.isArray(value) ? value.join(",") : value || null;
        continue;
      } else {
        value = value === "" ? null : value;
      }
      newObj[key] = value;
    }
    return newObj;
  };

  /* ── field setter ── */
  const set = (field) => (e) =>
    setFormvalues((prev) => ({ ...prev, [field]: e.target.value }));

  /* ── department change — clear projects that don't belong to new dept ── */
  const handleDepartmentChange = (e) => {
    const newDept = e.target.value;
    setFormvalues((prev) => {
      // keep only projects whose department string includes the newly selected department
      const validProjects = prev.projects.filter((projName) => {
        const proj = projectList.find((p) => p.value === projName);
        if (!proj || !proj.department) return false;
        return proj.department.split(",").map((d) => d.trim()).includes(newDept);
      });
      return { ...prev, department: newDept, projects: validProjects };
    });
  };

  /* ── project multi-select helpers (mirrors DocumentUploadForm pattern) ── */
  const toggleProject = (option) => {
    const already = formvalues.projects.includes(option.value);
    setFormvalues((prev) => ({
      ...prev,
      projects: already
        ? prev.projects.filter((v) => v !== option.value)
        : [...prev.projects, option.value],
    }));
  };

  const removeProject = (val) =>
    setFormvalues((prev) => ({ ...prev, projects: prev.projects.filter((v) => v !== val) }));

  /* ── filter projects by selected department ── */
  const filteredProjects = projectList.filter((p) => {
    // search filter
    const matchesSearch = p.label.toLowerCase().includes(projectSearch.toLowerCase());
    // department filter — only show projects whose department includes the selected dept
    const matchesDept = formvalues.department
      ? p.department.split(",").map((d) => d.trim()).includes(formvalues.department)
      : true; // no dept selected → show all
    return matchesSearch && matchesDept;
  });

  /* ── email check ── */
  const checkEmailExistAsync = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formvalues.email)) {
      ToastError("Please enter a valid email address!");
      return false;
    }
    setLoading(true);
    try {
      const res = await getRequest(`User/CheckEmail?email=${formvalues.email}`);
      setLoading(false);
      if (res.data?.emailExists) { ToastError("Entered Email already exists!"); return false; }
      return true;
    } catch (err) {
      setLoading(false);
      ToastError(err.response?.data?.message || "Failed to check email");
      return false;
    }
  };

  /* ── step validation ── */
  const validateStep = async (step) => {
    switch (step) {
      case 0:
        if (!formvalues.firstName || !formvalues.lastName || !formvalues.email) {
          ToastError("Please fill all mandatory fields"); return false;
        }
        if (!isEditMode) { const ok = await checkEmailExistAsync(); if (!ok) return false; }
        return true;
      case 1:
        if (!formvalues.employeeId || !formvalues.department || !formvalues.workLocation || !formvalues.reportingManager || !formvalues.accessRole) {
          ToastError("Please fill all mandatory fields"); return false;
        }
        return true;
      default:
        return true;
    }
  };

  /* ── navigation ── */
  const handleNext = async () => {
    const isValid = await validateStep(activeStep);
    if (!isValid) return;
    if (activeStep === steps.length - 1) {
      const data = extractValues(formvalues);
      setLoading(true);
      postRequest(isEditMode ? "User/Edit" : "User/Add", data)
        .then((res) => {
          if (res.status === 200) {
            ToastSuccess(isEditMode ? "User Updated Successfully" : "User Added Successfully");
            !isAdminOrManager ? navigate("/view-employee") : navigate("/employees");
          }
        })
        .catch((err) => {
          if (err.response?.status === 409) ToastError(err.response.data.message);
          else ToastError("Failed to save user data");
        })
        .finally(() => setLoading(false));
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleCancel = () => (!isAdminOrManager ? navigate("/view-employee") : navigate("/employees"));
  const handleBack   = () => setActiveStep((prev) => prev - 1);

  /* ── step content ── */
  const getStepContent = (step) => {
    switch (step) {

      /* ── Step 0: Personal Details ── */
      case 0:
        return (
          <FormSection title="Basic Info">
            <FormRow cols={3}>
              <FormInput label="First Name"       required value={formvalues.firstName} onChange={set("firstName")} placeholder="e.g. John" />
              <FormInput label="Last Name"         required value={formvalues.lastName}  onChange={set("lastName")}  placeholder="e.g. Doe" />
              <FormInput label="Email (User ID)"   required type="email" value={formvalues.email} onChange={set("email")} disabled={isEditMode} placeholder="e.g. john@company.com" />
            </FormRow>
            <FormRow cols={3}>
              <FormDate   label="Date of Birth"  value={formvalues.dob}          onChange={set("dob")} />
              <FormSelect label="Gender"          options={withPlaceholder("Select Gender",  GENDER_OPTIONS)}  value={formvalues.gender}        onChange={set("gender")} />
              <FormSelect label="Marital Status"  options={withPlaceholder("Select Status",  MARITAL_OPTIONS)} value={formvalues.maritalStatus} onChange={set("maritalStatus")} />
            </FormRow>
            <FormRow cols={3}>
              <FormSelect label="Blood Group"    options={withPlaceholder("Select Blood Group", BLOOD_OPTIONS)} value={formvalues.bloodGroup} onChange={set("bloodGroup")} />
              <FormInput  label="Nationality"    value={formvalues.nationality}   onChange={set("nationality")}   placeholder="e.g. Indian" />
              <FormInput  label="Contact Number" type="number" value={formvalues.contactNumber} onChange={set("contactNumber")} placeholder="e.g. 9876543210" />
            </FormRow>
            <FormRow cols={1}>
              <FormInput label="Address" value={formvalues.address} onChange={set("address")} placeholder="Full address" />
            </FormRow>
          </FormSection>
        );

      /* ── Step 1: Employment Details ── */
      case 1:
        return (
          <FormSection title="Employment Info">
            <FormRow cols={3}>
              <FormInput  label="Employee ID *"  value={formvalues.employeeId}   onChange={set("employeeId")}   disabled={!isAdminOrManager} placeholder="e.g. EMP-001" />
              <FormSelect label="Employee Type"  options={withPlaceholder("Select Type", EMP_TYPE_OPTIONS)} value={formvalues.employeeType} onChange={set("employeeType")} disabled={!isAdminOrManager} />
              <FormInput  label="Designation"    value={formvalues.designation}  onChange={set("designation")}  disabled={!isAdminOrManager} placeholder="e.g. Software Engineer" />
            </FormRow>
            <FormRow cols={3}>
              <FormDate   label="Date of Joining" value={formvalues.doj} onChange={set("doj")} disabled={!isAdminOrManager} />
              <FormSelect label="Department *"     options={withPlaceholder("Select Department", departmentNames)} value={formvalues.department} onChange={handleDepartmentChange} disabled={!isAdminOrManager} />

              {/* ── Projects inline multi-select (DocumentUploadForm pattern) ── */}
              <div style={{ marginBottom: 0 }}>
                <label style={IS.label}>Projects</label>

                {/* Selected chips */}
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom: formvalues.projects.length ? 8 : 0 }}>
                  {formvalues.projects.map((val) => (
                    <span key={val} style={{ display:"flex", alignItems:"center", gap:4, background:"var(--primary-ghost)", color:"var(--primary)", fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:20 }}>
                      {val}
                      {isAdminOrManager && (
                        <span onClick={() => removeProject(val)} style={{ cursor:"pointer", fontSize:14, lineHeight:1 }}>×</span>
                      )}
                    </span>
                  ))}
                </div>

                {/* Search input + dropdown */}
                <div style={{ position:"relative" }} ref={projectDropdownRef}>
                  <FocusInput
                    value={projectSearch}
                    disabled={!isAdminOrManager}
                    onChange={(e) => { setProjectSearch(e.target.value); setShowProjectDrop(true); }}
                    onFocus={() => isAdminOrManager && setShowProjectDrop(true)}
                    placeholder={
                      !formvalues.department
                        ? "Select a department first..."
                        : filteredProjects.length === 0
                          ? "No projects for this department"
                          : "Search and select projects..."
                    }
                  />
                  {showProjectDrop && isAdminOrManager && (
                    <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"white", border:"1.5px solid var(--border)", borderRadius:10, boxShadow:"var(--shadow-lg)", zIndex:200, maxHeight:200, overflowY:"auto", marginTop:4 }}>
                      {filteredProjects.length === 0 ? (
                        <div style={{ padding:"10px 14px", fontSize:13, color:"var(--text-muted)" }}>
                          {!formvalues.department ? "Select a department first" : "No projects found for this department"}
                        </div>
                      ) : filteredProjects.map((o) => {
                        const isSel = formvalues.projects.includes(o.value);
                        return (
                          <div
                            key={o.value}
                            onMouseDown={() => toggleProject(o)}
                            style={{ padding:"9px 14px", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between",
                              background: isSel ? "var(--primary-ghost)" : "white",
                              color:      isSel ? "var(--primary)"       : "var(--text-primary)",
                            }}
                          >
                            {o.label}
                            {isSel && <span style={{ fontSize:16, color:"var(--primary)" }}>✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </FormRow>

            <FormRow cols={3}>
              <FormInput  label="Work Location (City) *" value={formvalues.workLocation}    onChange={set("workLocation")}    disabled={!isAdminOrManager} placeholder="e.g. Chennai" />
              <FormSelect label="Employment Status"       options={withPlaceholder("Select Status",  EMP_STATUS_OPTIONS)}  value={formvalues.employmentStatus} onChange={set("employmentStatus")} disabled={!isAdminOrManager} />
              <FormSelect label="Reporting Manager *"     options={withPlaceholder("Select Manager", managerList)}         value={formvalues.reportingManager} onChange={set("reportingManager")} disabled={!isAdminOrManager} />
            </FormRow>
            <FormRow cols={3}>
              <FormSelect label="Access Role *" options={withPlaceholder("Select Role", ACCESS_ROLE_OPTIONS)} value={formvalues.accessRole} onChange={set("accessRole")} disabled={!isAdminOrManager} />
            </FormRow>
          </FormSection>
        );

      /* ── Step 2: Salary Details ── */
      case 2:
        return (
          <FormSection title="Salary Info">
            <FormRow cols={3}>
              <FormInput label="CTC"          type="number" value={formvalues.ctc}         onChange={set("ctc")}         disabled={!isAdminOrManager} placeholder="e.g. 600000" />
              <FormInput label="Basic Salary" type="number" value={formvalues.basicSalary} onChange={set("basicSalary")} disabled={!isAdminOrManager} placeholder="e.g. 300000" />
              <FormInput label="HRA"          type="number" value={formvalues.hra}         onChange={set("hra")}         disabled={!isAdminOrManager} placeholder="e.g. 120000" />
            </FormRow>
            <FormRow cols={3}>
              <FormInput label="Conveyance Allowance" type="number" value={formvalues.conveyanceAllowance} onChange={set("conveyanceAllowance")} disabled={!isAdminOrManager} />
              <FormInput label="Medical Allowance"    type="number" value={formvalues.medicalAllowance}    onChange={set("medicalAllowance")}    disabled={!isAdminOrManager} />
              <FormInput label="Special Allowance"    type="number" value={formvalues.specialAllowance}    onChange={set("specialAllowance")}    disabled={!isAdminOrManager} />
            </FormRow>
            <FormRow cols={3}>
              <FormInput label="Employee PF"    type="number" value={formvalues.employeePF}    onChange={set("employeePF")}    disabled={!isAdminOrManager} />
              <FormInput label="Bank Name"                    value={formvalues.bankName}       onChange={set("bankName")}       disabled={!isAdminOrManager} placeholder="e.g. HDFC Bank" />
              <FormInput label="Account Number" type="number" value={formvalues.accountNumber} onChange={set("accountNumber")} disabled={!isAdminOrManager} />
            </FormRow>
            <FormRow cols={3}>
              <FormInput label="IFSC Code"  value={formvalues.ifscCode}  onChange={set("ifscCode")}  disabled={!isAdminOrManager} placeholder="e.g. HDFC0001234" />
              <FormInput label="PAN Number" value={formvalues.panNumber} onChange={set("panNumber")} disabled={!isAdminOrManager} placeholder="e.g. ABCDE1234F" />
              <FormInput label="UAN Number" type="number" value={formvalues.uanNumber} onChange={set("uanNumber")} disabled={!isAdminOrManager} />
            </FormRow>
            <FormRow cols={2}>
              <FormInput label="PF Account Number" value={formvalues.pfAccountNumber} onChange={set("pfAccountNumber")} disabled={!isAdminOrManager} />
              <FormInput label="ESI Number"         value={formvalues.esiNumber}       onChange={set("esiNumber")}       disabled={!isAdminOrManager} />
            </FormRow>
          </FormSection>
        );

      /* ── Step 3: Education & Experience ── */
      case 3:
        return (
          <FormSection title="Education">
            <FormRow cols={3}>
              <FormInput label="Highest Qualification" value={formvalues.highestQualification} onChange={set("highestQualification")} placeholder="e.g. B.E / B.Tech" />
              <FormInput label="Specialization"        value={formvalues.specialization}       onChange={set("specialization")}       placeholder="e.g. Computer Science" />
              <FormInput label="University"            value={formvalues.university}           onChange={set("university")}           placeholder="e.g. Anna University" />
            </FormRow>
            <FormRow cols={3}>
              <FormInput label="Year of Passing"        type="number" value={formvalues.yearOfPassing}  onChange={set("yearOfPassing")}  placeholder="e.g. 2020" />
              <FormInput label="Previous Company"                     value={formvalues.previousCompany} onChange={set("previousCompany")} disabled={!isAdminOrManager} placeholder="e.g. Infosys" />
              <FormInput label="Total Experience (Yrs)" type="number" value={formvalues.totalExperience} onChange={set("totalExperience")} disabled={!isAdminOrManager} placeholder="e.g. 3" />
            </FormRow>
          </FormSection>
        );

      /* ── Step 4: Other Details ── */
      case 4:
        return (
          <>
            <FormSection title="Emergency Contact">
              <FormRow cols={3}>
                <FormInput  label="Emergency Contact Name"   value={formvalues.emergencyContactName}   onChange={set("emergencyContactName")}   placeholder="e.g. Jane Doe" />
                <FormInput  label="Emergency Contact Number" type="number" value={formvalues.emergencyContactNumber} onChange={set("emergencyContactNumber")} />
                <FormSelect label="Relationship" options={withPlaceholder("Select Relation", RELATION_OPTIONS)} value={formvalues.relationship} onChange={set("relationship")} />
              </FormRow>
            </FormSection>
            <FormSection title="Work Preferences">
              <FormRow cols={3}>
                <FormSelect label="Work Shift" options={withPlaceholder("Select Shift", WORK_SHIFT_OPTIONS)} value={formvalues.workShift} onChange={set("workShift")} />
                <FormSelect label="Work Mode"  options={withPlaceholder("Select Mode",  WORK_MODE_OPTIONS)}  value={formvalues.workMode}  onChange={set("workMode")} />
                <FormInput  label="Notes" value={formvalues.notes} onChange={set("notes")} placeholder="Any additional notes..." />
              </FormRow>
            </FormSection>
          </>
        );

      default:
        return "Unknown step";
    }
  };

  /* ── render ── */
  return (
    <div>
      <LoadingMask loading={loading} />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <Breadcrumb icon={<Users size={13} />} items={breadCrumb} />
          <h1 className="page-title">{isEditMode ? "Update Employee" : "Add Employee"}</h1>
          <p className="page-subtitle">
            Fill in all sections to {isEditMode ? "update" : "create"} the employee profile
          </p>
        </div>
        <button className="icon-btn" onClick={handleCancel} style={{ color: "var(--coral)" }}>
          <X size={20} />
        </button>
      </div>

      <div className="form-centered-wrap">
        <div className="card">

          {/* Gradient bar */}
          <div style={{ height: 5, background: "linear-gradient(90deg,var(--primary),var(--teal))" }} />

          {/* Card Header */}
          <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,var(--primary),var(--teal))", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Users size={20} color="white" />
            </div>
            <div>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:17, fontWeight:800, color:"var(--text-primary)" }}>
                {isEditMode ? "Edit Employee" : "Add New Employee"}
              </div>
              <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>
                Fill in all sections to {isEditMode ? "update" : "create"} the employee profile
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div style={{ padding:"20px 24px 0", borderBottom:"1px solid var(--border)" }}>
            <div style={{ display:"flex", alignItems:"center" }}>
              {steps.map((label, index) => (
                <React.Fragment key={index}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, flex: index < steps.length - 1 ? 0 : undefined }}>
                    <div style={{
                      width:36, height:36, borderRadius:"50%",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      background: activeStep > index ? "var(--teal)" : activeStep === index ? "linear-gradient(135deg,var(--primary),var(--primary-light))" : "var(--bg)",
                      color: activeStep >= index ? "white" : "var(--text-muted)",
                      fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, fontWeight:800,
                      border:`2px solid ${activeStep > index ? "var(--teal)" : activeStep === index ? "var(--primary)" : "var(--border)"}`,
                      transition:"all 0.3s", flexShrink:0,
                    }}>
                      {activeStep > index ? "✓" : (index + 1)}
                    </div>
                    <span style={{ fontSize:10.5, fontWeight:700, color: activeStep >= index ? "var(--primary)" : "var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>
                      {label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div style={{ flex:1, height:2, background: activeStep > index ? "var(--teal)" : "var(--border)", margin:"0 6px", marginBottom:20, transition:"background 0.3s" }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div style={{ padding:"24px", maxHeight:"60vh", overflowY:"auto" }}>
            {getStepContent(activeStep)}
          </div>

          {/* Footer */}
          <div style={{ padding:"16px 24px", borderTop:"1px solid var(--border)", display:"flex", justifyContent:"space-between", background:"#faf8ff" }}>
            <button
              disabled={activeStep === 0}
              onClick={handleBack}
              className={`btn btn-ghost ${activeStep === 0 ? "" : "btn-outline"}`}
              style={{ opacity: activeStep === 0 ? 0.4 : 1 }}
            >
              ← Previous
            </button>
            <button onClick={handleNext} className="btn btn-primary">
              {activeStep === steps.length - 1
                ? (isEditMode ? "Update Employee" : "Save Employee")
                : "Next →"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}