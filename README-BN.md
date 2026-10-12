# PlayX FF Tournament — Full Starter (Firebase)

## ফাইলগুলো
- `index.html` — responsive website UI
- `style.css` — design
- `firebase-config.js` — Firebase web config
- `app.js` — Firebase Authentication, tournament join, room details, results ও admin UI
- `firestore.rules` — Firestore security rules

## 1) Firebase setup
1. https://console.firebase.google.com/ খুলে project তৈরি করো।
2. Project Overview → Add app → Web → app nickname `PlayX FF Tournament`।
3. Firebase config কপি করে `firebase-config.js`-এ বসাও।
4. Authentication → Sign-in method → Email/Password enable করো।
5. Firestore Database → Create database (production mode)।
6. Firestore Rules-এ `firestore.rules`-এর rules বসিয়ে Publish করো।

## 2) Admin access
Admin panel শুধু তখনই দেখা যাবে যখন Firebase ID token-এ `admin: true` custom claim থাকবে।

Trusted environment-এ Node.js Admin SDK ব্যবহার করে claim সেট করো:
```js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
admin.auth().setCustomUserClaims("FIREBASE_AUTH_USER_UID", { admin: true })
  .then(() => {
    console.log("Admin claim set");
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
```

`serviceAccountKey.json` কখনো public repo-তে রাখবে না।

## 3) GitHub Pages deploy
1. GitHub-এ repo তৈরি করো।
2. `index.html`, `style.css`, `app.js`, `firebase-config.js` upload করো।
3. Settings → Pages → Deploy from a branch → `main` → `/ (root)` → Save।
4. Firebase Authentication → Settings → Authorized domains-এ `username.github.io` যোগ করো।

## 4) Firestore data model
- `users/{uid}`
- `tournaments/{tournamentId}`
- `registrations/{uid_tournamentId}`
- `roomDetails/{tournamentId}`
- `results/{resultId}`

## Security notes
- Room ID/password কেবল registered players-এর জন্য দেখাও।
- Firestore Rules deploy করার আগে verify করো।
- Fan-made platform; Garena/Free Fire official service নয়।
