import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";

// Replace with YOUR Firebase config from Step 1
const firebaseConfig = {
  apiKey: "AIzaSyAArgmb5PcBXvBtf-jixyja2kf6BBLu858",
  authDomain: "trivia-game-5e95f.firebaseapp.com",
  projectId: "trivia-game-5e95f",
  storageBucket: "trivia-game-5e95f.firebasestorage.app",
  messagingSenderId: "856348571076",
  appId: "1:856348571076:web:af3f1211bcf5c71ca9e091",
};

// Initialize Firebase
let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  alert("Firebase initialization failed. Check console for details.");
}

// Storage adapter that uses Firebase Firestore
class FirebaseStorageAdapter {
  async get(key, shared = false) {
    try {
      console.log("Firebase GET:", key);
      const docRef = doc(db, "games", key);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log("Firebase GET success:", key);
        return {
          key,
          value: docSnap.data().value,
          shared,
        };
      }
      console.log("Firebase GET not found:", key);
      return null;
    } catch (error) {
      console.error("Firebase get error:", error);
      console.error("Error details:", error.code, error.message);
      throw error;
    }
  }

  async set(key, value, shared = false) {
    try {
      console.log("Firebase SET:", key, "Length:", value?.length);

      if (!db) {
        throw new Error(
          "Firebase database not initialized. Check your Firebase configuration."
        );
      }

      const docRef = doc(db, "games", key);

      // Firebase has a size limit, let's check
      if (value && value.length > 1000000) {
        console.error("Value too large:", value.length);
        throw new Error("Data too large for Firebase");
      }

      await setDoc(docRef, {
        value,
        shared,
        updatedAt: Date.now(),
      });

      console.log("Firebase SET success:", key);
      return { key, value, shared };
    } catch (error) {
      console.error("Firebase set error:", error);
      console.error("Error details:", error.code, error.message);

      if (error.code === "permission-denied") {
        alert(
          "Firebase permission denied. Make sure Firestore rules allow read/write access."
        );
      } else {
        alert("Firebase error: " + error.message);
      }
      throw error;
    }
  }

  async delete(key, shared = false) {
    try {
      console.log("Firebase DELETE:", key);
      const docRef = doc(db, "games", key);
      await deleteDoc(docRef);

      console.log("Firebase DELETE success:", key);
      return { key, deleted: true, shared };
    } catch (error) {
      console.error("Firebase delete error:", error);
      console.error("Error details:", error.code, error.message);
      throw error;
    }
  }

  async list(prefix = "", shared = false) {
    try {
      console.log("Firebase LIST:", prefix);
      const gamesRef = collection(db, "games");
      const snapshot = await getDocs(gamesRef);

      const keys = [];
      snapshot.forEach((doc) => {
        if (doc.id.startsWith(prefix)) {
          keys.push(doc.id);
        }
      });

      console.log("Firebase LIST success:", keys.length, "items");
      return { keys, prefix, shared };
    } catch (error) {
      console.error("Firebase list error:", error);
      console.error("Error details:", error.code, error.message);
      throw error;
    }
  }
}

// Create and export storage instance
const storage = new FirebaseStorageAdapter();

// Make it globally available
if (typeof window !== "undefined") {
  window.storage = storage;
  console.log("Firebase storage attached to window");
}

export { db, storage };
export default storage;
