import WorkflowDialog from "../../components/WorkflowDialog";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import React, { useState, useEffect, useCallback } from "react";
import { setCookie } from "../../auth/Cookies";
import { ToastError, ToastSuccess } from "./ToastMsg";
import { postRequest } from "./Apiservice";
import { KeyRound, X, Shield, Eye, EyeOff } from "lucide-react";

const stopProp = (e) => e.stopPropagation();

const Field = ({ label, value, setValue, showKey, show, setShow }: Record<string, any>) => {
  const id = React.useId();
  return (
  <div className="mb-[16px]" >
    <label htmlFor={id} className="block text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.06em] mb-[8px]" >
      {label} <span className="text-[var(--coral)]" >*</span>
    </label>
    <div className="relative" >
      <Input
        id={id}
        type={show[showKey] ? "text" : "password"}
        value={value}
        onChange={e => setValue(e.target.value)}
        onClick={stopProp}
        onMouseDown={stopProp}
        autoComplete="off"
        className="w-[100%] p-[12px_40px_12px_12px] bg-[var(--bg-card)] text-[14px] text-[var(--text-primary)]" style={{borderRadius:"var(--radius)", border:"1px solid var(--border)", fontFamily:"var(--ui-font-sans)", outline:"none", transition:"border-color 0.2s, box-shadow 0.2s", boxSizing:"border-box"}}
        onFocus={e => { e.target.style.borderColor="var(--primary)"; e.target.style.boxShadow="0 0 0 3px var(--primary-ghost)"; }}
        onBlur={e => { e.target.style.borderColor="var(--border)"; e.target.style.boxShadow="none"; }}
      />
      <Button variant="ghost"
        type="button"
        aria-label={show[showKey] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        onMouseDown={e => { e.preventDefault(); setShow(s => ({ ...s, [showKey]: !s[showKey] })); }}
        className="absolute right-[10px] top-[50%] bg-[none] cursor-pointer text-[var(--text-muted)] flex p-[4px] z-[1]" style={{transform:"translateY(-50%)", border:"none"}}
      >
        {show[showKey] ? <EyeOff size={16}/> : <Eye size={16}/>}
      </Button>
    </div>
  </div>
);
};

const PasswordChange = ({ onSuccess, isManualChange = false, onClose }: Record<string, any>) => {
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
  const sColors = ["var(--error)","var(--warning)","var(--primary)","var(--success)"];
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
    <WorkflowDialog title={isManualChange ? "Change Password" : "Set New Password"} onClose={isManualChange ? onClose : undefined} busy={loading} dismissible={isManualChange} width="440px">
<div
        className="bg-[var(--bg-card)] w-[100%] max-w-[440px] overflow-hidden" style={{borderRadius:"var(--radius)", boxShadow:"var(--shadow-xl)"}}
        onMouseDown={stopProp}
        onClick={stopProp}
      >
        {/* Top gradient bar */}
        <div className="h-[5px] bg-primary"  />

        {/* Header */}
        <div className="p-[20px_24px_16px] flex items-center justify-between" style={{borderBottom:"1px solid var(--border)"}}>
          <div className="flex items-center gap-[12px]" >
            <div className="w-[40px] h-[40px] bg-primary flex items-center justify-center" style={{borderRadius:"var(--radius)"}}>
              <KeyRound size={20} color="var(--primary-foreground)"/>
            </div>
            <div>
              <div className="text-[18px] font-semibold text-[var(--text-primary)]" style={{fontFamily:"var(--ui-font-heading)"}}>
                {isManualChange ? "Change Password" : "Set New Password"}
              </div>
              <div className="text-[12px] text-[var(--text-muted)] mt-[4px]" >
                {isManualChange ? "Update your account security" : "You must change your default password"}
              </div>
            </div>
          </div>
          {isManualChange && onClose && (
            <Button variant="ghost" type="button"
              onMouseDown={e => { e.stopPropagation(); onClose(); }}
              className="w-[36px] h-[36px] bg-[var(--bg)] cursor-pointer flex items-center justify-center text-[var(--text-muted)]" style={{borderRadius:"var(--radius)", border:"none"}}
            >
              <X size={16}/>
            </Button>
          )}
        </div>

        {/* Fields */}
        <div className="p-[20px_24px]" >
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
            <div className="mb-[16px]" style={{marginTop:-10}}>
              <div className="h-[4px] bg-border overflow-hidden mb-[4px]" style={{borderRadius:"var(--radius)"}}>
                <div className="h-[100%]" style={{width:`${(strength / 4) * 100}%`, background:sColors[strength - 1] || "var(--error)", borderRadius:"var(--radius)", transition:"width 0.3s"}}/>
              </div>
              <span className="text-[12px] font-semibold" style={{color:sColors[strength - 1] || "var(--error)"}}>
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
          <div className="bg-[var(--bg)] p-[12px_16px] mb-[20px]" style={{borderRadius:"var(--radius)", border:"1px solid var(--border)"}}>
            {[
              ["Min 6 characters",    newPassword.length >= 6],
              ["Uppercase letter",    /[A-Z]/.test(newPassword)],
              ["Number (0-9)",        /[0-9]/.test(newPassword)],
              ["Special character",   /[^A-Za-z0-9]/.test(newPassword)],
            ].map(([rule, ok]) => (
              <div key={String(rule)} className="flex items-center gap-[8px] mb-[4px] text-[12px]" >
                <div className="w-[16px] h-[16px] flex items-center justify-center shrink-[0]" style={{borderRadius:"50%", background:ok ? "var(--success-subtle)" : "var(--border)"}}>
                  {ok && <span className="text-[12px] text-success font-semibold" >✓</span>}
                </div>
                <span style={{ color:ok ? "var(--success)" : "var(--text-muted)", fontWeight:ok ? 600 : 400 }}>{rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-[16px_24px_20px] flex gap-[12px] justify-end" style={{borderTop:"1px solid var(--border)"}}>
          {isManualChange && onClose && (
            <Button variant="ghost" type="button"
              onMouseDown={e => { e.stopPropagation(); onClose(); }}
              className="p-[8px_20px] bg-[var(--bg-card)] text-[var(--text-secondary)] text-[13px] font-semibold cursor-pointer" style={{borderRadius:"var(--radius)", border:"1px solid var(--border)"}}
            >
              Cancel
            </Button>
          )}
          <Button variant="ghost" type="button"
            onClick={handleUpdate}
            disabled={loading}
            className="p-[8px_24px] text-primary-foreground text-[13px] font-semibold flex items-center gap-[8px]" style={{borderRadius:"var(--radius)", border:"none", background:loading ? "var(--muted-foreground)" : "var(--primary)", cursor:loading ? "not-allowed" : "pointer", fontFamily:"var(--ui-font-sans)", boxShadow:"none"}}
          >
            {loading ? "Updating..." : <><Shield size={15}/> Update Password</>}
          </Button>
        </div>
      </div>
</WorkflowDialog>
  );
};

export default PasswordChange;
