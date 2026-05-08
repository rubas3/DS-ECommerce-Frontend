import { NextResponse } from "next/server";
import clientPromise from "@/src/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || "ecommerce");
    const products = db.collection("products");

    const data = await products.find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ products: data });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch products from MongoDB.",
      },
      { status: 500 }
    );
  }
}
