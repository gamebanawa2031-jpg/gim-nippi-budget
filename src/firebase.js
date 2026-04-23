import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDnumxTehn4eqidy_RHNRnX_yJjiVqMl2A",
  authDomain: "budget-26cbf.firebaseapp.com",
  projectId: "budget-26cbf",
  storageBucket: "budget-26cbf.firebasestorage.app",
  messagingSenderId: "284978077502",
  appId: "1:284978077502:web:1564c40a0a97c9a282d66f",
  measurementId: "G-QE9ZNLT3KN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
