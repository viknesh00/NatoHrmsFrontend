import { cn } from "cn";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileDown, Mail, ArrowLeft } from "lucide-react";
import Breadcrumb from "../../shared/services/Breadcrumb";
import LoadingMask from "../../shared/services/LoadingMask";
import { ToastSuccess, ToastError } from "../../shared/services/ToastMsg";
import { postRequest } from "../../shared/services/Apiservice";
import dayjs from "dayjs";

// Convert number to Indian words
const numberToWords = (num) => {
  if (!num || isNaN(num)) return "";
  const a=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const b=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  const cvt=(n)=>{
    if(n<20)return a[n];if(n<100)return b[Math.floor(n/10)]+(n%10?" "+a[n%10]:"");
    if(n<1000)return a[Math.floor(n/100)]+" Hundred"+(n%100===0?"":(" and "+cvt(n%100)));
    if(n<100000)return cvt(Math.floor(n/1000))+" Thousand"+(n%1000===0?"":" "+cvt(n%1000));
    if(n<10000000)return cvt(Math.floor(n/100000))+" Lakh"+(n%100000===0?"":" "+cvt(n%100000));
    return "";
  };
  return cvt(Math.round(num))+" Rupees Only";
};

const numFmt=(v)=>{ const n=parseFloat(v)||0; return n===0?"—":n.toLocaleString("en-IN",{minimumFractionDigits:0,maximumFractionDigits:0}); };
const inr=(v)=>{ const n=parseFloat(v)||0; return n===0?"-":n.toLocaleString("en-IN",{minimumFractionDigits:0}); };

function ENum({value,onChange}: Record<string, any>){
  return <Input type="number" value={value} onChange={onChange} className="w-[80px] text-right p-[4px_4px] text-[12px] bg-muted text-[var(--text-primary)] font-semibold" style={{border:"1px solid var(--border-strong)", borderRadius:"var(--radius)", fontFamily:"inherit", outline:"none"}}/>;
}

export default function PayslipPreview(){
  const location=useLocation(), navigate=useNavigate();
  const { employee, monthYear } = location.state||{};
  const [loading,setLoading]=useState(false);

  const mDate=new Date(monthYear);
  const totalDays=new Date(mDate.getFullYear(),mDate.getMonth()+1,0).getDate();
  const payMonthStr=dayjs(monthYear).format("MMMM YYYY");
  const doj=employee.doj?dayjs(employee.doj).format("DD-MM-YYYY"):"—";

  const [p,setP]=useState({
    employeeName: employee.fullName||`${employee.firstName||""} ${employee.lastName||""}`.trim(),
    employeeId:   employee.employeeId||"",
    designation:  employee.designation||"",
    department:   employee.department||"",
    location:     employee.workLocation||"",
    bankDetails:  employee.accountNumber||"",
    doj,
    pfNumber:     employee.pfAccountNumber||"",
    esiNumber:    employee.esiNumber||"",
    panNumber:    employee.panNumber||"",
    uanNumber:    employee.uanNumber||"",
    ctc:          employee.ctc||"",
    payMonth:     payMonthStr,
    workingDays:  String(totalDays),
    lopDays:      "0",
    extraPayDays: "0",
    // Earnings
    basicSalary:           parseFloat(employee.basicSalary)||0,
    hra:                   parseFloat(employee.hra)||0,
    conveyanceAllowance:   parseFloat(employee.conveyanceAllowance)||0,
    medicalAllowance:      parseFloat(employee.medicalAllowance)||0,
    specialAllowance:      parseFloat(employee.specialAllowance)||0,
    arrears:               0,
    reimbursement:         0,
    // Deductions
    employeePf:        1800,
    employeeEsi:       0,
    professionalTax:   0,
    incomeTax:         0,
    trainingCab:       0,
    others:            0,
    // Employer
    employerPf:        1800,
    employerEsi:       0,
    // Computed
    totalEarnings:0, totalDeductions:0, netPayable:0, netInWords:"",
  });

  useEffect(()=>{
    const te=[p.basicSalary,p.hra,p.conveyanceAllowance,p.medicalAllowance,p.specialAllowance,p.arrears,p.reimbursement].reduce((a,b)=>a+(parseFloat(String(b))||0),0);
    const td=[p.employeePf,p.employeeEsi,p.professionalTax,p.incomeTax,p.trainingCab,p.others].reduce((a,b)=>a+(parseFloat(String(b))||0),0);
    const net=te-td;
    setP(prev=>({...prev,totalEarnings:te,totalDeductions:td,netPayable:net,netInWords:numberToWords(Math.round(net))}));
  },[p.basicSalary,p.hra,p.conveyanceAllowance,p.medicalAllowance,p.specialAllowance,p.arrears,p.reimbursement,p.employeePf,p.employeeEsi,p.professionalTax,p.incomeTax,p.trainingCab,p.others]);
    if(!employee||!monthYear){
    return <div className="text-center p-[60px]" >
      No payslip data. <span className="text-primary cursor-pointer"  onClick={()=>navigate("/payslip")}>Go back</span>
    </div>;
  }
  const set=(f)=>(e)=>setP(prev=>({...prev,[f]:e.target.value}));

  const handleDownload=async()=>{
    setLoading(true);
    try{
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const el=document.getElementById("payslip-doc");
      const canvas=await html2canvas(el,{scale:2,useCORS:true,backgroundColor:getComputedStyle(el).backgroundColor});
      const pdf=new jsPDF({orientation:"portrait",unit:"pt",format:"a4"});
      const w=pdf.internal.pageSize.getWidth();
      const h=pdf.internal.pageSize.getHeight();
      const imgData=canvas.toDataURL("image/png");
      const imgProps=pdf.getImageProperties(imgData);
      const ratio=Math.min(w/imgProps.width,h/imgProps.height);
      pdf.addImage(imgData,"PNG",0,0,imgProps.width*ratio,imgProps.height*ratio);
      pdf.save(`${p.employeeName.replace(/\s+/g,"_")}_${p.payMonth.replace(/\s/g,"-")}.pdf`);
      ToastSuccess("Payslip downloaded!");
    }catch(e){ ToastError("PDF generation failed"); }
    finally{setLoading(false);}
  };

  const handleEmail=async()=>{
    setLoading(true);
    try{
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const el=document.getElementById("payslip-doc");
      const canvas=await html2canvas(el,{scale:2,useCORS:true,backgroundColor:getComputedStyle(el).backgroundColor});
      const pdf=new jsPDF({orientation:"portrait",unit:"pt",format:"a4"});
      const w=pdf.internal.pageSize.getWidth();
      const imgData=canvas.toDataURL("image/png");
      const imgProps=pdf.getImageProperties(imgData);
      pdf.addImage(imgData,"PNG",0,0,imgProps.width*(w/imgProps.width),imgProps.height*(w/imgProps.width));
      const b64=pdf.output("datauristring").split(",")[1];
      await postRequest("User/SendPayslipEmail",{ employeeEmail:employee.userName||employee.email, employeeName:p.employeeName, payMonth:p.payMonth, netAmount:String(p.netPayable), pdfBase64:b64, fileName:`${p.employeeName.replace(/\s+/g,"_")}_${p.payMonth.replace(/\s/g,"-")}.pdf` });
      ToastSuccess("Payslip emailed successfully!");
    }catch{ ToastError("Email failed"); }
    finally{setLoading(false);}
  };

  // Table cell styles
  const th: import("react").CSSProperties={padding:"6px 10px",border:"1px solid var(--border-strong)",fontWeight:600,background:"var(--muted)",fontSize:12,textAlign:"left",color:"var(--foreground)"};
  const td: React.CSSProperties={padding:"5px 10px",border:"1px solid var(--border)",fontSize:12,color:"var(--foreground)",verticalAlign:"middle"};
  const tdr: React.CSSProperties={...td,textAlign:"right"};
  const tdbold: React.CSSProperties={...td,fontWeight:600};
  const tdrbold: React.CSSProperties={...tdr,fontWeight:600};

  return (
    <div>
      <LoadingMask loading={loading}/>
      <div className={cn("page-header", "mb-[16px]")} >
        <div>
          <Breadcrumb items={[{label:"Payslip",link:"/payslip"},{label:"Preview"}]}/>
          <h1 className="page-title">Payslip – {p.payMonth}</h1>
        </div>
        <div className="flex gap-[12px]" >
          <Button variant="outline" type="button" className="btn btn-ghost" onClick={()=>navigate("/payslip")}><ArrowLeft size={15}/> Back</Button>
          <Button variant="outline" type="button" className="btn btn-outline" onClick={handleEmail}><Mail size={15}/> Email</Button>
          <Button variant="default" type="button" className="btn btn-primary" onClick={handleDownload}><FileDown size={15}/> Download PDF</Button>
        </div>
      </div>

      {/* Payslip Document - matches exact PDF format */}
      <div id="payslip-doc-parent" className="bg-card overflow-x-auto max-w-[820px] m-[0_auto]" style={{boxShadow:"var(--shadow-lg)", borderRadius:"var(--radius)"}}>
        <div id="payslip-doc" className="p-[28px_32px] text-[12px] text-[var(--text-primary)] bg-card" style={{fontFamily:"var(--ui-font-sans)"}}>

          {/* Header */}
          <div className="flex items-start gap-[16px] mb-[16px] pb-[12px]" style={{borderBottom:"2px solid var(--foreground)"}}>
            <img src="/assets/images/natobotics-logo.png" alt="Logo" className="w-[60px] h-[60px] shrink-[0]" style={{objectFit:"contain"}}/>
            <div>
              <div className="font-semibold text-[16px] text-foreground mb-[4px]" >Natobotics Technologies Private Limited</div>
              <div className="font-semibold text-[13px] text-foreground" >Payslip {p.payMonth}</div>
            </div>
          </div>

          {/* Employee Info Grid */}
          <div className="grid gap-[0px] mb-[16px]" style={{gridTemplateColumns:"1fr 1fr", border:"1px solid var(--border-strong)"}}>
            {[
              ["Employee Name", p.employeeName,    "Working Days",     p.workingDays],
              ["Emp ID",        p.employeeId,       "LOP / Extra Pay Days", `${p.lopDays} / ${p.extraPayDays}`],
              ["Designation",   p.designation,      "Bank Details",    p.bankDetails],
              ["Location",      p.location,         "PF Number",       p.pfNumber],
              ["Date of Joining",p.doj,             "CTC",             p.ctc?`₹${numFmt(p.ctc)}`:"—"],
              ["ESI Number",    p.esiNumber||"—",   "PAN",             p.panNumber||"—"],
            ].map(([l1,v1,l2,v2],i)=>(
              <React.Fragment key={i}>
                <div className="grid" style={{gridTemplateColumns:"140px 1fr", borderBottom:"1px solid var(--border)", borderRight:"1px solid var(--border-strong)"}}>
                  <span className="p-[8px_12px] font-semibold text-[12px] text-muted-foreground bg-muted" style={{borderRight:"1px solid var(--border)"}}>{l1}</span>
                  <span className="p-[8px_12px] text-[12px] font-semibold" >{v1||"—"}</span>
                </div>
                <div className="grid" style={{gridTemplateColumns:"150px 1fr", borderBottom:"1px solid var(--border)"}}>
                  <span className="p-[8px_12px] font-semibold text-[12px] text-muted-foreground bg-muted" style={{borderRight:"1px solid var(--border)"}}>{l2}</span>
                  <span className="p-[8px_12px] text-[12px] font-semibold" >{v2||"—"}</span>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Earnings & Deductions Table */}
          <table className="w-[100%] mb-[12px]" style={{borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th className="w-[30%]" style={{...th}}>Earnings</th>
                <th className="w-[20%] text-right" style={{...th}}>Amount (Rs)</th>
                <th className="w-[30%]" style={{...th}}>Deductions</th>
                <th className="w-[20%] text-right" style={{...th}}>Amount (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Basic Pay",         "basicSalary",         "Employee PF",         "employeePf"],
                ["HRA",               "hra",                 "Employee ESI",        "employeeEsi"],
                ["Conveyance",        "conveyanceAllowance", "Professional Tax",    "professionalTax"],
                ["Medical Allowance", "medicalAllowance",    "Income Tax",          "incomeTax"],
                ["Special Allowance", "specialAllowance",    "Training/Cab/Parking","trainingCab"],
                ["Arrears",           "arrears",             "Others",              "others"],
                ["Reimbursement",     "reimbursement",       "",                    ""],
              ].map(([l1,f1,l2,f2],i)=>(
                <tr key={i}>
                  <td style={td}>{l1}</td>
                  <td style={tdr}><ENum value={p[f1]||0} onChange={set(f1)}/></td>
                  <td style={td}>{l2}</td>
                  <td style={tdr}>{f2?<ENum value={p[f2]||0} onChange={set(f2)}/>:null}</td>
                </tr>
              ))}
              <tr>
                <td style={tdbold}>Total Earnings</td>
                <td style={tdrbold}>{numFmt(p.totalEarnings)}</td>
                <td style={tdbold}>Total Deductions</td>
                <td className="text-error" style={{...tdrbold}}>({numFmt(p.totalDeductions)})</td>
              </tr>
            </tbody>
          </table>

          {/* Employer contribution */}
          <div className="flex gap-[40px] mb-[12px] p-[8px_0]" style={{borderTop:"1px solid var(--border-strong)"}}>
            <div><span className="font-semibold text-[12px]" >Employer PF : </span><span className="text-[12px]" >{numFmt(p.employerPf)}</span></div>
            <div><span className="font-semibold text-[12px]" >Employer ESI : </span><span className="text-[12px]" >{p.employerEsi?numFmt(p.employerEsi):"-"}</span></div>
          </div>

          {/* Net Payable */}
          <div className="mb-[12px]" >
            <span className="font-semibold text-[14px] text-foreground" >NET PAYABLE: </span>
            <span className="font-semibold text-[16px] text-information" >₹{numFmt(p.netPayable)}</span>
          </div>

          <div className="mb-[20px]" >
            <span className="font-semibold text-[12px]" >In Words: </span>
            <span className="text-[12px]" style={{fontStyle:"italic"}}>{p.netInWords}</span>
          </div>

          {/* Seal + signature row */}
          <div className="flex justify-between items-end mt-[24px] pt-[16px]" style={{borderTop:"1px solid var(--border-strong)"}}>
            <div className="text-center" >
              <div className="w-[70px] h-[70px] flex items-center justify-center bg-muted" style={{borderRadius:"50%", border:"3px solid var(--foreground)"}}>
                <img src="/assets/images/natobotics-logo.png" alt="Seal" className="w-[50px] h-[50px]" style={{objectFit:"contain"}}/>
              </div>
            </div>
            <div className="text-right" >
              <div className="mb-[24px] text-[12px] text-muted-foreground" style={{fontStyle:"italic"}}>This is a computer-generated payslip and does not require a signature.</div>
              <div className="pt-[8px] text-[12px] font-semibold" style={{borderTop:"1px solid var(--foreground)"}}>Authorised Signatory</div>
              <div className="text-[12px] text-muted-foreground" >Natobotics Technologies Pvt Ltd</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
