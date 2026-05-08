import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function normalizeEnv(value?: string): string {
  if (!value) {
    return "";
  }

  return value.trim().replace(/^['"]|['"]$/g, "").replace(/,$/, "");
}

function inferProjectIdFromClientEmail(clientEmail: string): string {
  const match = clientEmail.match(/@([^.]+)\.iam\.gserviceaccount\.com$/);
  return match?.[1] ?? "";
}

function getAdminApp() {
  const clientEmail = normalizeEnv(process.env.FIREBASE_CLIENT_EMAIL);
  const rawProjectId = normalizeEnv(process.env.FIREBASE_PROJECT_ID);
  const inferredProjectId = inferProjectIdFromClientEmail(clientEmail);
  const projectId =
    /^[a-z0-9-]+$/.test(rawProjectId) && rawProjectId.length > 0
      ? rawProjectId
      : inferredProjectId;
  const privateKey = normalizeEnv(process.env.FIREBASE_PRIVATE_KEY).replace(
    /\\n/g,
    "\n"
  );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin env vars. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local."
    );
  }

  return getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
}

export function getFirebaseAdmin() {
  const app = getAdminApp();
  return {
    adminAuth: getAuth(app),
    adminDb: getFirestore(app),
  };
}
