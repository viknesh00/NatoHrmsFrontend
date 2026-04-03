import React, { useState, useEffect, useCallback } from "react";
import { setCookie } from "./Cookies";
import { ToastError, ToastSuccess } from "./ToastMsg";
import { postRequest } from "./Apiservice";
import { KeyRound, X, Shield, Eye, EyeOff } from "lucide-react";

const stopProp = (e) => e.stopPropagation();

const Field = ({ label, value, setValue, showKey, show, setShow }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display:"block", fontSize:11.5, fontWeight:700, color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:7 }}>
      {label} <span style={{ color:"var(--coral)" }}>*</span>
    </label>
    <div style={{ position:"relative" }}>
      <input
        type={show[showKey] ? "text" : "password"}
        value={value}
        onChange={e => setValue(e.target.value)}
        onClick={stopProp}
        onMouseDown={stopProp}
        autoComplete="off"
        style={{
          width:"100%", padding:"10px 40px 10px 13px", borderRadius:10,
          border:"1.5px solid var(--border)", background:"var(--bg-card)",
          fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"var(--text-primary)",
          outline:"none", transition:"border-color 0.2s, box-shadow 0.2s", boxSizing:"border-box",
        }}
        onFocus={e => { e.target.style.borderColor="var(--primary)"; e.target.style.boxShadow="0 0 0 3px var(--primary-ghost)"; }}
        onBlur={e => { e.target.style.borderColor="var(--border)"; e.target.style.boxShadow="none"; }}
      />
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); setShow(s => ({ ...s, [showKey]: !s[showKey] })); }}
        style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"var(--text-muted)", display:"flex", padding:4, zIndex:1 }}
      >
        {show[showKey] ? <EyeOff size={16}/> : <Eye size={16}/>}
      </button>
    </div>
  </div>
);

const PasswordChange = ({ onSuccess, isManualChange = false, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [retypePassword, setRetypePassword]   = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState({ cur: false, nw: false, re: false });

  useEffect(() => {
    setCurrentPassword(""); setNewPassword(""); setRetypePassword("");
  }, [isManualChange]);

  const getStrength = (p) => {
    let s = 0;
    if (p.length >= 6) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };

  const strength = getStrength(newPassword);
  const sColors = ["#ef4444","#f59e0b","#3b82f6","#22c55e"];
  const sLabels = ["Weak","Fair","Good","Strong"];

  const handleUpdate = useCallback(async () => {
    if (!currentPassword || !newPassword || !retypePassword) { ToastError("Please fill all fields"); return; }
    if (currentPassword === newPassword) { ToastError("New password cannot be same as current"); return; }
    if (strength < 4) { ToastError("Password needs uppercase, number, and special character"); return; }
    if (newPassword !== retypePassword) { ToastError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await postRequest("Account/ChangePassword", { currentPassword, newPassword });
      if (res.status === 200) {
        ToastSuccess("Password changed successfully!");
        setCookie("isDefaultPasswordChanged", true, new Date(new Date().setFullYear(new Date().getFullYear() + 1)));
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      ToastError(err?.response?.data?.message || err?.response?.data?.Message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, retypePassword, strength, onSuccess]);

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(20,0,50,0.5)", backdropFilter:"blur(4px)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onMouseDown={() => isManualChange && onClose && onClose()}
    >
      <div
        style={{ background:"var(--bg-card)", borderRadius:20, boxShadow:"var(--shadow-xl)", width:"100%", maxWidth:440, overflow:"hidden" }}
        onMouseDown={stopProp}
        onClick={stopProp}
      >
        {/* Top gradient bar */}
        <div style={{ height:5, background:"linear-gradient(90deg,var(--primary),var(--teal))" }} />

        {/* Header */}
        <div style={{ padding:"20px 24px 14px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,var(--primary),var(--teal))", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <KeyRound size={20} color="white"/>
            </div>
            <div>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:17, fontWeight:800, color:"var(--text-primary)" }}>
                {isManualChange ? "Change Password" : "Set New Password"}
              </div>
              <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>
                {isManualChange ? "Update your account security" : "You must change your default password"}
              </div>
            </div>
          </div>
          {isManualChange && onClose && (
            <button
              onMouseDown={e => { e.stopPropagation(); onClose(); }}
              style={{ width:30, height:30, borderRadius:8, background:"var(--bg)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-muted)" }}
            >
              <X size={16}/>
            </button>
          )}
        </div>

        {/* Fields */}
        <div style={{ padding:"20px 24px" }}>
          <Field
            label="Current Password"
            value={currentPassword}
            setValue={setCurrentPassword}
            showKey="cur"
            show={show}
            setShow={setShow}
          />
          <Field
            label="New Password"
            value={newPassword}
            setValue={setNewPassword}
            showKey="nw"
            show={show}
            setShow={setShow}
          />

          {/* Strength meter */}
          {newPassword && (
            <div style={{ marginTop:-10, marginBottom:14 }}>
              <div style={{ height:4, background:"var(--border)", borderRadius:4, overflow:"hidden", marginBottom:4 }}>
                <div style={{ height:"100%", width:`${(strength / 4) * 100}%`, background:sColors[strength - 1] || "#ef4444", borderRadius:4, transition:"width 0.3s" }}/>
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:sColors[strength - 1] || "#ef4444" }}>
                {sLabels[strength - 1] || "Very Weak"}
              </span>
            </div>
          )}

          <Field
            label="Confirm New Password"
            value={retypePassword}
            setValue={setRetypePassword}
            showKey="re"
            show={show}
            setShow={setShow}
          />

          {/* Rules checklist */}
          <div style={{ background:"var(--bg)", borderRadius:10, padding:"10px 14px", marginBottom:18, border:"1px solid var(--border)" }}>
            {[
              ["Min 6 characters",    newPassword.length >= 6],
              ["Uppercase letter",    /[A-Z]/.test(newPassword)],
              ["Number (0-9)",        /[0-9]/.test(newPassword)],
              ["Special character",   /[^A-Za-z0-9]/.test(newPassword)],
            ].map(([rule, ok]) => (
              <div key={rule} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4, fontSize:12 }}>
                <div style={{ width:16, height:16, borderRadius:"50%", background:ok ? "#dcfce7" : "var(--border)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {ok && <span style={{ fontSize:9, color:"#15803d", fontWeight:900 }}>✓</span>}
                </div>
                <span style={{ color:ok ? "#15803d" : "var(--text-muted)", fontWeight:ok ? 600 : 400 }}>{rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px 20px", borderTop:"1px solid var(--border)", display:"flex", gap:10, justifyContent:"flex-end" }}>
          {isManualChange && onClose && (
            <button
              onMouseDown={e => { e.stopPropagation(); onClose(); }}
              style={{ padding:"9px 18px", borderRadius:9, border:"1.5px solid var(--border)", background:"var(--bg-card)", color:"var(--text-secondary)", fontSize:13, fontWeight:600, cursor:"pointer" }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleUpdate}
            disabled={loading}
            style={{ padding:"9px 22px", borderRadius:9, border:"none", background:loading ? "#9ca3af" : "linear-gradient(135deg,var(--primary),var(--primary-light))", color:"white", fontSize:13, fontWeight:700, cursor:loading ? "not-allowed" : "pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", display:"flex", alignItems:"center", gap:7, boxShadow:loading ? "none" : "0 3px 10px var(--primary-glow)" }}
          >
            {loading ? "Updating..." : <><Shield size={15}/> Update Password</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordChange;