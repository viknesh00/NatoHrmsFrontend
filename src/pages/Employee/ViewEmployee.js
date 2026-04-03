import React, { useEffect, useState } from "react";
import { getCookie } from "../../services/Cookies";
import { getRequest } from "../../services/Apiservice";
import Breadcrumb from "../../services/Breadcrumb";
import LoadingMask from "../../services/LoadingMask";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Edit, User, Briefcase, DollarSign, GraduationCap,
  Phone, MapPin, FileText, Shield, Heart, Clock,
  Users
} from "lucide-react";

const fmt = (v) => {
  if (!v || v === "-") return "—";
  if (v instanceof Date || (typeof v === "string" && v.match(/^\d{4}-/))) {
    return dayjs(v).format("DD-MM-YYYY");
  }
  return v;
};

function Section({ icon, title, children }) {
  return (
    <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden", boxShadow: "var(--shadow-sm)", marginBottom: 16 }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "linear-gradient(135deg, var(--primary-ghost), #f0fdf4 80%)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, var(--primary), var(--teal))", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {React.cloneElement(icon, { size: 17, color: "white" })}
        </div>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</span>
      </div>
      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px 24px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>{value || "—"}</div>
    </div>
  );
}

export default function ViewEmployee() {
  const navigate = useNavigate();
  const email = getCookie("email");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRequest(`User/GetUser/${email}`)
      .then(res => { if (res.data?.length) setData(res.data[0]); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [email]);

  const fmtGender = (g) => g === "M" ? "Male" : g === "F" ? "Female" : g || "—";

  if (loading) return <LoadingMask loading />;
  if (!data) return <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>No profile data found</div>;

  const initials = `${data.firstName?.[0] || ""}${data.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div>
      <div className="page-header">
        <div>
          <Breadcrumb icon={<Users size={13} />} items={[{ label: "View Profile" }]} />
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Your employee information</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate(`/employees/edit-employee/${email}`)}>
          <Edit size={15} /> Edit Profile
        </button>
      </div>

      {/* Profile Hero Card */}
      <div style={{ background: "linear-gradient(135deg, var(--primary-dark), var(--primary), var(--primary-light))", borderRadius: "var(--radius-xl)", padding: "28px 32px", marginBottom: 20, display: "flex", alignItems: "center", gap: 24, boxShadow: "0 8px 32px var(--primary-glow)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -30, top: -30, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ position: "absolute", right: 80, bottom: -40, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 28, fontWeight: 900, color: "white", border: "3px solid rgba(255,255,255,0.3)", flexShrink: 0, backdropFilter: "blur(10px)" }}>
          {initials}
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 22, fontWeight: 900, color: "white", lineHeight: 1.2 }}>
            {data.firstName} {data.lastName}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
            {data.designation} · {data.department}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
            {[
              { label: data.employeeId, icon: "🆔" },
              { label: data.workLocation, icon: "📍" },
              { label: data.accessRole, icon: "🔑" },
            ].filter(b => b.label).map((b, i) => (
              <span key={i} style={{ background: "rgba(255,255,255,0.15)", color: "white", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, backdropFilter: "blur(6px)" }}>
                {b.icon} {b.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Section icon={<User />} title="Personal Details">
        <Field label="First Name" value={data.firstName} />
        <Field label="Last Name" value={data.lastName} />
        <Field label="Gender" value={fmtGender(data.gender)} />
        <Field label="Date of Birth" value={fmt(data.dob)} />
        <Field label="Marital Status" value={data.maritalStatus} />
        <Field label="Nationality" value={data.nationality} />
        <Field label="Blood Group" value={data.bloodGroup} />
        <Field label="Contact Number" value={data.contactNumber} />
        <Field label="Email Address" value={data.email} />
        <Field label="Address" value={data.address} />
      </Section>

      <Section icon={<Briefcase />} title="Employment Details">
        <Field label="Employee ID" value={data.employeeId} />
        <Field label="Employee Type" value={data.employeeType} />
        <Field label="Department" value={data.department} />
        <Field label="Designation" value={data.designation} />
        <Field label="Date of Joining" value={fmt(data.doj)} />
        <Field label="Work Location" value={data.workLocation} />
        <Field label="Work Shift" value={data.workShift} />
        <Field label="Work Mode" value={data.workMode} />
        <Field label="Employment Status" value={data.employmentStatus} />
        <Field label="Reporting Manager" value={data.reportingManager} />
        <Field label="Access Role" value={data.accessRole} />
      </Section>

      <Section icon={<DollarSign />} title="Salary & Compensation">
        <Field label="CTC (Annual)" value={data.ctc ? `₹ ${Number(data.ctc).toLocaleString()}` : "—"} />
        <Field label="Basic Salary" value={data.basicSalary ? `₹ ${Number(data.basicSalary).toLocaleString()}` : "—"} />
        <Field label="HRA" value={data.hra ? `₹ ${Number(data.hra).toLocaleString()}` : "—"} />
        <Field label="Medical Allowance" value={data.medicalAllowance ? `₹ ${Number(data.medicalAllowance).toLocaleString()}` : "—"} />
        <Field label="Conveyance Allowance" value={data.conveyanceAllowance ? `₹ ${Number(data.conveyanceAllowance).toLocaleString()}` : "—"} />
        <Field label="Special Allowance" value={data.specialAllowance ? `₹ ${Number(data.specialAllowance).toLocaleString()}` : "—"} />
        <Field label="Employee PF" value={data.employeePF ? `₹ ${Number(data.employeePF).toLocaleString()}` : "—"} />
        <Field label="PF Account Number" value={data.pfAccountNumber} />
        <Field label="ESI Number" value={data.esiNumber} />
      </Section>

      <Section icon={<Shield />} title="Bank & Compliance">
        <Field label="Bank Name" value={data.bankName} />
        <Field label="Account Number" value={data.accountNumber} />
        <Field label="IFSC Code" value={data.ifscCode} />
        <Field label="PAN Number" value={data.panNumber} />
        <Field label="UAN Number" value={data.uanNumber} />
      </Section>

      <Section icon={<GraduationCap />} title="Education & Experience">
        <Field label="Highest Qualification" value={data.highestQualification} />
        <Field label="Specialization" value={data.specialization} />
        <Field label="University" value={data.university} />
        <Field label="Year of Passing" value={data.yearOfPassing} />
        <Field label="Previous Company" value={data.previousCompany} />
        <Field label="Total Experience" value={data.totalExperience} />
      </Section>

      <Section icon={<Heart />} title="Emergency Contact">
        <Field label="Contact Name" value={data.emergencyContactName} />
        <Field label="Contact Number" value={data.emergencyContactNumber} />
        <Field label="Relationship" value={data.relationship} />
      </Section>

      {data.notes && (
        <Section icon={<FileText />} title="Notes">
          <div style={{ gridColumn: "1 / -1", fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.7 }}>{data.notes}</div>
        </Section>
      )}
    </div>
  );
}
