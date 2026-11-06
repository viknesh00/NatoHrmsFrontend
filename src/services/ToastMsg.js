import { toast } from "../components/ui/toast";

export const ToastSuccess = (msg = "") => {
  toast.success(msg);
};
export const ToastError = (msg = "") => {
  toast.error(msg);
};
