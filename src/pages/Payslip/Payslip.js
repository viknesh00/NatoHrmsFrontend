import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, RefreshCw, Plus, Eye, Mail, Receipt } from "lucide-react";
import { getRequest, postRequest } from "../../services/Apiservice";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import ProTable, { StatusChip } from "../../components/ProTable";
import dayjs from "dayjs";

export default function Payslip() {
  const navigate    = useNavigate();
  const [loading, setLoading]         = useState(false);
  const [empData, setEmpData]         = useState([]);
  const [selEmp, setSelEmp]           = useState("");
  const [selMonth, setSelMonth]       = useState(dayjs().subtract(1, "month").format("YYYY-MM"));
  const [generated, setGenerated]     = useState([]);
  const [showForm, setShowForm]       = useState(false);
  const [errors, setErrors]           = useState({});

  useEffect(() => { loadEmployees(); loadGeneratedPayslips(); }, []);

  const loadEmployees = () => {
    setLoading(true);
    getRequest("User/GetSalary")
      .then(res => { if (res.data) setEmpData(res.data); })
      .catch(console.error).finally(() => setLoading(false));
  };

  const loadGeneratedPayslips = () => {
    getRequest("User/GetGeneratedPayslips").then(res => {
      if (res.data) setGenerated(res.data.map(p => ({
        ...p,
        generatedOn: p.generatedOn ? dayjs(p.generatedOn).format("DD-MM-YYYY") : "—",
      })));
    }).catch(() => {}); // API may not exist yet
  };

  const validate = () => {
    const e = {};
    if (!selEmp)   e.emp   = "Please select an employee";
    if (!selMonth) e.month = "Please select a month";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGenerate = () => {
    if (!validate()) { ToastError("Please fill required fields"); return; }
    const emp = empData.find(e => e.userName === selEmp);
    if (!emp) return;
    navigate("/payslip/payslip-preview", { state: { employee: emp, monthYear: new Date(selMonth + "-01") } });
  };

  const selectedEmp = empData.find(e => e.userName === selEmp);

  const columns = [
    { field: "employeeName",  label: "Employee" },
    { field: "employeeId",    label: "Emp ID" },
    { field: "payMonth",      label: "Pay Month" },
    { field: "generatedOn",   label: "Generated On" },
    { field: "netAmount",     label: "Net Amount" },
    {
      field: "status", label: "Status",
      renderCell: (row) => <StatusChip label={row.emailSent ? "Sent" : "Generated"} />,
    },
    {
      field: "actions", label: "Actions",
      renderCell: (row) => (
        <div style={{ display: "flex", gap: 4 }}>
          <button className="icon-btn" title="View" onClick={() => navigate("/payslip/payslip-preview", { state: { payslipId: row.id, viewOnly: true } })}><Eye size={14} /></button>
          <button className="icon-btn" title="Email" style={{ color: "var(--teal)" }}
            onClick={() => {
              setLoading(true);
              postRequest("User/EmailPayslip", { payslipId: row.id })
                .then(() => { ToastSuccess("Payslip emailed"); loadGeneratedPayslips(); })
                .catch(() => ToastError("Email failed")).finally(() => setLoading(false));
            }}>
            <Mail size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <LoadingMask loading={loading} />
      <div className="page-header">
        <div>
          <Breadcrumb icon={<Receipt size={13} />} items={[{ label: "Payslip" }]} />
          <h1 className="page-title">Payslip Management</h1>
          <p className="page-subtitle">Generate and manage employee salary slips</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          <Plus size={15} /> {showForm ? "Close Generator" : "Generate Payslip"}
        </button>
      </div>

      {/* Generator Panel */}
      {showForm && (
        <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)", overflow: "hidden", marginBottom: 20 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "linear-gradient(135deg, var(--primary-ghost), #f0fdf4)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, var(--primary), var(--teal))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={18} color="white" />
            </div>
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>Generate Payslip</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Select employee and month to generate salary slip</div>
            </div>
          </div>

          <div style={{ padding: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 24 }}>
              {/* Employee Select */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7 }}>
                  Employee <span style={{ color: "var(--coral)" }}>*</span>
                </label>
                <select className="fc-input" value={selEmp} onChange={e => setSelEmp(e.target.value)} style={{ paddingRight: 32, appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                  <option value="">Select employee...</option>
                  {empData.map(e => <option key={e.userName} value={e.userName}>{e.userName}</option>)}
                </select>
                {errors.emp && <div style={{ fontSize: 12, color: "var(--coral)", marginTop: 4 }}>{errors.emp}</div>}
              </div>

              {/* Month Select */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7 }}>
                  Pay Month <span style={{ color: "var(--coral)" }}>*</span>
                </label>
                <input type="month" className="fc-input" value={selMonth}
                  max={dayjs().subtract(0, "month").format("YYYY-MM")}
                  onChange={e => setSelMonth(e.target.value)} />
                {errors.month && <div style={{ fontSize: 12, color: "var(--coral)", marginTop: 4 }}>{errors.month}</div>}
              </div>

              {/* Preview pane */}
              <div style={{ background: "var(--bg)", borderRadius: 10, padding: "12px 14px", border: "1.5px solid var(--border)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Selected Employee</div>
                {selectedEmp ? (
                  <>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>{selectedEmp.fullName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{selectedEmp.employeeId} · {selectedEmp.department}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", marginTop: 6 }}>
                      CTC: ₹{selectedEmp.ctc ? Number(selectedEmp.ctc).toLocaleString() : "—"}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No employee selected</div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-primary" onClick={handleGenerate}><FileText size={15} /> Generate & Preview</button>
              <button className="btn btn-ghost" onClick={() => { setSelEmp(""); setSelMonth(dayjs().subtract(1,"month").format("YYYY-MM")); setErrors({}); }}>
                <RefreshCw size={15} /> Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Payslips Table */}
      <ProTable
        title="Generated Payslips"
        columns={columns}
        data={generated}
      />

      <style>{`.fc-input{width:100%;padding:10px 13px;border-radius:10px;border:1.5px solid var(--border);background:var(--bg);font-family:'DM Sans',sans-serif;font-size:13.5px;color:var(--text-primary);outline:none;transition:all 0.2s;}.fc-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-ghost);background:#fff;}`}</style>
    </div>
  );
}
