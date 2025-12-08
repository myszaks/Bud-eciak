import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(undefined);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message, duration) => showToast(message, "success", duration), [showToast]);
  const error = useCallback((message, duration) => showToast(message, "error", duration), [showToast]);
  const warning = useCallback((message, duration) => showToast(message, "warning", duration), [showToast]);
  const info = useCallback((message, duration) => showToast(message, "info", duration), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, removeToast, success, error, warning, info }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}