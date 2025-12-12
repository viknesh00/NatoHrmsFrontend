export const getCookie = (cname) => {
  const name = cname + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1);
    if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
  }
  return "";
};

export const setCookie = (name, value, expires) => {
  let cookieData = `${encodeURI(name)}=${encodeURI(value)};`;

  if (expires) {
    const d = new Date(expires);
    cookieData += `expires=${d.toGMTString()};`;
  }

  cookieData += "path=/;";
  document.cookie = cookieData;
};

export const cookieKeys = (user, time) => {
  const userList = Object.keys(user);
  userList.forEach((item) => {
    setCookie(item, user[item], time);
  });
  console.log("Cookies set:", userList);
};
