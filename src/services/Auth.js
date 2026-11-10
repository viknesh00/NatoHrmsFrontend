import { cookieKeys, getCookie } from "./Cookies";
import { cookieObj } from "../models/cookieObj";
import { getHomePath } from "./HomePath";

export const isAuthenticated = () =>
  getCookie("isLoggedIn") === "true" && Boolean(getCookie("token").trim());

export const clearSession = () => cookieKeys(cookieObj, new Date(0));

// Only resume internal application URLs, never auth pages or external URLs.
export const getLoginRedirect = (from) => {
  const pathname = from?.pathname;
  if (
    typeof pathname !== "string" ||
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname.includes("\\") ||
    /^\/(?:login|sign-in|forgot-password)?\/?$/i.test(pathname)
  ) {
    return getHomePath();
  }
  return `${pathname}${from.search || ""}${from.hash || ""}`;
};
