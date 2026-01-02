import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../contexts/ToastContext";

export default function Login() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  function isStrongPassword(pw) {
    // Minimum 8 chars, at least one letter and one number
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=]{8,}$/.test(pw);
  }

  function translateAuthError(error) {
    const message = (error?.message || "").toLowerCase();

    if (message.includes("invalid login credentials")) {
      return "Nieprawidłowy email lub hasło.";
    }
    if (message.includes("email not confirmed")) {
      return "Potwierdź adres email, aby się zalogować.";
    }
    if (message.includes("user already registered")) {
      return "Użytkownik z tym adresem email już istnieje.";
    }
    if (message.includes("password should be at least")) {
      return "Hasło musi mieć co najmniej 6 znaków.";
    }
    if (message.includes("rate limit")) {
      return "Zbyt wiele prób. Spróbuj ponownie za chwilę.";
    }
    if (message.includes("token has expired") || message.includes("invalid token")) {
      return "Token wygasł lub jest nieprawidłowy. Spróbuj ponownie.";
    }

    return error?.message || "Coś poszło nie tak";
  }

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (!isStrongPassword(password)) {
          toast.error(
            "Hasło musi mieć min. 8 znaków, zawierać literę i cyfrę."
          );
          return;
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success(
          "Sprawdź swoją skrzynkę email, aby potwierdzić rejestrację!"
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    if (!email) {
      toast.error("Podaj adres email aby wysłać link resetujący");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: import.meta.env.PROD
          ? "https://budzet.app/reset-password"
          : "http://localhost:5173/reset-password",
      });

      if (error) throw error;
      toast.success("Sprawdź swoją skrzynkę — wysłaliśmy link do resetu hasła");
    } catch (err) {
      toast.error(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-surface to-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/icons/logo.png"
            alt="Budżet.app"
            className="w-28 h-28 md:w-36 md:h-36 mx-auto mb-4 rounded-xl object-contain shadow-sm"
          />

          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-2">
            Budżet.app
          </h1>
          <p className="text-gray-400 text-sm">
            Zarządzaj swoimi finansami w prosty sposób.
          </p>
        </div>

        {/* Formularz */}
        <div className="bg-dark-surface border border-dark-border rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-text mb-2">
              {isSignUp ? "Utwórz konto" : "Zaloguj się"}
            </h2>
            <p className="text-gray-400 text-sm">
              {isSignUp
                ? "Wypełnij formularz, aby rozpocząć"
                : "Wprowadź swoje dane logowania"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="twoj@email.com"
                required
                className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-lg text-text placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Hasło
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-lg text-text placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              {isSignUp && (
                <p className="text-xs text-gray-500 mt-2">
                  Minimum 8 znaków, litera + cyfra
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Ładowanie..."
                : isSignUp
                ? "Zarejestruj się"
                : "Zaloguj się"}
            </button>
          </form>

          {!isSignUp && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-blue-400 hover:underline text-sm"
              >
                Zapomniałeś hasła?
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-gray-400 hover:text-blue-400 transition-colors"
            >
              {isSignUp
                ? "Masz już konto? Zaloguj się"
                : "Nie masz konta? Zarejestruj się"}
            </button>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            © 2026 Budżet.app. Wszystkie prawa zastrzeżone.
          </p>
        </div>
      </div>
    </div>
  );
}
