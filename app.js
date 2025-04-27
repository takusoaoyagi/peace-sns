/* --------------------------------------------------
   0. AI フィルタ
-------------------------------------------------- */
async function aiFilter(text) {
  const res = await fetch(
    "https://peace-sns-ai.takusoarts2.workers.dev/",
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }) }
  );
  const data = await res.json();
  return data.filtered;
}

/* --------------------------------------------------
   1. Firebase Refs
-------------------------------------------------- */
const postsRef = firebase.database().ref("posts");
const usersRef = firebase.database().ref("users");

/* --------------------------------------------------
   2. キャラ絵文字
-------------------------------------------------- */
const charMap = { gal:"👧", ojou:"👸", nerd:"🤓", samurai:"⚔️" };

/* --------------------------------------------------
   3. 投稿をタイムラインへ描画
      parentId があればインデント
-------------------------------------------------- */
function addPost(id, post) {
  const selectedChar = localStorage.getItem("selectedChar") || "gal";
  const displayUser  = `${charMap[selectedChar]||""}${post.user}`;

  const tl   = document.getElementById("timeline");
  const card = document.createElement("article");
  card.className = "post bg-white rounded shadow p-4 flex flex-col gap-1";
  if (post.parentId) card.classList.add("ml-6"); // インデント

  card.innerHTML = `
    <h2 class="post-user font-bold text-pink-500">${displayUser}</h2>
    <p  class="post-time text-xs text-gray-400">${post.time}</p>
    <p  class="post-content break-words">${post.content}</p>
    <button data-reply="${id}"
            class="mt-2 self-start text-xs text-blue-500 hover:underline">
      リプライ
    </button>
  `;
  tl.prepend(card);
}

/* --------------------------------------------------
   4. モーダル / フォーム関連
-------------------------------------------------- */
function showNicknameModal(){ document.getElementById("nickname-modal").classList.remove("hidden"); }
function hideNicknameModal(){ document.getElementById("nickname-modal").classList.add("hidden"); }

/* --------------------------------------------------
   5. ページ読み込み
-------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn   = document.getElementById("login-button");
  const logoutBtn  = document.getElementById("logout-button");
  const provider   = new firebase.auth.GoogleAuthProvider();
  const nameField  = document.getElementById("post-user");
  const formWrap   = document.getElementById("post-form-wrapper");
  const replyInfo  = document.getElementById("reply-info");
  let   replyToId  = null; // ← 今どの投稿に返信中か

  /* ── ログイン ── */
  loginBtn.addEventListener("click", async () => {
    try {
      const { user } = await firebase.auth().signInWithPopup(provider);

      if (user.displayName) {
        nameField.value = user.displayName;
        nameField.readOnly = true;
      }

      usersRef.child(user.uid).once("value", snap => {
        if (snap.exists()) nameField.value = snap.val().nickname;
        else               showNicknameModal();
      });

      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      formWrap.style.display = "block";
    } catch(e){ console.error(e); }
  });

  /* ── ログアウト ── */
  logoutBtn.addEventListener("click", async () => {
    await firebase.auth().signOut();
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    formWrap.style.display = "none";
    nameField.value = ""; nameField.readOnly = false;
  });

  /* ── ニックネーム登録 ── */
  document.getElementById("nickname-submit").addEventListener("click", async () => {
    const nick = document.getElementById("nickname-input").value.trim();
    const user = firebase.auth().currentUser;
    if (!nick || !user) return alert("ニックネームを入力してね！");
    await usersRef.child(user.uid).set({ nickname:nick });
    nameField.value = nick; nameField.readOnly = true;
    hideNicknameModal();
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    formWrap.style.display = "block";
  });

  /* ── タイムライン描画（リアルタイム） ── */
  postsRef.on("child_added", snap => addPost(snap.key, snap.val()));

  /* ── クリック委譲でリプライボタン取得 ── */
  document.getElementById("timeline").addEventListener("click", e => {
    const btn = e.target.closest("button[data-reply]");
    if (!btn) return;
    replyToId = btn.dataset.reply;                 // 返信対象 ID
    replyInfo.textContent = "返信先 ▶ " + btn.parentNode.querySelector(".post-content").textContent.slice(0,15) + "…";
    replyInfo.classList.remove("hidden");
    document.getElementById("post-content-input").focus();
  });

  /* ── キャラ選択保存 ── */
  const charSel = document.getElementById("char-select");
  charSel.value = localStorage.getItem("selectedChar") || "gal";
  charSel.addEventListener("change", () =>
    localStorage.setItem("selectedChar", charSel.value)
  );

  /* ── 投稿／リプライ送信 ── */
  document.getElementById("post-form").addEventListener("submit", async e => {
    e.preventDefault();
    const userObj = firebase.auth().currentUser;
    if (!userObj) return alert("ログインしないと投稿できないよ！");

    const content = document.getElementById("post-content-input").value.trim();
    if (!content) return;
    const filtered = await aiFilter(content);
    const now      = new Date().toISOString().slice(0,16).replace("T"," ");

    await postsRef.push({
      user: nameField.value || "匿名",
      time: now,
      content: filtered,
      parentId: replyToId || null
    });

    /* 送信後リセット */
    e.target.reset();
    replyToId = null;
    replyInfo.classList.add("hidden");
  });
});
