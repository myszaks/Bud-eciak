import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../contexts/ToastContext";
import { useNavigate } from "react-router-dom";

export default function ResetPasswordPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("checking"); // checking | ready | submitting | success | error
  const [error, setError] = useState(null);

  useEffect(() => {
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
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      toast.error("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }

    setStatus("submitting");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      toast.error(error.message || "Coś poszło nie tak");
      setStatus("error");
    } else {
      setStatus("success");
      toast.success("Hasło zostało zmienione ✅");

      // Po 3s przekierowanie na dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Blur + dark overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      {/* Modal */}
      <div className="relative bg-dark-surface border border-dark-border rounded-2xl shadow-2xl p-8 w-full max-w-md z-10">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Reset hasła
        </h2>

        {status === "checking" && (
          <p className="text-gray-400 text-center">Weryfikacja linku resetującego…</p>
        )}

        {status === "error" && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-center">
            {error}
          </div>
        )}

        {status === "success" && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-center">
            Hasło zostało zmienione ✅ Za chwilę zostaniesz przeniesiony.
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
              className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "submitting" && (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              )}
              {status === "submitting" ? "Zapisywanie…" : "Zmień hasło"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
