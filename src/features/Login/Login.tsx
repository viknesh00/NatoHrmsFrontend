import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ToastError, ToastSuccess } from "../../shared/services/ToastMsg";
import { cookieKeys } from "../../auth/Cookies";
import { postPublicRequest } from "../../shared/services/Apiservice";
import { cookieObj } from "../../models/cookieObj";
import { Eye, EyeOff, LogIn, Users, Clock3, ClipboardList, Sparkles, CalendarCheck2, ChevronLeft, ChevronRight, BriefcaseBusiness, ChartNoAxesCombined, UserRound, UserRoundCheck } from "lucide-react";
import { getLoginRedirect } from "../../auth/Auth";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const LOGIN_FEATURES = [
  { eyebrow: "PEOPLE & ONBOARDING", title: "Bring every employee journey together.", description: "Keep employee records, onboarding steps, and team structure connected.", icon: Users },
  { eyebrow: "ATTENDANCE & LEAVE", title: "Make each workday easier to follow.", description: "See clock events, attendance, leave, and shared calendar updates in one place.", icon: CalendarCheck2 },
  { eyebrow: "WORK STATUS & REPORTS", title: "Turn daily updates into shared visibility.", description: "Bring work status, activities, assets, and comments into clear team reports.", icon: ChartNoAxesCombined },
];

const TEAM_REFLECTIONS = [
  { name: "Chandru", quote: "Clear people processes make room for better work." },
  { name: "Kiruban", quote: "Good tools help teams stay connected through the day." },
  { name: "Senthil", quote: "A shared view makes everyday coordination simpler." },
  { name: "Justin", quote: "Small, clear updates help everyone move forward." },
];

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [featureIndex, setFeatureIndex] = useState(0);
  const [reflectionIndex, setReflectionIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const activeFeature = LOGIN_FEATURES[featureIndex];
  const FeatureIcon = activeFeature.icon;

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const featureTimer = window.setInterval(() => setFeatureIndex(index => (index + 1) % LOGIN_FEATURES.length), 6500);
    const reflectionTimer = window.setInterval(() => setReflectionIndex(index => (index + 1) % TEAM_REFLECTIONS.length), 9000);
    return () => {
      window.clearInterval(featureTimer);
      window.clearInterval(reflectionTimer);
    };
  }, []);

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
            <h1>People, work, and progress in one clear view.</h1>
            <p>Natobotics HRMS brings everyday people operations together in a calm, connected workspace.</p>
          </div>

          <div className="login-feature-stage">
            <div className="login-sankey" role="img" aria-label="People and team information connects to attendance, leave and events, work status, and team reporting">
              <svg viewBox="0 0 600 180" className="login-sankey-lines" aria-hidden="true" preserveAspectRatio="none">
                <path d="M125 42 C210 42 190 48 270 48 S350 36 430 36" />
                <path d="M125 42 C210 42 190 91 270 91 S350 82 430 82" />
                <path d="M125 42 C210 42 190 136 270 136 S350 130 430 130" />
                <path d="M125 91 C210 91 190 48 270 48 S350 36 430 36" />
                <path d="M125 91 C210 91 190 91 270 91 S350 82 430 82" />
                <path d="M125 136 C210 136 190 136 270 136 S350 130 430 130" />
              </svg>
              <div className="login-sankey-column login-sankey-sources">
                <div><UserRound size={15} /><span>People</span></div>
                <div><UserRoundCheck size={15} /><span>Teams</span></div>
                <div><BriefcaseBusiness size={15} /><span>Work</span></div>
              </div>
              <div className="login-sankey-column login-sankey-workflows">
                <div><Clock3 size={15} /><span>Attendance</span></div>
                <div><CalendarCheck2 size={15} /><span>Leave &amp; events</span></div>
                <div><ClipboardList size={15} /><span>Work status</span></div>
              </div>
              <div className="login-sankey-column login-sankey-outcomes">
                <div><ChartNoAxesCombined size={15} /><span>Team reports</span></div>
                <div><Users size={15} /><span>Shared visibility</span></div>
                <div><Sparkles size={15} /><span>Clear next steps</span></div>
              </div>
            </div>

            <article className="login-feature-card" aria-live="off">
              <span className="login-feature-icon"><FeatureIcon size={19} aria-hidden="true" /></span>
              <div className="login-feature-copy">
                <span className="login-feature-eyebrow">{activeFeature.eyebrow}</span>
                <h2>{activeFeature.title}</h2>
                <p>{activeFeature.description}</p>
              </div>
              <div className="login-feature-controls" aria-label="Feature carousel controls">
                <button type="button" aria-label="Previous feature" onClick={() => setFeatureIndex(i => (i + LOGIN_FEATURES.length - 1) % LOGIN_FEATURES.length)}><ChevronLeft size={16} /></button>
                <span>{featureIndex + 1}<i>/</i>{LOGIN_FEATURES.length}</span>
                <button type="button" aria-label="Next feature" onClick={() => setFeatureIndex(i => (i + 1) % LOGIN_FEATURES.length)}><ChevronRight size={16} /></button>
              </div>
            </article>

          </div>

          <div className="login-story-footer">
            <span><span className="login-status-dot" /> A clearer way to work, together.</span>
            <span>Natobotics HRMS</span>
          </div>
        </div>
      </section>

      <section className="login-panel" aria-label="Sign in">
        <aside className="login-team-reflection login-team-reflection-top" aria-live="off">
          <div className="login-reflection-meta"><strong>{TEAM_REFLECTIONS[reflectionIndex].name}</strong><span>TEAM REFLECTION</span></div>
          <p>“{TEAM_REFLECTIONS[reflectionIndex].quote}”</p>
        </aside>
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
                onFocus={e=>{e.target.style.borderColor="var(--primary)";e.target.style.boxShadow="0 0 0 3px var(--primary-ghost)";e.target.style.background="var(--card)";}}
                onBlur={e=>{e.target.style.borderColor="var(--border)";e.target.style.boxShadow="none";e.target.style.background="var(--muted)";}}
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
                  onFocus={e=>{e.target.style.borderColor="var(--primary)";e.target.style.boxShadow="0 0 0 3px var(--primary-ghost)";e.target.style.background="var(--card)";}}
                  onBlur={e=>{e.target.style.borderColor="var(--border)";e.target.style.boxShadow="none";e.target.style.background="var(--muted)";}}
                />
                <Button variant="ghost" type="button" className="login-password-toggle" aria-label={showPwd ? "Hide password" : "Show password"} onClick={() => setShowPwd(s=>!s)}>
                  {showPwd ? <EyeOff size={17}/> : <Eye size={17}/>}
                </Button>
              </div>
            </div>

            <div className="login-form-meta">
              <Button variant="ghost" type="button" className="login-forgot" onClick={() => navigate("/forgot-password")} onMouseEnter={e=>e.currentTarget.style.color="var(--primary-dark)"} onMouseLeave={e=>e.currentTarget.style.color="var(--primary)"}>
                Forgot password?
              </Button>
            </div>

            <Button
              type="submit"
              size="lg"
              className="login-submit"
              disabled={loading}
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
