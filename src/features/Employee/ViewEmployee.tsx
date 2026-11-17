import { Button } from "../../components/ui/button";
import React, { useEffect, useState } from "react";
import { getCookie } from "../../auth/Cookies";
import { getRequest } from "../../shared/services/Apiservice";
import Breadcrumb from "../../shared/services/Breadcrumb";
import LoadingMask from "../../shared/services/LoadingMask";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Edit, User, Briefcase, DollarSign, GraduationCap, MapPin, FileText, Shield, Heart, IdCard, Users } from "lucide-react";
import ProfileAvatar from "../../components/ProfileAvatar";

const fmt = (v) => {
  if (!v || v === "-") return "N/A";
  if (v instanceof Date || (typeof v === "string" && v.match(/^\d{4}-/))) {
    return dayjs(v).format("DD-MM-YYYY");
  }
  return v;
};

function Section({ icon, title, children }: Record<string, any>) {
  return (
    <div className="bg-[var(--bg-card)] overflow-hidden mb-[16px]" style={{borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)"}}>
      <div className="p-[16px_20px] bg-muted flex items-center gap-[12px]" style={{borderBottom: "1px solid var(--border)"}}>
        <div className="w-[34px] h-[34px] bg-primary flex items-center justify-center" style={{borderRadius: "var(--radius)"}}>
          {React.cloneElement(icon, { size: 17, color: "var(--card)" })}
        </div>
        <span className="text-[14px] font-semibold text-[var(--text-primary)] uppercase tracking-[0.04em]" style={{fontFamily: "var(--ui-font-heading)"}}>{title}</span>
      </div>
      <div className="p-[20px_20px]" >
        <div className="grid gap-[12px_24px]" style={{gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))"}}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: Record<string, any>) {
  return (
    <div>
      <div className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-[4px]" >{label}</div>
      <div className="text-[14px] font-semibold text-[var(--text-primary)]" >{value || "N/A"}</div>
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

  const fmtGender = (g) => g === "M" ? "Male" : g === "F" ? "Female" : g || "N/A";

  if (loading) return <LoadingMask loading />;
  if (!data) return <div className="text-center p-[60px] text-[var(--text-muted)]" >No profile data found</div>;

  const initials = `${data.firstName?.[0] || ""}${data.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div>
      <div className="page-header">
        <div>
          <Breadcrumb icon={<Users size={13} />} items={[{ label: "View Profile" }]} />
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Your employee information</p>
        </div>
        <Button variant="default" type="button" className="btn btn-primary" onClick={() => navigate(`/employees/edit-employee/${email}`)}>
          <Edit size={15} /> Edit Profile
        </Button>
      </div>

      {/* Profile Hero Card */}
      <div className="profile-hero-card">
        <ProfileAvatar seed={data.email || email} initials={initials} className="profile-hero-avatar" />
        <div className="profile-hero-copy">
          <div className="profile-hero-title">
            {data.firstName} {data.lastName}
          </div>
          <div className="profile-hero-subtitle">
            {data.designation} · {data.department}
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
        <Section icon={<FileText />} title="Notes">
          <div className="text-[14px] text-[var(--text-secondary)] leading-[1.7]" style={{gridColumn: "1 / -1"}}>{data.notes}</div>
        </Section>
      )}
    </div>
  );
}
