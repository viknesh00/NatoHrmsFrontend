import { cn } from "cn";
import { Button } from "../../components/ui/button";
import { NativeSelect } from "../../components/ui/native-select";
import { Input } from "../../components/ui/input";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, RefreshCw, Plus, Eye, Mail, Receipt } from "lucide-react";
import { getRequest, postRequest } from "../../shared/services/Apiservice";
import LoadingMask from "../../shared/services/LoadingMask";
import Breadcrumb from "../../shared/services/Breadcrumb";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
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
  const [errors, setErrors]           = useState<Record<string, any>>({});

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
    const e: Record<string, any> = {};
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
        <div className="flex gap-[4px]" >
          <Button variant="ghost" type="button" className="icon-btn" title="View" onClick={() => navigate("/payslip/payslip-preview", { state: { payslipId: row.id, viewOnly: true } })}><Eye size={14} /></Button>
          <Button variant="ghost" type="button" className={cn("icon-btn", "text-[var(--teal)]")} title="Email" 
            onClick={() => {
              setLoading(true);
              postRequest("User/EmailPayslip", { payslipId: row.id })
                .then(() => { ToastSuccess("Payslip emailed"); loadGeneratedPayslips(); })
                .catch(() => ToastError("Email failed")).finally(() => setLoading(false));
            }}>
            <Mail size={14} />
          </Button>
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
        <Button variant="default" type="button" className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          <Plus size={15} /> {showForm ? "Close Generator" : "Generate Payslip"}
        </Button>
      </div>

      {/* Generator Panel */}
      {showForm && (
        <div className="bg-[var(--bg-card)] overflow-hidden mb-[20px]" style={{borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)"}}>
          <div className="p-[16px_20px] bg-muted flex items-center gap-[12px]" style={{borderBottom: "1px solid var(--border)"}}>
            <div className="w-[36px] h-[36px] bg-primary flex items-center justify-center" style={{borderRadius: "var(--radius)"}}>
              <FileText size={18} color="var(--primary-foreground)" />
            </div>
            <div>
              <div className="text-[16px] font-semibold text-[var(--text-primary)]" style={{fontFamily: "var(--ui-font-heading)"}}>Generate Payslip</div>
              <div className="text-[12px] text-[var(--text-muted)]" >Select employee and month to generate salary slip</div>
            </div>
          </div>

          <div className="p-[24px]" >
            <div className="grid gap-[20px] mb-[24px]" style={{gridTemplateColumns: "1fr 1fr 1fr"}}>
              {/* Employee Select */}
              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em] mb-[8px]" >
                  Employee <span className="text-[var(--coral)]" >*</span>
                </label>
                <NativeSelect className={cn("fc-input", "pr-[32px]")} value={selEmp} onChange={e => setSelEmp(e.target.value)} style={{appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center"}}>
                  <option value="">Select employee...</option>
                  {empData.map(e => <option key={e.userName} value={e.userName}>{e.userName}</option>)}
                </NativeSelect>
                {errors.emp && <div className="text-[12px] text-[var(--coral)] mt-[4px]" >{errors.emp}</div>}
              </div>

              {/* Month Select */}
              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em] mb-[8px]" >
                  Pay Month <span className="text-[var(--coral)]" >*</span>
                </label>
                <Input type="month" className="fc-input" value={selMonth}
                  max={dayjs().subtract(0, "month").format("YYYY-MM")}
                  onChange={e => setSelMonth(e.target.value)} />
                {errors.month && <div className="text-[12px] text-[var(--coral)] mt-[4px]" >{errors.month}</div>}
              </div>

              {/* Preview pane */}
              <div className="bg-[var(--bg)] p-[12px_16px]" style={{borderRadius: "var(--radius)", border: "1px solid var(--border)"}}>
                <div className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.05em] mb-[8px]" >Selected Employee</div>
                {selectedEmp ? (
                  <>
                    <div className="text-[14px] font-semibold text-[var(--text-primary)]" >{selectedEmp.fullName}</div>
                    <div className="text-[12px] text-[var(--text-muted)] mt-[4px]" >{selectedEmp.employeeId} · {selectedEmp.department}</div>
                    <div className="text-[13px] font-semibold text-primary mt-[8px]" >
                      CTC: ₹{selectedEmp.ctc ? Number(selectedEmp.ctc).toLocaleString() : "—"}
                    </div>
                  </>
                ) : (
                  <div className="text-[12px] text-[var(--text-muted)]" >No employee selected</div>
                )}
              </div>
            </div>

            <div className="flex gap-[12px]" >
              <Button variant="default" type="button" className="btn btn-primary" onClick={handleGenerate}><FileText size={15} /> Generate & Preview</Button>
              <Button variant="outline" type="button" className="btn btn-ghost" onClick={() => { setSelEmp(""); setSelMonth(dayjs().subtract(1,"month").format("YYYY-MM")); setErrors({}); }}>
                <RefreshCw size={15} /> Reset
              </Button>
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

    </div>
  );
}
