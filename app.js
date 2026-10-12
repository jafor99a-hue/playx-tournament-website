import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, setDoc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const configured = firebaseConfig.apiKey !== "PASTE_YOUR_API_KEY" && firebaseConfig.projectId !== "PASTE_YOUR_PROJECT_ID";
let auth, db, currentUser = null, authMode = "register", selectedTournament = null;
const $ = s => document.querySelector(s);

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 4000);
}

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

if (!configured) {
  $("#authMessage").textContent = "প্রথমে firebase-config.js-এ Firebase config বসাও, তারপর Authentication ও Firestore চালু করো।";
  $("#tournamentList").innerHTML = '<p class="muted">Firebase config না দেওয়া পর্যন্ত ডেটা লোড হবে না।</p>';
} else {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, async user => {
    currentUser = user;
    $("#userStatus").textContent = user ? `লগইন: ${user.displayName || user.email}` : "লগইন করা হয়নি";
    $("#loginBtn").hidden = !!user;
    $("#registerBtn").hidden = !!user;
    $("#logoutBtn").hidden = !user;
    $("#accountTitle").textContent = user ? "তোমার অ্যাকাউন্ট" : "Welcome to PlayX";
    $("#adminPanel").hidden = true;

    if (user) {
      const token = await user.getIdTokenResult(true);
      $("#adminPanel").hidden = !token.claims.admin;
      $("#displayNameWrap").hidden = true;
      $("#authForm").hidden = true;
    } else {
      $("#displayNameWrap").hidden = false;
      $("#authForm").hidden = false;
      setAuthMode("register");
    }

    await Promise.all([
      loadTournaments(),
      loadResults(),
      loadRooms(),
      user && (await loadAdminData())
    ]);
  });
}

function setAuthMode(mode) {
  authMode = mode;
  $("#displayNameWrap").hidden = mode === "login";
  $("#displayName").required = mode === "register";
  $("#authSubmit").textContent = mode === "login" ? "Login" : "Register";
  $("#authMessage").textContent = mode === "login"
    ? "তোমার ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করো।"
    : "নতুন অ্যাকাউন্ট তৈরি করতে তথ্য দাও।";
}

$("#loginBtn").addEventListener("click", () => {
  setAuthMode("login");
  $("#account").scrollIntoView({ behavior: "smooth" });
});

$("#registerBtn").addEventListener("click", () => {
  setAuthMode("register");
  $("#account").scrollIntoView({ behavior: "smooth" });
});

$("#logoutBtn").addEventListener("click", async () => {
  if (auth) await signOut(auth);
  toast("Logout হয়েছে।");
});

$("#authForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!configured) return toast("আগে Firebase config বসাও।");

  const email = $("#email").value.trim();
  const password = $("#password").value;

  try {
    if (authMode === "register") {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const name = $("#displayName").value.trim();
      if (name) await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db, "users", cred.user.uid), {
        displayName: name,
        email,
        createdAt: serverTimestamp()
      });
      toast("অ্যাকাউন্ট তৈরি হয়েছে!");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      toast("লগইন সফল!");
    }
  } catch (err) {
    toast(friendlyError(err.code));
  }
});

function friendlyError(code) {
  return ({
    "auth/email-already-in-use": "এই ইমেইল দিয়ে অ্যাকাউন্ট আছে।",
    "auth/invalid-credential": "ইমেইল বা পাসওয়ার্ড ঠিক নয়।",
    "auth/weak-password": "আরও শক্তিশালী পাসওয়ার্ড দাও।",
    "auth/invalid-email": "সঠিক ইমেইল দাও।",
    "auth/too-many-requests": "অনেকবার চেষ্টা হয়েছে; পরে চেষ্টা করো।"
  }[code]) || "সমস্যা হয়েছে। Firebase Console ও Security Rules পরীক্ষা করো।";
}

async function loadTournaments() {
  try {
    const snap = await getDocs(query(collection(db, "tournaments"), orderBy("createdAt", "desc")));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    $("#tournamentList").innerHTML = items.length
      ? items.map(t => `
          <article class="t-card">
            <span class="tag">${esc(t.mode || "MATCH")}</span>
            <h3>${esc(t.title)}</h3>
            <p>🎮 ${esc(t.mode || "")} · 🗺️ ${esc(t.map || "")}</p>
            <p>🗓️ ${esc(t.startAt || "তারিখ পরে জানানো হবে")}</p>
            <p class="muted">${esc(t.status || "open")}</p>
            <div class="card-foot">
              <div>
                <small class="muted">Prize pool</small>
                <div class="prize">${esc(t.prize || "—")}</div>
              </div>
              <button class="btn join-btn" data-id="${esc(t.id)}" data-title="${esc(t.title)}">Join Now</button>
            </div>
          </article>
        `).join("")
      : '<p class="muted">এখনো টুর্নামেন্ট নেই। অ্যাডমিন পরে যোগ করতে পারবেন।</p>';

    document.querySelectorAll(".join-btn").forEach(btn => {
      btn.addEventListener("click", () => openJoin(btn.dataset.id, btn.dataset.title));
    });

    fillTournamentSelects(items);
  } catch (e) {
    $("#tournamentList").innerHTML = '<p class="muted">টুর্নামেন্ট লোড হয়নি। Firestore Rules ও Database পরীক্ষা করো।</p>';
    console.error(e);
  }
}

function fillTournamentSelects(items) {
  ["#roomTournament", "#resultTournament"].forEach(sel => {
    $(sel).innerHTML = items.map(t => `<option value="${esc(t.id)}">${esc(t.title)}</option>`).join("");
  });
}

function openJoin(id, title) {
  if (!currentUser) {
    setAuthMode("login");
    $("#account").scrollIntoView({ behavior: "smooth" });
    return toast("Join করতে আগে Login করো।");
  }

  selectedTournament = id;
  $("#joinTitle").textContent = "Join: " + title;
  $("#joinModal").hidden = false;
}

$("#joinClose").addEventListener("click", () => $("#joinModal").hidden = true);
$("#joinModal").addEventListener("click", e => {
  if (e.target.id === "joinModal") $("#joinModal").hidden = true;
});

$("#joinForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser) return toast("আগে Login করো।");

  const id = `${currentUser.uid}_${selectedTournament}`;

  try {
    const ref = doc(db, "registrations", id);
    if ((await getDoc(ref)).exists()) return toast("তুমি ইতিমধ্যে Join করেছ।");

    await setDoc(ref, {
      uid: currentUser.uid,
      tournamentId: selectedTournament,
      inGameName: $("#ign").value.trim(),
      freeFireUid: $("#ffuid").value.trim(),
      teamName: $("#teamName").value.trim(),
      status: "registered",
      createdAt: serverTimestamp()
    });

    $("#joinModal").hidden = true;
    $("#joinForm").reset();
    toast("Tournament Join সফল!");
    await loadRooms();
    if (!$("#adminPanel").hidden) await loadAdminData();
  } catch (err) {
    console.error(err);
    toast("Join হয়নি। Firestore Security Rules পরীক্ষা করো।");
  }
});

async function loadResults() {
  try {
    const snap = await getDocs(query(collection(db, "results"), orderBy("publishedAt", "desc")));
    $("#resultsList").innerHTML = snap.empty
      ? '<tr><td colspan="3">এখনো ফলাফল প্রকাশ হয়নি।</td></tr>'
      : snap.docs.map(d => {
          const r = d.data();
          return `<tr><td>${esc(r.tournamentTitle || r.tournamentId)}</td><td>${esc(r.winner || r.details || "—")}</td><td class="status">প্রকাশিত</td></tr>`;
        }).join("");
  } catch (e) {
    $("#resultsList").innerHTML = '<tr><td colspan="3">ফলাফল লোড হয়নি; Rules পরীক্ষা করো।</td></tr>';
    console.error(e);
  }
}

async function loadRooms() {
  if (!currentUser) {
    $("#roomList").innerHTML = '<p class="muted">Room details দেখতে Login করো।</p>';
    return;
  }

  try {
    const regs = await getDocs(query(collection(db, "registrations"), where("uid", "==", currentUser.uid)));
    if (regs.empty) {
      $("#roomList").innerHTML = '<p class="muted">তুমি এখনো কোনো টুর্নামেন্টে Join করোনি।</p>';
      return;
    }

    let html = "";
    for (const r of regs.docs) {
      const data = r.data();
      const td = await getDoc(doc(db, "tournaments", data.tournamentId));
      const room = await getDoc(doc(db, "roomDetails", data.tournamentId));

      html += `
        <div class="t-card">
          <h3>${esc(td.exists() ? td.data().title : "Tournament")}</h3>
          ${room.exists()
            ? `<p>Room ID: <b>${esc(room.data().roomId)}</b></p><p>Password: <b>${esc(room.data().password)}</b></p>`
            : '<p class="muted">অ্যাডমিন এখনো Room details প্রকাশ করেননি।</p>'}
        </div>
      `;
    }

    $("#roomList").innerHTML = html;
  } catch (e) {
    $("#roomList").innerHTML = '<p class="muted">Room details লোড হয়নি। Rules পরীক্ষা করো।</p>';
    console.error(e);
  }
}

async function loadAdminData() {
  if (!currentUser) return;

  try {
    const token = await currentUser.getIdTokenResult(true);
    if (!token.claims.admin) return;

    const snap = await getDocs(collection(db, "registrations"));
    $("#registrationsList").innerHTML = snap.empty
      ? '<tr><td colspan="4">এখনো registration নেই।</td></tr>'
      : snap.docs.map(d => {
          const r = d.data();
          return `<tr><td>${esc(r.uid)}</td><td>${esc(r.inGameName)}</td><td>${esc(r.freeFireUid)}</td><td>${esc(r.tournamentId)}</td></tr>`;
        }).join("");
  } catch (e) {
    console.error(e);
  }
}

$("#tournamentForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser) return;

  try {
    await addDoc(collection(db, "tournaments"), {
      title: $("#tTitle").value.trim(),
      mode: $("#tMode").value,
      map: $("#tMap").value.trim(),
      prize: $("#tPrize").value.trim(),
      startAt: $("#tStart").value,
      status: "open",
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid
    });

    $("#tournamentForm").reset();
    toast("Tournament তৈরি হয়েছে।");
    await loadTournaments();
  } catch (e) {
    console.error(e);
    toast("তৈরি হয়নি। Admin custom claim ও Rules পরীক্ষা করো।");
  }
});

$("#roomForm").addEventListener("submit", async e => {
  e.preventDefault();

  try {
    const id = $("#roomTournament").value;
    if (!id) return toast("Tournament বেছে নাও।");

    await setDoc(doc(db, "roomDetails", id), {
      tournamentId: id,
      roomId: $("#roomId").value.trim(),
      password: $("#roomPassword").value.trim(),
      updatedAt: serverTimestamp()
    });

    toast("Room details সংরক্ষিত।");
    $("#roomForm").reset();
    await loadRooms();
  } catch (e) {
    console.error(e);
    toast("Room details সংরক্ষণ হয়নি। Admin access পরীক্ষা করো।");
  }
});

$("#resultForm").addEventListener("submit", async e => {
  e.preventDefault();

  try {
    const id = $("#resultTournament").value;
    const td = await getDoc(doc(db, "tournaments", id));

    await addDoc(collection(db, "results"), {
      tournamentId: id,
      tournamentTitle: td.exists() ? td.data().title : "Tournament",
      winner: $("#winner").value.trim(),
      details: $("#resultDetails").value.trim(),
      publishedAt: serverTimestamp(),
      publishedBy: currentUser.uid
    });

    $("#resultForm").reset();
    toast("Result প্রকাশ হয়েছে।");
    await loadResults();
  } catch (e) {
    console.error(e);
    toast("Result প্রকাশ হয়নি। Admin access পরীক্ষা করো.");
  }
});

$("#menuBtn").addEventListener("click", () => $("#nav").classList.toggle("open"));
$("#nav").querySelectorAll("a").forEach(a => a.addEventListener("click", () => $("#nav").classList.remove("open")));
