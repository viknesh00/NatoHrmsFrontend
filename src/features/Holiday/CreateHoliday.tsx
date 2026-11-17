import WorkflowDialog from "../../components/WorkflowDialog";
import { cn } from "cn";
import { Button } from "../../components/ui/button";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { postRequest, deleteRequest } from "../../shared/services/Apiservice";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
import LoadingMask from "../../shared/services/LoadingMask";
import Breadcrumb from "../../shared/services/Breadcrumb";
import { Calendar, Save, X, Trash2, Plus, AlertTriangle } from "lucide-react";
import { FormInput, FormSelect, FormDate, FormRow, FormCard, } from "../../components/FormComponents"; // ← adjust path as needed
 // ← adjust path as needed

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
  const [errors,  setErrors]              = useState<Record<string, any>>({});
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
    const e: Record<string, any> = {};
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
      {showDeleteConfirm && <WorkflowDialog title="Delete Event" onClose={() => setShowDeleteConfirm(false)} busy={loading} width="380px" dismissible={false}>
<div className="bg-[var(--bg-card)] w-[100%] max-w-[380px] overflow-hidden" style={{borderRadius: "var(--radius)", boxShadow: "var(--shadow-xl)", animation: "slideUp 0.25s ease"}}>
            <div className="h-[4px] bg-destructive"  />
            <div className="p-[24px_24px_0]" >
              <div className="flex items-center gap-[16px] mb-[12px]" >
                <div className="w-[44px] h-[44px] bg-error-subtle flex items-center justify-center shrink-[0]" style={{borderRadius: "var(--radius)"}}>
                  <AlertTriangle size={22} color="var(--coral)" />
                </div>
                <div>
                  <div className="text-[18px] font-semibold text-[var(--text-primary)]" style={{fontFamily: "var(--ui-font-heading)"}}>Delete Event</div>
                  <div className="text-[13px] text-[var(--text-muted)] mt-[4px]" >This action cannot be undone</div>
                </div>
              </div>
              <p className="text-[14px] text-[var(--text-secondary)] leading-[1.7] mb-[20px]" >
                Are you sure you want to delete <strong className="text-[var(--text-primary)]" >{rows[0]?.eventName || "this event"}</strong>? It will be permanently removed.
              </p>
            </div>
            <div className="p-[0_24px_20px] flex gap-[12px] justify-end" >
              <Button variant="outline" type="button" onClick={() => setShowDeleteConfirm(false)} className="btn btn-ghost">Cancel</Button>
              <Button variant="destructive" type="button" onClick={handleDeleteConfirm} className={cn("btn btn-danger", "flex items-center gap-[8px]")} >
                <Trash2 size={15} /> Yes, Delete
              </Button>
            </div>
          </div>
</WorkflowDialog>}

      <div>
        <div className="page-header">
          <div>
            <Breadcrumb icon={<Calendar size={13} />} items={[{ label: "Calendar", link: "/Calendar" }, { label: editData ? "Edit Event" : "Add Event" }]} />
            <h1 className="page-title">{editData ? "Edit Event" : "Add Event"}</h1>
            <p className="page-subtitle">Manage company holidays and events</p>
          </div>
          {editData && (
            <Button variant="destructive" type="button" className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={14} /> Delete
            </Button>
          )}
        </div>

        <div className="max-w-[680px] m-[0_auto]" >
          <FormCard
            icon={<Calendar />}
            title={editData ? "Edit Event" : "New Holiday / Event"}
            subtitle={editData ? "Update event details" : rows.length > 1 ? `Adding ${rows.length} events at once` : "Add a holiday or company event"}
            footer={
              <>
                <Button variant="outline" type="button" className="btn btn-ghost" onClick={() => navigate("/Calendar")}><X size={15} /> Cancel</Button>
                <Button variant="default" type="button" className="btn btn-primary" onClick={handleSave}>
                  <Save size={15} /> {editData ? "Update" : rows.length > 1 ? `Save ${rows.length} Events` : "Save Event"}
                </Button>
              </>
            }
          >
            {/* "Add Another" button — slot into card header via a wrapper trick */}
            {!editData && (
              <div className="flex justify-end mb-[16px]" style={{marginTop: -8}}>
                <Button variant="outline" type="button" onClick={addRow} className="btn btn-outline btn-sm"><Plus size={14} /> Add Another</Button>
              </div>
            )}

            {rows.map((row, i) => (
              <div key={i} style={{ paddingBottom: rows.length > 1 ? 16 : 0, marginBottom: i < rows.length - 1 ? 16 : 0, borderBottom: i < rows.length - 1 ? "1px dashed var(--border)" : "none" }}>

                {rows.length > 1 && (
                  <div className="flex items-center justify-between mb-[16px]" >
                    <span className="text-[13px] font-semibold text-primary" style={{fontFamily: "var(--ui-font-heading)"}}>Entry {i + 1}</span>
                    <Button variant="ghost" type="button" onClick={() => removeRow(i)} className="bg-[var(--coral-ghost)] text-[var(--coral)] cursor-pointer p-[4px_12px] text-[12px] font-semibold flex items-center gap-[4px]" style={{border: "none", borderRadius: "var(--radius)"}}>
                      <X size={12} /> Remove
                    </Button>
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
