import { useEffect, useMemo, useState } from "react";
import { AtSign, BriefcaseBusiness, Building2, Check, Copy, Download, ExternalLink, Link2, Mail, MapPin, Phone, QrCode, Share2, UserRound } from "lucide-react";
import { Button } from "../../components/ui/button";
import ProfileAvatar from "../../components/ProfileAvatar";
import { getCookie } from "../../auth/Cookies";
import { getRequest } from "../../shared/services/Apiservice";
import Breadcrumb from "../../shared/services/Breadcrumb";
import LoadingMask from "../../shared/services/LoadingMask";

type EmployeeProfile = Record<string, any>;

const valueOr = (value: unknown, fallback = "Not provided") => String(value ?? "").trim() || fallback;
const escapeVCard = (value: unknown) => String(value ?? "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

export default function VCard() {
  const email = getCookie("email") || "";
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    getRequest(`User/GetUser/${email}`)
      .then((response) => { if (active && response.data?.length) setProfile(response.data[0]); })
      .catch((error) => console.error("Failed to load vCard profile:", error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [email]);

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || getCookie("firstName") || "Your name";
  const title = [profile?.designation, profile?.department].filter(Boolean).join(" · ");
  const initials = `${profile?.firstName?.[0] || ""}${profile?.lastName?.[0] || ""}`.toUpperCase() || "NA";
  const contactLines = useMemo(() => [
    { label: "Work email", value: profile?.email || email, icon: Mail, href: `mailto:${profile?.email || email}` },
    { label: "Phone", value: profile?.contactNumber, icon: Phone, href: profile?.contactNumber ? `tel:${profile.contactNumber}` : "" },
    { label: "Location", value: profile?.workLocation || [profile?.city, profile?.country].filter(Boolean).join(", "), icon: MapPin, href: "" },
    { label: "Department", value: profile?.department, icon: Building2, href: "" },
  ].filter((item) => item.value), [profile, email]);

  const createVcf = () => {
    const first = profile?.firstName || fullName.split(" ")[0] || "";
    const last = profile?.lastName || fullName.split(" ").slice(1).join(" ");
    return [
      "BEGIN:VCARD", "VERSION:3.0",
      `N:${escapeVCard(last)};${escapeVCard(first)};;;`,
      `FN:${escapeVCard(fullName)}`,
      title && `TITLE:${escapeVCard(title)}`,
      profile?.department && `ORG:${escapeVCard(profile.department)}`,
      (profile?.email || email) && `EMAIL;TYPE=WORK:${escapeVCard(profile?.email || email)}`,
      profile?.contactNumber && `TEL;TYPE=WORK,VOICE:${escapeVCard(profile.contactNumber)}`,
      profile?.workLocation && `ADR;TYPE=WORK:;;${escapeVCard(profile.workLocation)};;;;`,
      "END:VCARD",
    ].filter(Boolean).join("\r\n");
  };

  const downloadContact = () => {
    const file = new Blob([createVcf()], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${fullName.trim().replace(/\s+/g, "-") || "contact"}.vcf`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Contact card downloaded");
  };

  const copyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("Profile link copied");
    } catch {
      setNotice("Copy is unavailable in this browser");
    }
  };

  const shareCard = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `${fullName} · Contact card`, text: title || "My contact card", url: window.location.href }); }
      catch (error) { if ((error as Error).name !== "AbortError") setNotice("Could not share this card"); }
      return;
    }
    await copyProfileLink();
  };

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (loading) return <LoadingMask loading />;

  return (
    <main className="vcard-page">
      <div className="page-header vcard-page-header">
        <div>
          <Breadcrumb icon={<ContactRoundIcon />} items={[{ label: "Digital Business Card" }]} />
          <h1 className="page-title">My digital business card</h1>
          <p className="page-subtitle">A polished, shareable introduction to you and your work.</p>
        </div>
        <div className="vcard-page-actions">
          <Button type="button" variant="outline" onClick={shareCard}><Share2 size={16} /> Share card</Button>
          <Button type="button" onClick={downloadContact}><Download size={16} /> Save contact</Button>
        </div>
      </div>

      <div className="vcard-layout">
        <section className="vcard-preview-column" aria-label="Digital contact card preview">
          <article className="vcard-preview">
            <div className="vcard-cover">
              <div className="vcard-cover-grid" aria-hidden="true" />
              <span className="vcard-brand-mark"><img src="/assets/images/natobotics-logo.png" alt="Natobotics" /> <span>NATOBOTICS</span></span>
              <span className="vcard-card-label">DIGITAL CONTACT CARD</span>
            </div>
            <div className="vcard-main">
              <ProfileAvatar seed={profile?.email || email} initials={initials} className="vcard-avatar" />
              <span className="vcard-availability"><i /> Team member</span>
              <h2>{fullName}</h2>
              <p className="vcard-title">{title || "Your role and team"}</p>
              <div className="vcard-divider" />
              <div className="vcard-quick-actions">
                <a href={`mailto:${profile?.email || email}`} aria-label="Email"><Mail size={17} /></a>
                {profile?.contactNumber && <a href={`tel:${profile.contactNumber}`} aria-label="Call"><Phone size={17} /></a>}
                {profile?.linkedIn && <a href={profile.linkedIn} target="_blank" rel="noreferrer" aria-label="LinkedIn"><Link2 size={17} /></a>}
                <button type="button" onClick={copyProfileLink} aria-label="Copy profile link"><Copy size={17} /></button>
              </div>
              <Button className="vcard-save-button" type="button" onClick={downloadContact}><Download size={16} /> Add to contacts</Button>
            </div>
            <div className="vcard-card-foot"><span>Designed for meaningful connections</span><QrCode size={18} aria-hidden="true" /></div>
          </article>
          <p className="vcard-preview-caption"><span><Check size={14} /> Live preview</span><span>Details stay in sync with your HR profile</span></p>
        </section>

        <section className="vcard-details-column" aria-label="Contact details">
          <div className="vcard-details-card">
            <div className="vcard-details-heading">
              <span className="vcard-details-icon"><UserRound size={18} /></span>
              <div><h2>Contact details</h2><p>Information shown on your card</p></div>
            </div>
            <div className="vcard-contact-list">
              {contactLines.map(({ label, value, icon: Icon, href }) => (
                <div className="vcard-contact-row" key={label}>
                  <span className="vcard-contact-icon"><Icon size={17} /></span>
                  <div className="vcard-contact-copy"><span>{label}</span>{href ? <a href={href}>{value}<ExternalLink size={12} aria-hidden="true" /></a> : <strong>{value}</strong>}</div>
                </div>
              ))}
              {!contactLines.length && <div className="vcard-no-details">Add your contact information to your profile to show it here.</div>}
            </div>
            <div className="vcard-details-footer">
              <span><BriefcaseBusiness size={15} /> {valueOr(profile?.employeeId, "Employee")}</span>
              <span><AtSign size={15} /> {valueOr(profile?.accessRole, "HRMS member")}</span>
            </div>
          </div>
          <div className="vcard-tip"><span className="vcard-tip-icon"><Share2 size={17} /></span><p><strong>Ready to connect?</strong><br />Share your card or save it to any phone’s contacts in one tap.</p></div>
          <Button className="vcard-copy-link" type="button" variant="outline" onClick={copyProfileLink}><Copy size={15} /> Copy profile link</Button>
        </section>
      </div>
      {notice && <div role="status" className="vcard-toast"><Check size={15} /> {notice}</div>}
    </main>
  );
}

function ContactRoundIcon() {
  return <UserRound size={14} aria-hidden="true" />;
}
