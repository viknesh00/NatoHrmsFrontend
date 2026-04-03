import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { postRequest, getRequest } from "../../services/Apiservice";
import { ToastSuccess, ToastError } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import { FormDate, FormDropdown, FormTextarea, FormCard, FormSection, FormRow } from "../../components/FormComponents";
import { Megaphone, Save, X } from "lucide-react";
import { useEffect } from "react";
import { getRequest as gr } from "../../services/Apiservice";

const STATUS_OPTS = [{ label:"Active", value:"true" }, { label:"Inactive", value:"false" }];

const AnnouncementForm = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const editData  = location.state?.editData || null;
  const [loading, setLoading] = useState(false);
  const [deptOptions, setDeptOptions] = useState([]);

  // Parse DD-MM-YYYY → YYYY-MM-DD for date input
  const parseDMY = (s) => {
    if (!s) return "";
    const p = s.split(/[-/]/);
    if (p.length !== 3) return "";
    const [d,m,y] = p;
    if (y.length === 4) return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
    return s;
  };

  const [form, setForm] = useState({
    id:               editData?.id ?? null,
    announcementdate: editData?.announcementDate ? parseDMY(editData.announcementDate) : "",
    description:      editData?.description || "",
    department:       editData?.department || "",
    isActive:         editData?.isActive != null ? String(editData.isActive) : "true",
  });

  useEffect(() => {
    // Load departments from API
    gr("Account/GetDepartments").then(res => {
      if (res.data) {
        const opts = res.data.map(d => ({ label: d.value || d.label || d, value: d.value || d.label || d }));
        if (!opts.find(o => o.value === "All")) opts.unshift({ label:"All Departments", value:"All" });
        setDeptOptions(opts);
      }
    }).catch(() => {
      // fallback static options
      setDeptOptions([
        { label:"All Departments", value:"All" },
        { label:"HR", value:"HR" },
        { label:"Management", value:"Management" },
        { label:"IT", value:"IT" },
        { label:"Finance", value:"Finance" },
        { label:"Operations", value:"Operations" },
      ]);
    });
  }, []);

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }));
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.announcementdate) e.date = "Date is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.department) e.department = "Department is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) { ToastError("Please fill all required fields"); return; }
    const payload = {
      id: form.id,
      announcementdate: form.announcementdate,
      description: form.description,
      department: form.department,
      isActive: form.isActive === "true",
    };
    setLoading(true);
    postRequest("Announcement/SaveAnnouncement", payload)
      .then(res => { if (res.status === 200) { ToastSuccess(res.data.message || "Saved successfully"); navigate("/announcement"); } })
      .catch(err => ToastError(err?.response?.data?.message || "Failed to save"))
      .finally(() => setLoading(false));
  };

  return (
    <div>
      <LoadingMask loading={loading} />
      <div className="page-header">
        <div>
          <Breadcrumb icon={<Megaphone size={13} />} items={[{ label:"Announcements", link:"/announcement" }, { label: editData ? "Edit Announcement" : "Create Announcement" }]} />
          <h1 className="page-title">{editData ? "Edit Announcement" : "Create Announcement"}</h1>
          <p className="page-subtitle">Broadcast important updates to your team</p>
        </div>
      </div>

      <div style={{ maxWidth:640, margin:"0 auto" }}>
        <FormCard
          icon={<Megaphone />}
          title={editData ? "Edit Announcement" : "New Announcement"}
          subtitle="Fill the details and publish to notify employees"
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => navigate("/announcement")}><X size={15}/> Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}><Save size={15}/> {editData ? "Update" : "Publish"}</button>
            </>
          }
        >
          <FormSection title="Announcement Details">
            <FormRow cols={2}>
              <FormDate
                label="Announcement Date"
                required
                value={form.announcementdate}
                onChange={e => set("announcementdate")(e.target.value)}
                error={errors.date}
              />
              <FormDropdown label="Target Department" required options={deptOptions} value={form.department} onChange={o => set("department")(o.value)} error={errors.department} placeholder="Select department..." />
            </FormRow>

            <div>
              <label className="fc-label">Announcement Content <span className="req">*</span></label>
              <textarea className="fc-input" rows={5} value={form.description} onChange={e => set("description")(e.target.value)} placeholder="Write your announcement here..." style={{ minHeight:120 }} />
              {errors.description && <div className="fc-error">{errors.description}</div>}
            </div>

            <FormDropdown label="Status" options={STATUS_OPTS} value={form.isActive} onChange={o => set("isActive")(o.value)} />
          </FormSection>
        </FormCard>
      </div>
    </div>
  );
};

export default AnnouncementForm;
