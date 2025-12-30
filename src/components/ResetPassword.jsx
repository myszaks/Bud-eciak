import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function ResetPassword() {
  const [token, setToken] = useState(null); // access_token or token
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | verifying | ready | submitting | success | error
  const [error, setError] = useState(null);

  // Read token from URL either as hash fragment or query param
  useEffect(() => {
    const u = new URL(window.location.href);

    // 1) Check fragment first (some Supabase flows return #access_token=... or #error=...)
    if (window.location.hash) {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      // access_token is present for implicit flow; for recovery flows Supabase may include 'error' in fragment
      if (hash.get("access_token")) {
        setToken(hash.get("access_token"));
      } else if (hash.get("error")) {
        setError(
          `${hash.get("error")}: ${hash.get("error_description") || ""}`
        );
        setStatus("error");
      }
    }

    // 2) Check query params: token (when using token in email template) or 'type' + 'token'
    const qToken =
      u.searchParams.get("token") ||
      u.searchParams.get("access_token") ||
      u.searchParams.get("token_hash");
    if (qToken) setToken(qToken);

    const redirectParam = u.searchParams.get("redirect");
    if (!qToken && redirectParam) {
      try {
        const inner = new URL(decodeURIComponent(redirectParam));

        // check fragment for access_token inside the inner URL

        if (inner.hash) {
          const innerHash = new URLSearchParams(inner.hash.replace(/^#/, ""));

          if (innerHash.get("access_token"))
            setToken(innerHash.get("access_token"));
        }

        // check inner query params for token / access_token / token_hash

        const innerQ =
          inner.searchParams.get("token") ||
          inner.searchParams.get("access_token") ||
          inner.searchParams.get("token_hash");

        if (innerQ) setToken(innerQ);
      } catch (e) {
        // ignore malformed redirect param
      }
    }

    // 3) If no token and no error, set ready to allow user to request new reset
    if (!qToken && !window.location.hash) {
      setStatus("idle");
    }
  }, []);

  // If we have a token but no session yet, try to verify/exchange it
  useEffect(() => {
    if (!token) return;

    // We mark verifying state
    setStatus("verifying");
    setError(null);
    (async () => {
      try {
        // Try verifyOtp (PKCE / server-side token_hash flows) — may not apply in implicit flow
        // We'll attempt verifyOtp with type=recovery. If that returns error, we fallback to signing in using the token (implicit).
        const verifyRes = await supabase.auth.verifyOtp({
          token,
          type: "recovery",
        });

        if (!verifyRes.error) {
          // verifyOtp succeeded — user is now signed in (server-side flows)
          setStatus("ready");
          const { data } = await supabase.auth.getUser();
          setEmail(data?.user?.email ?? "");
          return;
        }

        // If verifyOtp returned error, try to treat token as an access token (implicit flow).
        // For implicit flow, Supabase returns access_token in the fragment — we already handled that above.
        // If token is not accepted, surface the error from verifyRes
        setError(verifyRes.error.message || JSON.stringify(verifyRes.error));
        setStatus("error");
      } catch (e) {
        setError(e.message || String(e));
        setStatus("error");
      }
    })();
  }, [token]);

  // Submit new password
  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!password || password.length < 6) {
      setError("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }

    setStatus("submitting");

    try {
      // If there's a user session (user is signed in), updateUser works.
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        const { error: updateErr } = await supabase.auth.updateUser({
          password,
        });
        if (updateErr) throw updateErr;
        setStatus("success");
        return;
      }

      // If no session, some flows require calling the verify endpoint server-side.
      // But for client-side password reset, Supabase expects the link to produce a session.
      // Provide fallback: call recover endpoint using the token to get a session via REST.
      // NOTE: Exchanging a raw OTP token for a session via client isn't supported directly;
      // the recommended flow is to ensure the redirect created a session. If not, instruct user to request new reset.
      setError(
        "Link jest nieważny lub wygasł. Poproś o ponowne wygenerowanie linku resetującego hasło."
      );
      setStatus("error");
    } catch (err) {
      setError(err.message || String(err));
      setStatus("error");
    }
  }

  // Helper to request a new reset email
  async function requestNewReset(e) {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Wpisz e-mail aby wysłać link resetujący.");
      return;
    }
    setStatus("submitting");
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://www.budzet.app/auth/forward-to-supabase",
      });
      if (error) throw error;
      setStatus("idle");
      alert("Sprawdź swoją skrzynkę — wysłaliśmy link do resetu hasła.");
    } catch (err) {
      setError(err.message || String(err));
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-bg via-dark-surface to-dark-bg p-4">
      <div className="w-full max-w-md">
        <div className="bg-dark-surface border border-dark-border rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Reset hasła
          </h2>

          {status === "verifying" && (
            <p className="text-gray-400 text-center mb-4">Weryfikacja linku…</p>
          )}

          {status === "error" && (
            <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-center">
              <strong>Błąd:</strong> {error}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setToken(null);
                    setError(null);
                    setStatus("idle");
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  Poproś o nowy link
                </button>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-center">
              Hasło zostało zaktualizowane. Możesz się teraz zalogować.
            </div>
          )}

          {/* If we have a verified session or ready to update, show password form */}
          {status === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Adres e-mail
                </label>
                <input
                  value={email}
                  readOnly
                  className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Nowe hasło
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="Nowe hasło"
                  className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "submitting" ? "Zapisywanie..." : "Zmień hasło"}
              </button>
            </form>
          )}

          {/* If idle or no valid token, show request form */}
          {(status === "idle" || status === "submitting") && !token && (
            <form onSubmit={requestNewReset} className="space-y-4">
              <p className="text-gray-400 text-center">
                Podaj swój adres e-mail, aby wysłać link do resetowania hasła.
              </p>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "submitting"
                  ? "Wysyłanie..."
                  : "Wyślij link resetujący"}
              </button>
              {error && (
                <div className="text-red-400 text-center mt-2">{error}</div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
