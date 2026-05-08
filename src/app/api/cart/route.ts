import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/src/lib/mongodb";
import { requireAuthenticatedUser } from "@/src/lib/api-auth";

type CartItemPayload = {
  productId?: string;
  name?: string;
  price?: number;
  imageUrl?: string;
  quantity?: number;
};

function getDatabaseName() {
  return process.env.MONGODB_DB_NAME || "ecommerce";
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const client = await clientPromise;
    const db = client.db(getDatabaseName());
    const cartItems = db.collection("cartItems");

    const items = await cartItems
      .find({ userId: user.uid })
      .sort({ updatedAt: -1 })
      .toArray();

    const total = items.reduce(
      (accumulator, item) => accumulator + Number(item.price) * Number(item.quantity),
      0
    );

    return NextResponse.json({ items, total });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load cart items.";
    const status = message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const body = (await request.json()) as CartItemPayload;

    const productId = body.productId?.trim();
    const name = body.name?.trim();
    const imageUrl = body.imageUrl?.trim();
    const price = Number(body.price);
    const quantity = Math.max(1, Number(body.quantity ?? 1));

    if (!productId || !name || !imageUrl || Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        { message: "productId, name, imageUrl, and valid price are required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(getDatabaseName());
    const cartItems = db.collection("cartItems");
    const now = new Date();

    await cartItems.updateOne(
      { userId: user.uid, productId },
      {
        $set: {
          userId: user.uid,
          userEmail: user.email,
          productId,
          name,
          imageUrl,
          price,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
        $inc: {
          quantity,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ message: "Item added to cart." }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to add item to cart.";
    const status = message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const body = (await request.json()) as {
      productId?: string;
      quantity?: number;
    };

    const productId = body.productId?.trim();
    const quantity = Number(body.quantity);

    if (!productId || Number.isNaN(quantity) || quantity < 1) {
      return NextResponse.json(
        { message: "productId and quantity (>= 1) are required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(getDatabaseName());
    const cartItems = db.collection("cartItems");
    const result = await cartItems.updateOne(
      { userId: user.uid, productId },
      { $set: { quantity, updatedAt: new Date() } }
    );

    if (!result.matchedCount) {
      return NextResponse.json({ message: "Cart item not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Cart updated successfully." });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update cart item.";
    const status = message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId")?.trim();

    if (!productId) {
      return NextResponse.json(
        { message: "productId query param is required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(getDatabaseName());
    const cartItems = db.collection("cartItems");
    const result = await cartItems.deleteOne({ userId: user.uid, productId });

    if (!result.deletedCount) {
      return NextResponse.json({ message: "Cart item not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Item removed from cart." });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to remove cart item.";
    const status = message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ message }, { status });
  }
}
