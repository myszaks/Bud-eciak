import BaseModal from "./BaseModal";

export default function ConfirmDeleteModal({
  title,
  description,
  confirmText = "OK",
  confirmVariant = "primary",
  onConfirm,
  onClose,
}) {
  if (!onClose) return null;

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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-text">{title}</h3>
            <p className="text-sm text-gray-400">Potwierdzenie wymagane</p>
          </div>
        </div>

        <div className="text-gray-600 mb-6">{description}</div>

        <div className="flex gap-3">
          <button
            onClick={async () => {
              if (onConfirm) {
                await onConfirm();
              }
              onClose();
            }}
            className={`flex-1 py-2.5 rounded-lg font-medium ${
              confirmVariant === "danger"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
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
