export const getCookie = (name: string): string => {
  const prefix = `${encodeURIComponent(name)}=`;
  const item = document.cookie.split(";").map(value => value.trim()).find(value => value.startsWith(prefix));
  if (!item) return "";
  try { return decodeURIComponent(item.slice(prefix.length)); } catch { return ""; }
};

export const setCookie = (name: string, value: string | number | boolean | Date, expires?: string | number | Date): void => {
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(String(value))};path=/;SameSite=Lax;`;
  if (expires) cookie += `expires=${new Date(expires).toUTCString()};`;
  if (window.location.protocol === "https:") cookie += "Secure;";
  document.cookie = cookie;
};

export const cookieKeys = (user: Record<string, string | number | boolean>, expires?: string | number | Date): void => {
  Object.entries(user).forEach(([name, value]) => setCookie(name, value, expires));
};
