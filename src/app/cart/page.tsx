"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/src/lib/firebase";
import { apiFetch } from "@/src/lib/api-client";

type CartItem = {
  _id: string;
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
};

export default function CartPage() {
  const router = useRouter();
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCartForUser = async (user: User) => {
    try {
      setError("");
      const idToken = await user.getIdToken();
      const response = await apiFetch("/api/cart", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const payload = (await response.json()) as {
        items?: CartItem[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to load cart.");
      }

      setItems(payload.items ?? []);
    } catch (caughtError: unknown) {
      if (caughtError instanceof Error) {
        setError(caughtError.message);
      } else {
        setError("Unable to load cart.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/signin");
        return;
      }

      setActiveUser(user);
      void loadCartForUser(user);
    });

    return () => unsubscribe();
  }, [router]);

  const handleQuantityChange = async (productId: string, quantity: number) => {
    if (!activeUser) {
      return;
    }

    if (quantity < 1) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      setIsSubmitting(true);
      const idToken = await activeUser.getIdToken();
      const response = await apiFetch("/api/cart", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ productId, quantity }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to update quantity.");
      }

      await loadCartForUser(activeUser);
    } catch (caughtError: unknown) {
      if (caughtError instanceof Error) {
        setError(caughtError.message);
      } else {
        setError("Unable to update quantity.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    if (!activeUser) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      setIsSubmitting(true);
      const idToken = await activeUser.getIdToken();
      const response = await apiFetch(
        `/api/cart?productId=${encodeURIComponent(productId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to remove item.");
      }

      await loadCartForUser(activeUser);
    } catch (caughtError: unknown) {
      if (caughtError instanceof Error) {
        setError(caughtError.message);
      } else {
        setError("Unable to remove item.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtotal = useMemo(
    () =>
      items.reduce(
        (accumulator, item) => accumulator + item.price * item.quantity,
        0
      ),
    [items]
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
              Shopping Cart
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">Your Cart</h1>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Continue Shopping
          </Link>
        </div>

        {error ? (
          <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            {success}
          </p>
        ) : null}

        {isLoading ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
            Loading cart...
          </p>
        ) : null}

        {!isLoading && items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-slate-700">Your cart is currently empty.</p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Browse Products
            </Link>
          </div>
        ) : null}

        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item.productId}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-20 w-20 rounded-xl object-cover"
                />
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {item.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    ${item.price.toFixed(2)} each
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isSubmitting || item.quantity <= 1}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-slate-700 disabled:opacity-50"
                  onClick={() => {
                    void handleQuantityChange(item.productId, item.quantity - 1);
                  }}
                >
                  -
                </button>
                <span className="min-w-8 text-center font-medium text-slate-900">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-slate-700 disabled:opacity-50"
                  onClick={() => {
                    void handleQuantityChange(item.productId, item.quantity + 1);
                  }}
                >
                  +
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  className="rounded-lg bg-red-50 px-3 py-1 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  onClick={() => {
                    void handleRemoveItem(item.productId);
                  }}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>

        {!isLoading && items.length > 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-slate-700">Subtotal</p>
              <p className="text-xl font-semibold text-slate-900">
                ${subtotal.toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              onClick={() => {
                router.push("/checkout");
              }}
            >
              Proceed to Payment
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
