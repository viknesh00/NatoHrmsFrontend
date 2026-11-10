import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ToastError, ToastSuccess } from "../../services/ToastMsg";
import { cookieKeys } from "../../services/Cookies";
import { postPublicRequest } from "../../services/Apiservice";
import { cookieObj } from "../../models/cookieObj";
import { Eye, EyeOff, LogIn, Users, Clock3, ClipboardList, Sparkles } from "lucide-react";
import { getLoginRedirect } from "../../services/Auth";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isToday = (dateStr) => dateStr && new Date(dateStr).toDateString() === new Date().toDateString();

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) { ToastError("Please fill in both fields!"); return; }
    setLoading(true);
    postPublicRequest("Auth/Login", { username: email, password })
      .then(res => {
        if (res.status === 200 && res.data?.token) {
          ToastSuccess("Login successful!");
          const todayClockInTime = isToday(res.data.clockIn) ? res.data.clockIn : "";
          cookieKeys({
            ...cookieObj,
            token: res.data.token,
            isLoggedIn: true,
            email: res.data.email,
            role: res.data.role,
            department: res.data.department || "",
            isDefaultPasswordChanged: res.data.isDefaultPasswordChanged,
            firstName: res.data.firstName,
            lastName: res.data.lastName,
            employeeId: res.data.employeeId,
            clockInTime: todayClockInTime,
            includeSaturday: res.data.includeSaturday,
            includeSunday: res.data.includeSunday,
            shiftStartTime: res.data.shiftStartTime || "",
            shiftEndTime: res.data.shiftEndTime || "",
            workLocationCity: res.data.workLocationCity || "",
            geoFenceEnabled: res.data.geoFenceEnabled,
          }, new Date(res.data.expiration));
          navigate(getLoginRedirect(location.state?.from), { replace: true });
        } else ToastError("Invalid credentials!");
      })
      .catch(err => ToastError(err?.response?.data?.message || "Unable to connect. Please try again."))
      .finally(() => setLoading(false));
  };

  return (
    <main className="login-shell">
      <section className="login-story" aria-label="Natobotics HRMS overview">
        <div className="login-story-inner">
          <div className="login-brand">
            <img src="/assets/images/natobotics-logo.png" alt="Natobotics" />
            <span>Natobotics <strong>HRMS</strong></span>
          </div>

          <div className="login-story-copy">
            <div className="login-story-eyebrow"><Sparkles size={15} /> People operations, with clarity</div>
            <h1>Make every workday clearer.</h1>
            <p>Keep the people and processes that move your organization forward in one place.</p>
          </div>

          <div className="login-principles">
            <div className="login-principle">
              <span className="login-principle-icon"><Users size={18} /></span>
              <div><strong>People first</strong><p>Support the everyday moments that matter at work.</p></div>
            </div>
            <div className="login-principle">
              <span className="login-principle-icon"><Clock3 size={18} /></span>
              <div><strong>Work with clarity</strong><p>Keep attendance, leave, and updates easy to find.</p></div>
            </div>
            <div className="login-principle">
              <span className="login-principle-icon"><ClipboardList size={18} /></span>
              <div><strong>Move forward together</strong><p>Bring common HR workflows into one calm workspace.</p></div>
            </div>
          </div>

          <div className="login-story-footer">
            <span><span className="login-status-dot" /> A clearer way to work, together.</span>
            <span>Natobotics HRMS</span>
          </div>
        </div>
      </section>

      <section className="login-panel" aria-label="Sign in">
        <div className="login-form-frame">
          <div className="login-form-kicker">EMPLOYEE WORKSPACE</div>
          <h2>Welcome back</h2>
          <p className="login-form-subtitle">Sign in to continue to your account.</p>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="login-field-group">
              <label htmlFor="login-email">Email address</label>
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@natobotics.com"
                className="login-input"
                onFocus={e=>{e.target.style.borderColor="var(--primary)";e.target.style.boxShadow="0 0 0 3px var(--primary-ghost)";e.target.style.background="#fff";}}
                onBlur={e=>{e.target.style.borderColor="#e5e7eb";e.target.style.boxShadow="none";e.target.style.background="#f9fafb";}}
              />
            </div>

            <div className="login-field-group">
              <label htmlFor="login-password">Password</label>
              <div className="login-password-wrap">
                <Input
                  id="login-password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="login-input login-password-input"
                  onFocus={e=>{e.target.style.borderColor="var(--primary)";e.target.style.boxShadow="0 0 0 3px var(--primary-ghost)";e.target.style.background="#fff";}}
                  onBlur={e=>{e.target.style.borderColor="#e5e7eb";e.target.style.boxShadow="none";e.target.style.background="#f9fafb";}}
                />
                <button type="button" className="login-password-toggle" aria-label={showPwd ? "Hide password" : "Show password"} onClick={() => setShowPwd(s=>!s)}>
                  {showPwd ? <EyeOff size={17}/> : <Eye size={17}/>}
                </button>
              </div>
            </div>

            <div className="login-form-meta">
              <button type="button" className="login-forgot" onClick={() => navigate("/forgot-password")} onMouseEnter={e=>e.currentTarget.style.color="var(--primary-dark)"} onMouseLeave={e=>e.currentTarget.style.color="var(--primary)"}>
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              size="lg"
              className="login-submit"
              disabled={loading}
              onMouseEnter={e=>{ if(!loading){ e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 8px 28px rgba(54,92,200,0.2)"; }}}
              onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="none"; }}
            >
              {loading ? (
                <span className="login-loading-dots" aria-label="Signing in">
                  {[0,1,2].map(i=><span key={i} style={{ animationDelay:`${i*0.15}s` }} />)}
                </span>
              ) : <><LogIn size={17}/> Sign in</>}
            </Button>
          </form>

          <p className="login-copyright">© Natobotics {new Date().getFullYear()}. All rights reserved.</p>
        </div>
      </section>
    </main>
  );
};

export default Login;
