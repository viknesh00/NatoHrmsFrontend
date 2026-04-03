import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { getCookie } from "./Cookies";

export default function RoleBasedRedirect() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/dashboard"); }, [navigate]);
  return null;
}
