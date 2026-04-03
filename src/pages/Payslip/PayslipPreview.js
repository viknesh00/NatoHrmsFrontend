import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileDown, Mail, ArrowLeft } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Breadcrumb from "../../services/Breadcrumb";
import LoadingMask from "../../services/LoadingMask";
import { ToastSuccess, ToastError } from "../../services/ToastMsg";
import { postRequest } from "../../services/Apiservice";
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

function ENum({value,onChange}){
  return <input type="number" value={value} onChange={onChange} style={{ width:80,textAlign:"right",padding:"2px 4px",border:"1px solid #c4b5f4",borderRadius:4,fontFamily:"inherit",fontSize:11,background:"#faf8ff",color:"#1e1143",fontWeight:600,outline:"none" }}/>;
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
    const te=[p.basicSalary,p.hra,p.conveyanceAllowance,p.medicalAllowance,p.specialAllowance,p.arrears,p.reimbursement].reduce((a,b)=>a+(parseFloat(b)||0),0);
    const td=[p.employeePf,p.employeeEsi,p.professionalTax,p.incomeTax,p.trainingCab,p.others].reduce((a,b)=>a+(parseFloat(b)||0),0);
    const net=te-td;
    setP(prev=>({...prev,totalEarnings:te,totalDeductions:td,netPayable:net,netInWords:numberToWords(Math.round(net))}));
  },[p.basicSalary,p.hra,p.conveyanceAllowance,p.medicalAllowance,p.specialAllowance,p.arrears,p.reimbursement,p.employeePf,p.employeeEsi,p.professionalTax,p.incomeTax,p.trainingCab,p.others]);
    if(!employee||!monthYear){
    return <div style={{textAlign:"center",padding:60}}>
      No payslip data. <span style={{color:"var(--primary)",cursor:"pointer"}} onClick={()=>navigate("/payslip")}>Go back</span>
    </div>;
  }
  const set=(f)=>(e)=>setP(prev=>({...prev,[f]:e.target.value}));

  const handleDownload=async()=>{
    setLoading(true);
    try{
      const el=document.getElementById("payslip-doc");
      const canvas=await html2canvas(el,{scale:2,useCORS:true,backgroundColor:"#fff"});
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
      const el=document.getElementById("payslip-doc");
      const canvas=await html2canvas(el,{scale:2,useCORS:true,backgroundColor:"#fff"});
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
  const th={padding:"6px 10px",border:"1px solid #bdc3c7",fontWeight:700,background:"#ecf0f1",fontSize:11.5,textAlign:"left",color:"#2c3e50"};
  const td={padding:"5px 10px",border:"1px solid #d5dbdb",fontSize:11,color:"#2c3e50",verticalAlign:"middle"};
  const tdr={...td,textAlign:"right"};
  const tdbold={...td,fontWeight:700};
  const tdrbold={...tdr,fontWeight:700};

  return (
    <div>
      <LoadingMask loading={loading}/>
      <div className="page-header" style={{marginBottom:16}}>
        <div>
          <Breadcrumb items={[{label:"Payslip",link:"/payslip"},{label:"Preview"}]}/>
          <h1 className="page-title">Payslip – {p.payMonth}</h1>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button className="btn btn-ghost" onClick={()=>navigate("/payslip")}><ArrowLeft size={15}/> Back</button>
          <button className="btn btn-outline" onClick={handleEmail}><Mail size={15}/> Email</button>
          <button className="btn btn-primary" onClick={handleDownload}><FileDown size={15}/> Download PDF</button>
        </div>
      </div>

      {/* Payslip Document - matches exact PDF format */}
      <div style={{background:"white",boxShadow:"var(--shadow-lg)",borderRadius:12,overflow:"hidden",maxWidth:820,margin:"0 auto"}}>
        <div id="payslip-doc" style={{padding:"28px 32px",fontFamily:"Arial,sans-serif",fontSize:12,color:"#2c3e50",background:"white"}}>

          {/* Header */}
          <div style={{display:"flex",alignItems:"flex-start",gap:16,marginBottom:16,paddingBottom:12,borderBottom:"2px solid #2c3e50"}}>
            <img src="/assets/images/natobotics-logo.png" alt="Logo" style={{width:60,height:60,objectFit:"contain",flexShrink:0}}/>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:"#2c3e50",marginBottom:3}}>Natobotics Technologies Private Limited</div>
              <div style={{fontWeight:700,fontSize:13,color:"#2c3e50"}}>Payslip {p.payMonth}</div>
            </div>
          </div>

          {/* Employee Info Grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,marginBottom:16,border:"1px solid #bdc3c7"}}>
            {[
              ["Employee Name", p.employeeName,    "Working Days",     p.workingDays],
              ["Emp ID",        p.employeeId,       "LOP / Extra Pay Days", `${p.lopDays} / ${p.extraPayDays}`],
              ["Designation",   p.designation,      "Bank Details",    p.bankDetails],
              ["Location",      p.location,         "PF Number",       p.pfNumber],
              ["Date of Joining",p.doj,             "CTC",             p.ctc?`₹${numFmt(p.ctc)}`:"—"],
              ["ESI Number",    p.esiNumber||"—",   "PAN",             p.panNumber||"—"],
            ].map(([l1,v1,l2,v2],i)=>(
              <React.Fragment key={i}>
                <div style={{display:"grid",gridTemplateColumns:"140px 1fr",borderBottom:"1px solid #d5dbdb",borderRight:"1px solid #bdc3c7"}}>
                  <span style={{padding:"6px 10px",fontWeight:700,fontSize:11.5,color:"#5d6d7e",background:"#f8f9fa",borderRight:"1px solid #d5dbdb"}}>{l1}</span>
                  <span style={{padding:"6px 10px",fontSize:11.5,fontWeight:600}}>{v1||"—"}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"150px 1fr",borderBottom:"1px solid #d5dbdb"}}>
                  <span style={{padding:"6px 10px",fontWeight:700,fontSize:11.5,color:"#5d6d7e",background:"#f8f9fa",borderRight:"1px solid #d5dbdb"}}>{l2}</span>
                  <span style={{padding:"6px 10px",fontSize:11.5,fontWeight:600}}>{v2||"—"}</span>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Earnings & Deductions Table */}
          <table style={{width:"100%",borderCollapse:"collapse",marginBottom:12}}>
            <thead>
              <tr>
                <th style={{...th,width:"30%"}}>Earnings</th>
                <th style={{...th,width:"20%",textAlign:"right"}}>Amount (Rs)</th>
                <th style={{...th,width:"30%"}}>Deductions</th>
                <th style={{...th,width:"20%",textAlign:"right"}}>Amount (Rs)</th>
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
                <td style={{...tdrbold,color:"#c0392b"}}>({numFmt(p.totalDeductions)})</td>
              </tr>
            </tbody>
          </table>

          {/* Employer contribution */}
          <div style={{display:"flex",gap:40,marginBottom:12,padding:"8px 0",borderTop:"1px solid #bdc3c7"}}>
            <div><span style={{fontWeight:600,fontSize:11.5}}>Employer PF : </span><span style={{fontSize:11.5}}>{numFmt(p.employerPf)}</span></div>
            <div><span style={{fontWeight:600,fontSize:11.5}}>Employer ESI : </span><span style={{fontSize:11.5}}>{p.employerEsi?numFmt(p.employerEsi):"-"}</span></div>
          </div>

          {/* Net Payable */}
          <div style={{marginBottom:10}}>
            <span style={{fontWeight:700,fontSize:14,color:"#2c3e50"}}>NET PAYABLE: </span>
            <span style={{fontWeight:700,fontSize:16,color:"#1a5276"}}>₹{numFmt(p.netPayable)}</span>
          </div>

          <div style={{marginBottom:20}}>
            <span style={{fontWeight:700,fontSize:11.5}}>In Words: </span>
            <span style={{fontSize:11.5,fontStyle:"italic"}}>{p.netInWords}</span>
          </div>

          {/* Seal + signature row */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginTop:24,paddingTop:16,borderTop:"1px solid #bdc3c7"}}>
            <div style={{textAlign:"center"}}>
              <div style={{width:70,height:70,borderRadius:"50%",border:"3px solid #2c3e50",display:"flex",alignItems:"center",justifyContent:"center",background:"#f8f9fa"}}>
                <img src="/assets/images/natobotics-logo.png" alt="Seal" style={{width:50,height:50,objectFit:"contain"}}/>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{marginBottom:24,fontSize:11,color:"#7f8c8d",fontStyle:"italic"}}>This is a computer-generated payslip and does not require a signature.</div>
              <div style={{borderTop:"1px solid #2c3e50",paddingTop:6,fontSize:11,fontWeight:700}}>Authorised Signatory</div>
              <div style={{fontSize:10,color:"#5d6d7e"}}>Natobotics Technologies Pvt Ltd</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
