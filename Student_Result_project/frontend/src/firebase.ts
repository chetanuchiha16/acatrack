// src/firebase.ts
import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getMessaging, getToken, type Messaging } from "firebase/messaging";

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyA_jCnGwbBkev8UJ5m3ui_XT3Aa1iV2Rtk",
  authDomain: "student-6b67d.firebaseapp.com",
  projectId: "student-6b67d",
  storageBucket: "student-6b67d.firebasestorage.app",
  messagingSenderId: "580754728717",
  appId: "1:580754728717:web:2e5eac4285e3b1ace03244",
  measurementId: "G-E57QRC6W38",
};

const app = initializeApp(firebaseConfig);
export const messaging: Messaging = getMessaging(app);

const VAPID_KEY =
  "BNHLEOEvdqu88loXLpemou1WIS-LoKgSsc7h8_OTKnqU_imMNYC_TdcbGDKMwacWIAxIulVGqtx7Aufv85UK0jk";

/**
 * Request an FCM registration token from Firebase Cloud Messaging.
 *
 * - Waits for the service worker to be ready before requesting.
 * - Returns the token string on success, or null on failure / permission denied.
 */
export async function requestForToken(): Promise<string | null> {
  try {
    await navigator.serviceWorker.ready;

    const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });

    if (currentToken) {
      return currentToken;
    }

    console.warn("No registration token available. Request permission to send notifications.");
    return null;
  } catch (error: unknown) {
    console.error("Error getting FCM token:", error);
    return null;
  }
}
