// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCNgPOSfoBEO8FSTlApFNBqxWaUxUxq-Xk",
  authDomain: "distributed-ecommerce-663a8.firebaseapp.com",
  projectId: "distributed-ecommerce-663a8",
  storageBucket: "distributed-ecommerce-663a8.firebasestorage.app",
  messagingSenderId: "395518086201",
  appId: "1:395518086201:web:922b8ae57be2cda8e6d1e8",
  measurementId: "G-RWCFGVR6RK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics =
  typeof window !== "undefined" ? getAnalytics(app) : null;
export const auth = getAuth(app);