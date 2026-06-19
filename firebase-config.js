// Firebase configuration
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, query, orderBy, limit } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBEIy1XgDNSJald5gmyEZlsxTDkq1RwB6I",
    authDomain: "flappy-bird-ae5ab.firebaseapp.com",
    projectId: "flappy-bird-ae5ab",
    storageBucket: "flappy-bird-ae5ab.firebasestorage.app",
    messagingSenderId: "711516125816",
    appId: "1:711516125816:web:f1fe088b1ffa0724228b8d",
    measurementId: "G-6QGZ29FMTN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, doc, setDoc, getDoc, getDocs, updateDoc, query, orderBy, limit };
