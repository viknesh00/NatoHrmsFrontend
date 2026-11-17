import React from "react";
import { FormInput } from "./FormComponents";

export default function PasswordField(props) {
  return <FormInput type="password" autoComplete="current-password" {...props} />;
}
