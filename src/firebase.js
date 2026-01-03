import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

// Replace with YOUR Firebase config from Step 1
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Storage adapter that uses Firebase Firestore
class FirebaseStorageAdapter {
  async get(key, shared = false) {
    try {
      const docRef = doc(db, "games", key);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          key,
          value: docSnap.data().value,
          shared,
        };
      }
      return null;
    } catch (error) {
      console.error("Firebase get error:", error);
      throw error;
    }
  }

  async set(key, value, shared = false) {
    try {
      const docRef = doc(db, "games", key);
      await setDoc(docRef, {
        value,
        shared,
        updatedAt: Date.now(),
      });

      return { key, value, shared };
    } catch (error) {
      console.error("Firebase set error:", error);
      throw error;
    }
  }

  async delete(key, shared = false) {
    try {
      const docRef = doc(db, "games", key);
      await deleteDoc(docRef);

      return { key, deleted: true, shared };
    } catch (error) {
      console.error("Firebase delete error:", error);
      throw error;
    }
  }

  async list(prefix = "", shared = false) {
    try {
      const gamesRef = collection(db, "games");
      const snapshot = await getDocs(gamesRef);

      const keys = [];
      snapshot.forEach((doc) => {
        if (doc.id.startsWith(prefix)) {
          keys.push(doc.id);
        }
      });

      return { keys, prefix, shared };
    } catch (error) {
      console.error("Firebase list error:", error);
      throw error;
    }
  }
}

// Initialize storage
if (typeof window !== "undefined") {
  window.storage = new FirebaseStorageAdapter();
}

export { db };
export default window.storage;
