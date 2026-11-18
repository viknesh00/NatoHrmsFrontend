import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, ExternalLink, GitFork, KeyRound, LoaderCircle, Moon, Sun, Settings, ShieldCheck, FileText, Scale, CircleHelp, SlidersHorizontal } from "lucide-react";
import { Button } from "../../components/ui/button";
import PasswordChange from "../../shared/services/PasswordChange";
import Breadcrumb from "../../shared/services/Breadcrumb";
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

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <Breadcrumb icon={<Settings size={14} aria-hidden="true" />} items={[{ label: "Settings" }]} />
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage sign-in security, appearance, and workspace preferences.</p>
        </div>
      </div>

      <Tabs defaultValue="security" className="settings-tabs">
        <TabsList className="settings-tabs-list" aria-label="Settings sections">
          <TabsTrigger value="security"><KeyRound size={15} /> Security</TabsTrigger>
          <TabsTrigger value="appearance"><SlidersHorizontal size={15} /> Appearance</TabsTrigger>
          <TabsTrigger value="trust"><ShieldCheck size={15} /> Trust &amp; Policies</TabsTrigger>
          <TabsTrigger value="contributors"><GitFork size={15} /> Contributors</TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="settings-tab-panel">
          <section className="card settings-section" aria-labelledby="security-title">
            <div className="settings-section-heading">
              <span className="settings-section-icon"><KeyRound size={17} aria-hidden="true" /></span>
              <div><h2 id="security-title">Sign-in security</h2></div>
            </div>
            <div className="settings-control-row">
              <div><strong>Password</strong><span>Update the password for your HRMS account.</span></div>
              <Button variant="outline" onClick={() => setShowPassword(true)}>Change password</Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="appearance" className="settings-tab-panel">
          <section className="card settings-section" aria-labelledby="appearance-title">
            <div className="settings-section-heading">
              <span className="settings-section-icon">{theme === "dark" ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}</span>
              <div><h2 id="appearance-title">Appearance</h2><p>Choose a theme for this browser</p></div>
            </div>
            <div className="settings-control-row">
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

        <TabsContent value="contributors" className="settings-tab-panel">
          <ContributorList />
        </TabsContent>
      </Tabs>

      {showPassword && <PasswordChange isManualChange onSuccess={() => setShowPassword(false)} onClose={() => setShowPassword(false)} />}
    </div>
  );
}
