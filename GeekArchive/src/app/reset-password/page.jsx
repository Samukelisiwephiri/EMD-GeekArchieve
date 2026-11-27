
"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, ShieldCheck, LockKeyhole } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setError("Authentication service unavailable.");
      setChecking(false);
      return;
    }

    const params = new URLSearchParams(
      window.location.hash.slice(1)
    );

    if (params.get("error")) {
      setError("This recovery link is invalid or expired.");
      setChecking(false);
    }

    const timeout = setTimeout(() => {
      setChecking(false);
    }, 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        setReady(true);
        setChecking(false);
        setError("");
        clearTimeout(timeout);
      }

      if (event === "SIGNED_OUT") {
        setReady(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!ready || loading) return;

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) throw updateError;

      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirm(false);
      setSuccess(true);
      setReady(false);

      const { error: signOutError } =
        await supabase.auth.signOut({ scope: "global" });

      if (signOutError) {
        setError(
          "Password updated, but automatic sign-out failed."
        );
      }
    } catch (err) {
      setError(err.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-[#D8CFC4] bg-[#FAF8F5] px-4 py-3 pr-12 text-sm outline-none focus:border-[#587561]";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F2F5EE] p-6">
      <div className="w-full max-w-md rounded-3xl border border-[#E6DFD5] bg-white p-8 shadow-lg">

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#163126] font-bold text-[#C8DD9F]">
            GA
          </div>

          <h1 className="text-xl font-bold text-[#163126]">
            Geek Archive
          </h1>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <ShieldCheck className="mx-auto h-14 w-14 text-[#587561]" />

            <h2 className="text-2xl font-bold text-[#163126]">
              Password updated!
            </h2>

            <p className="text-sm text-[#68766F]">
              Your new password has been saved successfully.
            </p>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <a
              href="/"
              className="block rounded-xl bg-[#587561] px-4 py-3 font-semibold text-white"
            >
              Return to GeekArchive
            </a>
          </div>
        ) : checking ? (
          <p className="text-sm text-[#68766F]">
            Verifying your recovery link...
          </p>
        ) : !ready ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#163126]">
              Recovery link unavailable
            </h2>

            <p role="alert" className="text-sm text-red-600">
              {error || "This recovery link is invalid, expired or already used. Please request a new one."}
            </p>

            <a href="/" className="text-sm font-semibold text-[#587561] underline">
              Return to GeekArchive
            </a>
          </div>
        ) : (
          <form
            onSubmit={handleResetPassword}
            className="space-y-4"
          >
            <LockKeyhole className="h-8 w-8 text-[#587561]" />

            <h2 className="text-2xl font-bold text-[#163126]">
              Reset your password
            </h2>

            <p className="text-sm text-[#68766F]">
              Choose a new password for your GeekArchive account.
            </p>

            {error && (
              <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm font-medium">
                New password
              </label>

              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className={inputClass}
                  placeholder="At least 8 characters"
                />

                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-[#68766F]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium">
                Confirm new password
              </label>

              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className={inputClass}
                  placeholder="Re-enter your password"
                />

                <button
                  type="button"
                  aria-label={showConfirm ? "Hide confirmation" : "Show confirmation"}
                  aria-pressed={showConfirm}
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-[#68766F]"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#587561] px-4 py-3 font-semibold text-white hover:bg-[#46634F] disabled:opacity-50"
            >
              {loading ? "Updating password..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
