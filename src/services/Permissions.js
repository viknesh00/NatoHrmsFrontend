// Read / Write / Edit rights of the logged in user (Onboarding + Work Status).
// The API enforces them as well - this only decides what the UI shows.
import { useEffect, useState } from "react";
import { getRequest } from "./Apiservice";
import { getCookie } from "./Cookies";

const NONE = { read: false, write: false, edit: false };
export const NO_ACCESS = { role: "", isAdminOrManager: false, onboarding: NONE, workStatus: NONE };

let cached = null;
let cachedToken = null;

export const loadPermissions = () => {
  const token = getCookie("token");
  // a new login (different token) always reloads the rights
  if (!cached || cachedToken !== token) {
    cachedToken = token;
    cached = getRequest("Permissions/Mine")
      .then((res) => res.data)
      .catch((err) => { cached = null; throw err; });
  }
  return cached;
};

export const invalidatePermissions = () => { cached = null; };

// null while loading, then { role, isAdminOrManager, onboarding:{read,write,edit}, workStatus:{read,write,edit} }
export function usePermissions() {
  const [perms, setPerms] = useState(null);
  useEffect(() => {
    let alive = true;
    loadPermissions()
      .then((p) => alive && setPerms(p))
      .catch(() => alive && setPerms(NO_ACCESS));
    return () => { alive = false; };
  }, []);
  return perms;
}
