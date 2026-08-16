"use client";

const TYPE_STYLES = {
  success: "bg-ok text-white",
  error: "bg-late text-white",
  default: "bg-ink text-cream",
};

export default function Toast({ toast }) {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`animate-toast-in fixed top-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm shadow-lg ${
        TYPE_STYLES[toast.type] || TYPE_STYLES.default
      }`}
    >
      {toast.message}
    </div>
  );
}
