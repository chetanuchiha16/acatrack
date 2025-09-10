// src/firebase.js
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyA_jCnGwbBkev8UJ5m3ui_XT3Aa1iV2Rtk",
  authDomain: "student-6b67d.firebaseapp.com",
  projectId: "student-6b67d",
  storageBucket: "student-6b67d.firebasestorage.app",
  messagingSenderId: "580754728717",
  appId: "1:580754728717:web:2e5eac4285e3b1ace03244",
  measurementId: "G-E57QRC6W38"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

export async function requestForToken() {
  try {
    // Service worker must exist in public folder
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const currentToken = await getToken(messaging, {
      vapidKey: "BNHLEOEvdqu88loXLpemou1WIS-LoKgSsc7h8_OTKnqU_imMNYC_TdcbGDKMwacWIAxIulVGqtx7Aufv85UK0jk",
      serviceWorkerRegistration: registration,
    });

    return currentToken;
  } catch (error) {
    console.error("Error getting FCM token", error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
