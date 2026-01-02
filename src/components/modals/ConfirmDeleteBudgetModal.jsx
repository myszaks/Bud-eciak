import { useState } from "react";
import BaseModal from "./BaseModal";

export default function ConfirmDeleteBudgetModal({
  budget,
  confirmText = "Usuń budżet",
  confirmVariant = "danger",
  onConfirm,
  onClose,
}) {
  const [inputValue, setInputValue] = useState("");

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    onClose();
  };

  const isValid = inputValue.trim() === budget.name;

  return (
    <BaseModal onClose={onClose}>
      <div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 w-full max-w-md">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-text">Usuń budżet</h3>
            <p className="text-sm text-gray-400">Potwierdzenie wymagane</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Ta operacja jest{" "}
            <strong className="text-red-600">nieodwracalna</strong>. Wszystkie
            dane zostaną trwale usunięte.
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Wpisz nazwę budżetu{" "}
            <strong className="text-text">{budget.name}</strong> aby
            potwierdzić:
          </p>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={budget.name}
            className="w-full px-4 py-2.5 bg-dark-card border border-dark-border rounded-lg text-text placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
              isValid
                ? confirmVariant === "danger"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-600 text-gray-300 cursor-not-allowed"
            }`}
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-2.5 rounded-lg font-medium"
          >
            Anuluj
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
