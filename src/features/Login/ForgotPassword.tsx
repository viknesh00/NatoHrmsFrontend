import { cn } from "cn";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
import { postPublicRequest } from "../../shared/services/Apiservice";
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

  const callApi = (url, data, successMsg, nextStep = undefined) => {
    if (loading) return;
    setLoading(true);
    postPublicRequest(url, data)
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

  const handleVerifyOtp = (e, autoOtp = undefined) => {
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
    width:"100%", padding:"11px 40px 11px 14px", borderRadius:"var(--radius)",
    border:`1px solid ${focused ? "var(--primary)" : "var(--border)"}`,
    boxShadow: focused ? "0 0 0 3px var(--primary-ghost)" : "none",
    fontFamily:"var(--ui-font-sans)", fontSize:14, color:"var(--foreground)",
    outline:"none", transition:"all 0.2s", background: focused ? "var(--card)" : "var(--muted)",
  });

  const [focused, setFocused] = useState<Record<string, any>>({});

  return (
    <div className={cn("auth-shell", "min-h-[100vh] bg-muted flex items-center justify-center relative overflow-hidden")} >
      <div className="w-[100%] max-w-[460px] m-[20px] relative z-[1]" >
        <div className={cn("auth-card", "forgot-password-card overflow-hidden")}>
          <div className="h-[5px] bg-primary"  />

          <div className="p-[32px_40px_36px]" >
            {/* Logo */}
            <div className="flex flex-col items-center mb-[28px]" >
              <div className="w-[56px] h-[56px] overflow-hidden mb-[12px]" style={{borderRadius:"var(--radius)", boxShadow:"var(--shadow-sm)"}}>
                <img src="/assets/images/natobotics-logo.png" alt="Logo" className="w-[100%] h-[100%]" style={{objectFit:"cover"}} />
              </div>
              <div className="text-[22px] font-semibold text-[var(--text-primary)]" style={{fontFamily:"var(--ui-font-heading)"}}>
                Natobotics <span className="text-[var(--teal)]" >HRMS</span>
              </div>
            </div>

            {/* Step progress */}
            <div className="reset-stepper" role="list" aria-label="Password reset steps">
              {STEPS.map((s, i) => (
                <React.Fragment key={s.id}>
                  <div className={`reset-stepper-item${step > s.id ? " is-complete" : step === s.id ? " is-current" : ""}`} role="listitem" aria-current={step === s.id ? "step" : undefined}>
                    <div className="reset-step-indicator" aria-hidden="true">
                      {step > s.id ? <Check size={14} /> : s.id}
                    </div>
                    <span>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`reset-step-connector${step > s.id ? " is-complete" : ""}`} aria-hidden="true" />}
                </React.Fragment>
              ))}
            </div>

            {/* Step 1: Email */}
            {step === 1 && (
              <form onSubmit={handleSendOtp}>
                <h2 className="text-[20px] font-semibold text-[var(--text-primary)] mb-[8px]" style={{fontFamily:"var(--ui-font-heading)"}}>Forgot Password?</h2>
                <p className="text-[14px] text-muted-foreground mb-[20px]" >Enter your registered email to receive a verification code.</p>
                <div className="mb-[20px]" >
                  <label htmlFor="reset-email" className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-[8px]" >Email Address <span className="text-[var(--coral)]" >*</span></label>
                  <div className="relative" >
                    <Input id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@natobotics.com"
                      style={inputStyle(focused.email)}
                      onFocus={() => setFocused(f => ({...f, email:true}))} onBlur={() => setFocused(f => ({...f, email:false}))} />
                    <Mail size={16} className="absolute right-[13px] top-[50%] text-muted-foreground" style={{transform:"translateY(-50%)", pointerEvents:"none"}} />
                  </div>
                </div>
                <Button variant="ghost" type="submit" disabled={loading} className="w-[100%] p-[12px] text-[16px] font-semibold text-primary-foreground flex items-center justify-center gap-[8px]" style={{borderRadius:"var(--radius)", border:"none", cursor:loading?"not-allowed":"pointer", fontFamily:"var(--ui-font-sans)", background:loading?"var(--muted-foreground)":"var(--primary)", boxShadow:"none", transition:"all 0.25s"}}>
                  {loading ? <div className="flex gap-[4px]" >{[0,1,2].map(i=><div key={i} className="w-[8px] h-[8px] bg-card" style={{borderRadius:"50%", animation:"spinnerBounce 0.7s ease-in-out infinite alternate", animationDelay:`${i*0.15}s`}}/>)}</div> : <><Mail size={17}/> Send OTP</>}
                </Button>
              </form>
            )}

            {/* Step 2: OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp}>
                <h2 className="text-[20px] font-semibold text-[var(--text-primary)] mb-[8px]" style={{fontFamily:"var(--ui-font-heading)"}}>Verify OTP</h2>
                <p className="text-[14px] text-muted-foreground mb-[20px]" >We sent a 6-digit code to <strong className="text-primary" >{email}</strong></p>
                <div onPaste={handleOtpPaste} className="flex justify-center gap-[12px] mb-[20px]" style={{...(otpError ? { animation:"shake 0.35s" } : {})}}>
                  {otp.map((digit, idx) => (
                    <Input key={idx} id={`otp-${idx}`} aria-label={`Verification digit ${idx + 1}`} value={digit} maxLength={1}
                      onChange={e => handleOtpChange(e.target.value, idx)}
                      onKeyDown={e => handleOtpKeyDown(e, idx)}
                      className="w-[48px] h-[54px] text-center text-[22px] font-semibold text-[var(--text-primary)] bg-muted" style={{borderRadius:"var(--radius)", border:`2px solid ${otpError?"var(--error)":digit?"var(--primary)":"var(--border)"}`, fontFamily:"var(--ui-font-heading)", outline:"none", transition:"all 0.2s", boxShadow:digit?"0 0 0 3px var(--primary-ghost)":"none"}}
                    />
                  ))}
                </div>
                <Button variant="ghost" type="submit" disabled={loading} className="w-[100%] p-[12px] text-[16px] font-semibold text-primary-foreground flex items-center justify-center gap-[8px]" style={{borderRadius:"var(--radius)", border:"none", cursor:loading?"not-allowed":"pointer", fontFamily:"var(--ui-font-sans)", background:loading?"var(--muted-foreground)":"var(--primary)"}}>
                  {loading ? "Verifying..." : <><ShieldCheck size={17}/> Verify Code</>}
                </Button>
                <p className="text-center text-[13px] text-muted-foreground mt-[16px]" >
                  Didn't receive it? <span onClick={() => callApi("Auth/SendOtp",{email},"OTP resent!",null)} className="text-primary font-semibold cursor-pointer" >Resend OTP</span>
                </p>
              </form>
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword}>
                <h2 className="text-[20px] font-semibold text-[var(--text-primary)] mb-[8px]" style={{fontFamily:"var(--ui-font-heading)"}}>Set New Password</h2>
                <p className="text-[14px] text-muted-foreground mb-[20px]" >Create a strong password for your account.</p>
                {[
                  { key:"newPwd", label:"New Password", val:newPassword, set:setNewPassword, show:showPwd, toggle:()=>setShowPwd(s=>!s) },
                  { key:"cPwd", label:"Confirm Password", val:confirmPassword, set:setConfirmPassword, show:showCPwd, toggle:()=>setShowCPwd(s=>!s) },
                ].map(({key,label,val,set,show,toggle}: Record<string, any>) => (
                  <div key={key} className="mb-[16px]" >
                    <label htmlFor={key} className="block text-[13px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-[8px]" >{label} <span className="text-[var(--coral)]" >*</span></label>
                    <div className="relative" >
                      <Input id={key} type={show?"text":"password"} value={val} onChange={e=>set(e.target.value)} placeholder="••••••••"
                        style={inputStyle(focused[key])} onFocus={()=>setFocused(f=>({...f,[key]:true}))} onBlur={()=>setFocused(f=>({...f,[key]:false}))} />
                      <Button variant="ghost" type="button" aria-label={`${show ? "Hide" : "Show"} ${label.toLowerCase()}`} onClick={toggle} className="absolute right-[12px] top-[50%] bg-[none] cursor-pointer text-muted-foreground flex" style={{transform:"translateY(-50%)", border:"none"}}>
                        {show ? <EyeOff size={17}/> : <Eye size={17}/>}
                      </Button>
                    </div>
                    {key==="newPwd" && newPassword && <PasswordStrength password={newPassword} />}
                  </div>
                ))}
                <Button variant="ghost" type="submit" disabled={loading} className="w-[100%] p-[12px] text-[16px] font-semibold text-primary-foreground flex items-center justify-center gap-[8px]" style={{borderRadius:"var(--radius)", border:"none", cursor:loading?"not-allowed":"pointer", fontFamily:"var(--ui-font-sans)", background:loading?"var(--muted-foreground)":"var(--primary)"}}>
                  {loading ? "Resetting..." : <><KeyRound size={17}/> Reset Password</>}
                </Button>
              </form>
            )}

            <Button variant="ghost" type="button" onClick={() => navigate("/login")} className="w-[100%] flex items-center justify-center gap-[8px] mt-[20px] bg-[none] cursor-pointer text-[14px] text-muted-foreground font-medium" style={{border:"none", fontFamily:"var(--ui-font-sans)", transition:"color 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.color="var(--primary)"} onMouseLeave={e=>e.currentTarget.style.color="var(--muted-foreground)"}>
              <ArrowLeft size={15}/> Back to Login
            </Button>
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
