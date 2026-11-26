import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDwcHUmUN4oEATac37DVMmG7GxUehDfPUE",
  authDomain: "aleta-pt.firebaseapp.com",
  databaseURL: "https://aleta-pt-default-rtdb.firebaseio.com",
  projectId: "aleta-pt",
  storageBucket: "aleta-pt.firebasestorage.app",
  messagingSenderId: "1012057576412",
  appId: "1:1012057576412:web:ee52debdcc81293fa0f519",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export default app;
