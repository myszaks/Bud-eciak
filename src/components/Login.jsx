import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isSignUp) {
        // Sprawdź whitelist
        const { data: whitelistCheck, error: whitelistError } = await supabase
          .from("email_whitelist")
          .select("email")
          .eq("email", email.trim())
          .single();

        if (whitelistError || !whitelistCheck) {
          setMessage("Ten adres email nie jest uprawniony do rejestracji. Skontaktuj się z administratorem.");
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Sprawdź email, aby potwierdzić rejestrację!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-dark-surface rounded-lg shadow-2xl p-8">
      <h2 className="text-2xl font-light text-white mb-6 text-center">
        {isSignUp ? "Rejestracja" : "Logowanie"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="twoj@email.com"
            className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Hasło
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            required
            minLength={6} // ✅ DODAJ: Minimalna długość
          />
          {/* ✅ DODAJ: Informacja o wymaganiach */}
          {isSignUp && (
            <p className="mt-1 text-xs text-gray-500">
              Hasło musi mieć minimum 6 znaków
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {loading ? "Ładowanie..." : isSignUp ? "Zarejestruj się" : "Zaloguj się"}
        </button>
      </form>

      {message && (
        <div className={`mt-4 p-3 rounded text-sm ${
          message.includes("Sprawdź") 
            ? "bg-green-900/30 text-green-300 border border-green-700" 
            : "bg-red-900/30 text-red-300 border border-red-700"
        }`}>
          {message}
        </div>
      )}

      <div className="mt-6 text-center">
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
        >
          {isSignUp
            ? "Masz już konto? Zaloguj się"
            : "Nie masz konta? Zarejestruj się"}
        </button>
      </div>

      {isSignUp && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Rejestracja wymaga autoryzacji. Jeśli nie masz dostępu, skontaktuj się z administratorem.
        </div>
      )}
    </div>
  );
}
