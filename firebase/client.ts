// Import the functions you need from the SDKs you need
import { initializeApp , getApp , getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";



const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "prep-ai-bc833.firebaseapp.com",
  projectId: "prep-ai-bc833",
  storageBucket: "prep-ai-bc833.firebasestorage.app",
  messagingSenderId: "674745696267",
  appId: "1:674745696267:web:f6eea8d93622e58043470e",
  measurementId: "G-PV9HH7LR49"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
