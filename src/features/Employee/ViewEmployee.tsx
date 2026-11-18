import { Button } from "../../components/ui/button";
import React, { useEffect, useState } from "react";
import { getCookie } from "../../auth/Cookies";
import { getRequest } from "../../shared/services/Apiservice";
import Breadcrumb from "../../shared/services/Breadcrumb";
import LoadingMask from "../../shared/services/LoadingMask";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { Edit, User, Briefcase, DollarSign, GraduationCap, MapPin, FileText, Shield, Heart, IdCard } from "lucide-react";
import ProfileAvatar from "../../components/ProfileAvatar";

const fmt = (v) => {
  if (!v || v === "-") return "N/A";
  if (v instanceof Date || (typeof v === "string" && v.match(/^\d{4}-/))) {
    return dayjs(v).format("DD-MM-YYYY");
  }
  return v;
};

function Section({ icon, title, children, fieldList = true }: Record<string, any>) {
  return (
    <section className="bg-[var(--bg-card)] overflow-hidden mb-[16px]" style={{borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)"}}>
      <div className="p-[16px_20px] bg-muted flex items-center gap-[12px]" style={{borderBottom: "1px solid var(--border)"}}>
        <div className="w-[34px] h-[34px] bg-primary flex items-center justify-center" style={{borderRadius: "var(--radius)"}}>
          {React.cloneElement(icon, { size: 17, color: "var(--card)" })}
        </div>
        <h2 className="text-[14px] font-semibold text-[var(--text-primary)]" style={{fontFamily: "var(--ui-font-heading)"}}>{title}</h2>
      </div>
      <div className="p-[20px_20px]" >
        {fieldList ? <dl className="grid gap-[12px_24px]" style={{gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))"}}>
          {children}
        </dl> : children}
      </div>
    </section>
  );
}

function Field({ label, value }: Record<string, any>) {
  return (
    <div className="min-w-0">
      <dt className="mb-1 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-semibold text-foreground">{value === 0 ? value : value || "N/A"}</dd>
    </div>
  );
}

export default function ViewEmployee() {
  const email = getCookie("email");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    if (!email) { setLoading(false); return; }
    getRequest(`User/GetUser/${encodeURIComponent(email)}`, { signal: controller.signal })
      .then(res => { if (!controller.signal.aborted) setData(Array.isArray(res.data) ? res.data[0] : res.data); })
      .catch(() => { if (!controller.signal.aborted) setData(null); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [email]);

  const fmtGender = (g) => g === "M" ? "Male" : g === "F" ? "Female" : g || "N/A";

  const initials = `${data?.firstName?.[0] || ""}${data?.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div>
      <div className="page-header">
        <div>
          <Breadcrumb icon={<User size={13} />} items={[{ label: "My Profile" }]} />
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Your employee information</p>
        </div>
        {data && <Button variant="default" className="btn btn-primary" asChild>
          <Link to={`/employees/edit-employee/${encodeURIComponent(email)}`}><Edit size={15} /> Edit Profile</Link>
        </Button>}
      </div>

      {loading && <LoadingMask loading layout label="Loading your profile" />}
      {!loading && !data && <p className="card card-body text-muted-foreground" role="status">Your profile information is unavailable.</p>}
      {data && <>
      {/* Profile Hero Card */}
      <div className="profile-hero-card">
        <ProfileAvatar seed={data.email || email} initials={initials} className="profile-hero-avatar" />
        <div className="profile-hero-copy">
          <div className="profile-hero-title">
            {data.firstName} {data.lastName}
          </div>
          <div className="profile-hero-subtitle">
            {[data.designation, data.department].filter(Boolean).join(" · ")}
          </div>
          <div className="profile-hero-meta">
            {[
              { label: data.employeeId, icon: IdCard, tone: "id" },
              { label: data.workLocation, icon: MapPin, tone: "location" },
              { label: data.employeeType, icon: Briefcase, tone: "type" },
              { label: data.accessRole, icon: Shield, tone: "role" },
            ].filter(b => b.label).map((b) => (
              <span key={b.tone} className={`profile-hero-chip profile-hero-chip--${b.tone}`}>
                <b.icon size={13} aria-hidden="true" /> {b.label}
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
        <Field label="Project Assigned" value={data.projectAssigned} />
        <Field label="Designation" value={data.designation} />
        <Field label="Date of Joining" value={fmt(data.doj)} />
        <Field label="Work Location" value={data.workLocation} />
        <Field label="Geo-Fence Enabled"
          value={
            data.restrictToWorkLocation === true ||
            data.restrictToWorkLocation === 1 ||
            data.restrictToWorkLocation === "1" ? "Yes" : "No"
          }
        />
        <Field label="Work Shift" value={data.workShift} />
        <Field label="Work Mode" value={data.workMode} />
        <Field label="Employment Status" value={data.employmentStatus} />
        <Field label="Reporting Manager" value={data.reportingManager} />
        <Field label="Access Role" value={data.accessRole} />
      </Section>

      <Section icon={<DollarSign />} title="Salary & Compensation">
        <Field label="CTC (Annual)" value={data.ctc ? `₹ ${Number(data.ctc).toLocaleString()}` : "N/A"} />
        <Field label="Basic Salary" value={data.basicSalary ? `₹ ${Number(data.basicSalary).toLocaleString()}` : "N/A"} />
        <Field label="HRA" value={data.hra ? `₹ ${Number(data.hra).toLocaleString()}` : "N/A"} />
        <Field label="Medical Allowance" value={data.medicalAllowance ? `₹ ${Number(data.medicalAllowance).toLocaleString()}` : "N/A"} />
        <Field label="Conveyance Allowance" value={data.conveyanceAllowance ? `₹ ${Number(data.conveyanceAllowance).toLocaleString()}` : "N/A"} />
        <Field label="Special Allowance" value={data.specialAllowance ? `₹ ${Number(data.specialAllowance).toLocaleString()}` : "N/A"} />
        <Field label="Employee PF" value={data.employeePF ? `₹ ${Number(data.employeePF).toLocaleString()}` : "N/A"} />
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
        <Section icon={<FileText />} title="Notes" fieldList={false}>
          <p className="break-words text-sm text-muted-foreground">{data.notes}</p>
        </Section>
      )}
      </>}
    </div>
  );
}
