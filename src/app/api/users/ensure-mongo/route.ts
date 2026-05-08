import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/src/lib/mongodb";
import { requireAuthenticatedUser } from "@/src/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || "ecommerce");
    const users = db.collection("users");
    const now = new Date();

    await users.updateOne(
      { uid: user.uid },
      {
        $set: {
          uid: user.uid,
          email: user.email,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ message: "User synced to MongoDB." });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to sync user profile.";
    const status = message.includes("authorization") ? 401 : 500;
    return NextResponse.json({ message }, { status });
  }
}
