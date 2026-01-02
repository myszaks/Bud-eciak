import BaseModal from "./BaseModal";

export default function ChangePermissionModal({
  currentLevel,
  newLevel,
  userEmail,
  confirmText = "OK",
  onConfirm,
  onClose,
}) {
  if (!onClose) return null;

  const currentLabel = currentLevel === "view" ? "Podgląd" : "Edycja";
  const newLabel = newLevel === "view" ? "Podgląd" : "Edycja";

  return (
    <BaseModal onClose={onClose}>
      <div className="bg-white rounded-xl p-6 shadow-2xl border border-gray-200 w-full max-w-md">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <svg
              className="w-6 h-6 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text">Zmień uprawnienia</h2>
            <p className="text-sm text-gray-400">Potwierdzenie wymagane</p>
          </div>
        </div>

        <p className="text-gray-600 mb-6">
          Zmienić uprawnienia z{" "}
          <strong className="text-text">{currentLabel}</strong> na{" "}
          <strong className="text-text">{newLabel}</strong>
          {userEmail ? ` dla ${userEmail}?` : " dla tego użytkownika?"}
        </p>

        <div className="flex gap-3">
          <button
            onClick={async () => {
              if (onConfirm) {
                await onConfirm();
              }
              onClose();
            }}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2.5 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-lg shadow-blue-500/30"
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-dark-border text-text py-2.5 px-4 rounded-lg hover:bg-dark-hover transition-colors font-medium"
          >
            Anuluj
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
