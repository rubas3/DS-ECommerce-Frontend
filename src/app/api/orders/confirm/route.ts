import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/src/lib/mongodb";
import { requireAuthenticatedUser } from "@/src/lib/api-auth";

function getDatabaseName() {
  return process.env.MONGODB_DB_NAME || "ecommerce";
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const client = await clientPromise;
    const db = client.db(getDatabaseName());
    const cartItems = db.collection("cartItems");
    const orders = db.collection("orders");

    const items = await cartItems.find({ userId: user.uid }).toArray();
    if (!items.length) {
      return NextResponse.json(
        { message: "Your cart is empty. Add products before confirming order." },
        { status: 400 }
      );
    }

    const totalAmount = items.reduce(
      (accumulator, item) => accumulator + Number(item.price) * Number(item.quantity),
      0
    );
    const now = new Date();

    const order = {
      userId: user.uid,
      userEmail: user.email,
      items: items.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        quantity: item.quantity,
      })),
      totalAmount,
      status: "confirmed",
      createdAt: now,
      updatedAt: now,
    };

    const result = await orders.insertOne(order);
    await cartItems.deleteMany({ userId: user.uid });

    return NextResponse.json({
      message: "Order confirmed successfully.",
      orderId: result.insertedId.toString(),
      totalAmount,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to confirm order.";
    const status = message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ message }, { status });
  }
}
