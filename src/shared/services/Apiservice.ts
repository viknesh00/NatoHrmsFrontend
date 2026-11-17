import axios, { type AxiosRequestConfig } from "axios";
import { getCookie } from "../../auth/Cookies";
import { clearSession } from "../../auth/Auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Helper to add Bearer token header
function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export const getRequest = async (endpoint: string, config: AxiosRequestConfig | null = {}, isBlob = false) => {
  const token = getCookie("token");
  const url = `${BASE_URL}${endpoint}`;

  const safeConfig = config || {};   // Prevent null-config crashes.

  try {
    const options = {
      ...safeConfig,
      responseType: isBlob ? "blob" as const : "json" as const,
      headers: {
        ...(token && getHeaders(token)),
        ...(safeConfig.headers || {}),
      },
    };

    return await axios.get(url, options);
  } catch (error) {
    if (error.response?.status === 401) {
      clearSession();
      window.location.replace("/login");
    }
    throw error;
  }
};




export const postRequest = async (endpoint: string, data: unknown, isBlob: boolean | AxiosRequestConfig = false) => {
  const token = getCookie("token");
  const url = `${BASE_URL}${endpoint}`;

  try {
    const options = {
      responseType: isBlob ? "blob" as const : "json" as const,
      headers: {
        ...(token && getHeaders(token)),
      },
    };

    return await axios.post(url, data, options);
  } catch (error) {
    if (error.response?.status === 401) {
      clearSession();
      window.location.replace("/login");
    }
    throw error;
  }
};


export const putRequest = async (endpoint: string, data: unknown) => {
  const token = getCookie("token");
  const url = `${BASE_URL}${endpoint}`;
  const options = token ? { headers: getHeaders(token) } : {};

  try {
    return await axios.put(url, data, options);
  } catch (error) {
    if (error.response?.status === 401) {
      clearSession();
      window.location.replace("/login");
    }
    throw error;
  }
};

export const deleteRequest = async (endpoint: string) => {
  const token = getCookie("token");
  const url = `${BASE_URL}${endpoint}`;
  const options = token ? { headers: getHeaders(token) } : {};

  try {
    return await axios.delete(url, options);
  } catch (error) {
    if (error.response?.status === 401) {
      clearSession();
      window.location.replace("/login");
    }
    throw error;
  }
};

// Public (unauthenticated) POST - never sends a token and never redirects to sign-in
export const postPublicRequest = async (endpoint: string, data: unknown) => {
  const url = `${BASE_URL}${endpoint}`;
  return await axios.post(url, data);
};
