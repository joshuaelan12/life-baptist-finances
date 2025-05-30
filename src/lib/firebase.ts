
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

// Safer initialization pattern for both client and server
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);


export { app, auth, db /*, storage, analytics */ };

