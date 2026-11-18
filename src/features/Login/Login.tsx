import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
import { cookieKeys } from "../../auth/Cookies";
import { postPublicRequest } from "../../shared/services/Apiservice";
import { cookieObj } from "../../models/cookieObj";
import { Eye, EyeOff } from "lucide-react";
import { getLoginRedirect } from "../../auth/Auth";
import AuthSectionOne from "@/components/ui/auth-section-1";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "./login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isToday = (dateStr) => dateStr && new Date(dateStr).toDateString() === new Date().toDateString();

  const handleLogin = (e: FormEvent<HTMLFormElement>) => {
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
    <AuthSectionOne
      headline="People, work, and progress in one clear view."
      description="Manage attendance, leave, and employee information in one workspace."
    >
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">
          <img src="/assets/images/natobotics-logo.png" alt="" width={36} height={36} />
          <span>Natobotics <strong>HRMS</strong></span>
        </div>

        <header className="login-intro">
          <h1 id="login-title">Welcome back</h1>
          <p>Sign in to your Natobotics workspace.</p>
        </header>

        <Button
          type="button"
          variant="outline"
          className="login-sso"
          aria-describedby="login-sso-status"
          disabled
        >
          <span className="login-microsoft-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>Sign in with Microsoft</span>
          <span id="login-sso-status" aria-hidden="true">Coming soon</span>
        </Button>

        <div className="login-divider">or use your email</div>

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
            />
          </div>

          <div className="login-field-group">
            <div className="login-password-label">
              <label htmlFor="login-password">Password</label>
              <Link to="/forgot-password" className="login-forgot">Forgot password?</Link>
            </div>
            <div className="login-password-wrap">
              <Input
                id="login-password"
                type={showPwd ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="login-input login-password-input"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                type="button"
                className="login-password-toggle"
                aria-label={showPwd ? "Hide password" : "Show password"}
                onClick={() => setShowPwd(show => !show)}
              >
                {showPwd ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </Button>
            </div>
          </div>

          <Button type="submit" size="lg" className="login-submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="login-copyright">© {new Date().getFullYear()} Natobotics.</p>
      </section>
    </AuthSectionOne>
  );
};

export default Login;
