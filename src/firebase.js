// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCOMuaGOJTLAxXaXvU-if7lttvC4XkTMs4",
  authDomain: "nezamak-41fe2.firebaseapp.com",
  databaseURL: "https://nezamak-41fe2-default-rtdb.firebaseio.com",
  projectId: "nezamak-41fe2",
  storageBucket: "nezamak-41fe2.firebasestorage.app",
  messagingSenderId: "244956209860",
  appId: "1:244956209860:web:4f723fdb8e0a70c581df91",
  measurementId: "G-H5TC983RBX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getDatabase(app);