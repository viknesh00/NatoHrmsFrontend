import { cn } from "cn";
import { Checkbox } from "../../components/ui/checkbox";
import { Button } from "../../components/ui/button";
import { useState } from "react";
import { postPublicRequest } from "../../shared/services/Apiservice";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
import LoadingMask from "../../shared/services/LoadingMask";
import { FileText, Image as ImageIcon, CheckCircle2, AlertTriangle } from "lucide-react";
import { FormInput, FormSelect, FormTextarea, FormDate, FormMonth } from "../../components/FormComponents";
import FileUploadBox from "../../components/FileUploadBox";
import MultiFileUploadBox from "../../components/MultiFileUploadBox";
import PhoneField, { buildPhone, findCountry } from "../../components/PhoneField";

/* ──────────────────────────────────────────────
   Constants
   ────────────────────────────────────────────── */
const EMAIL_STATUS_OPTIONS = [{ label: "Enabled", value: "Enabled" }, { label: "Disabled", value: "Disabled" }];
const SIEMENS_OPTIONS = [{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }];
const withPlaceholder = (label, options) => [{ label, value: "" }, ...options];

const MAX_FILE_MB = 5;
const MAX_CERTIFICATES = 10;
const MAX_CERTIFICATES_TOTAL_MB = 5;   // all certificates together
const PASSPORT_COPY_EXT = ["jpg", "jpeg", "png", "pdf"];
const PASSPORT_PHOTO_EXT = ["jpg", "jpeg", "png", "pdf"];

const LOGO_URL = "https://natoboticshrms.vercel.app/assets/images/natobotics-logo.png";

/* field order on the page (used to scroll to the first error) */
const FIELD_ORDER = [
  "firstName", "lastName", "dateOfBirth", "placeOfBirth", "mobileNumber", "passportNo", "salCode",
  "visaType", "workVisaExpiryDate", "hasSiemensIdCard", "siemensIdReceivedMonth",
  "city", "country", "currentAddress", "nConsEmail", "nConsEmailStatus", "personalEmail", "whatsAppNumber",
  "passportCopy", "passportPhoto", "certificates", "consentGiven",
];

const EMPTY_FORM = {
  firstName: "", lastName: "", dateOfBirth: "", placeOfBirth: "",
  passportNo: "", salCode: "",
  mobileNumber: "", personalEmail: "", city: "", country: "", currentAddress: "",
  nConsEmail: "", nConsEmailStatus: "",
  visaType: "", workVisaExpiryDate: "", hasSiemensIdCard: "", siemensIdReceivedMonth: "", whatsAppNumber: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[\p{L}\p{M}][\p{L}\p{M} '.-]*$/u;

/* ── date helpers ── */
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// calendar value (YYYY-MM-DD) -> DD/MM/YYYY expected by the API
const isoToDmy = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

// calendar month (YYYY-MM) -> MM/YYYY expected by the API
const ymToMy = (ym) => (ym ? ym.split("-").reverse().join("/") : "");

const extOf = (file) => (file?.name?.split(".").pop() || "").toLowerCase();

/* ──────────────────────────────────────────────
   Component (single-page, Google-Forms style)
   ────────────────────────────────────────────── */
/* field anchor (top-level so inputs keep focus while typing) */
function Q({ name, children }: Record<string, any>) {
  return <div id={`gf-${name}`}>{children}</div>;
}

/* grouped card with the title sitting on the top border */
function Group({ title, children }: Record<string, any>) {
  return (
    <fieldset className="gf-group">
      <legend className="gf-legend">{title}</legend>
      {children}
    </fieldset>
  );
}

const GF_STYLES = `
.gf-card { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:20px 24px; margin-bottom:12px; box-shadow:var(--shadow-sm); }
.gf-group { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:24px 24px 8px; margin:0 0 24px; min-width:0; box-shadow:var(--shadow-sm); }
.gf-legend { padding:0 8px; margin-left:-2px; font-family:var(--ui-font-sans); font-size:14px; font-weight:600; letter-spacing:0; text-transform:none; color:var(--text-secondary); }
.gf-group .fc-row { column-gap:20px; }
.gf-group .fc-label { text-transform:none; letter-spacing:0; font-size:14px; font-weight:600; color:var(--text-primary); }
.gf-actions { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:16px 24px; box-shadow:var(--shadow-sm); }
.gf-actions-note { flex:1 1 280px; font-size:13px; line-height:1.5; color:var(--text-secondary); }
.gf-actions-btns { display:flex; gap:12px; }
.gf-btn { min-width:130px; height:42px; justify-content:center; font-size:14px; font-weight:600; border-radius:var(--radius); }
.gf-btn:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
.gf-btn.btn-outline { border:1px solid var(--border-strong); }
@media (max-width:600px) { .gf-actions { padding:16px; } .gf-actions-btns { width:100%; } .gf-btn { flex:1; } }
@media (max-width:600px) { .gf-group { padding:20px 16px 4px; } .gf-group .fc-row-2 { grid-template-columns:1fr; } }
`;

export default function EmployeeDetailsForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, any>>({});

  const [formvalues, setFormvalues] = useState(EMPTY_FORM);
  const [phone, setPhone] = useState({ countryIso: "DE", number: "" });
  const [whatsappOwn, setWhatsapp] = useState({ countryIso: "DE", number: "" });
  const [sameAsMobile, setSameAsMobile] = useState(false);
  // while "Same as mobile number" is ticked, WhatsApp simply follows the mobile number
  const whatsapp = sameAsMobile ? phone : whatsappOwn;
  const [passportCopy, setPassportCopy] = useState(null);
  const [passportPhoto, setPassportPhoto] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [consent, setConsent] = useState(false);

  /* ── field setters (clear that field's error on change) ── */
  const clearError = (field) => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const set = (field) => (e) => {
    setFormvalues((prev) => ({ ...prev, [field]: e.target.value }));
    clearError(field);
  };

  /* ── file handling ── */
  const pickFile = (field, allowedExt, label, setter) => (file) => {
    if (!allowedExt.includes(extOf(file))) {
      setErrors((p) => ({ ...p, [field]: `${label} must be a ${allowedExt.map((x) => x.toUpperCase()).join(", ")} file.` }));
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setErrors((p) => ({ ...p, [field]: `${label} must not exceed ${MAX_FILE_MB} MB.` }));
      return;
    }
    setter(file);
    clearError(field);
  };

  /* ── certificates (optional, several files, max 10) ── */
  const addCertificates = (incoming) => {
    const accepted = [];
    let problem = "";
    incoming.forEach((file) => {
      if (!PASSPORT_COPY_EXT.includes(extOf(file))) problem = `"${file.name}" is not allowed. Only JPG, PNG or PDF files can be uploaded.`;
      else accepted.push(file);
    });

    // keep the files that fit: max 10 files and 5 MB in total
    let count = certificates.length;
    let bytes = certificates.reduce((sum, f) => sum + f.size, 0);
    const fitting = [];
    accepted.forEach((file) => {
      if (count >= MAX_CERTIFICATES) { problem = `You can upload a maximum of ${MAX_CERTIFICATES} certificates.`; return; }
      if (bytes + file.size > MAX_CERTIFICATES_TOTAL_MB * 1024 * 1024) { problem = `The total size of all certificates must not exceed ${MAX_CERTIFICATES_TOTAL_MB} MB. "${file.name}" was not added.`; return; }
      fitting.push(file); count += 1; bytes += file.size;
    });
    if (fitting.length) setCertificates((prev) => [...prev, ...fitting]);
    setErrors((prev) => ({ ...prev, certificates: problem || undefined }));
  };

  /* ── validation ── */
  const validateAll = () => {
    const e: Record<string, any> = {};
    const v = (k) => (formvalues[k] || "").trim();

    if (!v("firstName")) e.firstName = "First Name is required";
    else if (!NAME_REGEX.test(v("firstName"))) e.firstName = "Enter a valid First Name";
    if (!v("lastName")) e.lastName = "Last Name is required";
    else if (!NAME_REGEX.test(v("lastName"))) e.lastName = "Enter a valid Last Name";
    if (!v("dateOfBirth")) e.dateOfBirth = "Date of Birth is required";
    else if (v("dateOfBirth") > todayIso()) e.dateOfBirth = "Date of Birth cannot be in the future";
    if (!v("placeOfBirth")) e.placeOfBirth = "Place of Birth is required";

    const dial = findCountry(phone.countryIso).dial;
    if (!phone.number) e.mobileNumber = "Mobile Number is required";
    else if ((dial + phone.number).length < 8 || (dial + phone.number).length > 15)
      e.mobileNumber = "Enter a valid mobile number";

    if (!v("passportNo")) e.passportNo = "Passport No. is required";
    else if (!/^[A-Za-z0-9]{6,20}$/.test(v("passportNo"))) e.passportNo = "Passport No. must be 6-20 letters or digits";
    if (v("salCode") && !/^[A-Za-z0-9\-_/ ]{1,50}$/.test(v("salCode"))) e.salCode = "SAL Code contains invalid characters";

    if (!v("city")) e.city = "City is required";
    if (!v("country")) e.country = "Country is required";
    if (!v("currentAddress")) e.currentAddress = "Current Address is required";

    if (!v("hasSiemensIdCard")) e.hasSiemensIdCard = "Please select Yes or No";
    else if (v("hasSiemensIdCard") === "Yes") {
      if (!v("siemensIdReceivedMonth")) e.siemensIdReceivedMonth = "Please select the month the ID was received";
      else if (v("siemensIdReceivedMonth") > todayIso().slice(0, 7)) e.siemensIdReceivedMonth = "Month cannot be in the future";
    }

    if (whatsapp.number) {
      const wTotal = (findCountry(whatsapp.countryIso).dial + whatsapp.number).length;
      if (wTotal < 8 || wTotal > 15) e.whatsAppNumber = "Enter a valid WhatsApp number";
    }

    if (v("nConsEmail") && !EMAIL_REGEX.test(v("nConsEmail"))) e.nConsEmail = "Enter a valid email address";

    if (!v("personalEmail")) e.personalEmail = "Personal Email ID is required";
    else if (!EMAIL_REGEX.test(v("personalEmail"))) e.personalEmail = "Enter a valid email address";

    if (!consent) e.consentGiven = "Please confirm that the information is shared with your consent";
    if (!passportCopy) e.passportCopy = errors.passportCopy || "Passport Copy is required";
    if (!passportPhoto) e.passportPhoto = errors.passportPhoto || "Passport-size Photo is required";
    return e;
  };

  const scrollToFirstError = (errs) => {
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (!first) return;
    setTimeout(() => {
      const el = document.getElementById(`gf-${first}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  /* ── submit ── */
  const handleSubmit = (ev) => {
    ev.preventDefault();
    const errs = validateAll();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      scrollToFirstError(errs);
      ToastError(errs.passportCopy || errs.passportPhoto
        ? "Please complete all mandatory fields and upload both documents"
        : "Please fill all mandatory fields");
      return;
    }

    const formData = new FormData();
    Object.keys(formvalues).forEach((k) =>
      formData.append(k,
        k === "dateOfBirth" ? isoToDmy(formvalues.dateOfBirth)
        : k === "workVisaExpiryDate" ? isoToDmy(formvalues.workVisaExpiryDate)
        : k === "siemensIdReceivedMonth" ? (formvalues.hasSiemensIdCard === "Yes" ? ymToMy(formvalues.siemensIdReceivedMonth) : "")
        : k === "mobileNumber" ? buildPhone(phone.countryIso, phone.number)
        : k === "whatsAppNumber" ? buildPhone(whatsapp.countryIso, whatsapp.number)
        : formvalues[k].trim()));
    formData.append("passportCopy", passportCopy);
    formData.append("passportPhoto", passportPhoto);
    certificates.forEach((f) => formData.append("certificates", f));
    formData.append("consentGiven", consent ? "true" : "false");

    setLoading(true);
    postPublicRequest("EmployeeDetails/Submit", formData)
      .then(() => {
        ToastSuccess("Employee details submitted successfully");
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch((err) => {
        const data = err.response?.data;
        if (data?.errors && typeof data.errors === "object") {
          setErrors(data.errors);
          scrollToFirstError(data.errors);
        }
        if (err.response?.status === 413) ToastError("The uploaded files are too large. Each file must be under 5 MB.");
        else ToastError(data?.message || "Failed to submit details. Please try again.");
      })
      .finally(() => setLoading(false));
  };

  const resetForm = () => {
    setFormvalues(EMPTY_FORM);
    setPhone({ countryIso: "DE", number: "" });
    setWhatsapp({ countryIso: "DE", number: "" });
    setSameAsMobile(false);
    setPassportCopy(null);
    setPassportPhoto(null);
    setCertificates([]);
    setConsent(false);
    setErrors({});
    setSubmitted(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-[100vh] bg-[var(--bg)] p-[24px_12px_48px]" >
      <style>{GF_STYLES}</style>
      <LoadingMask loading={loading} />

      <div className="max-w-[900px] m-[0_auto]" >

        {/* Form header */}
        <div className={cn("gf-card", "p-[0px] overflow-hidden mb-[24px]")} >
          <div className="h-[10px] bg-primary"  />
          <div className="p-[24px_24px_20px] text-center" >
            <img src={LOGO_URL} alt="Natobotics" className="h-[56px] max-w-[100%] block m-[0_auto_14px]" style={{objectFit: "contain"}} />
            <h1 className={cn("page-title", "text-[24px]")} >Employee Details Form</h1>
            <p className="text-[14px] text-[var(--text-secondary)] mt-[8px]" >
              Fill in your details as printed in your passport. <span className="text-[var(--coral)]" >* Required</span>
            </p>
          </div>
        </div>

        {submitted ? (
          <div className={cn("gf-card", "text-center p-[48px_24px]")} >
            <div className="w-[64px] h-[64px] bg-[var(--teal-ghost)] flex items-center justify-center m-[0_auto_16px]" style={{borderRadius: "50%"}}>
              <CheckCircle2 size={34} color="var(--teal)" />
            </div>
            <div className="text-[20px] font-semibold text-[var(--text-primary)]" style={{fontFamily: "var(--ui-font-heading)"}}>
              Thank you! Your details have been submitted
            </div>
            <p className="text-[14px] text-[var(--text-secondary)] mt-[8px]" >
              Our HR team has received your details and documents. To make any correction after submission, please contact an authorized person.
            </p>
            <Button variant="outline" type="button" className={cn("btn btn-outline", "mt-[20px]")}  onClick={resetForm}>Submit another response</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>

            {/* Mandatory-documents warning */}
            <div className="flex gap-[12px] items-start p-[12px_16px] bg-[var(--amber-ghost)] text-[13px] text-warning leading-[1.5] mb-[12px]" style={{borderRadius: "var(--radius)", borderLeft: "4px solid var(--amber)"}}>
              <AlertTriangle size={17} className="shrink-[0] mt-[4px]"  />
              <span><strong>Both files are mandatory:</strong> your submission is incomplete without the Passport Copy and the Passport-Size Photo.</span>
            </div>

            <Group title="About you">
              <div className="fc-row fc-row-2">
                <Q name="firstName"><FormInput label="First name" required value={formvalues.firstName} onChange={set("firstName")} error={errors.firstName} hint="As in your passport" maxLength={100} /></Q>
                <Q name="lastName"><FormInput label="Last name" required value={formvalues.lastName} onChange={set("lastName")} error={errors.lastName} hint="As in your passport" maxLength={100} /></Q>
                <Q name="dateOfBirth"><FormDate label="Date of birth" required value={formvalues.dateOfBirth} onChange={set("dateOfBirth")} error={errors.dateOfBirth} max={todayIso()} placeholder="Select date" /></Q>
                <Q name="placeOfBirth"><FormInput label="Place of birth" required value={formvalues.placeOfBirth} onChange={set("placeOfBirth")} error={errors.placeOfBirth} hint="As in your passport" maxLength={150} /></Q>
              </div>
            </Group>

            <Group title="Passport and site">
              <div className="fc-row fc-row-2">
                <Q name="passportNo"><FormInput label="Passport number" required value={formvalues.passportNo} onChange={set("passportNo")} error={errors.passportNo} hint="Letters and digits only" maxLength={20} /></Q>
                <Q name="salCode"><FormInput label="SAL code" value={formvalues.salCode} onChange={set("salCode")} error={errors.salCode} hint="Exactly as given to you" maxLength={50} /></Q>
              </div>
            </Group>

            <Group title="Right to work">
              <div className="fc-row fc-row-2">
                <Q name="visaType"><FormInput label="Visa / work permit type" value={formvalues.visaType} onChange={set("visaType")} error={errors.visaType} hint="For Germany or the country you work in, e.g. Work Visa, EU Blue Card" maxLength={100} /></Q>
                <Q name="workVisaExpiryDate"><FormDate label="Work visa expiry date" value={formvalues.workVisaExpiryDate} onChange={set("workVisaExpiryDate")} error={errors.workVisaExpiryDate} placeholder="Select date" hint="Last date you are legally permitted to work there" /></Q>
                <Q name="hasSiemensIdCard"><FormSelect label="Do you have a valid Siemens ID card?" required options={withPlaceholder("Select", SIEMENS_OPTIONS)} value={formvalues.hasSiemensIdCard}
                  onChange={(e) => { set("hasSiemensIdCard")(e); if (e.target.value !== "Yes") { setFormvalues((prev) => ({ ...prev, siemensIdReceivedMonth: "" })); clearError("siemensIdReceivedMonth"); } }}
                  error={errors.hasSiemensIdCard} /></Q>
                {formvalues.hasSiemensIdCard === "Yes" && (
                  <Q name="siemensIdReceivedMonth"><FormMonth label="Siemens ID received month" required max={todayIso().slice(0, 7)} value={formvalues.siemensIdReceivedMonth} onChange={set("siemensIdReceivedMonth")} error={errors.siemensIdReceivedMonth} placeholder="Select month" /></Q>
                )}
              </div>
            </Group>

            <Group title="Contact">
              <div className="fc-row fc-row-2">
                <Q name="mobileNumber"><PhoneField label="Mobile number" required countryIso={phone.countryIso} number={phone.number} onChange={(v) => { setPhone(v); clearError("mobileNumber"); }} error={errors.mobileNumber} hint="Select the country code, then enter digits only" placeholder="1512 3456789" /></Q>
                <Q name="nConsEmail"><FormInput label="N-Cons email ID" type="email" value={formvalues.nConsEmail} onChange={set("nConsEmail")} error={errors.nConsEmail} hint="Your work email" maxLength={150} /></Q>
                <Q name="nConsEmailStatus"><FormSelect label="N-Cons email status" options={withPlaceholder("Select status", EMAIL_STATUS_OPTIONS)} value={formvalues.nConsEmailStatus} onChange={set("nConsEmailStatus")} error={errors.nConsEmailStatus} /></Q>
                <Q name="whatsAppNumber"><PhoneField label="WhatsApp number" countryIso={whatsapp.countryIso} number={whatsapp.number} onChange={(v) => { setSameAsMobile(false); setWhatsapp(v); clearError("whatsAppNumber"); }} error={errors.whatsAppNumber} hint="If applicable" placeholder="1512 3456789" />
                  <label className="flex items-center gap-[8px] mt-[8px] text-[13px] text-[var(--text-secondary)] cursor-pointer" >
                  <Checkbox  checked={sameAsMobile} onCheckedChange={checked => ((e) => setSameAsMobile(e.target.checked))({ target: { checked: checked === true } })} className="cursor-pointer"  />
                  Same as mobile number
                </label></Q>
                <Q name="personalEmail"><FormInput label="Personal email ID" required type="email" value={formvalues.personalEmail} onChange={set("personalEmail")} error={errors.personalEmail} hint="An address you check regularly" maxLength={150} /></Q>
              </div>
            </Group>

            <Group title="Where you are now">
              <div className="fc-row fc-row-2">
                <Q name="city"><FormInput label="City" required value={formvalues.city} onChange={set("city")} error={errors.city} hint="Current city" maxLength={100} /></Q>
                <Q name="country"><FormInput label="Country" required value={formvalues.country} onChange={set("country")} error={errors.country} hint="Current country" maxLength={100} /></Q>
              </div>
              <Q name="currentAddress"><FormTextarea label="Current address" required value={formvalues.currentAddress} onChange={set("currentAddress")} error={errors.currentAddress} hint="House no., street, area, postcode" rows={3} maxLength={500} /></Q>
            </Group>

            <Group title="Documents">
              <Q name="passportCopy">
                <FileUploadBox
                  id="passport-copy-input"
                  label="Passport copy (photo and passport number page)"
                  hint="Photo and passport number page · JPG, PNG or PDF · max 5 MB"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  file={passportCopy}
                  error={errors.passportCopy}
                  icon={<FileText />}
                  onSelect={pickFile("passportCopy", PASSPORT_COPY_EXT, "Passport Copy", setPassportCopy)}
                  onRemove={() => setPassportCopy(null)}
                />
              </Q>
              <Q name="passportPhoto">
                <FileUploadBox
                  id="passport-photo-input"
                  label="Current passport-size photo"
                  hint="Recent, clear, plain background · JPG, PNG or PDF · max 5 MB"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  file={passportPhoto}
                  error={errors.passportPhoto}
                  icon={<ImageIcon />}
                  onSelect={pickFile("passportPhoto", PASSPORT_PHOTO_EXT, "Passport-size Photo", setPassportPhoto)}
                  onRemove={() => setPassportPhoto(null)}
                />
              </Q>
            </Group>

            <Group title="Certificates">
              <Q name="certificates">
                <MultiFileUploadBox
                  id="certificates-input"
                  label="Upload certificates (optional)"
                  hint="e.g. CCNA, higher education or training certificates · JPG, PNG or PDF · up to 10 files, 5 MB in total"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  files={certificates}
                  max={MAX_CERTIFICATES}
                  maxTotalMb={MAX_CERTIFICATES_TOTAL_MB}
                  error={errors.certificates}
                  onAdd={addCertificates}
                  onRemove={(idx) => { setCertificates((prev) => prev.filter((_, k) => k !== idx)); clearError("certificates"); }}
                />
              </Q>
            </Group>

            <Q name="consentGiven">
              <div className="gf-card" style={{ borderColor: errors.consentGiven ? "var(--coral)" : undefined }}>
                <label className="flex items-start gap-[12px] cursor-pointer text-[14px] leading-[1.5] text-[var(--text-primary)]" >
                  <Checkbox  checked={consent} className="mt-[4px] cursor-pointer w-[16px] h-[16px]" 
                    onCheckedChange={checked => ((e) => { setConsent(e.target.checked); if (e.target.checked) clearError("consentGiven"); })({ target: { checked: checked === true } })} />
                  <span>I confirm that the information and documents provided in this form are shared with my consent.<span className={cn("req", "text-[var(--coral)] ml-[4px]")} >*</span></span>
                </label>
                {errors.consentGiven && <div className={cn("fc-error", "mt-[8px]")} >{errors.consentGiven}</div>}
              </div>
            </Q>

            <div className="gf-actions">
              <span className="gf-actions-note">Please check your details before submitting. After submission, to make any correction, please contact an authorized person.</span>
              <div className="gf-actions-btns">
                <Button variant="outline" type="button" className="btn btn-outline gf-btn" onClick={resetForm} disabled={loading}>Clear form</Button>
                <Button variant="default" type="submit" className="btn btn-primary gf-btn" disabled={loading}>{loading ? "Submitting..." : "Submit"}</Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
