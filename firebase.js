const firebaseConfig = {
  apiKey: "AIzaSyD1Rh2n07yxasd6sBKngMIBTZnkrABN1ic",
  authDomain: "fashion-adda-2527a.firebaseapp.com",
  projectId: "fashion-adda-2527a",
  storageBucket: "fashion-adda-2527a.firebasestorage.app",
  messagingSenderId: "609395625808",
  appId: "1:609395625808:web:8ce9816553df6e0e7de655",
  measurementId: "G-Z8TZ1F2CGK"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

window.db = firebase.firestore();
window.auth = firebase.auth();
window.storage = firebase.storage();

window.firebaseReady =
  firebaseConfig.apiKey !== "AIzaSyD1Rh2n07yxasd6sBKngMIBTZnkrABN1ic";