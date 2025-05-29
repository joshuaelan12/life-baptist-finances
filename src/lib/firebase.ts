
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
// To enable other Firebase services, import them here
// import { getStorage, type FirebaseStorage } from 'firebase/storage';
// import { getAnalytics, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDmchdxVvres2FycHX7tRceuAyeA7bcwR0",
  authDomain: "life-baptist-finances-88d5b.firebaseapp.com",
  projectId: "life-baptist-finances-88d5b",
  storageBucket: "life-baptist-finances-88d5b.firebasestorage.app",
  messagingSenderId: "1079707286530",
  appId: "1:1079707286530:web:18714ab5c627303adf7b1b"
};


// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
// let storage: FirebaseStorage; // Uncomment if you need Firebase Storage
// let analytics: Analytics | null = null; // Uncomment if you need Firebase Analytics

if (typeof window !== 'undefined' && !getApps().length) {
  // Client-side initialization
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  // storage = getStorage(app); // Initialize storage if needed
  // analytics = getAnalytics(app); // Initialize analytics if needed
} else if (getApps().length) {
  // Reuse existing app instance on the client if hot-reloading or similar
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  // storage = getStorage(app); // Initialize storage if needed
  // analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
} else {
  // Server-side or build-time initialization (less common for client-focused apps but good practice)
  // Note: For server-side auth and Firestore admin tasks, you'd use firebase-admin
  // This basic client SDK init might still be useful for some build processes or server components
  // that don't require admin privileges.
  app = initializeApp(firebaseConfig); // Fallback, though direct server use often needs firebase-admin
  auth = getAuth(app);
  db = getFirestore(app);
}


export { app, auth, db /*, storage, analytics */ };
