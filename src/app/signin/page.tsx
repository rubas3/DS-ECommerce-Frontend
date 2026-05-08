"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function Signin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email);
  const canSubmit =
    email.length > 0 && password.length > 0 && isEmailValid && !isSubmitting;

  const handleSignin = async () => {
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    if (!isEmailValid) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const idToken = await userCredential.user.getIdToken(true);

      const syncResponse = await fetch("/api/users/sync-verification", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (!syncResponse.ok) {
        throw new Error("Could not sync verification status with database.");
      }

      const mongoSyncResponse = await fetch("/api/users/ensure-mongo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (!mongoSyncResponse.ok) {
        throw new Error("Could not sync user profile with MongoDB.");
      }

      if (!userCredential.user.emailVerified) {
        await signOut(auth);
        setError(
          "Your email is not verified yet. Please verify your email first, then sign in."
        );
        return;
      }
      setSuccess("Signed in successfully.");
      router.push("/dashboard");
    } catch (caughtError: unknown) {
      if (caughtError instanceof Error) {
        setError(caughtError.message);
      } else {
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">
        <section className="hidden bg-gradient-to-br from-slate-900 to-slate-700 p-10 text-white md:flex md:flex-col md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-300">
              Distributed Ecommerce
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              Welcome back to your storefront dashboard.
            </h1>
            <p className="mt-4 text-slate-200">
              Sign in to manage your account and continue your ecommerce
              journey.
            </p>
          </div>
          <p className="text-sm text-slate-300">
            Secure auth powered by Firebase
          </p>
        </section>

        <section className="p-8 sm:p-10">
          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              Account Access
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">
              Sign in
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Enter your credentials to access your account.
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSignin();
            }}
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
              />
              {email.length > 0 && !isEmailValid ? (
                <p className="mt-2 text-xs text-amber-700">
                  Please enter a valid email format (example: name@gmail.com).
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                placeholder="Enter your password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            New here?{" "}
            <Link
              href="/signup"
              className="font-semibold text-slate-900 underline underline-offset-4"
            >
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
