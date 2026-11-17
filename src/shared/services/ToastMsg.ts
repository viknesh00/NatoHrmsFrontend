import { toast } from "../../components/ui/toast";

function eventTitle(message: string, type: "success" | "error" | "warning" | "info") {
  const text = message.toLowerCase().replace(/[-_]/g, " ");
  if (/clock(?:ed|ing)?\s*in/.test(text)) return type === "success" ? "Clock-in recorded" : "Clock-in needs attention";
  if (/clock(?:ed|ing)?\s*out/.test(text)) return type === "success" ? "Clock-out recorded" : "Clock-out needs attention";
  if (/delete|removed/.test(text)) return type === "success" ? "Item removed" : "Could not remove item";
  if (/save|submit|create|add/.test(text)) return type === "success" ? "Changes saved" : "Could not save changes";
  if (/update|edit|change|reset|approve/.test(text)) return type === "success" ? "Update complete" : "Update needs attention";
  if (/download|export|copied/.test(text)) return type === "success" ? "Ready" : "Could not complete action";
  return { success: "Success", error: "Something went wrong", warning: "Please review", info: "Information" }[type];
}

function showEventToast(msg: string, type: "success" | "error" | "warning" | "info") {
  const description = String(msg ?? "");
  toast.add({ title: eventTitle(description, type), description, type });
}

export const ToastSuccess = (msg = "") => {
  showEventToast(msg, "success");
};
export const ToastError = (msg = "") => {
  showEventToast(msg, "error");
};
export const ToastWarning = (msg = "") => showEventToast(msg, "warning");
export const ToastInfo = (msg = "") => showEventToast(msg, "info");
