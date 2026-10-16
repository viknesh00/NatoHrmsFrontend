import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { getHomePath } from "./HomePath";

export default function RoleBasedRedirect() {
  const navigate = useNavigate();
  useEffect(() => { navigate(getHomePath()); }, [navigate]);
  return null;
}
