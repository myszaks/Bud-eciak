import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../contexts/ToastContext";

export default function Login() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState(null);

  function isStrongPassword(pw) {
    // Minimum 8 chars, at least one letter and one number
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=]{8,}$/.test(pw);
  }

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        if (!isStrongPassword(password)) {
          setMessage({
            type: "error",
            text: "Hasło musi mieć min. 8 znaków, zawierać literę i cyfrę."
          });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({
          type: "success",
          text: "Sprawdź swoją skrzynkę email, aby potwierdzić rejestrację!",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-surface to-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-2xl shadow-blue-500/30 mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-2">
            Budżeciak
          </h1>
          <p className="text-gray-400 text-sm">
            Zarządzaj swoimi finansami w prosty sposób
          </p>
        </div>

        {/* Formularz */}
        <div className="bg-dark-surface border border-dark-border rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {isSignUp ? "Utwórz konto" : "Zaloguj się"}
            </h2>
            <p className="text-gray-400 text-sm">
              {isSignUp
                ? "Wypełnij formularz, aby rozpocząć"
                : "Wprowadź swoje dane logowania"}
            </p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              message.type === "error"
                ? "bg-red-500/10 border border-red-500/30"
                : "bg-green-500/10 border border-green-500/30"
            }`}>
              <svg
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  message.type === "error" ? "text-red-400" : "text-green-400"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {message.type === "error" ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                )}
              </svg>
              <p
                className={`text-sm ${
                  message.type === "error" ? "text-red-400" : "text-green-400"
                }`}
              >
                {message.text}
              </p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                    />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="twoj@email.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Hasło
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              {isSignUp && (
                <p className="text-xs text-gray-500 mt-2">
                  Minimum 6 znaków
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Ładowanie...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isSignUp ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    )}
                  </svg>
                  <span>{isSignUp ? "Zarejestruj się" : "Zaloguj się"}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center">
            {!isSignUp && (
              <a
                href="/reset-password"
                className="text-blue-400 hover:underline text-sm"
              >
                Zapomniałeś hasła?
              </a>
            )}
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage(null);
              }}
              className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
            >
              {isSignUp
                ? "Masz już konto? Zaloguj się"
                : "Nie masz konta? Zarejestruj się"}
            </button>
          </div>
        </div>

        {/* Stopka */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            © 2024 Budżeciak. Wszystkie prawa zastrzeżone.
          </p>
        </div>
      </div>
    </div>
  );
}
