import { Navigate } from "react-router-dom";
import { getHomePath } from "./HomePath";

export default function RoleBasedRedirect() {
  return <Navigate to={getHomePath()} replace />;
}
