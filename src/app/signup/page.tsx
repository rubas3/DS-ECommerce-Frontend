"use client";

import Link from "next/link";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { sendEmailVerification } from "firebase/auth";
import { apiFetch } from "@/src/lib/api-client";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email);
  const isPasswordValid = password.length >= 6;
  const isConfirmPasswordValid = confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit =
    name.trim().length > 0 &&
    email.length > 0 &&
    isEmailValid &&
    isPasswordValid &&
    isConfirmPasswordValid &&
    !isSubmitting;

  const handleSignup = async () => {
    setError("");
    setSuccess("");

    if (!name.trim() || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (!isEmailValid) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isPasswordValid) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!isConfirmPasswordValid) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const idToken = await userCredential.user.getIdToken();

      const profileResponse = await apiFetch("/api/users/upsert-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
        }),
      });
      if (!profileResponse.ok) {
        const payload = (await profileResponse.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(
          payload?.message ?? "Failed to save user profile in database."
        );
      }

      await sendEmailVerification(userCredential.user);

      setSuccess(
        "Account created. Verification email sent. Please verify before signing in."
      );
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (caughtError: unknown) {
      if (caughtError instanceof Error) {
        setError(caughtError.message);
      } else {
        setError("Something went wrong. Please try again.");
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
              Build your account and start shopping smarter.
            </h1>
            <p className="mt-4 text-slate-200">
              Fast sign up, secure authentication, and a clean dashboard
              experience for your customers.
            </p>
          </div>
          <p className="text-sm text-slate-300">
            Secure auth powered by Firebase
          </p>
        </section>

        <section className="p-8 sm:p-10">
          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              Create Account
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">
              Sign up
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Use your email and password to create a new account.
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSignup();
            }}
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                placeholder="Ayesha Khan"
                onChange={(e) => setName(e.target.value)}
              />
            </div>

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
                placeholder="Minimum 6 characters"
                onChange={(e) => setPassword(e.target.value)}
              />
              {password.length > 0 && !isPasswordValid ? (
                <p className="mt-2 text-xs text-amber-700">
                  Password must be at least 6 characters.
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                placeholder="Repeat your password"
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword.length > 0 && !isConfirmPasswordValid ? (
                <p className="mt-2 text-xs text-amber-700">
                  Confirm password must match password.
                </p>
              ) : null}
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
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-semibold text-slate-900 underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}