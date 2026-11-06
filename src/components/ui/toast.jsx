import React, { useSyncExternalStore } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Info, LoaderCircle, X } from "lucide-react";

let items = [];
let nextId = 1;
const listeners = new Set();
const timers = new Map();

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return items;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function closeToast(id) {
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
  const nextItems = items.filter((item) => item.id !== id);
  if (nextItems.length === items.length) return;
  items = nextItems;
  notify();
}

function addToast(messageOrOptions, type = "info") {
  const options = typeof messageOrOptions === "object" && messageOrOptions !== null
    ? messageOrOptions
    : { title: String(messageOrOptions ?? ""), type };
  const id = nextId++;
  const item = {
    id,
    title: options.title || "",
    description: options.description || "",
    type: options.type || type,
    actionProps: options.actionProps,
  };

  items = [...items, item].slice(-5);
  notify();

  const timeout = options.timeout ?? 5000;
  if (timeout > 0) timers.set(id, setTimeout(() => closeToast(id), timeout));
  return id;
}

function updateToast(id, messageOrOptions, type) {
  const options = typeof messageOrOptions === "object" && messageOrOptions !== null
    ? messageOrOptions
    : { title: String(messageOrOptions ?? ""), type };
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
  items = items.map((item) => item.id === id
    ? {
        ...item,
        title: options.title || "",
        description: options.description || "",
        type: options.type || type || item.type,
        actionProps: options.actionProps,
      }
    : item
  );
  notify();
  const timeout = options.timeout ?? 5000;
  if (timeout > 0 && items.some((item) => item.id === id)) {
    timers.set(id, setTimeout(() => closeToast(id), timeout));
  }
}

export const toast = {
  add: (options) => addToast(options),
  success: (message) => addToast(message, "success"),
  error: (message) => addToast(message, "error"),
  warning: (message) => addToast(message, "warning"),
  info: (message) => addToast(message, "info"),
  loading: (message) => addToast({ title: String(message ?? ""), type: "loading", timeout: 0 }),
  promise: (promise, messages = {}) => {
    const loading = typeof messages.loading === "object"
      ? { ...messages.loading, type: "loading", timeout: 0 }
      : { title: String(messages.loading || "Loading…"), type: "loading", timeout: 0 };
    const id = addToast(loading);
    return Promise.resolve(promise).then(
      (value) => {
        const success = typeof messages.success === "function" ? messages.success(value) : messages.success;
        updateToast(id, success || "Completed", "success");
        return value;
      },
      (error) => {
        const failure = typeof messages.error === "function" ? messages.error(error) : messages.error;
        updateToast(id, failure || error?.message || "Something went wrong", "error");
        throw error;
      }
    );
  },
  close: closeToast,
};

function ToastIcon({ type }) {
  const props = { size: 17, "aria-hidden": true };
  if (type === "success") return <CheckCircle2 {...props} />;
  if (type === "error") return <CircleAlert {...props} />;
  if (type === "warning") return <AlertTriangle {...props} />;
  if (type === "loading") return <LoaderCircle {...props} className="hrms-toast-spinner" />;
  return <Info {...props} />;
}

function ToastViewport() {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return (
    <div className="hrms-toast-viewport" aria-label="Notifications">
      {toasts.map((item) => (
        <div
          key={item.id}
          className="hrms-toast"
          data-type={item.type}
          role={item.type === "error" ? "alert" : "status"}
          aria-live={item.type === "error" ? "assertive" : "polite"}
        >
          <div className="hrms-toast-content">
            <span className="hrms-toast-icon" aria-hidden="true">
              <ToastIcon type={item.type} />
            </span>
            <div className="hrms-toast-copy">
              {item.title && <div className="hrms-toast-title">{item.title}</div>}
              {item.description && <div className="hrms-toast-description">{item.description}</div>}
            </div>
            {item.actionProps?.children && (
              <button
                className="hrms-toast-action"
                type="button"
                onClick={(event) => {
                  item.actionProps.onClick?.(event);
                  closeToast(item.id);
                }}
              >
                {item.actionProps.children}
              </button>
            )}
            <button
              className="hrms-toast-close"
              type="button"
              aria-label="Dismiss notification"
              onClick={() => closeToast(item.id)}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Toaster({ children }) {
  return (
    <>
      {children}
      <ToastViewport />
    </>
  );
}
