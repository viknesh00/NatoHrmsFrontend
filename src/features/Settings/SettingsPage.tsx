import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ExternalLink, GitFork, KeyRound, LoaderCircle, Moon, Sun, UserRound, ShieldCheck, FileText, Scale, CircleHelp, SlidersHorizontal, LayoutDashboard, ArrowRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import ProfileAvatar from "../../components/ProfileAvatar";
import PasswordChange from "../../shared/services/PasswordChange";
import Breadcrumb from "../../shared/services/Breadcrumb";
import { getCookie } from "../../auth/Cookies";
import { useTheme } from "../../theme/ThemeProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

type GitHubContributor = { login: string; avatar_url: string; html_url: string; contributions: number };
let contributorCache: GitHubContributor[] | null = null;

function ContributorList() {
  const [contributors, setContributors] = useState<GitHubContributor[] | null>(() => contributorCache);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (contributorCache) return;
    const controller = new AbortController();
    fetch("https://api.github.com/repos/viknesh00/NatoHrmsFrontend/contributors?per_page=5", {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    }).then((response) => {
      if (!response.ok) throw new Error("GitHub contributors are unavailable");
      return response.json();
    }).then((data) => {
      if (!Array.isArray(data)) throw new Error("Unexpected GitHub response");
      contributorCache = data.filter((entry) => entry?.login && entry?.html_url).slice(0, 5);
      setContributors(contributorCache);
    }).catch((fetchError) => {
      if (fetchError?.name !== "AbortError") setError(true);
    });
    return () => controller.abort();
  }, []);

  return (
    <section className="settings-section settings-contributors" aria-labelledby="contributors-title">
      <div className="settings-section-heading">
        <span className="settings-section-icon"><GitFork size={17} aria-hidden="true" /></span>
        <div><h2 id="contributors-title">Project contributors</h2><p>Contributor data from the public GitHub repository</p></div>
        <a className="settings-repository-link" href="https://github.com/viknesh00/NatoHrmsFrontend/graphs/contributors" target="_blank" rel="noreferrer" aria-label="Open the repository contributors graph">
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      </div>
      {contributors ? (
        contributors.length ? <ul className="settings-contributor-list" aria-label="Top GitHub contributors">
          {contributors.map((contributor) => (
            <li key={contributor.login}>
              <img src={contributor.avatar_url} alt="" loading="lazy" />
              <a href={contributor.html_url} target="_blank" rel="noreferrer">{contributor.login}</a>
              <span>{contributor.contributions} contributions</span>
            </li>
          ))}
        </ul> : <p className="settings-contributors-status">No public contributors were returned by GitHub.</p>
      ) : error ? (
        <p className="settings-contributors-status" role="status">Contributor information is temporarily unavailable. <a href="https://github.com/viknesh00/NatoHrmsFrontend/graphs/contributors" target="_blank" rel="noreferrer">Open GitHub contributors</a>.</p>
      ) : (
        <p className="settings-contributors-status" role="status"><LoaderCircle className="settings-loading-icon" size={15} aria-hidden="true" /> Loading contributors from GitHub…</p>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const firstName = getCookie("firstName") || "";
  const lastName = getCookie("lastName") || "";
  const email = getCookie("email") || "";
  const role = getCookie("role") || "Employee";

  return (
    <main className="settings-page">
      <div className="page-header">
        <div>
          <Breadcrumb icon={<UserRound size={14} aria-hidden="true" />} items={[{ label: "Settings" }]} />
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your profile, sign-in, appearance, and workspace information.</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="settings-tabs">
        <TabsList className="settings-tabs-list" aria-label="Settings sections">
          <TabsTrigger value="overview"><LayoutDashboard size={15} /> Overview</TabsTrigger>
          <TabsTrigger value="profile"><UserRound size={15} /> Profile</TabsTrigger>
          <TabsTrigger value="appearance"><SlidersHorizontal size={15} /> Appearance</TabsTrigger>
          <TabsTrigger value="trust"><ShieldCheck size={15} /> Trust &amp; Policies</TabsTrigger>
          <TabsTrigger value="contributors"><GitFork size={15} /> Contributors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="settings-tab-panel">
          <section className="settings-overview-card" aria-labelledby="settings-overview-title">
            <div className="settings-overview-heading">
              <span className="settings-section-icon"><LayoutDashboard size={18} aria-hidden="true" /></span>
              <div><h2 id="settings-overview-title">Workspace settings</h2><p>Quick access to your account, appearance, support, and policies.</p></div>
            </div>
            <div className="settings-overview-summary">
              <div><span>Signed in as</span><strong>{[firstName, lastName].filter(Boolean).join(" ") || email || "Workspace user"}</strong><small>{role}</small></div>
              <div><span>Appearance</span><strong>{theme === "dark" ? "Dark theme" : "Light theme"}</strong><small>Saved for this browser</small></div>
              <div><span>Workspace owner</span><strong>NCons / Natobotics Technology</strong><small>HRMS workspace</small></div>
            </div>
            <div className="settings-overview-links">
              <Link to="/help-center">Help Center <ArrowRight size={15} /></Link>
              <Link to="/standards">Trust &amp; Policies <ArrowRight size={15} /></Link>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="profile" className="settings-tab-panel">
          <section className="settings-profile-card" aria-labelledby="settings-profile-title">
            <ProfileAvatar seed={email} initials={`${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase()} className="settings-page-avatar" />
            <div className="settings-profile-copy">
              <h2 id="settings-profile-title">{[firstName, lastName].filter(Boolean).join(" ") || "Your profile"}</h2>
              <p>{email || "Signed-in account"}</p>
              <span className="settings-role-label">{role}</span>
            </div>
            <div className="settings-profile-actions">
              <Button variant="outline" asChild><Link to="/view-employee"><UserRound size={15} /> View profile</Link></Button>
              <Button variant="outline" onClick={() => setShowPassword(true)}><KeyRound size={15} /> Change password</Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="appearance" className="settings-tab-panel">
          <section className="card settings-section" aria-labelledby="appearance-title">
            <div className="settings-section-heading">
              <span className="settings-section-icon">{theme === "dark" ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}</span>
              <div><h2 id="appearance-title">Appearance</h2><p>Choose a theme for this browser</p></div>
            </div>
            <div className="settings-appearance-row">
              <div><strong>{theme === "dark" ? "Dark theme" : "Light theme"}</strong><span>Stored locally for this browser</span></div>
              <Button variant="outline" onClick={toggleTheme}>{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}{theme === "dark" ? "Use light" : "Use dark"}</Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="trust" className="settings-tab-panel">
          <section className="card settings-section" aria-labelledby="organization-title">
            <div className="settings-section-heading">
              <span className="settings-section-icon"><Building2 size={17} aria-hidden="true" /></span>
              <div><h2 id="organization-title">Organization &amp; standards</h2><p>Workspace owner and reference material</p></div>
            </div>
            <div className="settings-owner"><strong>NCons / Natobotics Technology</strong><span>HRMS workspace owner</span></div>
            <div className="settings-standard-tags" aria-label="Standards and integration references">
              <span>ISO/IEC</span><span>IEEE</span><span>SAP</span><span>Corporate policy</span>
            </div>
            <nav className="settings-link-list" aria-label="Trust, policy, and help pages">
              <Link to="/privacy-policy"><FileText size={15} /> Privacy policy</Link>
              <Link to="/terms"><Scale size={15} /> Terms of use</Link>
              <Link to="/standards"><ShieldCheck size={15} /> Standards &amp; integrations</Link>
              <Link to="/help-center"><CircleHelp size={15} /> Help Center</Link>
            </nav>
          </section>
        </TabsContent>

        <TabsContent value="contributors" className="settings-tab-panel" forceMount>
          <ContributorList />
        </TabsContent>
      </Tabs>

      {showPassword && <PasswordChange isManualChange onSuccess={() => setShowPassword(false)} onClose={() => setShowPassword(false)} />}
    </main>
  );
}
