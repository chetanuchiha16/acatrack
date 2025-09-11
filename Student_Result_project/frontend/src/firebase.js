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
    const currentToken = await getToken(messaging, {
      vapidKey: "BNHLEOEvdqu88loXLpemou1WIS-LoKgSsc7h8_OTKnqU_imMNYC_TdcbGDKMwacWIAxIulVGqtx7Aufv85UK0jk",
    });

    if (currentToken) {
      console.log("FCM Token:", currentToken);
      return currentToken;
    } else {
      console.warn("No registration token available. Request permission?");
      return null;
    }
  } catch (error) {
    console.error("Error getting FCM token", error);
    return null;
  }
}


