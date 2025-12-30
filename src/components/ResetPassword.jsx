import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("checking");
  // checking | ready | submitting | success | error
  const [error, setError] = useState(null);

  useEffect(() => {
    // Supabase sam ustawia sesję z linku recovery
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data?.session) {
        setStatus("ready");
      } else {
        setError(
          "Link resetujący jest nieważny lub wygasł. Poproś o nowy link."
        );
        setStatus("error");
      }
    };

    checkSession();

    // Debug (opcjonalnie – możesz usunąć)
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      console.log("RESET PASSWORD EVENT:", event);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }

    setStatus("submitting");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("success");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-bg via-dark-surface to-dark-bg p-4">
      <div className="w-full max-w-md">
        <div className="bg-dark-surface border border-dark-border rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Reset hasła
          </h2>

          {status === "checking" && (
            <p className="text-gray-400 text-center">
              Weryfikacja linku resetującego…
            </p>
          )}

          {status === "error" && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-center">
              {error}
            </div>
          )}

          {status === "success" && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-center">
              Hasło zostało zmienione ✅ Możesz się teraz zalogować.
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Nowe hasło
                </label>
                <input
                  type="password"
                  placeholder="Nowe hasło"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "submitting" ? "Zapisywanie…" : "Zmień hasło"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
