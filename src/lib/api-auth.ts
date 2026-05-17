import { NextRequest } from "next/server";
import { getFirebaseAdmin } from "@/src/lib/firebase-admin";

export type AuthenticatedUser = {
  uid: string;
  email: string;
};

function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  return header.replace("Bearer ", "").trim();
}

export async function requireAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser> {
  const token = getBearerToken(request);
  if (!token) {
    throw new Error("Missing authorization token.");
  }

  const { adminAuth } = getFirebaseAdmin();
  const decoded = await adminAuth.verifyIdToken(token);

  return {
    uid: decoded.uid,
    email: decoded.email ?? "",
  };
}
