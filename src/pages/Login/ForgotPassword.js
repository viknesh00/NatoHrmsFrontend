import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import { postRequest } from "../../services/Apiservice";
import { ArrowLeft, Mail, ShieldCheck, KeyRound, Check, Eye, EyeOff } from "lucide-react";
import { PasswordStrength } from "../../components/FormComponents";

const STEPS = [
  { id: 1, icon: <Mail size={20} />, label: "Email" },
  { id: 2, icon: <ShieldCheck size={20} />, label: "Verify OTP" },
  { id: 3, icon: <KeyRound size={20} />, label: "New Password" },
];

const ForgotPassword = () => {
  const [step, setStep]       = useState(1);
  const [email, setEmail]     = useState("");
  const [otp, setOtp]         = useState(["","","","","",""]);
  const [otpError, setOtpError] = useState(false);
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [showCPwd, setShowCPwd] = useState(false);
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const callApi = (url, data, successMsg, nextStep) => {
    if (loading) return;
    setLoading(true);
    postRequest(url, data)
      .then(() => { ToastSuccess(successMsg); if (nextStep) setStep(nextStep); })
      .catch(err => ToastError(err?.response?.data?.message || "Something went wrong."))
      .finally(() => setLoading(false));
  };

  const handleOtpChange = (val, idx) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[idx] = val; setOtp(next); setOtpError(false);
    if (val && idx < 5) document.getElementById(`otp-${idx+1}`)?.focus();
    if (next.join("").length === 6) handleVerifyOtp(null, next.join(""));
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) document.getElementById(`otp-${idx-1}`)?.focus();
  };

  const handleOtpPaste = (e) => {
    const p = e.clipboardData.getData("text").slice(0,6);
    if (!/^\d+$/.test(p)) return;
    setOtp([...p.split(""), ...Array(6-p.length).fill("")]);
  };

  const getStrength = (p) => {
    let s = 0;
    if (p.length >= 6) s++; if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };

  const handleSendOtp = e => {
    e.preventDefault();
    if (!email) { ToastError("Please enter your email address."); return; }
    callApi("Auth/SendOtp", { email }, "OTP sent to your email.", 2);
  };

  const handleVerifyOtp = (e, autoOtp) => {
    if (e) e.preventDefault();
    const finalOtp = autoOtp || otp.join("");
    if (finalOtp.length !== 6) { setOtpError(true); ToastError("Enter the 6-digit OTP."); return; }
    callApi("Auth/VerifyOtp", { email, otp: finalOtp }, "OTP verified!", 3);
  };

  const handleResetPassword = e => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) { ToastError("Please fill all fields."); return; }
    if (getStrength(newPassword) < 4) { ToastError("Password must be stronger."); return; }
    if (newPassword !== confirmPassword) { ToastError("Passwords do not match."); return; }
    callApi("Auth/ResetPassword", { email, otp: otp.join(""), newPassword }, "Password reset successfully!");
    setTimeout(() => navigate("/login"), 1200);
  };

  const inputStyle = (focused) => ({
    width:"100%", padding:"11px 40px 11px 14px", borderRadius:10,
    border:`1.5px solid ${focused ? "#6c3fc5" : "#e5e7eb"}`,
    boxShadow: focused ? "0 0 0 3px #ede9fe" : "none",
    fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"#1f2937",
    outline:"none", transition:"all 0.2s", background: focused ? "#fff" : "#f9fafb",
  });

  const [focused, setFocused] = useState({});

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1e1143 0%,#3b1f6e 40%,#0d9488 100%)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      {/* BG orbs */}
      <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", background:"rgba(108,63,197,0.2)", top:-100, right:-100, pointerEvents:"none" }} />
      <div style={{ position:"absolute", width:300, height:300, borderRadius:"50%", background:"rgba(13,148,136,0.15)", bottom:-80, left:-60, pointerEvents:"none" }} />

      <div style={{ width:"100%", maxWidth:460, margin:"20px", position:"relative", zIndex:1 }}>
        <div style={{ background:"rgba(255,255,255,0.97)", borderRadius:24, overflow:"hidden", boxShadow:"0 32px 80px rgba(0,0,0,0.35)" }}>
          <div style={{ height:5, background:"linear-gradient(90deg,#6c3fc5,#0d9488,#f43f5e)" }} />

          <div style={{ padding:"32px 40px 36px" }}>
            {/* Logo */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:28 }}>
              <div style={{ width:56, height:56, borderRadius:18, overflow:"hidden", marginBottom:12, boxShadow:"0 4px 20px rgba(108,63,197,0.25)" }}>
                <img src="/assets/images/natobotics-logo.png" alt="Logo" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:22, fontWeight:900, color:"#1e1143" }}>
                Natobotics <span style={{ color:"#0d9488" }}>HRMS</span>
              </div>
            </div>

            {/* Step progress */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:28, gap:0 }}>
              {STEPS.map((s, i) => (
                <React.Fragment key={s.id}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    <div style={{
                      width:38, height:38, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                      background: step > s.id ? "#0d9488" : step === s.id ? "linear-gradient(135deg,#6c3fc5,#8b5cf6)" : "#f1f5f9",
                      color: step >= s.id ? "white" : "#9ca3af", fontWeight:700, fontSize:13,
                      transition:"all 0.3s", boxShadow: step === s.id ? "0 4px 12px rgba(108,63,197,0.35)" : "none",
                    }}>
                      {step > s.id ? <Check size={16} /> : s.icon}
                    </div>
                    <span style={{ fontSize:10.5, fontWeight:700, color: step >= s.id ? "#6c3fc5" : "#9ca3af", textTransform:"uppercase", letterSpacing:"0.05em" }}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ flex:1, height:2, background: step > s.id ? "var(--teal)" : "var(--border)", margin:"0 8px", marginBottom:22, transition:"background 0.3s" }} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Step 1: Email */}
            {step === 1 && (
              <form onSubmit={handleSendOtp}>
                <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:20, fontWeight:800, color:"#1e1143", marginBottom:6 }}>Forgot Password?</h2>
                <p style={{ fontSize:13.5, color:"#6b7280", marginBottom:20 }}>Enter your registered email to receive a verification code.</p>
                <div style={{ marginBottom:18 }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:7 }}>Email Address <span style={{ color:"#f43f5e" }}>*</span></label>
                  <div style={{ position:"relative" }}>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@natobotics.com"
                      style={inputStyle(focused.email)}
                      onFocus={() => setFocused(f => ({...f, email:true}))} onBlur={() => setFocused(f => ({...f, email:false}))} />
                    <Mail size={16} style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", color:"#9ca3af", pointerEvents:"none" }} />
                  </div>
                </div>
                <button type="submit" disabled={loading} style={{ width:"100%", padding:"13px", borderRadius:12, border:"none", cursor:loading?"not-allowed":"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:15, fontWeight:800, color:"white", background:loading?"#9ca3af":"linear-gradient(135deg,#6c3fc5,#0d9488)", boxShadow:"0 4px 20px rgba(108,63,197,0.35)", transition:"all 0.25s", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  {loading ? <div style={{ display:"flex",gap:5 }}>{[0,1,2].map(i=><div key={i} style={{ width:8,height:8,borderRadius:"50%",background:"white",animation:"spinnerBounce 0.7s ease-in-out infinite alternate",animationDelay:`${i*0.15}s` }}/>)}</div> : <><Mail size={17}/> Send OTP</>}
                </button>
              </form>
            )}

            {/* Step 2: OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp}>
                <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:20, fontWeight:800, color:"#1e1143", marginBottom:6 }}>Verify OTP</h2>
                <p style={{ fontSize:13.5, color:"#6b7280", marginBottom:20 }}>We sent a 6-digit code to <strong style={{ color:"#6c3fc5" }}>{email}</strong></p>
                <div onPaste={handleOtpPaste} style={{ display:"flex", justifyContent:"center", gap:10, marginBottom:20, ...(otpError ? { animation:"shake 0.35s" } : {}) }}>
                  {otp.map((digit, idx) => (
                    <input key={idx} id={`otp-${idx}`} value={digit} maxLength={1}
                      onChange={e => handleOtpChange(e.target.value, idx)}
                      onKeyDown={e => handleOtpKeyDown(e, idx)}
                      style={{ width:48, height:54, textAlign:"center", fontSize:22, fontWeight:800, borderRadius:12, border:`2px solid ${otpError?"#ef4444":digit?"#6c3fc5":"#e5e7eb"}`, fontFamily:"'Plus Jakarta Sans',sans-serif", color:"#1e1143", outline:"none", background:"#f9fafb", transition:"all 0.2s", boxShadow:digit?"0 0 0 3px #ede9fe":"none" }}
                    />
                  ))}
                </div>
                <button type="submit" disabled={loading} style={{ width:"100%", padding:"13px", borderRadius:12, border:"none", cursor:loading?"not-allowed":"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:15, fontWeight:800, color:"white", background:loading?"#9ca3af":"linear-gradient(135deg,#6c3fc5,#0d9488)", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  {loading ? "Verifying..." : <><ShieldCheck size={17}/> Verify Code</>}
                </button>
                <p style={{ textAlign:"center", fontSize:13, color:"#6b7280", marginTop:14 }}>
                  Didn't receive it? <span onClick={() => callApi("Auth/SendOtp",{email},"OTP resent!",null)} style={{ color:"#6c3fc5", fontWeight:700, cursor:"pointer" }}>Resend OTP</span>
                </p>
              </form>
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword}>
                <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:20, fontWeight:800, color:"#1e1143", marginBottom:6 }}>Set New Password</h2>
                <p style={{ fontSize:13.5, color:"#6b7280", marginBottom:20 }}>Create a strong password for your account.</p>
                {[
                  { key:"newPwd", label:"New Password", val:newPassword, set:setNewPassword, show:showPwd, toggle:()=>setShowPwd(s=>!s) },
                  { key:"cPwd", label:"Confirm Password", val:confirmPassword, set:setConfirmPassword, show:showCPwd, toggle:()=>setShowCPwd(s=>!s) },
                ].map(({key,label,val,set,show,toggle}) => (
                  <div key={key} style={{ marginBottom:16 }}>
                    <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:7 }}>{label} <span style={{ color:"#f43f5e" }}>*</span></label>
                    <div style={{ position:"relative" }}>
                      <input type={show?"text":"password"} value={val} onChange={e=>set(e.target.value)} placeholder="••••••••"
                        style={inputStyle(focused[key])} onFocus={()=>setFocused(f=>({...f,[key]:true}))} onBlur={()=>setFocused(f=>({...f,[key]:false}))} />
                      <button type="button" onClick={toggle} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#9ca3af",display:"flex" }}>
                        {show ? <EyeOff size={17}/> : <Eye size={17}/>}
                      </button>
                    </div>
                    {key==="newPwd" && newPassword && <PasswordStrength password={newPassword} />}
                  </div>
                ))}
                <button type="submit" disabled={loading} style={{ width:"100%", padding:"13px", borderRadius:12, border:"none", cursor:loading?"not-allowed":"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:15, fontWeight:800, color:"white", background:loading?"#9ca3af":"linear-gradient(135deg,#6c3fc5,#0d9488)", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  {loading ? "Resetting..." : <><KeyRound size={17}/> Reset Password</>}
                </button>
              </form>
            )}

            <button onClick={() => navigate("/login")} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:7, marginTop:20, background:"none", border:"none", cursor:"pointer", fontSize:13.5, color:"#6b7280", fontFamily:"'DM Sans',sans-serif", fontWeight:500, transition:"color 0.2s" }}
              onMouseEnter={e=>e.currentTarget.style.color="#6c3fc5"} onMouseLeave={e=>e.currentTarget.style.color="#6b7280"}>
              <ArrowLeft size={15}/> Back to Login
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)}
          60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} 100%{transform:translateX(0)}
        }
      `}</style>
    </div>
  );
};

export default ForgotPassword;
