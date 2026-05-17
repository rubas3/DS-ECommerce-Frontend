"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/src/lib/firebase";
import { apiFetch } from "@/src/lib/api-client";

type Product = {
  _id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  rating: number;
  description: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [addingProductId, setAddingProductId] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/signin");
        return;
      }

      setActiveUser(user);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setError("");
        const response = await apiFetch("/api/products");
        const payload = (await response.json()) as {
          products?: Product[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.message || "Failed to load products.");
        }

        setProducts(payload.products || []);
      } catch (caughtError: unknown) {
        if (caughtError instanceof Error) {
          setError(caughtError.message);
        } else {
          setError("Unable to load products.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadProducts();
  }, []);

  const handleAddToCart = async (product: Product) => {
    try {
      setError("");
      setSuccess("");

      if (!activeUser) {
        setError("Please sign in before adding items to cart.");
        return;
      }

      setAddingProductId(product._id);
      const idToken = await activeUser.getIdToken();
      const response = await apiFetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          productId: product._id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          quantity: 1,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.message ?? "Failed to add product to cart.");
      }

      setSuccess(`${product.name} added to cart.`);
    } catch (caughtError: unknown) {
      if (caughtError instanceof Error) {
        setError(caughtError.message);
      } else {
        setError("Unable to add item to cart.");
      }
    } finally {
      setAddingProductId("");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/signin");
    } catch (error) {
      console.error("Failed to sign out", error);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-4 py-12 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-300">
              Store Dashboard
            </p>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Welcome to your product control center
            </h1>
            <p className="max-w-2xl text-slate-200">
              Monitor products, review catalog visuals, and prepare a premium
              shopping experience.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/cart"
              className="inline-flex w-fit items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              View Cart
            </Link>
            <button
              onClick={handleSignOut}
              className="inline-flex w-fit items-center rounded-xl border border-slate-600 bg-transparent px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        {success ? (
          <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            {success}
          </p>
        ) : null}

        {isLoading ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
            Loading products...
          </p>
        ) : null}

        {error ? (
          <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </p>
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product._id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-52 w-full object-cover"
              />
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {product.category}
                  </span>
                  <span className="text-sm font-semibold text-amber-600">
                    {product.rating} / 5
                  </span>
                </div>

                <h2 className="text-lg font-semibold text-slate-900">
                  {product.name}
                </h2>

                <p className="text-sm text-slate-600">{product.description}</p>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xl font-semibold text-slate-900">
                    ${product.price.toFixed(2)}
                  </p>
                  <button
                    type="button"
                    disabled={addingProductId === product._id}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    onClick={() => {
                      void handleAddToCart(product);
                    }}
                  >
                    {addingProductId === product._id
                      ? "Adding..."
                      : "Add to cart"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
