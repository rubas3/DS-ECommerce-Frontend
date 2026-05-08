import { randomBytes, scryptSync } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/src/lib/firebase-admin";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  return header.replace("Bearer ", "").trim();
}

export async function POST(request: NextRequest) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { message: "Missing authorization token." },
        { status: 401 }
      );
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "name, email and password are required." },
        { status: 400 }
      );
    }

    const userRef = adminDb.collection("users").doc(decoded.uid);
    const snapshot = await userRef.get();

    await userRef.set(
      {
        uid: decoded.uid,
        name,
        email,
        passwordHash: hashPassword(password),
        isVerified: Boolean(decoded.email_verified),
        ...(snapshot.exists
          ? {}
          : { createdAt: FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      message: "User profile saved successfully.",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save user profile.";
    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}
