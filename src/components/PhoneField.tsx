import { cn } from "cn";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
// Mobile number field with country-code dropdown (flag + dial code) and digits-only input.
// Uses the same fc-* look as the other shared form components.

// Mobile number field with country-code dropdown (flag + dial code) and digits-only input.
// Uses the same fc-* look as the other shared form components.
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";

// [ISO code, country name, dial code]
export const COUNTRIES = [
  ["IN", "India", "91"], ["GB", "United Kingdom", "44"], ["US", "United States", "1"], ["CA", "Canada", "1"],
  ["DE", "Germany", "49"], ["AE", "United Arab Emirates", "971"], ["SG", "Singapore", "65"], ["AU", "Australia", "61"],
  ["AF", "Afghanistan", "93"], ["AL", "Albania", "355"], ["DZ", "Algeria", "213"], ["AR", "Argentina", "54"],
  ["AM", "Armenia", "374"], ["AT", "Austria", "43"], ["AZ", "Azerbaijan", "994"], ["BH", "Bahrain", "973"],
  ["BD", "Bangladesh", "880"], ["BY", "Belarus", "375"], ["BE", "Belgium", "32"], ["BT", "Bhutan", "975"],
  ["BO", "Bolivia", "591"], ["BA", "Bosnia and Herzegovina", "387"], ["BR", "Brazil", "55"], ["BG", "Bulgaria", "359"],
  ["KH", "Cambodia", "855"], ["CM", "Cameroon", "237"], ["CL", "Chile", "56"], ["CN", "China", "86"],
  ["CO", "Colombia", "57"], ["CR", "Costa Rica", "506"], ["HR", "Croatia", "385"], ["CY", "Cyprus", "357"],
  ["CZ", "Czechia", "420"], ["DK", "Denmark", "45"], ["EC", "Ecuador", "593"], ["EG", "Egypt", "20"],
  ["EE", "Estonia", "372"], ["ET", "Ethiopia", "251"], ["FI", "Finland", "358"], ["FR", "France", "33"],
  ["GE", "Georgia", "995"], ["GH", "Ghana", "233"], ["GR", "Greece", "30"], ["HK", "Hong Kong", "852"],
  ["HU", "Hungary", "36"], ["IS", "Iceland", "354"], ["ID", "Indonesia", "62"], ["IR", "Iran", "98"],
  ["IQ", "Iraq", "964"], ["IE", "Ireland", "353"], ["IL", "Israel", "972"], ["IT", "Italy", "39"],
  ["JP", "Japan", "81"], ["JO", "Jordan", "962"], ["KZ", "Kazakhstan", "7"], ["KE", "Kenya", "254"],
  ["KW", "Kuwait", "965"], ["LV", "Latvia", "371"], ["LB", "Lebanon", "961"], ["LT", "Lithuania", "370"],
  ["LU", "Luxembourg", "352"], ["MY", "Malaysia", "60"], ["MV", "Maldives", "960"], ["MT", "Malta", "356"],
  ["MU", "Mauritius", "230"], ["MX", "Mexico", "52"], ["MA", "Morocco", "212"], ["MM", "Myanmar", "95"],
  ["NP", "Nepal", "977"], ["NL", "Netherlands", "31"], ["NZ", "New Zealand", "64"], ["NG", "Nigeria", "234"],
  ["NO", "Norway", "47"], ["OM", "Oman", "968"], ["PK", "Pakistan", "92"], ["PA", "Panama", "507"],
  ["PE", "Peru", "51"], ["PH", "Philippines", "63"], ["PL", "Poland", "48"], ["PT", "Portugal", "351"],
  ["QA", "Qatar", "974"], ["RO", "Romania", "40"], ["RU", "Russia", "7"], ["SA", "Saudi Arabia", "966"],
  ["RS", "Serbia", "381"], ["SK", "Slovakia", "421"], ["SI", "Slovenia", "386"], ["ZA", "South Africa", "27"],
  ["KR", "South Korea", "82"], ["ES", "Spain", "34"], ["LK", "Sri Lanka", "94"], ["SE", "Sweden", "46"],
  ["CH", "Switzerland", "41"], ["TW", "Taiwan", "886"], ["TZ", "Tanzania", "255"], ["TH", "Thailand", "66"],
  ["TR", "Türkiye", "90"], ["UG", "Uganda", "256"], ["UA", "Ukraine", "380"], ["UY", "Uruguay", "598"],
  ["UZ", "Uzbekistan", "998"], ["VE", "Venezuela", "58"], ["VN", "Vietnam", "84"], ["ZM", "Zambia", "260"],
  ["ZW", "Zimbabwe", "263"],
].map(([iso, name, dial]) => ({ iso, name, dial }));

export const findCountry = (iso) => COUNTRIES.find((c) => c.iso === iso) || COUNTRIES[0];

// Combine selected country + typed digits into "+91 9876543210"
export const buildPhone = (iso, number) => (number ? `+${findCountry(iso).dial} ${number}` : "");

// "+91 9876543210" -> { countryIso: "IN", number: "9876543210" }
export const parsePhone = (value) => {
  const m = /^\+(\d{1,4})[\s-]*(.*)$/.exec((value || "").trim());
  if (!m) return { countryIso: "DE", number: (value || "").replace(/\D/g, "") };
  const country = COUNTRIES.find((c) => c.dial === m[1]) || COUNTRIES[0];
  return { countryIso: country.iso, number: m[2].replace(/\D/g, "") };
};

const flagUrl = (iso) => `https://flagcdn.com/w40/${iso.toLowerCase()}.png`;

const Flag = ({ iso }: Record<string, any>) => (
  <img src={flagUrl(iso)} alt="" width={22} height={16} loading="lazy"
    className="w-[22px] h-[16px] shrink-[0]" style={{objectFit: "cover", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)"}} />
);

export default function PhoneField({ label, required, hint, error, countryIso, number, onChange, placeholder = "Mobile number" }: Record<string, any>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);
  const id = React.useId();

  const country = findCountry(countryIso);
  const maxDigits = Math.max(15 - country.dial.length, 4); // E.164: total digits <= 15

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const q = query.trim().toLowerCase().replace(/^\+/, "");
  const list = !q ? COUNTRIES : COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(q) || c.dial.startsWith(q) || c.iso.toLowerCase() === q);

  const pick = (c) => {
    onChange({ countryIso: c.iso, number: number.slice(0, Math.max(15 - c.dial.length, 4)) });
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="fc-group" ref={ref}>
      {label && <label htmlFor={id} className="fc-label">{label}{required && <span className="req">*</span>}</label>}
      <div className="flex gap-[8px] relative" >
        <Button variant="ghost"
          type="button"
          className={cn("fc-input", "w-[auto] min-w-[112px] flex items-center gap-[8px] cursor-pointer p-[12px_12px_12px_12px] shrink-[0]")}
          onClick={() => setOpen((o) => !o)}
          aria-label={`${label || "Phone"} country code`}
          aria-haspopup="listbox"
          aria-expanded={open}
          style={{...(open ? { borderColor: "var(--primary)", boxShadow: "0 0 0 3px var(--primary-ghost)", background: "var(--card)" } : {})}}
        >
          <Flag iso={country.iso} />
          <span className="font-semibold" >+{country.dial}</span>
          <ChevronDown size={15} className="ml-[auto] text-[var(--text-muted)]"  />
        </Button>

        <Input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          className={cn("fc-input", "min-w-[0px]")}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={number}
          placeholder={placeholder}
          maxLength={maxDigits}
          onChange={(e) => onChange({ countryIso, number: e.target.value.replace(/\D/g, "").slice(0, maxDigits) })}
          onKeyDown={(e) => {
            // block letters / symbols while typing; keep navigation, editing and shortcuts working
            if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, maxDigits);
            onChange({ countryIso, number: digits });
          }}
          style={{flex: 1}}
        />

        {open && (
          <div role="listbox" className="absolute top-[calc(100%_+_6px)] left-[0px] bg-card z-[600] overflow-hidden" style={{width: "min(340px, 100%)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)"}}>
            <div className="p-[8px] relative" style={{borderBottom: "1px solid var(--border)"}}>
              <Search size={14} className="absolute left-[18px] top-[19px] text-[var(--text-muted)]"  />
              <Input
                autoFocus
                className={cn("fc-input", "pl-[32px]")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
                placeholder="Search country or code"
                
              />
            </div>
            <div className="max-h-[250px] overflow-y-auto" >
              {list.length === 0 && <div className="p-[12px_16px] text-[13px] text-[var(--text-muted)]" >No country found</div>}
              {list.map((c) => (
                <div
                  key={c.iso}
                  role="option"
                  tabIndex={0}
                  onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); pick(c); } }}
                  aria-selected={c.iso === country.iso}
                  onClick={() => pick(c)}
                  className="flex items-center gap-[12px] p-[8px_16px] cursor-pointer text-[14px]" style={{background: c.iso === country.iso ? "var(--primary-ghost)" : "transparent"}}
                  onMouseEnter={(e) => { if (c.iso !== country.iso) e.currentTarget.style.background = "var(--bg)"; }}
                  onMouseLeave={(e) => { if (c.iso !== country.iso) e.currentTarget.style.background = "transparent"; }}
                >
                  <Flag iso={c.iso} />
                  <span className="text-[var(--text-primary)]" style={{flex: 1}}>{c.name}</span>
                  <span className="text-[var(--text-secondary)] font-semibold" >+{c.dial}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && <div id={`${id}-help`} className="fc-error">{error}</div>}
      {hint && !error && <div id={`${id}-help`} className="fc-hint">{hint}</div>}
    </div>
  );
}
