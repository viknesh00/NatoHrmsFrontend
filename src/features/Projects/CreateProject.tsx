import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { postRequest, getRequest } from "../../shared/services/Apiservice";
import { ToastSuccess, ToastError } from "../../shared/services/ToastMsg";
import LoadingMask from "../../shared/services/LoadingMask";
import Breadcrumb from "../../shared/services/Breadcrumb";
import { FormInput, FormDate, FormSelect, FormTextarea, FormCard, FormSection, FormRow, } from "../../components/FormComponents";
import { Briefcase, Save, X } from "lucide-react";

/* ── helpers ── */
const parseDMY = (d) => {
  if (!d) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.substring(0, 10);
  const [day, month, year] = d.split("-");
  if (day && month && year) return `${year}-${month}-${day}`;
  return "";
};

const deptStringToArray = (str) =>
  str ? str.split(",").map((s) => s.trim()).filter(Boolean).map((s) => ({ label: s, value: s })) : [];

/* ── Input styles (same as DocumentUploadForm) ── */
const IS = {
  label: { display:"block", fontFamily:"var(--ui-font-heading)", fontSize:12, fontWeight:600, color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:7 },
  input: { width:"100%", padding:"10px 13px", borderRadius:"var(--radius)", border:"1px solid var(--border)", background:"var(--bg)", fontFamily:"var(--ui-font-sans)", fontSize:14, color:"var(--text-primary)", outline:"none", transition:"all 0.2s", boxSizing:"border-box" },
  error: { fontSize:13, color:"var(--coral)", marginTop:4 },
};

function FocusInput({ style: s, ...props }: Record<string, any>) {
  return (
    <Input
      {...props}
      style={{ ...IS.input, ...s }}
      onFocus={(e) => { e.target.style.borderColor="var(--primary)"; e.target.style.boxShadow="0 0 0 3px var(--primary-ghost)"; e.target.style.background="var(--card)"; }}
      onBlur={(e)  => { e.target.style.borderColor="var(--border)";  e.target.style.boxShadow="none"; e.target.style.background="var(--bg)"; }}
    />
  );
}

const CreateProject = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData || null;

  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState<Record<string, any>>({});
  const [deptOptions, setDeptOptions] = useState([]);
  const [deptSearch,  setDeptSearch]  = useState("");
  const [showDeptDrop, setShowDeptDrop] = useState(false);

  /* ── ref for outside-click close (same as peopleDropdownRef) ── */
  const deptDropdownRef = useRef(null);

  const [form, setForm] = useState({
    projectId:    editData?.projectId    ?? null,
    projectName:  editData?.projectName  || "",
    description:  editData?.description  || "",
    clientName:   editData?.clientName   || "",
    managerEmail: editData?.managerEmail || "",
    startDate:    parseDMY(editData?.startDate),
    endDate:      parseDMY(editData?.endDate),
    status:       editData?.status || "Active",
    assignedDepts: deptStringToArray(editData?.department),
  });

  /* ── Load departments ── */
  useEffect(() => {
    getRequest("Attendance/GetAllDepartments")
      .then((res) => {
        if (res.data)
          setDeptOptions(res.data.map((d) => ({ label: d.departmentName, value: d.departmentName })));
      })
      .catch(console.error);
  }, []);

  /* ── Close dept dropdown on outside click ── */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target))
        setShowDeptDrop(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  /* ── Department multi-select helpers (mirrors togglePerson / removePerson) ── */
  const toggleDept = (option) => {
    const already  = form.assignedDepts.some((d) => d.value === option.value);
    setForm((prev) => ({
      ...prev,
      assignedDepts: already
        ? prev.assignedDepts.filter((d) => d.value !== option.value)
        : [...prev.assignedDepts, option],
    }));
  };

  const removeDept = (val) =>
    setForm((prev) => ({ ...prev, assignedDepts: prev.assignedDepts.filter((d) => d.value !== val) }));

  const filteredDepts = deptOptions.filter((o) =>
    o.label.toLowerCase().includes(deptSearch.toLowerCase())
  );

  /* ── Validation ── */
  const validate = () => {
    const e: Record<string, any> = {};
    if (!form.projectName.trim()) e.projectName = "Project name is required";
    if (!form.startDate)          e.startDate   = "Start date is required";
    if (form.endDate && form.endDate < form.startDate)
      e.endDate = "End date must be after start date";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Duration badge ── */
  const calcDuration = () => {
    if (!form.startDate || !form.endDate) return null;
    const diff = Math.ceil(
      (new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff <= 0) return null;
    const months = Math.floor(diff / 30);
    const days   = diff % 30;
    return months > 0 ? `${months}m ${days}d` : `${diff} day${diff !== 1 ? "s" : ""}`;
  };

  const duration = calcDuration();

  /* ── Save ── */
  const handleSave = () => {
    if (!validate()) { ToastError("Please fill all required fields"); return; }

    const payload = {
      projectId:    form.projectId,
      projectName:  form.projectName,
      description:  form.description  || null,
      clientName:   form.clientName   || null,
      managerEmail: form.managerEmail || null,
      startDate:    form.startDate    || null,
      endDate:      form.endDate      || null,
      status:       form.status,
      department:   form.assignedDepts.map((d) => d.value).join(",") || null,
    };

    setLoading(true);
    postRequest("Project/InsertOrUpdate", payload)
      .then((res) => {
        if (res.status === 200) {
          ToastSuccess(res.data?.message || "Project saved successfully");
          navigate("/employees/projects");
        }
      })
      .catch((err) =>
        ToastError(err?.response?.data?.message || "Failed to save project")
      )
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <LoadingMask loading={loading} />

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <Breadcrumb
            icon={<Briefcase size={13} />}
            items={[
              { label: "Employees", link: "/employees" },
              { label: "Projects",  link: "/employees/projects" },
              { label: editData ? "Edit Project" : "Create Project" },
            ]}
          />
          <h1 className="page-title">{editData ? "Edit Project" : "Create Project"}</h1>
          <p className="page-subtitle">
            {editData ? "Update the project details" : "Set up a new project for your team"}
          </p>
        </div>
      </div>

      <div className="max-w-[680px] m-[0_auto]" >
        <FormCard
          icon={<Briefcase />}
          title={editData ? "Edit Project" : "New Project"}
          subtitle="Fill in the project details, timeline, and status"
          footer={
            <>
              <Button variant="outline" type="button" className="btn btn-ghost" onClick={() => navigate("/employees/projects")}>
                <X size={15} /> Cancel
              </Button>
              <Button variant="default" type="button" className="btn btn-primary" onClick={handleSave}>
                <Save size={15} /> {editData ? "Update" : "Save"}
              </Button>
            </>
          }
        >
          {/* ── Project Information ── */}
          <FormSection title="Project Information">
            <FormInput
              label="Project Name"
              required
              value={form.projectName}
              onChange={set("projectName")}
              error={errors.projectName}
              placeholder="e.g. HR Portal Revamp"
            />
            <FormTextarea
              label="Description"
              value={form.description}
              onChange={set("description")}
              placeholder="Brief description of the project goals and scope..."
              rows={3}
            />
            <FormInput
              label="Client Name"
              value={form.clientName}
              onChange={set("clientName")}
              placeholder="e.g. Acme Corp (leave blank if internal)"
            />

            {/* ── Department multi-select (same pattern as Assign People) ── */}
            <div className="mb-[16px]" >
              <label style={IS.label}>Department</label>

              {/* Selected chips */}
              <div className="flex flex-wrap gap-[8px]" style={{marginBottom: form.assignedDepts.length ? 8 : 0}}>
                {form.assignedDepts.map((d) => (
                  <span key={d.value} className="flex items-center gap-[4px] bg-[var(--primary-ghost)] text-primary text-[12px] font-semibold p-[4px_12px]" style={{borderRadius:"var(--radius)"}}>
                    {d.label}
                    <span onClick={() => removeDept(d.value)} className="cursor-pointer text-[14px] leading-[1]" >×</span>
                  </span>
                ))}
              </div>

              {/* Search input + dropdown container */}
              <div className="relative"  ref={deptDropdownRef}>
                <FocusInput
                  value={deptSearch}
                  onChange={(e) => { setDeptSearch(e.target.value); setShowDeptDrop(true); }}
                  onFocus={() => setShowDeptDrop(true)}
                  placeholder="Search and select departments..."
                />

                {/* Dropdown */}
                {showDeptDrop && (
                  <div className="absolute top-[100%] left-[0px] right-[0px] bg-card z-[100] max-h-[200px] overflow-y-auto mt-[4px]" style={{border:"1px solid var(--border)", borderRadius:"var(--radius)", boxShadow:"var(--shadow-lg)"}}>
                    {filteredDepts.length === 0 ? (
                      <div className="p-[12px_16px] text-[13px] text-[var(--text-muted)]" >No results</div>
                    ) : filteredDepts.map((o) => {
                      const isSelected = form.assignedDepts.some((d) => d.value === o.value);
                      return (
                        <div
                          key={o.value}
                          onMouseDown={() => toggleDept(o)}
                          className="p-[8px_16px] text-[13px] cursor-pointer flex items-center justify-between" style={{background: isSelected ? "var(--primary-ghost)" : "var(--card)", color:      isSelected ? "var(--primary)"       : "var(--text-primary)"}}
                        >
                          {o.label}
                          {isSelected && <span className="text-[16px] text-primary" >✓</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </FormSection>

          {/* ── Timeline ── */}
          <FormSection title="Timeline">
            <FormRow cols={2}>
              <FormDate
                label="Start Date"
                required
                value={form.startDate}
                onChange={set("startDate")}
                error={errors.startDate}
              />
              <FormDate
                label="End Date"
                value={form.endDate}
                onChange={set("endDate")}
                error={errors.endDate}
              />
            </FormRow>

            {duration && (
              <div className="bg-[var(--teal-ghost)] p-[12px_16px] mb-[20px] flex items-center gap-[8px]" style={{border:"1px solid var(--teal)", borderRadius:"var(--radius)"}}>
                <Briefcase size={15} color="var(--teal)" />
                <span className="text-[12px] font-semibold text-[var(--teal)] uppercase tracking-[0.05em]" >Duration:</span>
                <span className="text-[14px] font-semibold text-[var(--teal)]" >{duration}</span>
              </div>
            )}
          </FormSection>

          {/* ── Assignment & Status ── */}
          <FormSection title="Assignment & Status">
            <FormInput
              label="Project Manager Email"
              value={form.managerEmail}
              onChange={set("managerEmail")}
              placeholder="manager@company.com"
            />
            <FormSelect
              label="Status"
              value={form.status}
              onChange={set("status")}
              options={[
                { label: "Active",    value: "Active" },
                { label: "On Hold",   value: "On Hold" },
                { label: "Completed", value: "Completed" },
                { label: "Cancelled", value: "Cancelled" },
              ]}
            />
          </FormSection>
        </FormCard>
      </div>
    </div>
  );
};

export default CreateProject;