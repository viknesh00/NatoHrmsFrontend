import { cn } from "cn";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { NativeSelect } from "../../components/ui/native-select";
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getRequest, postRequest } from "../../shared/services/Apiservice";
import { ToastSuccess, ToastError } from "../../shared/services/ToastMsg";
import LoadingMask from "../../shared/services/LoadingMask";
import Breadcrumb from "../../shared/services/Breadcrumb";
import { FormCard, FormSection, FormRow, FormDate } from "../../components/FormComponents";
import { FileText, Save, X, Upload, File, Eye, Trash2 } from "lucide-react";

const IS: Record<string, React.CSSProperties> = {
  label:{ display:"block",fontFamily:"var(--ui-font-heading)",fontSize:12,fontWeight:600,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:7 },
  input:{ width:"100%",padding:"10px 13px",borderRadius:"var(--radius)",border:"1px solid var(--border)",background:"var(--bg)",fontFamily:"var(--ui-font-sans)",fontSize:14,color:"var(--text-primary)",outline:"none",transition:"all 0.2s",boxSizing:"border-box" },
  req:{ color:"var(--coral)",marginLeft:2 },
  error:{ fontSize:13,color:"var(--coral)",marginTop:4 },
};

function Field({ label, req, children, err }: Record<string, any>){
  return (
    <div className="mb-[16px]" >
      <label style={IS.label}>{label}{req && <span style={IS.req}>*</span>}</label>
      {children}
      {err && <div style={IS.error}>{err}</div>}
    </div>
  );
}

function FocusInput({ style:s, ...props }: Record<string, any>){
  return <Input {...props} style={{ ...IS.input, ...s }}
    onFocus={e=>{e.target.style.borderColor="var(--primary)";e.target.style.boxShadow="0 0 0 3px var(--primary-ghost)";e.target.style.background="var(--card)";}}
    onBlur={e=>{e.target.style.borderColor="var(--border)";e.target.style.boxShadow="none";e.target.style.background="var(--bg)";}}/>;
}

const yesNoOptions = [
  { label:"Yes", value:true },
  { label:"No",  value:false },
];

const DocumentUploadForm = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const editData  = location.state?.editData || null;
  const [loading, setLoading]               = useState(false);
  const [errors,  setErrors]                = useState<Record<string, any>>({});
  const [file,    setFile]                  = useState(null);
  const [removedExistingFile, setRemovedExistingFile] = useState(false);
  const [peopleOptions, setPeopleOptions]   = useState([]);
  const [peopleSearch, setPeopleSearch]     = useState("");
  const [showPeopleDropdown, setShowPeopleDropdown] = useState(false);

  // ── FIX: ref for the entire people dropdown container ──
  const peopleDropdownRef = useRef(null);

  const [form, setForm] = useState({
    id:             editData?.id ?? null,
    documentName:   editData?.documentName   || "",
    tags:           editData?.tags           || "",
    assignedPeople: editData?.assignedPeople
      ? editData.assignedPeople.split(",").map(e => ({ label:e, value:e }))
      : [],
    reviewDate:     editData?.reviewDate
      ? editData.reviewDate.split("T")[0]
      : "",
    isCurrent:      editData?.isCurrent != null
      ? (editData.isCurrent ? { label:"Yes", value:true } : { label:"No", value:false })
      : null,
    fileName:       editData?.fileName || "",
  });

  useEffect(() => { getUsers(); }, []);

  // ── FIX: close dropdown on outside click ──
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (peopleDropdownRef.current && !peopleDropdownRef.current.contains(e.target)) {
        setShowPeopleDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getUsers = () => {
    setLoading(true);
    getRequest("User/All")
      .then(res => {
        if (res.data) {
          const emails = res.data
            .map(u => ({ label:u.email, value:u.email }))
            .sort((a,b) => a.label.localeCompare(b.label));
          setPeopleOptions([{ label:"All", value:"ALL" }, ...emails]);
        }
      }).finally(() => setLoading(false));
  };

  const set = (f) => (v) => setForm(prev => ({ ...prev, [f]:v }));

  // People multi-select helpers
  const togglePerson = (option) => {
    if (option.value === "ALL") {
      set("assignedPeople")([{ label:"All", value:"ALL" }]);
    } else {
      const already = form.assignedPeople.some(p => p.value === option.value);
      const filtered = form.assignedPeople.filter(p => p.value !== "ALL");
      set("assignedPeople")(
        already ? filtered.filter(p => p.value !== option.value) : [...filtered, option]
      );
    }
  };

  const removePerson = (val) => set("assignedPeople")(form.assignedPeople.filter(p => p.value !== val));

  const filteredPeople = peopleOptions.filter(o =>
    o.label.toLowerCase().includes(peopleSearch.toLowerCase()) &&
    (form.assignedPeople.some(p => p.value === "ALL") ? o.value === "ALL" : true)
  );

  const validate = () => {
    const e: Record<string, any> = {};
    if (!form.documentName.trim()) e.documentName = "Document name is required";
    if (!form.tags.trim())         e.tags         = "Tags are required";
    if (!form.assignedPeople.length) e.assignedPeople = "Please assign at least one person";
    if (!form.reviewDate)          e.reviewDate   = "Review date is required";
    if (!form.isCurrent)           e.isCurrent    = "Please select current status";
    if ((!editData || removedExistingFile) && !file) e.file = "Document file is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) { ToastError("Please fill all required fields"); return; }
    const formData = new FormData();
    formData.append("id",             form.id ?? "");
    formData.append("documentName",   form.documentName);
    formData.append("tags",           form.tags.split(",").map(t=>t.trim()).filter(Boolean).join(","));
    formData.append("assignedPeople", form.assignedPeople.map(p=>p.value).join(","));
    formData.append("reviewDate",     form.reviewDate);
    formData.append("isCurrent",      form.isCurrent?.value ? "true" : "false");
    if (removedExistingFile) formData.append("removeExistingFile","true");
    if (file) formData.append("document", file);

    setLoading(true);
    postRequest("CompanyDocument/SaveDocument", formData, { headers:{ "Content-Type":"multipart/form-data" } })
      .then(res => { if (res.data) { ToastSuccess("Saved successfully"); navigate("/company-documents"); } })
      .catch(err => ToastError(err?.response?.data?.message || "Failed"))
      .finally(() => setLoading(false));
  };

  const previewExistingFile = async () => {
    try {
      setLoading(true);
      const res = await getRequest(`CompanyDocument/Preview/${form.id}`, {}, true);
      window.open(URL.createObjectURL(res.data), "_blank");
    } catch { ToastError("Preview failed"); } finally { setLoading(false); }
  };

  const previewNewFile = () => window.open(URL.createObjectURL(file), "_blank");

  const removeFile = () => { setFile(null); setRemovedExistingFile(true); };

  return (
    <div>
      <LoadingMask loading={loading}/>
      <div className="page-header">
        <div>
          <Breadcrumb icon={<File size={13}/>} items={[{ label:"Company Documents", link:"/company-documents" }, { label: editData ? "Edit Document" : "Upload Document" }]}/>
          <h1 className="page-title">{editData ? "Edit Document" : "Upload Document"}</h1>
          <p className="page-subtitle">Manage company document library</p>
        </div>
      </div>

      <div className="max-w-[620px] m-[0_auto]" >
        <FormCard
          icon={<FileText/>}
          title={editData ? "Edit Document" : "Upload New Document"}
          subtitle="Add a document to the company knowledge base"
          footer={
            <>
              <Button variant="outline" type="button" className="btn btn-ghost" onClick={() => navigate("/company-documents")}><X size={15}/> Cancel</Button>
              <Button variant="default" type="button" className="btn btn-primary" onClick={handleSave}><Save size={15}/> {editData ? "Update" : "Upload"}</Button>
            </>
          }
        >
          <FormSection title="Document Information">

            {/* Document Name */}
            <Field label="Document Name" req err={errors.documentName}>
              <FocusInput
                value={form.documentName}
                onChange={e => set("documentName")(e.target.value)}
                placeholder="e.g. Employee Handbook 2024"
              />
            </Field>

            {/* Tags */}
            <Field label="Tags (comma separated)" req err={errors.tags}>
              <FocusInput
                value={form.tags}
                onChange={e => set("tags")(e.target.value)}
                placeholder="e.g. policy, hr, onboarding"
              />
            </Field>

            {/* Assigned People multi-select */}
            <Field label="Assign People" req err={errors.assignedPeople}>
              {/* ── FIX: attach ref here, removed onBlur from FocusInput ── */}
              <div className="relative"  ref={peopleDropdownRef}>
                {/* Selected tags */}
                <div className="flex flex-wrap gap-[8px]" style={{marginBottom: form.assignedPeople.length ? 8 : 0}}>
                  {form.assignedPeople.map(p => (
                    <span key={p.value} className="flex items-center gap-[4px] bg-[var(--primary-ghost)] text-primary text-[12px] font-semibold p-[4px_12px]" style={{borderRadius:"var(--radius)"}}>
                      {p.label}
                      <span onClick={() => removePerson(p.value)} className="cursor-pointer text-[14px] leading-[1]" >×</span>
                    </span>
                  ))}
                </div>
                {/* Search input — onBlur removed */}
                <FocusInput
                  value={peopleSearch}
                  onChange={e => { setPeopleSearch(e.target.value); setShowPeopleDropdown(true); }}
                  onFocus={() => setShowPeopleDropdown(true)}
                  placeholder="Search and select people..."
                />
                {/* Dropdown */}
                {showPeopleDropdown && (
                  <div className="absolute top-[100%] left-[0px] right-[0px] bg-card z-[100] max-h-[200px] overflow-y-auto mt-[4px]" style={{border:"1px solid var(--border)", borderRadius:"var(--radius)", boxShadow:"var(--shadow-lg)"}}>
                    {filteredPeople.length === 0 ? (
                      <div className="p-[12px_16px] text-[13px] text-[var(--text-muted)]" >No results</div>
                    ) : filteredPeople.map(o => {
                      const selected = form.assignedPeople.some(p => p.value === o.value);
                      return (
                        <div key={o.value} onMouseDown={() => togglePerson(o)}
                          className="p-[8px_16px] text-[13px] cursor-pointer flex items-center justify-between" style={{background: selected ? "var(--primary-ghost)" : "var(--card)", color: selected ? "var(--primary)" : "var(--text-primary)"}}>
                          {o.label}
                          {selected && <span className="text-[16px] text-primary" >✓</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Field>

            <FormRow cols={2}>
              {/* Review Date */}
              <Field label="Review Date" req err={errors.reviewDate}>
                <FormDate
                  value={form.reviewDate}
                  onChange={e => set("reviewDate")(e.target.value)}
                  placeholder="Select review date"
                />
              </Field>

              {/* Is Current */}
              <Field label="Current" req err={errors.isCurrent}>
                <NativeSelect
                  value={form.isCurrent?.value != null ? String(form.isCurrent.value) : ""}
                  onChange={e => {
                    const found = yesNoOptions.find(o => String(o.value) === e.target.value);
                    set("isCurrent")(found || null);
                  }}
                  className="pr-[36px]" style={{...IS.input, appearance:"none", backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center"}}
                  onFocus={e=>{e.target.style.borderColor="var(--primary)";e.target.style.boxShadow="0 0 0 3px var(--primary-ghost)";}}
                  onBlur={e=>{e.target.style.borderColor="var(--border)";e.target.style.boxShadow="none";}}
                >
                  <option value="">Select...</option>
                  {yesNoOptions.map(o => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
                </NativeSelect>
              </Field>
            </FormRow>

          </FormSection>

          {/* File Upload */}
          <FormSection title="File Upload">
            <Field label={`File${!editData ? " *" : ""}`} err={errors.file}>
              <div className="p-[20px_16px] text-center cursor-pointer" style={{border:`2px dashed ${errors.file ? "var(--coral)" : "var(--border)"}`, borderRadius:"var(--radius)", background: file ? "var(--teal-ghost)" : "var(--bg)", transition:"all 0.2s"}}
                onClick={() => document.getElementById("doc-file-input").click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f=e.dataTransfer.files[0]; if(f){ setFile(f); setRemovedExistingFile(true); } }}>
                <input id="doc-file-input" type="file" className="hidden" 
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
                  onChange={e => { setFile(e.target.files[0]); setRemovedExistingFile(true); }}/>
                <Upload size={28} color={file ? "var(--teal)" : "var(--text-muted)"} className="m-[0_auto_8px]" />
                {file ? (
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--teal)]" >{file.name}</div>
                    <div className="text-[12px] text-[var(--text-muted)] mt-[4px]" >{(file.size/1024/1024).toFixed(2)} MB</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--text-secondary)]" >Click to upload or drag & drop</div>
                    <div className="text-[12px] text-[var(--text-muted)] mt-[4px]" >PDF, DOCX, XLSX, PNG, JPG</div>
                  </div>
                )}
              </div>
            </Field>

            {/* Existing file row */}
            {editData && !removedExistingFile && !file && (
              <div className="flex items-center justify-between p-[12px_16px] bg-[var(--bg)]" style={{borderRadius:"var(--radius)", border:"1px solid var(--border)"}}>
                <span className="text-[13px] text-[var(--text-primary)] font-semibold" >{form.fileName || "Existing document"}</span>
                <div className="flex gap-[8px]" >
                  <Button variant="ghost" type="button" className={cn("icon-btn", "text-primary")} title="Preview" onClick={previewExistingFile} ><Eye size={16}/></Button>
                  <Button variant="ghost" type="button" className={cn("icon-btn", "text-[var(--coral)]")} title="Remove"  onClick={removeFile}          ><Trash2 size={16}/></Button>
                </div>
              </div>
            )}

            {/* New file row */}
            {file && (
              <div className="flex items-center justify-between p-[12px_16px] bg-[var(--teal-ghost)]" style={{borderRadius:"var(--radius)", border:"1px solid var(--border)"}}>
                <span className="text-[13px] text-[var(--teal)] font-semibold" >{file.name}</span>
                <div className="flex gap-[8px]" >
                  <Button variant="ghost" type="button" className={cn("icon-btn", "text-primary")} title="Preview" onClick={previewNewFile} ><Eye size={16}/></Button>
                  <Button variant="ghost" type="button" className={cn("icon-btn", "text-[var(--coral)]")} title="Remove"  onClick={removeFile}     ><Trash2 size={16}/></Button>
                </div>
              </div>
            )}

            {editData && !file && (
              <div className="text-[12px] text-[var(--text-muted)] mt-[8px]" >Leave empty to keep the existing file</div>
            )}
          </FormSection>
        </FormCard>
      </div>
    </div>
  );
};

export default DocumentUploadForm;