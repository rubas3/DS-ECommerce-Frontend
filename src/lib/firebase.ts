import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCNgPOSfoBEO8FSTlApFNBqxWaUxUxq-Xk",
  authDomain: "distributed-ecommerce-663a8.firebaseapp.com",
  projectId: "distributed-ecommerce-663a8",
  storageBucket: "distributed-ecommerce-663a8.firebasestorage.app",
  messagingSenderId: "395518086201",
  appId: "1:395518086201:web:922b8ae57be2cda8e6d1e8",
  measurementId: "G-RWCFGVR6RK",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);