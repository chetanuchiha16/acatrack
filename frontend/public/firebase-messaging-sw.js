// Give the service worker access to Firebase Messaging
importScripts('https://www.gstatic.com/firebasejs/10.3.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.3.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyA_jCnGwbBkev8UJ5m3ui_XT3Aa1iV2Rtk",
  authDomain: "student-6b67d.firebaseapp.com",
  projectId: "student-6b67d",
  storageBucket: "student-6b67d.firebasestorage.app",
  messagingSenderId: "580754728717",
  appId: "1:580754728717:web:2e5eac4285e3b1ace03244",
  measurementId: "G-E57QRC6W38"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Optional: handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'Background Message Title';
  const notificationOptions = {
    body: payload.notification?.body || 'Background Message body.',
    icon: '/firebase-logo.png' // Optional: change to your app icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
