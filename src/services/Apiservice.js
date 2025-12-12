import axios from "axios";
import { getCookie } from "./Cookies";
import { cookieKeys } from "./Cookies";
import { cookieObj } from "../models/cookieObj";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Helper to add Bearer token header
function getHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export const getRequest = async (endpoint) => {
  const token = getCookie("token");
  const url = `${BASE_URL}${endpoint}`;

  try {
    const options = token ? { headers: getHeaders(token) } : {};
    return await axios.get(url, options);
  } catch (error) {
    if (error.response?.status === 401) {
      cookieKeys(cookieObj, 0);
      window.location.href = "/sign-in";
    }
    throw error;
  }
};

export const postRequest = async (endpoint, data, isBlob = false) => {
  const token = getCookie("token");
  const url = `${BASE_URL}${endpoint}`;
  const options = token ? { headers: getHeaders(token) } : {};

  if (isBlob) options.responseType = "blob";

  try {
    return await axios.post(url, data, options);
  } catch (error) {
    if (error.response?.status === 401) {
      cookieKeys(cookieObj, 0);
      window.location.href = "/sign-in";
    }
    throw error;
  }
};

export const putRequest = async (endpoint, data) => {
  const token = getCookie("token");
  const url = `${BASE_URL}${endpoint}`;
  const options = token ? { headers: getHeaders(token) } : {};

  try {
    return await axios.put(url, data, options);
  } catch (error) {
    if (error.response?.status === 401) {
      cookieKeys(cookieObj, 0);
      window.location.href = "/sign-in";
    }
    throw error;
  }
};

export const deleteRequest = async (endpoint) => {
  const token = getCookie("token");
  const url = `${BASE_URL}${endpoint}`;
  const options = token ? { headers: getHeaders(token) } : {};

  try {
    return await axios.delete(url, options);
  } catch (error) {
    if (error.response?.status === 401) {
      cookieKeys(cookieObj, 0);
      window.location.href = "/sign-in";
    }
    throw error;
  }
};
