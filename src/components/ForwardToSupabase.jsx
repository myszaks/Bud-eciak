import { useLocation } from "react-router-dom";
import React from "react";

export default function ForwardToSupabase() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  let redirect = params.get("redirect");
  try {
    if (redirect) redirect = decodeURIComponent(redirect);
  } catch {
    redirect = null;
  }

  if (!redirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4">
        <div className="bg-dark-surface border border-dark-border rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-white mb-2">Nieprawidłowy lub brakujący link</h2>
          <p className="text-gray-400">Proszę poprosić o nowy e-mail do resetowania hasła.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4">
      <div className="bg-dark-surface border border-dark-border rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <h2 className="text-xl font-bold text-white mb-2">Resetuj hasło</h2>
        <p className="text-gray-400">Kliknij poniższy przycisk, aby przejść do bezpiecznej strony resetowania hasła.</p>
        <div className="mt-6">
          <a
            href={redirect}
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
          >
            Przejdź dalej
          </a>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Jeśli przycisk nie działa, <a href={redirect} className="underline">otwórz link</a>.
        </p>
      </div>
    </div>
  );
}
