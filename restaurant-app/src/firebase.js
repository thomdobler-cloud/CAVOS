import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCpzYD0fK2yjLZvGwDhuV_q8qlj56e8_mI",
    authDomain: "cavos-4a963.firebaseapp.com",
    databaseURL: "https://cavos-4a963-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "cavos-4a963",
    storageBucket: "cavos-4a963.firebasestorage.app",
    messagingSenderId: "8263713864",
    appId: "1:8263713864:web:e252d91fcd78ee198f847d",
    measurementId: "G-2HQRLB8RLN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
export default app;
