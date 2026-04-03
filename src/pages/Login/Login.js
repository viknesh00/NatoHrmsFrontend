import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import { cookieKeys } from "../../services/Cookies";
import { postRequest } from "../../services/Apiservice";
import { cookieObj } from "../../models/cookieObj";
import PasswordField from "../../Fields/PasswordField";
import { Eye, EyeOff, LogIn } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isToday = (dateStr) => dateStr && new Date(dateStr).toDateString() === new Date().toDateString();

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) { ToastError("Please fill in both fields!"); return; }
    setLoading(true);
    postRequest("Auth/Login", { username: email, password })
      .then(res => {
        if (res.status === 200 && res.data?.token) {
          ToastSuccess("Login successful!");
          const todayClockInTime = isToday(res.data.clockIn) ? res.data.clockIn : "";
          cookieKeys({ ...cookieObj, token: res.data.token, isLoggedIn: true, email: res.data.email, role: res.data.role, isDefaultPasswordChanged: res.data.isDefaultPasswordChanged, firstName: res.data.firstName, lastName: res.data.lastName, employeeId: res.data.employeeId, clockInTime: todayClockInTime }, new Date(res.data.expiration));
          setTimeout(() => navigate("/dashboard"), 800);
        } else ToastError("Invalid credentials!");
      })
      .catch(err => ToastError(err?.response?.data?.message || "Unable to connect. Please try again."))
      .finally(() => setLoading(false));
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1e1143 0%,#3b1f6e 40%,#0d9488 100%)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      {/* BG orbs */}
      {[{w:400,h:400,t:"-100px",r:"-100px",bg:"rgba(108,63,197,0.2)"},{w:300,h:300,b:"-80px",l:"-60px",bg:"rgba(13,148,136,0.15)"},{w:200,h:200,t:"40%",l:"20%",bg:"rgba(255,255,255,0.04)"}].map((o,i)=>(
        <div key={i} style={{ position:"absolute", width:o.w, height:o.h, borderRadius:"50%", background:o.bg, top:o.t, right:o.r, bottom:o.b, left:o.l, pointerEvents:"none" }} />
      ))}

      <div style={{ width:"100%", maxWidth:430, margin:"20px", position:"relative", zIndex:1 }}>
        <div style={{ background:"rgba(255,255,255,0.97)", borderRadius:24, overflow:"hidden", boxShadow:"0 32px 80px rgba(0,0,0,0.35)", backdropFilter:"blur(20px)" }}>
          {/* Top accent bar */}
          <div style={{ height:5, background:"linear-gradient(90deg,#6c3fc5,#0d9488,#f43f5e)" }} />

          <div style={{ padding:"36px 40px 40px" }}>
            {/* Logo */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:32 }}>
              <div style={{ width:64, height:64, borderRadius:18, overflow:"hidden", marginBottom:14, boxShadow:"0 4px 20px rgba(108,63,197,0.25)" }}>
                <img src="/assets/images/natobotics-logo.png" alt="Logo" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:24, fontWeight:900, color:"#1e1143", letterSpacing:"-0.5px" }}>
                Natobotics <span style={{ color:"#0d9488" }}>HRMS</span>
              </div>
              <div style={{ fontSize:13.5, color:"#6b7280", marginTop:4 }}>Sign in to your account</div>
            </div>

            <form onSubmit={handleLogin}>
              {/* Email */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:7 }}>Email Address</label>
                <input
                  type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="you@natobotics.com"
                  style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1.5px solid #e5e7eb", fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"#1f2937", outline:"none", transition:"all 0.2s", background:"#f9fafb" }}
                  onFocus={e=>{e.target.style.borderColor="#6c3fc5";e.target.style.boxShadow="0 0 0 3px #ede9fe";e.target.style.background="#fff";}}
                  onBlur={e=>{e.target.style.borderColor="#e5e7eb";e.target.style.boxShadow="none";e.target.style.background="#f9fafb";}}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom:10 }}>
                <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:7 }}>Password</label>
                <div style={{ position:"relative" }}>
                  <input
                    type={showPwd ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{ width:"100%", padding:"11px 42px 11px 14px", borderRadius:10, border:"1.5px solid #e5e7eb", fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"#1f2937", outline:"none", transition:"all 0.2s", background:"#f9fafb" }}
                    onFocus={e=>{e.target.style.borderColor="#6c3fc5";e.target.style.boxShadow="0 0 0 3px #ede9fe";e.target.style.background="#fff";}}
                    onBlur={e=>{e.target.style.borderColor="#e5e7eb";e.target.style.boxShadow="none";e.target.style.background="#f9fafb";}}
                  />
                  <button type="button" onClick={() => setShowPwd(s=>!s)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9ca3af", display:"flex" }}>
                    {showPwd ? <EyeOff size={17}/> : <Eye size={17}/>}
                  </button>
                </div>
              </div>

              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:24 }}>
                <span onClick={() => navigate("/forgot-password")} style={{ fontSize:13, color:"#6c3fc5", fontWeight:600, cursor:"pointer", transition:"color 0.2s" }} onMouseEnter={e=>e.target.style.color="#4c1d95"} onMouseLeave={e=>e.target.style.color="#6c3fc5"}>
                  Forgot Password?
                </span>
              </div>

              <button type="submit" disabled={loading} style={{ width:"100%", padding:"13px", borderRadius:12, border:"none", cursor:loading?"not-allowed":"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:15, fontWeight:800, color:"white", background:loading?"#9ca3af":"linear-gradient(135deg,#6c3fc5,#0d9488)", boxShadow:loading?"none":"0 4px 20px rgba(108,63,197,0.35)", transition:"all 0.25s", display:"flex", alignItems:"center", justifyContent:"center", gap:8, letterSpacing:"0.01em" }}
                onMouseEnter={e=>{ if(!loading){ e.target.style.transform="translateY(-1px)"; e.target.style.boxShadow="0 8px 28px rgba(108,63,197,0.45)"; }}}
                onMouseLeave={e=>{ e.target.style.transform=""; e.target.style.boxShadow="0 4px 20px rgba(108,63,197,0.35)"; }}
              >
                {loading ? (
                  <div style={{ display:"flex", gap:5 }}>
                    {[0,1,2].map(i=><div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"white", animation:"spinnerBounce 0.7s ease-in-out infinite alternate", animationDelay:`${i*0.15}s` }} />)}
                  </div>
                ) : <><LogIn size={17}/> Sign In</>}
              </button>
            </form>

            <p style={{ textAlign:"center", fontSize:12, color:"#9ca3af", marginTop:28 }}>
              © Natobotics {new Date().getFullYear()}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
