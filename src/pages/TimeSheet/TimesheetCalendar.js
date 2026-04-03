import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { ChevronLeft, ChevronRight, X, Save, Clock, Copy, FileSpreadsheet, Trash2, AlertCircle, ClipboardList } from "lucide-react";
import { getRequest, postRequest } from "../../services/Apiservice";
import { useLocation, useNavigate } from "react-router-dom";
import LoadingMask from "../../services/LoadingMask";
import Breadcrumb from "../../services/Breadcrumb";
import { ToastSuccess, ToastError } from "../../services/ToastMsg";
import * as XLSX from "xlsx";

dayjs.extend(isoWeek);

const STATUS = {
  filled:   { bg:"#dcfce7", border:"#86efac", text:"#15803d", label:"8+ hrs" },
  partial:  { bg:"#dbeafe", border:"#93c5fd", text:"#1d4ed8", label:"< 8 hrs" },
  empty:    { bg:"#fff7ed", border:"#fed7aa", text:"#c2410c", label:"Pending" },
  leave:    { bg:"#ede9fe", border:"#c4b5f4", text:"#6c3fc5", label:"On Leave" },
  approved: { bg:"#dcfce7", border:"#86efac", text:"#15803d", label:"Leave ✓" },
  holiday:  { bg:"#fee2e2", border:"#fca5a5", text:"#b91c1c", label:"Holiday" },
  weekend:  { bg:"#f8fafc", border:"var(--border)", text:"var(--text-muted)", label:"Weekend" },
  future:   { bg:"#f9fafb", border:"var(--border)", text:"#d1d5db", label:"Future" },
  pastlock: { bg:"#f1f5f9", border:"#cbd5e1", text:"#94a3b8", label:"Locked" },
  outside:  { bg:"transparent", border:"transparent", text:"#e5e7eb", label:"" },
};

const toMin=(v)=>{ if(!v)return 0; const p=String(v).split("."); return parseInt(p[0]||0)*60+parseInt(p[1]||0); };
const fromMin=(m)=>{ const h=Math.floor(m/60),min=m%60; return min===0?`${h}`:`${h}.${String(min).padStart(2,"0")}`; };

export default function TimesheetCalendar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { viewData, selectedMonth: viewMonth } = location.state||{};

  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [entries, setEntries]     = useState({});
  const [leaveList, setLeaveList] = useState([]);
  const [holidayList, setHolidayList] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [modal, setModal]         = useState(false);
  const [selDate, setSelDate]     = useState(null);
  const [taskDetails, setTask]    = useState("");
  const [hours, setHours]         = useState("");
  const [copyOpt, setCopyOpt]     = useState("");
  const [otherDays, setOtherDays] = useState([]);
  const [leaveType, setLeaveType] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [tooltip, setTooltip]     = useState({ visible: false, date: null, x: 0, y: 0 });

  const isViewMode = !!viewData;
  const today = dayjs();
  const isCurrentMonth = currentMonth.isSame(today, "month");
  const canEdit = !isViewMode && isCurrentMonth;

  const startDay = currentMonth.startOf("month").startOf("isoWeek");
  const endDay   = currentMonth.endOf("month").endOf("isoWeek");
  const allDays  = [];
  let d = startDay;
  while (d.isBefore(endDay,"day")||d.isSame(endDay,"day")) { allDays.push(d); d=d.add(1,"day"); }
  const weeks = [];
  for (let i=0;i<allDays.length;i+=7) weeks.push(allDays.slice(i,i+7));

  useEffect(() => {
    loadLeaves();
    if (!viewData) loadEntries();
    else {
      const fmt = viewData.timesheet.reduce((acc,item) => {
        if (item.entryDate) {
          const dt = item.entryDate.split("T")[0];
          acc[dt] = { task:item.taskDetails||"", hours:item.workingHours??0, leaveType:item.leaveType||null };
        }
        return acc;
      },{});
      setEntries(fmt);
    }
  }, [currentMonth]);

  const loadLeaves = () => {
    const url = viewData?`User/GetEmployeeLeave?userName=${viewData.username}`:`User/GetEmployeeLeave`;
    getRequest(url).then(res => {
      if (res.data) {
        setLeaveList(res.data.leaves.map(l=>({ ...l, fromDate:l.fromDate?dayjs(l.fromDate).format("YYYY-MM-DD"):l.fromDate, toDate:l.toDate?dayjs(l.toDate).format("YYYY-MM-DD"):l.toDate })));
        setHolidayList(res.data.holidays?.filter(h=>h.eventType==="Holiday").map(h=>({...h,eventDate:dayjs(h.eventDate).format("YYYY-MM-DD")}))||[]);
      }
    }).catch(console.error);
  };

  const loadEntries = () => {
    setLoading(true);
    getRequest(`TimeSheet/GetTimeSheet?month=${currentMonth.format("YYYY-MM")}`).then(res => {
      if (res.data) {
        const fmt = res.data.reduce((acc,item)=>{
          if(item.entryDate){ const dt=item.entryDate.split("T")[0]; acc[dt]={task:item.taskDetails||"",hours:item.workingHours??0,leaveType:item.leaveType||null}; }
          return acc;
        },{});
        setEntries(fmt);
      }
    }).catch(console.error).finally(()=>setLoading(false));
  };

  const getLeaveForDay = (date) => leaveList.find(l=>{
    const from=dayjs(l.fromDate,"YYYY-MM-DD"); const to=dayjs(l.toDate,"YYYY-MM-DD");
    return date.isSame(from,"day")||date.isSame(to,"day")||(date.isAfter(from,"day")&&date.isBefore(to,"day"));
  });

  const getHolidayForDay = (date) => holidayList.find(h=>h.eventDate===date.format("YYYY-MM-DD"));

  const getCellStatus = (date) => {
    const inCurrentMonth = date.month()===currentMonth.month();
    if (!inCurrentMonth) return "outside";
    if (date.isAfter(today,"day")) return "future";
    if (!currentMonth.isSame(today,"month") && !isViewMode) return "pastlock";
    const holiday=getHolidayForDay(date); if (holiday) return "holiday";
    const isWknd=date.day()===0||date.day()===6;
    const leave=getLeaveForDay(date);
    if (leave&&!leave.approverReason) return leave.isApproved===true||leave.isApproved==="true"?"approved":"leave";
    const entry=entries[date.format("YYYY-MM-DD")];
    if (isWknd&&!entry?.hours) return "weekend";
    if (!entry||entry.hours===0) return isWknd?"weekend":"empty";
    if (entry.hours>=8) return "filled";
    return "partial";
  };

  const handleCellClick = (date) => {
    if (isViewMode) return;
    if (!canEdit) { ToastError("Previous month timesheets are locked for editing"); return; }
    const status = getCellStatus(date);
    if (["outside","future","holiday","approved","leave","pastlock"].includes(status)) return;
    setSelDate(date);
    const entry=entries[date.format("YYYY-MM-DD")];
    setTask(entry?.task||""); setHours(entry?.hours||""); setCopyOpt(""); setOtherDays([]); setLeaveType(entry?.leaveType||"");
    setDeleteConfirm(false);
    setModal(true);
    setTooltip({ visible: false, date: null, x: 0, y: 0 });
  };

  // Hover preview handlers
  const handleCellMouseEnter = (e, date) => {
    const iso = date.format("YYYY-MM-DD");
    const entry = entries[iso];
    const holiday = getHolidayForDay(date);
    const leave = getLeaveForDay(date);
    const status = getCellStatus(date);
    if (status === "outside") return;
    // Only show tooltip if there's meaningful content
    if (!entry?.task && !holiday && !leave) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ visible: true, date, x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  const handleCellMouseLeave = () => {
    setTooltip({ visible: false, date: null, x: 0, y: 0 });
  };

  const saveEntry = () => {
    const hrsVal=parseFloat(hours)||0;
    if (!hrsVal && !leaveType) { ToastError("Please select a Leave Type when hours is 0"); return; }
    const upd={...entries};
    upd[selDate.format("YYYY-MM-DD")]={task:taskDetails,hours:hrsVal,leaveType:(!hrsVal?leaveType:null)};
    if(copyOpt==="week"){
      let d=selDate.startOf("isoWeek");
      while(d.isBefore(selDate.endOf("isoWeek"))||d.isSame(selDate.endOf("isoWeek"),"day")){
        if(!d.isAfter(today,"day")&&d.month()===currentMonth.month()) upd[d.format("YYYY-MM-DD")]={task:taskDetails,hours:hrsVal};
        d=d.add(1,"day");
      }
    } else if(copyOpt==="month"){
      let d=selDate.startOf("month");
      while(d.isBefore(selDate)||d.isSame(selDate,"day")){
        if(!d.isAfter(today,"day")) upd[d.format("YYYY-MM-DD")]={task:taskDetails,hours:hrsVal};
        d=d.add(1,"day");
      }
    } else if(copyOpt==="custom"){
      otherDays.forEach(d=>{ upd[d.format("YYYY-MM-DD")]={task:taskDetails,hours:hrsVal}; });
    }
    const payload=Object.keys(upd).map(dt=>({entryDate:dt,taskDetails:upd[dt].task||"",workingHours:upd[dt].hours??0,leaveType:upd[dt].leaveType||null}));
    setLoading(true);
    postRequest("TimeSheet/InsertOrUpdateTimeSheet",payload).then(res=>{
      if(res.data){ loadEntries(); setModal(false); ToastSuccess("Timesheet saved"); }
    }).catch(console.error).finally(()=>setLoading(false));
  };

  const clearEntry = () => {
    if (!selDate) return;
    const upd={...entries};
    upd[selDate.format("YYYY-MM-DD")]={task:"",hours:0,leaveType:null};
    const payload=Object.keys(upd).map(dt=>({entryDate:dt,taskDetails:upd[dt].task||"",workingHours:upd[dt].hours??0,leaveType:upd[dt].leaveType||null}));
    setLoading(true);
    postRequest("TimeSheet/InsertOrUpdateTimeSheet",payload).then(()=>{
      loadEntries(); setModal(false); setDeleteConfirm(false); ToastSuccess("Entry cleared");
    }).catch(console.error).finally(()=>setLoading(false));
  };

  const getWeekTotal = (week) => fromMin(week.reduce((s,d)=>s+toMin(entries[d.format("YYYY-MM-DD")]?.hours||0),0));
  const monthTotal   = fromMin(Object.values(entries).reduce((s,e)=>s+toMin(e.hours||0),0));

  // Excel export — task description now included
  const handleExcelExport = () => {
    const rows = [];
    const daysInMonth = [];
    const mStart = currentMonth.startOf("month");
    let day = mStart;
    while (day.isSame(currentMonth,"month")) {
      daysInMonth.push(day.clone());
      day = day.add(1,"day");
    }

    if (!isViewMode) {
      daysInMonth.forEach(d=>{
        const iso=d.format("YYYY-MM-DD");
        const entry=entries[iso];
        const holiday=getHolidayForDay(d);
        const leave=getLeaveForDay(d);
        const isWknd=d.day()===0||d.day()===6;
        rows.push({
          "Date":             d.format("DD-MM-YYYY"),
          "Day":              d.format("dddd"),
          "Status":           holiday?"Holiday":leave?"On Leave":isWknd?"Weekend":entry?.hours>0?"Present":"Absent",
          "Hours":            entry?.hours||0,
          "Task Description": entry?.task||"",   // ← fixed: was missing
          "Leave Type":       entry?.leaveType||leave?.leaveType||"",
        });
      });
    } else {
      // Admin view: one row per employee, days as columns + task description columns
      const header={"Employee":viewData.employeeName,"Email":viewData.username};
      daysInMonth.forEach(d=>{
        const iso=d.format("YYYY-MM-DD");
        header[d.format("DD-MM-YYYY (ddd)")]=entries[iso]?.hours||0;
      });
      daysInMonth.forEach(d=>{
        const iso=d.format("YYYY-MM-DD");
        if(entries[iso]?.task) header[`Task ${d.format("DD-MM")}`]=entries[iso].task;
      });
      header["Total Hours"]=monthTotal;
      rows.push(header);
    }

    const ws=XLSX.utils.json_to_sheet(rows);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Timesheet");
    XLSX.writeFile(wb,`Timesheet_${(viewData?.employeeName||"My")}_${currentMonth.format("MMM-YYYY")}.xlsx`);
    ToastSuccess("Exported to Excel");
  };

  const legend = [
    {key:"filled",label:"8+ hrs"},{key:"partial",label:"<8 hrs"},
    {key:"empty",label:"Pending"},{key:"leave",label:"Leave"},
    {key:"holiday",label:"Holiday"},{key:"pastlock",label:"Locked"},
  ];

  const breadItems = viewData
    ? [{label:"Timesheet",link:"/timesheet"},{label:`${viewData.employeeName} – ${viewMonth||""}`}]
    : [{label:"Timesheet"}];

  // Tooltip content
  const tooltipEntry   = tooltip.date ? entries[tooltip.date.format("YYYY-MM-DD")] : null;
  const tooltipHoliday = tooltip.date ? getHolidayForDay(tooltip.date) : null;
  const tooltipLeave   = tooltip.date ? getLeaveForDay(tooltip.date) : null;
  const tooltipStatus  = tooltip.date ? getCellStatus(tooltip.date) : null;
  const tooltipS       = tooltipStatus ? STATUS[tooltipStatus] : null;

  return (
    <div>
      <LoadingMask loading={loading}/>
      <div className="page-header">
        <div>
          <Breadcrumb icon={<ClipboardList size={13} />} items={breadItems}/>
          <h1 className="page-title">{viewData?`${viewData.employeeName}'s Timesheet`:"My Timesheet"}</h1>
          <p className="page-subtitle">{canEdit?"Click a date to log hours ·":isViewMode?"View only ·":"Previous months are locked ·"} {currentMonth.format("MMMM YYYY")}</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className="icon-btn" onClick={handleExcelExport} title="Export to Excel" style={{ color:"var(--teal)", width:38, height:38 }}><FileSpreadsheet size={18}/></button>
          <div style={{background:"var(--primary-ghost)",border:"1px solid var(--border)",borderRadius:10,padding:"8px 16px",textAlign:"center"}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--primary)",textTransform:"uppercase",letterSpacing:"0.05em"}}>Month Total</div>
            <div style={{fontSize:20,fontWeight:900,color:"var(--primary)",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{monthTotal} hrs</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {!isViewMode && (
              <button className="calendar-nav-btn" onClick={()=>setCurrentMonth(c=>c.subtract(1,"month"))}><ChevronLeft size={16}/></button>
            )}
            {isViewMode && <div style={{width:30}}/>}
            <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:17,fontWeight:800,color:"var(--text-primary)",minWidth:160,textAlign:"center"}}>{currentMonth.format("MMMM YYYY")}</span>
            {!isViewMode && (
              <button className="calendar-nav-btn" onClick={()=>{ if(currentMonth.isBefore(today,"month")) setCurrentMonth(c=>c.add(1,"month")); }}
                style={{opacity:currentMonth.isBefore(today,"month")?1:0.3,cursor:currentMonth.isBefore(today,"month")?"pointer":"not-allowed"}}>
                <ChevronRight size={16}/>
              </button>
            )}
            {isViewMode && <div style={{width:30}}/>}
            {!canEdit && !isViewMode && (
              <span style={{background:"#fff7ed",color:"#b45309",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,display:"flex",alignItems:"center",gap:5}}>
                <AlertCircle size={12}/> Locked
              </span>
            )}
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {legend.map(({key,label})=>(
              <div key={key} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:10,height:10,borderRadius:3,background:STATUS[key].bg,border:`1.5px solid ${STATUS[key].border}`}}/>
                <span style={{fontSize:11,fontWeight:600,color:"var(--text-secondary)"}}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{overflowX:"auto",padding:"4px 8px 8px"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:680}}>
            <thead>
              <tr>
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun","Week Total"].map(h=>(
                  <th key={h} style={{padding:"10px 6px",textAlign:"center",fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid var(--border)",background:"var(--bg)",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week,wi)=>(
                <tr key={wi}>
                  {week.map(day=>{
                    const status=getCellStatus(day);
                    const s=STATUS[status]||STATUS.outside;
                    const entry=entries[day.format("YYYY-MM-DD")];
                    const holiday=getHolidayForDay(day);
                    const leave=getLeaveForDay(day);
                    const isToday2=day.format("YYYY-MM-DD")===today.format("YYYY-MM-DD");
                    const inCurrentMonth=day.month()===currentMonth.month();
                    const clickable=canEdit&&!["outside","future","holiday","approved","leave","pastlock"].includes(status);
                    const hasTooltip=!!(entry?.task||holiday||leave);

                    return (
                      <td
                        key={day.format("YYYY-MM-DD")}
                        onClick={()=>handleCellClick(day)}
                        onMouseEnter={e=>{ if(clickable) e.currentTarget.style.filter="brightness(0.95)"; if(hasTooltip&&inCurrentMonth) handleCellMouseEnter(e,day); }}
                        onMouseLeave={e=>{ e.currentTarget.style.filter=""; handleCellMouseLeave(); }}
                        style={{
                          width:80, height:80,
                          border:"1px solid var(--border)",
                          background:status==="outside"?"transparent":s.bg,
                          cursor:clickable?"pointer":"default",
                          verticalAlign:"middle",
                          padding:0,
                          transition:"all 0.15s",
                          boxShadow:isToday2?"inset 0 0 0 2px var(--primary)":"none",
                          position:"relative",
                        }}
                      >
                        {inCurrentMonth && (
                          <div style={{
                            display:"flex",
                            flexDirection:"column",
                            alignItems:"center",
                            justifyContent:"center",
                            height:"100%",
                            padding:"6px",
                            gap:4,
                          }}>
                            {/* Date number — top-left feel via absolute */}
                            <div style={{
                              position:"absolute",
                              top:6, left:8,
                              fontSize:12,
                              fontWeight:isToday2?900:600,
                              color:isToday2?"var(--primary)":s.text,
                              fontFamily:"'Plus Jakarta Sans',sans-serif",
                            }}>
                              {day.format("D")}
                            </div>

                            {/* Centered content */}
                            {holiday && (
                              <div style={{
                                fontSize:10, color:s.text, fontWeight:700,
                                textAlign:"center", maxWidth:"90%",
                                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                                background:"rgba(255,255,255,0.5)",
                                padding:"2px 5px", borderRadius:4,
                              }}>
                                {holiday.eventName}
                              </div>
                            )}
                            {leave && !holiday && (
                              <div style={{
                                fontSize:10, color:s.text, fontWeight:700,
                                textAlign:"center", maxWidth:"90%",
                                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                              }}>
                                {leave.leaveType}
                              </div>
                            )}
                            {/* Hours badge centered */}
                            {entry?.hours > 0 && !holiday && !leave && (
                              <span style={{
                                fontSize:18,
                                fontWeight:900,
                                color:s.text,
                                fontFamily:"'Plus Jakarta Sans',sans-serif",
                                lineHeight:1,
                              }}>
                                {entry.hours}h
                              </span>
                            )}
                            {status==="pastlock" && (
                              <div style={{fontSize:16,color:s.text,textAlign:"center"}}>🔒</div>
                            )}
                            {/* Task indicator dot — shown when task exists but no text shown */}
                            {entry?.task && !holiday && !leave && (
                              <div style={{
                                width:5, height:5, borderRadius:"50%",
                                background:s.text, opacity:0.5,
                                flexShrink:0,
                              }}/>
                            )}
                          </div>
                        )}
                        {!inCurrentMonth && (
                          <div style={{padding:"5px 6px",color:"#e5e7eb",fontSize:12,fontWeight:500}}>
                            {day.format("D")}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td style={{textAlign:"center",border:"1px solid var(--border)",background:"var(--bg)",fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,fontWeight:800,color:"var(--primary)",padding:8,whiteSpace:"nowrap"}}>
                    {getWeekTotal(week)} hrs
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hover Tooltip Preview */}
      {tooltip.visible && tooltip.date && (
        <div
          style={{
            position:"fixed",
            left: tooltip.x,
            top: tooltip.y,
            transform:"translate(-50%, -100%)",
            zIndex:9999,
            pointerEvents:"none",
          }}
        >
          <div style={{
            background:"var(--bg-card, #fff)",
            border:"1.5px solid var(--border)",
            borderRadius:12,
            boxShadow:"0 8px 24px rgba(0,0,0,0.12)",
            padding:"12px 14px",
            minWidth:200,
            maxWidth:280,
          }}>
            {/* Arrow */}
            <div style={{
              position:"absolute",
              bottom:-7,
              left:"50%",
              transform:"translateX(-50%)",
              width:12,
              height:12,
              background:"var(--bg-card, #fff)",
              border:"1.5px solid var(--border)",
              borderTop:"none",
              borderLeft:"none",
              transform:"translateX(-50%) rotate(45deg)",
            }}/>

            <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>
              {tooltip.date.format("ddd, DD MMM YYYY")}
            </div>

            {tooltipHoliday && (
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <div style={{width:8,height:8,borderRadius:2,background:tooltipS?.bg,border:`1.5px solid ${tooltipS?.border}`,flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:700,color:tooltipS?.text}}>{tooltipHoliday.eventName}</span>
              </div>
            )}

            {tooltipLeave && !tooltipHoliday && (
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <div style={{width:8,height:8,borderRadius:2,background:tooltipS?.bg,border:`1.5px solid ${tooltipS?.border}`,flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:700,color:tooltipS?.text}}>{tooltipLeave.leaveType}</span>
              </div>
            )}

            {tooltipEntry?.hours > 0 && (
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:tooltipEntry?.task?8:0}}>
                <Clock size={11} color="var(--text-muted)"/>
                <span style={{fontSize:12,fontWeight:700,color:"var(--text-primary)"}}>{tooltipEntry.hours} hours logged</span>
              </div>
            )}

            {tooltipEntry?.task && (
              <>
                <div style={{height:1,background:"var(--border)",margin:"8px 0"}}/>
                <div style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>Task</div>
                <div style={{
                  fontSize:12,
                  color:"var(--text-primary)",
                  lineHeight:1.6,
                  maxHeight:80,
                  overflowY:"auto",
                  wordBreak:"break-word",
                }}>
                  {tooltipEntry.task}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Entry Modal */}
      {modal&&selDate&&(
        <div className="modal-backdrop" onClick={()=>setModal(false)}>
          <div className="modal" style={{maxWidth:500}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div className="modal-icon" style={{background:"var(--primary-ghost)"}}><Clock size={20} color="var(--primary)"/></div>
                <div>
                  <div className="modal-title">Log Hours</div>
                  <div className="modal-subtitle">{selDate.format("dddd, DD MMM YYYY")}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                {(entries[selDate?.format("YYYY-MM-DD")]?.hours>0 || entries[selDate?.format("YYYY-MM-DD")]?.leaveType || entries[selDate?.format("YYYY-MM-DD")]?.task)&&(
                  <button className="icon-btn" title="Clear this entry" style={{color:"var(--coral)"}} onClick={()=>setDeleteConfirm(true)}><Trash2 size={15}/></button>
                )}
                <button className="modal-close" onClick={()=>setModal(false)}><X size={16}/></button>
              </div>
            </div>

            {/* Existing entry preview */}
            {entries[selDate?.format("YYYY-MM-DD")]?.task && !deleteConfirm && (
              <div style={{margin:"0 24px 4px",padding:"10px 14px",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:10}}>
                <div style={{fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Current Task</div>
                <div style={{fontSize:12.5,color:"var(--text-secondary)",lineHeight:1.6}}>{entries[selDate.format("YYYY-MM-DD")].task}</div>
              </div>
            )}

            {deleteConfirm&&(
              <div style={{margin:"12px 24px",padding:"12px 14px",background:"#fff1f2",border:"1px solid #fecdd3",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <AlertCircle size={16} color="var(--coral)"/>
                  <span style={{fontSize:13,fontWeight:600,color:"#be123c"}}>Clear this day's entry?</span>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>setDeleteConfirm(false)} style={{padding:"4px 10px",borderRadius:6,border:"1px solid var(--border)",background:"white",cursor:"pointer",fontSize:12,fontWeight:600}}>Cancel</button>
                  <button onClick={clearEntry} style={{padding:"4px 10px",borderRadius:6,border:"none",background:"var(--coral)",color:"white",cursor:"pointer",fontSize:12,fontWeight:700}}>Clear</button>
                </div>
              </div>
            )}

            <div className="modal-body">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                <div>
                  <label className="fc-label">Working Hours <span className="req">*</span></label>
                  <input type="number" min="0" max="24" step="0.5" className="fc-input" value={hours} onChange={e=>{ setHours(e.target.value); if(parseFloat(e.target.value)>0) setLeaveType(""); }} placeholder="e.g. 8" style={{fontSize:15,fontWeight:700}}/>
                </div>
                <div>
                  <label className="fc-label" style={{opacity: parseFloat(hours)>0 ? 0.4 : 1}}>
                    Leave Type {parseFloat(hours)===0||hours==="" ? <span className="req">*</span> : null}
                  </label>
                  <select
                    className="fc-input"
                    value={leaveType}
                    onChange={e=>setLeaveType(e.target.value)}
                    disabled={parseFloat(hours)>0}
                    style={{
                      opacity: parseFloat(hours)>0 ? 0.4 : 1,
                      cursor: parseFloat(hours)>0 ? "not-allowed" : "pointer",
                      borderColor: (!parseFloat(hours) && !leaveType && hours!=="") ? "var(--coral)" : undefined,
                      boxShadow: (!parseFloat(hours) && !leaveType && hours!=="") ? "0 0 0 3px rgba(239,68,68,0.1)" : undefined,
                    }}
                  >
                    <option value="">Select leave type…</option>
                    {["Sick Leave","Casual Leave","Other Leave"].map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                  {(!parseFloat(hours) && !leaveType && hours!=="") && (
                    <div style={{fontSize:11,color:"var(--coral)",fontWeight:600,marginTop:4}}>Required when hours is 0</div>
                  )}
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <label className="fc-label">Task Description</label>
                <textarea className="fc-input" rows={3} value={taskDetails} onChange={e=>setTask(e.target.value)} placeholder="What did you work on today?"/>
              </div>
              <div>
                <label className="fc-label" style={{display:"flex",alignItems:"center",gap:6}}><Copy size={12}/> Copy Hours To</label>
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                  {[{val:"",label:"This day"},{val:"week",label:"Whole week"},{val:"month",label:"Whole month"},{val:"custom",label:"Pick days"}].map(({val,label})=>(
                    <button key={val} type="button" onClick={()=>setCopyOpt(val)} style={{padding:"6px 12px",borderRadius:8,border:`1.5px solid ${copyOpt===val?"var(--primary)":"var(--border)"}`,background:copyOpt===val?"var(--primary-ghost)":"var(--bg)",color:copyOpt===val?"var(--primary)":"var(--text-secondary)",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>
                      {label}
                    </button>
                  ))}
                </div>
                {copyOpt==="custom"&&(
                  <div style={{marginTop:10}}>
                    <label className="fc-label">Select days</label>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      {allDays.filter(d=>d.month()===currentMonth.month()&&!d.isAfter(today,"day")).map(d=>{
                        const iso=d.format("YYYY-MM-DD"); const isSel=otherDays.find(x=>x.isSame(d,"day"));
                        return (
                          <button key={iso} type="button" onClick={()=>setOtherDays(prev=>prev.find(x=>x.isSame(d,"day"))?prev.filter(x=>!x.isSame(d,"day")):[...prev,d])}
                            style={{width:32,height:32,borderRadius:7,border:`1.5px solid ${isSel?"var(--primary)":"var(--border)"}`,background:isSel?"var(--primary)":"var(--bg)",color:isSel?"white":"var(--text-secondary)",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.15s",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                            {d.format("D")}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(false)}><X size={14}/> Cancel</button>
              <button className="btn btn-primary" onClick={saveEntry}><Save size={14}/> Save Entry</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .fc-label{display:block;font-family:'Plus Jakarta Sans',sans-serif;font-size:11.5px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:7px;}
        .req{color:var(--coral);margin-left:2px;}
        .fc-input{width:100%;padding:10px 13px;border-radius:10px;border:1.5px solid var(--border);background:var(--bg);font-family:'DM Sans',sans-serif;font-size:13.5px;color:var(--text-primary);outline:none;transition:all 0.2s;box-sizing:border-box;}
        .fc-input:focus{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-ghost);background:#fff;}
        textarea.fc-input{resize:vertical;min-height:70px;line-height:1.6;}
        select.fc-input{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px;}
      `}</style>
    </div>
  );
}