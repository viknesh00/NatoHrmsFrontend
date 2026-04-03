import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { postRequest, deleteRequest } from "../../services/Apiservice";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import { Calendar, Save, X, Trash2, Plus, AlertTriangle } from "lucide-react";
import { createPortal } from "react-dom";
import {
  FormInput,
  FormSelect,
  FormDate,
  FormRow,
  FormCard,
} from "../../components/FormComponents"; // ← adjust path as needed

const EVENT_TYPES = [
  { value: "Holiday", label: "Holiday" },
  { value: "Event",   label: "Event"   },
];

const emptyRow = () => ({ eventName: "", eventDate: "", eventType: "Holiday", workLocation: "" });

const CreateHoliday = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.holiday || null;

  const [loading, setLoading]             = useState(false);
  const [errors,  setErrors]              = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [rows, setRows] = useState(
    editData
      ? [{ id: editData.holidayId, eventName: editData.eventName || "", eventDate: editData.eventDate || "", eventType: editData.eventType || "Holiday", workLocation: editData.workLocation || "" }]
      : [emptyRow()]
  );

  const setRow    = (i, field, val) => setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const addRow    = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const validate = () => {
    const e = {};
    rows.forEach((r, i) => {
      if (!r.eventName.trim())    e[`name_${i}`]     = "Required";
      if (!r.eventDate)           e[`date_${i}`]     = "Required";
      if (!r.workLocation.trim()) e[`location_${i}`] = "Required";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) { ToastError("Please fill required fields"); return; }
    setLoading(true);
    try {
      const payload = rows.map(row => ({
        HolidayId:    row.id || null,
        EventName:    row.eventName,
        EventDate:    row.eventDate,
        EventType:    row.eventType,
        workLocation: row.workLocation.trim(),
      }));
      const res = await postRequest("Holiday/SaveHoliday", payload);
      if (res.status === 200) {
        ToastSuccess(rows.length > 1 ? `${rows.length} events saved` : "Saved successfully");
        navigate("/Calendar");
      }
    } catch (err) {
      ToastError(err?.response?.data?.message || "Failed");
    } finally { setLoading(false); }
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    setLoading(true);
    try {
      const res = await deleteRequest(`Holiday/DeleteHoliday?holidayId=${editData.holidayId}`);
      if (res.status === 200) { ToastSuccess("Deleted successfully"); navigate("/Calendar"); }
    } catch {
      ToastError("Delete failed");
    } finally { setLoading(false); }
  };

  return (
    <>
      <LoadingMask loading={loading} />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,0,50,0.5)", backdropFilter: "blur(4px)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 20, boxShadow: "var(--shadow-xl)", width: "100%", maxWidth: 380, overflow: "hidden", animation: "slideUp 0.25s ease" }}>
            <div style={{ height: 4, background: "linear-gradient(90deg, var(--coral), #f97316)" }} />
            <div style={{ padding: "24px 24px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff1f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <AlertTriangle size={22} color="var(--coral)" />
                </div>
                <div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>Delete Event</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>This action cannot be undone</div>
                </div>
              </div>
              <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 20 }}>
                Are you sure you want to delete <strong style={{ color: "var(--text-primary)" }}>{rows[0]?.eventName || "this event"}</strong>? It will be permanently removed.
              </p>
            </div>
            <div style={{ padding: "0 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleDeleteConfirm} className="btn btn-danger" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Trash2 size={15} /> Yes, Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div>
        <div className="page-header">
          <div>
            <Breadcrumb icon={<Calendar size={13} />} items={[{ label: "Calendar", link: "/Calendar" }, { label: editData ? "Edit Event" : "Add Event" }]} />
            <h1 className="page-title">{editData ? "Edit Event" : "Add Event"}</h1>
            <p className="page-subtitle">Manage company holidays and events</p>
          </div>
          {editData && (
            <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>

        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <FormCard
            icon={<Calendar />}
            title={editData ? "Edit Event" : "New Holiday / Event"}
            subtitle={editData ? "Update event details" : rows.length > 1 ? `Adding ${rows.length} events at once` : "Add a holiday or company event"}
            footer={
              <>
                <button className="btn btn-ghost" onClick={() => navigate("/Calendar")}><X size={15} /> Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>
                  <Save size={15} /> {editData ? "Update" : rows.length > 1 ? `Save ${rows.length} Events` : "Save Event"}
                </button>
              </>
            }
          >
            {/* "Add Another" button — slot into card header via a wrapper trick */}
            {!editData && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, marginTop: -8 }}>
                <button onClick={addRow} className="btn btn-outline btn-sm"><Plus size={14} /> Add Another</button>
              </div>
            )}

            {rows.map((row, i) => (
              <div key={i} style={{ paddingBottom: rows.length > 1 ? 16 : 0, marginBottom: i < rows.length - 1 ? 16 : 0, borderBottom: i < rows.length - 1 ? "1px dashed var(--border)" : "none" }}>

                {rows.length > 1 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Entry {i + 1}</span>
                    <button onClick={() => removeRow(i)} style={{ background: "var(--coral-ghost)", color: "var(--coral)", border: "none", cursor: "pointer", borderRadius: 7, padding: "4px 10px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                      <X size={12} /> Remove
                    </button>
                  </div>
                )}

                <FormInput
                  label="Event Name"
                  required
                  value={row.eventName}
                  onChange={e => setRow(i, "eventName", e.target.value)}
                  placeholder="e.g. Republic Day, Team Outing"
                  error={errors[`name_${i}`]}
                />

                <FormRow cols={2}>
                  <FormDate
                    label="Event Date"
                    required
                    value={row.eventDate}
                    onChange={e => setRow(i, "eventDate", e.target.value)}
                    error={errors[`date_${i}`]}
                  />
                  <FormSelect
                    label="Event Type"
                    required
                    options={EVENT_TYPES}
                    value={row.eventType}
                    onChange={e => setRow(i, "eventType", e.target.value)}
                  />
                </FormRow>

                <FormInput
                  label="Applicable Location"
                  required
                  value={row.workLocation}
                  onChange={e => setRow(i, "workLocation", e.target.value)}
                  placeholder="e.g. Chennai, Bangalore, All"
                  error={errors[`location_${i}`]}
                />

              </div>
            ))}
          </FormCard>
        </div>
      </div>
    </>
  );
};

export default CreateHoliday;