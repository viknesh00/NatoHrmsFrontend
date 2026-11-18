import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRequest, postRequest } from "../../shared/services/Apiservice";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
import LoadingMask from "../../shared/services/LoadingMask";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { getCookie } from "../../auth/Cookies";
import { FormInput, FormSelect, FormRow, FormSection, FormDate } from "../../components/FormComponents";

/* ── Input styles (same as DocumentUploadForm) ── */
const IS = {
  label: { display:"block", fontFamily:"var(--ui-font-sans)", fontSize:13, fontWeight:500, color:"var(--foreground)", letterSpacing:"0", marginBottom:8 },
  input: { width:"100%", minHeight:40, padding:"9px 12px", borderRadius:"var(--radius)", border:"1px solid var(--border)", background:"var(--card)", fontFamily:"var(--ui-font-sans)", fontSize:14, color:"var(--foreground)", outline:"none", transition:"all 0.2s", boxSizing:"border-box" },
  error: { fontSize:13, color:"var(--coral)", marginTop:4 },
};

function FocusInput({ style: s, disabled, ...props }: Record<string, any>) {
  return (
    <Input
      {...props}
      disabled={disabled}
      style={{ ...IS.input, ...(disabled ? { opacity:0.5, cursor:"not-allowed" } : {}), ...s }}
      onFocus={(e) => { if (!disabled) { e.target.style.borderColor="var(--primary)"; e.target.style.boxShadow="0 0 0 3px var(--primary-ghost)"; e.target.style.background="var(--card)"; } }}
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
const ACCESS_ROLE_OPTIONS = [{ label: "Admin", value: "Admin" }, { label: "Manager", value: "Manager" }, { label: "Team Lead", value: "TeamLead" }, { label: "Employee", value: "Employee" }];
const WORK_SHIFT_OPTIONS  = [{ label: "Day", value: "Day" }, { label: "Night", value: "Night" }, { label: "Rotational", value: "Rotational" }];
const WORK_MODE_OPTIONS   = [{ label: "Office", value: "Office" }, { label: "Remote", value: "Remote" }, { label: "Hybrid", value: "Hybrid" }];
const RELATION_OPTIONS    = [{ label: "Spouse", value: "Spouse" }, { label: "Parent", value: "Parent" }, { label: "Friend", value: "Friend" }];
const GEO_FENCE_OPTIONS = [{ label: "No", value: "No" }, { label: "Yes", value: "Yes" }];

const withPlaceholder = (label, options) => [{ label, value: "" }, ...options];

/* ── Role hierarchy — highest to lowest ── */
const ROLE_HIERARCHY = ["Admin", "Manager", "TeamLead", "Employee"];

/* ── Only show roles at or below the current user's own level ── */
const getAllowedAccessRoles = (role) => {
  const idx = ROLE_HIERARCHY.indexOf(role);
  if (idx === -1) return ACCESS_ROLE_OPTIONS; // unknown role → no restriction
  return ACCESS_ROLE_OPTIONS.filter(
    (opt) => ROLE_HIERARCHY.indexOf(opt.value) >= idx
  );
};

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
  const canManageEmployeeFields  = userRole === "Admin" || userRole === "Manager" || userRole === "TeamLead";

  /* ── form state ── */
  const [formvalues, setFormvalues] = useState({
    // Personal
    firstName: "", lastName: "", gender: "", dob: "",
    maritalStatus: "", nationality: "", bloodGroup: "",
    contactNumber: "", email: "", address: "",
    // Employment
    employeeId: "", employeeType: "", designation: "", doj: "",
    department: "", workLocation: "", employmentStatus: "",
    reportingManager: "", accessRole: "",restrictToWorkLocation: "No",
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
            restrictToWorkLocation: (d.restrictToWorkLocation === 1 || d.restrictToWorkLocation === "1") ? "Yes" : "No",
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
    const newObj: Record<string, any> = {};
    for (const key in data) {
      let value = data[key];
      if (key === "dob" || key === "doj") {
        if (value && value !== "") {
          const parsed = new Date(value + "T12:00:00.000Z");
          value = isNaN(parsed.getTime()) ? null : parsed.toISOString();
        } else {
          value = null;
        }
      } else if (key === "projects") {
        newObj["projectAssigned"] = Array.isArray(value) ? value.join(",") : value || null;
        continue;
      } else if (key === "restrictToWorkLocation") {
        value = value === "Yes";
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
            !canManageEmployeeFields  ? navigate("/profile") : navigate("/employees");
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

  const handleCancel = () => (!canManageEmployeeFields  ? navigate("/profile") : navigate("/employees"));
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
              <FormInput  label="Employee ID *"  value={formvalues.employeeId}   onChange={set("employeeId")}   disabled={!canManageEmployeeFields } placeholder="e.g. EMP-001" />
              <FormSelect label="Employee Type"  options={withPlaceholder("Select Type", EMP_TYPE_OPTIONS)} value={formvalues.employeeType} onChange={set("employeeType")} disabled={!canManageEmployeeFields } />
              <FormInput  label="Designation"    value={formvalues.designation}  onChange={set("designation")}  disabled={!canManageEmployeeFields } placeholder="e.g. Software Engineer" />
            </FormRow>
            <FormRow cols={3}>
              <FormDate   label="Date of Joining" value={formvalues.doj} onChange={set("doj")} disabled={!canManageEmployeeFields } />
              <FormSelect label="Department *"     options={withPlaceholder("Select Department", departmentNames)} value={formvalues.department} onChange={handleDepartmentChange} disabled={!canManageEmployeeFields } />

              {/* ── Projects inline multi-select (DocumentUploadForm pattern) ── */}
              <div className="mb-[0px]" >
                <label style={IS.label}>Projects</label>

                {/* Selected chips */}
                <div className="flex flex-wrap gap-[8px]" style={{marginBottom: formvalues.projects.length ? 8 : 0}}>
                  {formvalues.projects.map((val) => (
                    <span key={val} className="flex items-center gap-[4px] bg-[var(--primary-ghost)] text-primary text-[12px] font-semibold p-[4px_12px]" style={{borderRadius:"var(--radius)"}}>
                      {val}
                      {canManageEmployeeFields  && (
                        <span onClick={() => removeProject(val)} className="cursor-pointer text-[14px] leading-[1]" >×</span>
                      )}
                    </span>
                  ))}
                </div>

                {/* Search input + dropdown */}
                <div className="relative"  ref={projectDropdownRef}>
                  <FocusInput
                    value={projectSearch}
                    disabled={!canManageEmployeeFields }
                    onChange={(e) => { setProjectSearch(e.target.value); setShowProjectDrop(true); }}
                    onFocus={() => canManageEmployeeFields  && setShowProjectDrop(true)}
                    placeholder={
                      !formvalues.department
                        ? "Select a department first..."
                        : filteredProjects.length === 0
                          ? "No projects for this department"
                          : "Search and select projects..."
                    }
                  />
                  {showProjectDrop && canManageEmployeeFields  && (
                    <div className="absolute top-[100%] left-[0px] right-[0px] bg-card z-[200] max-h-[200px] overflow-y-auto mt-[4px]" style={{border:"1px solid var(--border)", borderRadius:"var(--radius)", boxShadow:"var(--shadow-lg)"}}>
                      {filteredProjects.length === 0 ? (
                        <div className="p-[12px_16px] text-[13px] text-[var(--text-muted)]" >
                          {!formvalues.department ? "Select a department first" : "No projects found for this department"}
                        </div>
                      ) : filteredProjects.map((o) => {
                        const isSel = formvalues.projects.includes(o.value);
                        return (
                          <div
                            key={o.value}
                            onMouseDown={() => toggleProject(o)}
                            className="p-[8px_16px] text-[13px] cursor-pointer flex items-center justify-between" style={{background: isSel ? "var(--primary-ghost)" : "var(--card)", color:      isSel ? "var(--primary)"       : "var(--text-primary)"}}
                          >
                            {o.label}
                            {isSel && <span className="text-[16px] text-primary" >✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </FormRow>

            <FormRow cols={3}>
              <FormInput  label="Work Location (City) *" value={formvalues.workLocation}    onChange={set("workLocation")}    disabled={!canManageEmployeeFields } placeholder="e.g. Chennai" />
              <FormSelect label="Geo-Fence Enabled"       options={GEO_FENCE_OPTIONS}              value={formvalues.restrictToWorkLocation} onChange={set("restrictToWorkLocation")} disabled={!canManageEmployeeFields } />
              <FormSelect label="Employment Status"       options={withPlaceholder("Select Status",  EMP_STATUS_OPTIONS)}  value={formvalues.employmentStatus} onChange={set("employmentStatus")} disabled={!canManageEmployeeFields } />
            </FormRow>
            <FormRow cols={3}>
              <FormSelect label="Reporting Manager *"     options={withPlaceholder("Select Manager", managerList)}         value={formvalues.reportingManager} onChange={set("reportingManager")} disabled={!canManageEmployeeFields } />
              <FormSelect
                label="Access Role *"
                options={withPlaceholder("Select Role", getAllowedAccessRoles(userRole))}
                value={formvalues.accessRole}
                onChange={set("accessRole")}
                disabled={!canManageEmployeeFields}
              />
            </FormRow>
          </FormSection>
        );

      /* ── Step 2: Salary Details ── */
      case 2:
        return (
          <FormSection title="Salary Info">
            <FormRow cols={3}>
              <FormInput label="CTC"          type="number" value={formvalues.ctc}         onChange={set("ctc")}         disabled={!canManageEmployeeFields } placeholder="e.g. 600000" />
              <FormInput label="Basic Salary" type="number" value={formvalues.basicSalary} onChange={set("basicSalary")} disabled={!canManageEmployeeFields } placeholder="e.g. 300000" />
              <FormInput label="HRA"          type="number" value={formvalues.hra}         onChange={set("hra")}         disabled={!canManageEmployeeFields } placeholder="e.g. 120000" />
            </FormRow>
            <FormRow cols={3}>
              <FormInput label="Conveyance Allowance" type="number" value={formvalues.conveyanceAllowance} onChange={set("conveyanceAllowance")} disabled={!canManageEmployeeFields } />
              <FormInput label="Medical Allowance"    type="number" value={formvalues.medicalAllowance}    onChange={set("medicalAllowance")}    disabled={!canManageEmployeeFields } />
              <FormInput label="Special Allowance"    type="number" value={formvalues.specialAllowance}    onChange={set("specialAllowance")}    disabled={!canManageEmployeeFields } />
            </FormRow>
            <FormRow cols={3}>
              <FormInput label="Employee PF"    type="number" value={formvalues.employeePF}    onChange={set("employeePF")}    disabled={!canManageEmployeeFields } />
              <FormInput label="Bank Name"                    value={formvalues.bankName}       onChange={set("bankName")}       disabled={!canManageEmployeeFields } placeholder="e.g. HDFC Bank" />
              <FormInput label="Account Number" type="number" value={formvalues.accountNumber} onChange={set("accountNumber")} disabled={!canManageEmployeeFields } />
            </FormRow>
            <FormRow cols={3}>
              <FormInput label="IFSC Code"  value={formvalues.ifscCode}  onChange={set("ifscCode")}  disabled={!canManageEmployeeFields } placeholder="e.g. HDFC0001234" />
              <FormInput label="PAN Number" value={formvalues.panNumber} onChange={set("panNumber")} disabled={!canManageEmployeeFields } placeholder="e.g. ABCDE1234F" />
              <FormInput label="UAN Number" type="number" value={formvalues.uanNumber} onChange={set("uanNumber")} disabled={!canManageEmployeeFields } />
            </FormRow>
            <FormRow cols={2}>
              <FormInput label="PF Account Number" value={formvalues.pfAccountNumber} onChange={set("pfAccountNumber")} disabled={!canManageEmployeeFields } />
              <FormInput label="ESI Number"         value={formvalues.esiNumber}       onChange={set("esiNumber")}       disabled={!canManageEmployeeFields } />
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
              <FormInput label="Previous Company"                     value={formvalues.previousCompany} onChange={set("previousCompany")} disabled={!canManageEmployeeFields } placeholder="e.g. Infosys" />
              <FormInput label="Total Experience (Yrs)" type="number" value={formvalues.totalExperience} onChange={set("totalExperience")} disabled={!canManageEmployeeFields } placeholder="e.g. 3" />
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
      <div className="page-header employee-wizard-page-header">
        <div>
          <Button type="button" variant="ghost" className="wizard-return-link" onClick={handleCancel}><ArrowLeft size={14} aria-hidden="true" /> {canManageEmployeeFields ? "Back to employees" : "Back to profile"}</Button>
          <h1 className="page-title">{isEditMode ? "Update Employee" : "Add Employee"}</h1>
          <p className="page-subtitle">
            Fill in all sections to {isEditMode ? "update" : "create"} the employee profile
          </p>
        </div>
      </div>

      <div className="form-centered-wrap employee-wizard-wrap">
        <div className="card employee-wizard-card">
          {/* Stepper */}
          <div className="wizard-progress-shell">
            <div className="wizard-stepper-list" role="list" aria-label="Employee form steps">
              {steps.map((label, index) => <div key={label} className={`wizard-stepper-item${activeStep === index ? " is-current" : activeStep > index ? " is-complete" : ""}`} role="listitem" aria-current={activeStep === index ? "step" : undefined} aria-label={`Step ${index + 1}: ${label}${activeStep > index ? ", completed" : activeStep === index ? ", current step" : ""}`}>
                <span className="wizard-stepper-index">{activeStep > index ? <Check size={14} aria-hidden="true" /> : index + 1}</span>
                <span className="wizard-stepper-label">{label}</span>
              </div>)}
            </div>
          </div>

          {/* Step Content */}
          <div className="employee-wizard-content">
            {getStepContent(activeStep)}
          </div>

          {/* Footer */}
          <div className="employee-wizard-footer">
            <Button variant="ghost" type="button"
              disabled={activeStep === 0}
              onClick={handleBack}
              className={`wizard-back-button ${activeStep === 0 ? "is-disabled" : ""}`}
              style={{ opacity: activeStep === 0 ? 0.4 : 1 }}
            >
              <ArrowLeft size={15} aria-hidden="true" /> Previous
            </Button>
            <Button variant="default" type="button" onClick={handleNext} className="wizard-next-button">
              {activeStep === steps.length - 1
                ? (isEditMode ? "Update Employee" : "Save Employee")
                : <>Continue <ArrowRight size={15} aria-hidden="true" /></>}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
