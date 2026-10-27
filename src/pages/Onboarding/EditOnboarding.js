import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UserCheck, FileText, Image as ImageIcon, Download, Eye, Save, X } from "lucide-react";
import dayjs from "dayjs";
import { getRequest, postRequest } from "../../services/Apiservice";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import { FormInput, FormSelect, FormTextarea, FormDate, FormMonth } from "../../components/FormComponents";
import PhoneField, { buildPhone, findCountry, parsePhone } from "../../components/PhoneField";
import FileUploadBox from "../../components/FileUploadBox";
import MultiFileUploadBox from "../../components/MultiFileUploadBox";
import Group from "../../components/GroupCard";
import { getCookie } from "../../services/Cookies";

const STATUS_OPTIONS = [{ label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" }];

const EMAIL_STATUS_OPTIONS = [{ label: "Enabled", value: "Enabled" }, { label: "Disabled", value: "Disabled" }];
const SIEMENS_OPTIONS = [{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[\p{L}\p{M}][\p{L}\p{M} '.\-]*$/u;
const MAX_FILE_MB = 5;
const FILE_EXT = ["jpg", "jpeg", "png", "pdf"];
const MAX_CERTIFICATES = 10;            // same limits as the public form
const MAX_CERTIFICATES_TOTAL_MB = 5;    // all certificates together

const todayIso = () => dayjs().format("YYYY-MM-DD");
const isoToDmy = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
// calendar month (YYYY-MM) -> MM/YYYY expected by the API
const ymToMy = (ym) => (ym ? ym.split("-").reverse().join("/") : "");

const extOf = (file) => (file?.name?.split(".").pop() || "").toLowerCase();

export default function EditOnboarding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = getCookie("role");
  const canEdit = role === "Admin" || role === "Manager";   // Read-only users see the details but cannot change them

  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState(null);     // original row (for file names / audit info)
  const [form, setForm] = useState(null);
  const [phone, setPhone] = useState({ countryIso: "DE", number: "" });
  const [whatsappOwn, setWhatsapp] = useState({ countryIso: "DE", number: "" });
  const [sameAsMobile, setSameAsMobile] = useState(false);
  // while "Same as mobile number" is ticked, WhatsApp simply follows the mobile number
  const whatsapp = sameAsMobile ? phone : whatsappOwn;
  const [newCopy, setNewCopy] = useState(null);
  const [newPhoto, setNewPhoto] = useState(null);
  const [certificates, setCertificates] = useState([]);          // already stored
  const [removedCertIds] = useState([]);        // stored ones marked for deletion (applied on save)
  const [newCertificates, setNewCertificates] = useState([]);      // files added in this session (uploaded on save)
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setLoading(true);
    getRequest(`EmployeeOnboarding/Get/${id}`)
      .then((res) => {
        const d = res.data;
        setRecord(d);
        setForm({
          firstName: d.firstName || "", lastName: d.lastName || "",
          dateOfBirth: d.dateOfBirth ? d.dateOfBirth.split("T")[0] : "",
          placeOfBirth: d.placeOfBirth || "", passportNo: d.passportNo || "", salCode: d.salCode || "",
          personalEmail: d.personalEmail || "", city: d.city || "", country: d.country || "",
          currentAddress: d.currentAddress || "", nConsEmail: d.nConsEmail || "", nConsEmailStatus: d.nConsEmailStatus || "",
          visaType: d.visaType || "", workVisaExpiryDate: d.workVisaExpiryDate ? d.workVisaExpiryDate.split("T")[0] : "",
          hasSiemensIdCard: d.hasSiemensIdCard || "",
          employeeStatus: d.employeeStatus || "Active",
          siemensIdReceivedMonth: d.siemensIdReceivedMonth ? d.siemensIdReceivedMonth.slice(0, 7) : "",
        });
        setPhone(parsePhone(d.mobileNumber));
        if (d.whatsAppNumber) setWhatsapp(parsePhone(d.whatsAppNumber));
        setSameAsMobile(!!d.whatsAppNumber && d.whatsAppNumber === d.mobileNumber);
      })
      .catch((err) => { ToastError(err.response?.data?.message || "Failed to load details"); navigate("/onboarding"); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    getRequest(`EmployeeOnboarding/Certificates/${id}`)
      .then((res) => setCertificates(res.data || []))
      .catch(() => ToastError("Could not load the certificates"));
  }, [id]);

  const clearError = (f) => setErrors((p) => (p[f] ? { ...p, [f]: undefined } : p));
  const set = (f) => (e) => { setForm((p) => ({ ...p, [f]: e.target.value })); clearError(f); };

  const pickFile = (field, label, setter) => (file) => {
    if (!FILE_EXT.includes(extOf(file))) { setErrors((p) => ({ ...p, [field]: `${label} must be a JPG, PNG or PDF file.` })); return; }
    if (file.size > MAX_FILE_MB * 1024 * 1024) { setErrors((p) => ({ ...p, [field]: `${label} must not exceed ${MAX_FILE_MB} MB.` })); return; }
    setter(file);
    clearError(field);
  };

  /* ── certificates: add new files / remove stored ones (both applied when "Save changes" is clicked) ── */
  const keptCertificates = certificates.filter((c) => !removedCertIds.includes(c.certificateId));
  const keptBytes = keptCertificates.reduce((sum, c) => sum + (c.fileSize || 0), 0);
  const slotsLeft = Math.max(0, MAX_CERTIFICATES - keptCertificates.length);
  const mbLeft = Math.max(0, MAX_CERTIFICATES_TOTAL_MB - keptBytes / 1024 / 1024);

  const addCertificates = (incoming) => {
    let problem = "";
    let count = newCertificates.length;
    let bytes = newCertificates.reduce((sum, f) => sum + f.size, 0);
    const fitting = [];
    incoming.forEach((file) => {
      if (!FILE_EXT.includes(extOf(file))) { problem = `"${file.name}" is not allowed. Only JPG, PNG or PDF files can be uploaded.`; return; }
      if (count >= slotsLeft) { problem = `A maximum of ${MAX_CERTIFICATES} certificates is allowed (${keptCertificates.length} already stored).`; return; }
      if (keptBytes + bytes + file.size > MAX_CERTIFICATES_TOTAL_MB * 1024 * 1024) { problem = `The total size of all certificates must not exceed ${MAX_CERTIFICATES_TOTAL_MB} MB. "${file.name}" was not added.`; return; }
      fitting.push(file); count += 1; bytes += file.size;
    });
    if (fitting.length) setNewCertificates((prev) => [...prev, ...fitting]);
    setErrors((prev) => ({ ...prev, certificates: problem || undefined }));
  };

  /* ── view / download the stored attachments ── */
  const fetchFile = (type) => getRequest(`EmployeeOnboarding/File/${id}/${type}`, null, true);

  const viewFile = async (type) => {
    try {
      setLoading(true);
      const res = await fetchFile(type);
      const blob = new Blob([res.data], { type: res.headers["content-type"] || "application/octet-stream" });
      window.open(window.URL.createObjectURL(blob), "_blank");
    } catch { ToastError("Could not open the file"); } finally { setLoading(false); }
  };

  const downloadFile = async (type, name) => {
    try {
      setLoading(true);
      const res = await fetchFile(type);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: res.headers["content-type"] }));
      const a = document.createElement("a");
      a.href = url; a.download = name || type;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch { ToastError("Download failed"); } finally { setLoading(false); }
  };

  const fetchCertificate = (c) => getRequest(`EmployeeOnboarding/Certificate/${c.certificateId}`, null, true);

  const viewCertificate = async (c) => {
    try {
      setLoading(true);
      const res = await fetchCertificate(c);
      const blob = new Blob([res.data], { type: res.headers["content-type"] || c.contentType || "application/octet-stream" });
      window.open(window.URL.createObjectURL(blob), "_blank");
    } catch { ToastError("Could not open the file"); } finally { setLoading(false); }
  };

  const downloadCertificate = async (c) => {
    try {
      setLoading(true);
      const res = await fetchCertificate(c);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: res.headers["content-type"] }));
      const a = document.createElement("a");
      a.href = url; a.download = c.fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch { ToastError("Download failed"); } finally { setLoading(false); }
  };

  /* ── validation ── */
  const validate = () => {
    const e = {};
    const v = (k) => (form[k] || "").trim();
    if (!v("firstName")) e.firstName = "First Name is required";
    else if (!NAME_REGEX.test(v("firstName"))) e.firstName = "Enter a valid First Name";
    if (!v("lastName")) e.lastName = "Last Name is required";
    else if (!NAME_REGEX.test(v("lastName"))) e.lastName = "Enter a valid Last Name";
    if (!v("dateOfBirth")) e.dateOfBirth = "Date of Birth is required";
    else if (v("dateOfBirth") > todayIso()) e.dateOfBirth = "Date of Birth cannot be in the future";
    if (!v("placeOfBirth")) e.placeOfBirth = "Place of Birth is required";
    const total = findCountry(phone.countryIso).dial + phone.number;
    if (!phone.number) e.mobileNumber = "Mobile Number is required";
    else if (total.length < 8 || total.length > 15) e.mobileNumber = "Enter a valid mobile number";
    if (!["Active", "Inactive"].includes(v("employeeStatus"))) e.employeeStatus = "Select Active or Inactive";
    if (!v("hasSiemensIdCard")) e.hasSiemensIdCard = "Please select Yes or No";
    else if (v("hasSiemensIdCard") === "Yes") {
      if (!v("siemensIdReceivedMonth")) e.siemensIdReceivedMonth = "Please select the month the ID was received";
      else if (v("siemensIdReceivedMonth") > todayIso().slice(0, 7)) e.siemensIdReceivedMonth = "Month cannot be in the future";
    }
    if (whatsapp.number) {
      const wTotal = (findCountry(whatsapp.countryIso).dial + whatsapp.number).length;
      if (wTotal < 8 || wTotal > 15) e.whatsAppNumber = "Enter a valid WhatsApp number";
    }
    if (!v("passportNo")) e.passportNo = "Passport No. is required";
    else if (!/^[A-Za-z0-9]{6,20}$/.test(v("passportNo"))) e.passportNo = "Passport No. must be 6-20 letters or digits";
    if (v("salCode") && !/^[A-Za-z0-9\-_/ ]{1,50}$/.test(v("salCode"))) e.salCode = "SAL Code contains invalid characters";
    if (!v("city")) e.city = "City is required";
    if (!v("country")) e.country = "Country is required";
    if (!v("currentAddress")) e.currentAddress = "Current Address is required";
    if (v("nConsEmail") && !EMAIL_REGEX.test(v("nConsEmail"))) e.nConsEmail = "Enter a valid email address";
    if (!v("personalEmail")) e.personalEmail = "Personal Email ID is required";
    else if (!EMAIL_REGEX.test(v("personalEmail"))) e.personalEmail = "Enter a valid email address";
    return e;
  };

  const handleSave = () => {
    if (!canEdit) { ToastError("You do not have permission to edit"); return; }
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); ToastError("Please fix the highlighted fields"); return; }

    const fd = new FormData();
    fd.append("submissionId", id);
    Object.keys(form).forEach((k) => fd.append(k, (k === "dateOfBirth" || k === "workVisaExpiryDate") ? isoToDmy(form[k]) : k === "siemensIdReceivedMonth" ? (form.hasSiemensIdCard === "Yes" ? ymToMy(form[k]) : "") : form[k].trim()));
    fd.append("mobileNumber", buildPhone(phone.countryIso, phone.number));
    fd.append("whatsAppNumber", buildPhone(whatsapp.countryIso, whatsapp.number));
    if (newCopy) fd.append("passportCopy", newCopy);
    if (newPhoto) fd.append("passportPhoto", newPhoto);
    newCertificates.forEach((f) => fd.append("certificates", f));
    removedCertIds.forEach((cid) => fd.append("removeCertificateIds", cid));

    setLoading(true);
    postRequest("EmployeeOnboarding/Update", fd)
      .then(() => { ToastSuccess("Details updated successfully"); navigate("/onboarding"); })
      .catch((err) => {
        const data = err.response?.data;
        if (data?.errors && typeof data.errors === "object") setErrors(data.errors);
        ToastError(data?.message || "Failed to update details");
      })
      .finally(() => setLoading(false));
  };

  if (!form) return <LoadingMask loading={loading} />;

  const fileRow = (label, icon, name, type) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg)", marginBottom: 10, flexWrap: "wrap" }}>
      {icon}
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", wordBreak: "break-all" }}>{name || "—"}</div>
      </div>
      <button type="button" className="btn btn-outline" style={{ padding: "6px 12px" }} onClick={() => viewFile(type)}><Eye size={14} /> View</button>
      <button type="button" className="btn btn-outline" style={{ padding: "6px 12px" }} onClick={() => downloadFile(type, name)}><Download size={14} /> Download</button>
    </div>
  );

  return (
    <div>
      <LoadingMask loading={loading} />
      <div className="page-header">
        <div>
          <Breadcrumb icon={<UserCheck size={13} />} items={[{ label: "Onboarding", link: "/onboarding" }, { label: "View / Edit" }]} />
          <h1 className="page-title">{record.firstName} {record.lastName}</h1>
          <p className="page-subtitle">
            Submitted {dayjs(record.submittedAt).format("DD-MM-YYYY HH:mm")}
            {record.consentGiven ? ` · Consent confirmed${record.consentAt ? " on " + dayjs(record.consentAt).format("DD-MM-YYYY HH:mm") : ""}` : " · Consent not recorded"}
            {record.updatedAt ? ` · Last updated ${dayjs(record.updatedAt).format("DD-MM-YYYY HH:mm")} by ${record.updatedBy}` : ""}
          </p>
        </div>
        <button className="icon-btn" onClick={() => navigate("/onboarding")} style={{ color: "var(--coral)" }}><X size={20} /></button>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {!canEdit && (
          <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "#fef3c7", color: "#92400e", fontSize: 13, fontWeight: 600 }}>
            You have view-only access. Contact an Admin or Manager to change these details.
          </div>
        )}
        <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <Group title="About you">
          <div className="fc-row fc-row-2">
            <FormInput label="First name" required value={form.firstName} onChange={set("firstName")} error={errors.firstName} maxLength={100} />
            <FormInput label="Last name" required value={form.lastName} onChange={set("lastName")} error={errors.lastName} maxLength={100} />
            <FormDate label="Date of birth" required value={form.dateOfBirth} onChange={set("dateOfBirth")} error={errors.dateOfBirth} max={todayIso()} />
            <FormInput label="Place of birth" required value={form.placeOfBirth} onChange={set("placeOfBirth")} error={errors.placeOfBirth} maxLength={150} />
          </div>
        </Group>

        <Group title="Passport and site">
          <div className="fc-row fc-row-2">
            <FormInput label="Passport number" required value={form.passportNo} onChange={set("passportNo")} error={errors.passportNo} maxLength={20} />
            <FormInput label="SAL code" value={form.salCode} onChange={set("salCode")} error={errors.salCode} maxLength={50} />
            <FormSelect label="Status" required options={STATUS_OPTIONS} value={form.employeeStatus} onChange={set("employeeStatus")} error={errors.employeeStatus} />
          </div>
        </Group>

        <Group title="Right to work">
          <div className="fc-row fc-row-2">
            <FormInput label="Visa / work permit type" value={form.visaType} onChange={set("visaType")} error={errors.visaType} maxLength={100} />
            <FormDate label="Work visa expiry date" value={form.workVisaExpiryDate} onChange={set("workVisaExpiryDate")} error={errors.workVisaExpiryDate} />
            <FormSelect label="Valid Siemens ID card?" required options={[{ label: "Select", value: "" }, ...SIEMENS_OPTIONS]} value={form.hasSiemensIdCard}
              onChange={(e) => { set("hasSiemensIdCard")(e); if (e.target.value !== "Yes") setForm((p) => ({ ...p, siemensIdReceivedMonth: "" })); }} error={errors.hasSiemensIdCard} />
            {form.hasSiemensIdCard === "Yes" && (
              <FormMonth label="Siemens ID received month" required max={todayIso().slice(0, 7)} value={form.siemensIdReceivedMonth} onChange={set("siemensIdReceivedMonth")} error={errors.siemensIdReceivedMonth} />
            )}
          </div>
        </Group>

        <Group title="Contact">
          <div className="fc-row fc-row-2">
            <PhoneField label="Mobile number" required countryIso={phone.countryIso} number={phone.number}
              onChange={(v) => { setPhone(v); clearError("mobileNumber"); }} error={errors.mobileNumber} placeholder="1512 3456789" />
            <FormInput label="N-Cons email ID" type="email" value={form.nConsEmail} onChange={set("nConsEmail")} error={errors.nConsEmail} maxLength={150} />
            <FormSelect label="N-Cons email status" options={[{ label: "Select status", value: "" }, ...EMAIL_STATUS_OPTIONS]} value={form.nConsEmailStatus} onChange={set("nConsEmailStatus")} error={errors.nConsEmailStatus} />
            <div>
            <PhoneField label="WhatsApp number" countryIso={whatsapp.countryIso} number={whatsapp.number}
              onChange={(v) => { setSameAsMobile(false); setWhatsapp(v); clearError("whatsAppNumber"); }} error={errors.whatsAppNumber} placeholder="1512 3456789" />
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={sameAsMobile} onChange={(e) => setSameAsMobile(e.target.checked)} style={{ cursor: "pointer" }} />
              Same as mobile number
            </label>
            </div>
            <FormInput label="Personal email ID" required type="email" value={form.personalEmail} onChange={set("personalEmail")} error={errors.personalEmail} maxLength={150} />
          </div>
        </Group>

        <Group title="Where you are now">
          <div className="fc-row fc-row-2">
            <FormInput label="City" required value={form.city} onChange={set("city")} error={errors.city} maxLength={100} />
            <FormInput label="Country" required value={form.country} onChange={set("country")} error={errors.country} maxLength={100} />
          </div>
          <FormTextarea label="Current address" required value={form.currentAddress} onChange={set("currentAddress")} error={errors.currentAddress} rows={3} maxLength={500} />
        </Group>

        </fieldset>

        <Group title="Documents">
          {fileRow("Passport copy", <FileText size={20} color="var(--primary)" />, record.passportCopyFileName, "PassportCopy")}
          {fileRow("Passport-size photo", <ImageIcon size={20} color="var(--primary)" />, record.passportPhotoFileName, "PassportPhoto")}
          {canEdit && <>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "14px 0" }}>To replace a document, upload a new file below. Leave empty to keep the current one.</div>
          <FileUploadBox id="edit-copy" label="Replace passport copy" hint="JPG, PNG or PDF · max 5 MB" accept=".jpg,.jpeg,.png,.pdf" file={newCopy}
            error={errors.passportCopy} icon={<FileText />} onSelect={pickFile("passportCopy", "Passport Copy", setNewCopy)} onRemove={() => setNewCopy(null)} optional />
          <FileUploadBox id="edit-photo" label="Replace passport-size photo" hint="JPG, PNG or PDF · max 5 MB" accept=".jpg,.jpeg,.png,.pdf" file={newPhoto}
            error={errors.passportPhoto} icon={<ImageIcon />} onSelect={pickFile("passportPhoto", "Passport-size Photo", setNewPhoto)} onRemove={() => setNewPhoto(null)} optional />
          </>}
        </Group>

        <Group title={`Certificates (${keptCertificates.length}${newCertificates.length ? ` + ${newCertificates.length} new` : ""})`}>
          {certificates.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>No certificates have been uploaded yet.</div>
          ) : certificates.map((c) => {
            const removed = removedCertIds.includes(c.certificateId);
            return (
              <div key={c.certificateId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: `1px solid ${removed ? "var(--coral)" : "var(--border)"}`, borderRadius: 10, background: "var(--bg)", marginBottom: 10, flexWrap: "wrap", opacity: removed ? 0.6 : 1 }}>
                <FileText size={20} color="var(--primary)" />
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", wordBreak: "break-all", textDecoration: removed ? "line-through" : "none" }}>{c.fileName}</div>
                  <div style={{ fontSize: 12, color: removed ? "var(--coral)" : "var(--text-muted)" }}>
                    {removed ? "Will be deleted when you save" : `${(c.fileSize / 1024 / 1024).toFixed(2)} MB`}
                  </div>
                </div>
                {!removed && <button type="button" className="btn btn-outline" style={{ padding: "6px 12px" }} onClick={() => viewCertificate(c)}><Eye size={14} /> View</button>}
                {!removed && <button type="button" className="btn btn-outline" style={{ padding: "6px 12px" }} onClick={() => downloadCertificate(c)}><Download size={14} /> Download</button>}
              </div>
            );
          })}

          {canEdit && <MultiFileUploadBox
            id="edit-certificates"
            label="Add certificates"
            hint={`JPG, PNG or PDF · ${slotsLeft} more file${slotsLeft === 1 ? "" : "s"} and ${mbLeft.toFixed(2)} MB left (max ${MAX_CERTIFICATES} files, ${MAX_CERTIFICATES_TOTAL_MB} MB in total)`}
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            files={newCertificates}
            max={slotsLeft}
            maxTotalMb={Number(mbLeft.toFixed(2))}
            error={errors.certificates}
            onAdd={addCertificates}
            onRemove={(idx) => { setNewCertificates((prev) => prev.filter((_, k) => k !== idx)); clearError("certificates"); }}
          />}
        </Group>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 32 }}>
          <button className="btn btn-outline" style={{ minWidth: 120, height: 42, justifyContent: "center" }} onClick={() => navigate("/onboarding")}>{canEdit ? "Cancel" : "Back"}</button>
          {canEdit && <button className="btn btn-primary" style={{ minWidth: 150, height: 42, justifyContent: "center" }} onClick={handleSave} disabled={loading}><Save size={15} /> Save changes</button>}
        </div>
      </div>
    </div>
  );
}
