import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/src/lib/firebase-admin";

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

    const decoded = await adminAuth.verifyIdToken(token, true);
    const isVerified = Boolean(decoded.email_verified);
    const userRef = adminDb.collection("users").doc(decoded.uid);

    await userRef.set(
      {
        isVerified,
        ...(isVerified ? { verifiedAt: FieldValue.serverTimestamp() } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      message: "Verification status synced.",
      isVerified,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to sync verification status.";
    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}
