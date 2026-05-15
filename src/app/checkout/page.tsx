"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/src/lib/firebase";
import { apiFetch } from "@/src/lib/api-client";

type CartItem = {
  _id?: string;
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [placedOrderId, setPlacedOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");

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
        setError("Unable to load checkout details.");
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

  useEffect(() => {
    if (!activeUser || !placedOrderId) {
      return;
    }

    const pollOrderStatus = async () => {
      try {
        const idToken = await activeUser.getIdToken();
        const response = await apiFetch(
          `/api/orders/status?orderId=${placedOrderId}`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );
        const payload = (await response.json()) as {
          status?: string;
          paymentStatus?: string;
          inventoryStatus?: string;
        };

        if (!response.ok) {
          return;
        }

        setOrderStatus(
          `Order: ${payload.status ?? "UNKNOWN"} | Inventory: ${
            payload.inventoryStatus ?? "UNKNOWN"
          } | Payment: ${payload.paymentStatus ?? "UNKNOWN"}`
        );
      } catch {
        // Polling is best-effort only for UI visibility.
      }
    };

    void pollOrderStatus();
    const intervalId = setInterval(() => {
      void pollOrderStatus();
    }, 2500);

    return () => clearInterval(intervalId);
  }, [activeUser, placedOrderId]);

  const totalAmount = useMemo(
    () => items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items]
  );

  const canSubmitPayment =
    !isSubmitting &&
    items.length > 0 &&
    cardNumber.trim().length >= 12 &&
    expiry.trim().length >= 4 &&
    cvv.trim().length >= 3 &&
    nameOnCard.trim().length > 0;

  const handleConfirmPayment = async () => {
    if (!activeUser || !canSubmitPayment) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      setPlacedOrderId("");
      setOrderStatus("");
      setIsSubmitting(true);

      const idToken = await activeUser.getIdToken();
      const response = await apiFetch("/api/orders/confirm", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const payload = (await response.json()) as {
        message?: string;
        orderId?: string;
        orderStatus?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to place order.");
      }

      setSuccess(
        payload.orderId
          ? `${payload.message ?? "Order created."} Order ID: ${payload.orderId}`
          : payload.message ?? "Order created."
      );
      setPlacedOrderId(payload.orderId ?? "");
      setOrderStatus(payload.orderStatus ? `Order: ${payload.orderStatus}` : "");
      setItems([]);
    } catch (caughtError: unknown) {
      if (caughtError instanceof Error) {
        setError(caughtError.message);
      } else {
        setError("Payment failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <section className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
              Checkout
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">Payment</h1>
          </div>
          <Link
            href="/cart"
            className="inline-flex w-fit items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Back to Cart
          </Link>
        </div>

        {error ? (
          <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            <p>{success}</p>
            {orderStatus ? <p className="mt-2 text-sm">{orderStatus}</p> : null}
            <Link
              href="/dashboard"
              className="mt-3 inline-flex rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              Return to Home
            </Link>
          </div>
        ) : null}

        {isLoading ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
            Loading checkout...
          </p>
        ) : null}

        {!isLoading && items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-slate-700">Your cart is empty.</p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Browse Products
            </Link>
          </div>
        ) : null}

        {!isLoading && items.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Payment Details
              </h2>
              <div className="space-y-3">
                <input
                  type="text"
                  value={nameOnCard}
                  placeholder="Name on card"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                  onChange={(e) => setNameOnCard(e.target.value)}
                />
                <input
                  type="text"
                  value={cardNumber}
                  placeholder="Card number"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                  onChange={(e) => setCardNumber(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={expiry}
                    placeholder="MM/YY"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                  <input
                    type="password"
                    value={cvv}
                    placeholder="CVV"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                    onChange={(e) => setCvv(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Order Summary
              </h2>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between text-sm text-slate-700"
                  >
                    <span>
                      {item.name} x {item.quantity}
                    </span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="my-4 border-t border-slate-200" />
              <div className="mb-4 flex items-center justify-between">
                <p className="text-slate-700">Total</p>
                <p className="text-xl font-semibold text-slate-900">
                  ${totalAmount.toFixed(2)}
                </p>
              </div>
              <button
                type="button"
                disabled={!canSubmitPayment}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                onClick={() => {
                  void handleConfirmPayment();
                }}
              >
                {isSubmitting ? "Confirming payment..." : "Confirm Payment & Place Order"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
