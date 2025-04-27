/* --------------------------------------------------
   0. AI フィルタ
-------------------------------------------------- */
async function aiFilter(text) {
  const r = await fetch("https://peace-sns-ai.takusoarts2.workers.dev/", {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify({ text })
  });
  return (await r.json()).filtered;
}

/* --------------------------------------------------
   1. Firebase Refs
-------------------------------------------------- */
const db        = firebase.database();
const postsRef  = db.ref("posts");
const usersRef  = db.ref("users");

/* --------------------------------------------------
   2. キャラ絵文字
-------------------------------------------------- */
const charMap = { gal:"👧", ojou:"👸", nerd:"🤓", samurai:"⚔️" };

/* --------------------------------------------------
   3. タイムライン描画（ツリー型）
-------------------------------------------------- */
const nodeMap = new Map();                      // id → DOM

function createCard(id, post) {
  const card = document.createElement("article");
  card.className = "bg-white rounded shadow p-4 flex flex-col gap-1 w-full";

  /* インデント */
  const depth = calcDepth(post.parentId);
  card.style.marginLeft = `${depth * 1.5}rem`;

  const display = `${charMap[localStorage.getItem("selectedChar") || "gal"] || ""}${post.user}`;

  card.innerHTML = `
    <h2 class="font-bold text-pink-500">${display}</h2>
    <p  class="text-xs text-gray-400">${post.time}</p>
    <p  class="break-words">${post.content}</p>
    <button data-reply="${id}"
            class="mt-2 self-start text-xs text-blue-500 hover:underline">
      リプライ
    </button>
  `;
  card.dataset.parentId = post.parentId || "";
  nodeMap.set(id, card);
  return card;
}

function calcDepth(pid, d = 0) {
  if (!pid) return d;
  const pNode = nodeMap.get(pid);
  return pNode ? calcDepth(pNode.dataset.parentId, d + 1) : d + 1;
}

function addPost(id, post) {
  const tl   = document.getElementById("timeline");
  const card = createCard(id, post);

  if (!post.parentId) {
    tl.prepend(card);                                    // ルート投稿
    return;
  }

  /* 親の直後の “同じ深さ最後尾” を探して挿入 */
  const parentEl = nodeMap.get(post.parentId);
  if (!parentEl) {
    tl.prepend(card);                                    // 親未描画なら先頭へ
    return;
  }
  let insertPos = parentEl;
  while (
    insertPos.nextElementSibling &&
    insertPos.nextElementSibling.style.marginLeft === parentEl.style.marginLeft
  ) {
    insertPos = insertPos.nextElementSibling;
  }
  insertPos.after(card);
}

/* --------------------------------------------------
   4. リプライ UI
-------------------------------------------------- */
const replyInfo   = document.getElementById("reply-info");
const replyText   = document.getElementById("reply-text");
const replyCancel = document.getElementById("reply-cancel");
let   replyToId   = null;

function setReplyTarget(id, preview) {
  replyToId = id;
  replyText.textContent = `返信 ▶ ${preview.slice(0, 15)}…`;
  replyInfo.classList.remove("hidden");
}
function clearReplyTarget() {
  replyToId = null;
  replyInfo.classList.add("hidden");
}

/* --------------------------------------------------
   5. ページ読み込み
-------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  /* ---------- ログイン／ログアウト ---------- */
  const loginBtn   = document.getElementById("login-button");
  const logoutBtn  = document.getElementById("logout-button");
  const formWrap   = document.getElementById("post-form-wrapper");
  const nameField  = document.getElementById("post-user");
  const provider   = new firebase.auth.GoogleAuthProvider();

  // ログイン
  loginBtn.addEventListener("click", async () => {
    try {
      const { user } = await firebase.auth().signInWithPopup(provider);
      console.log("ログイン成功:", user.displayName);

      /* Google 表示名 → 名前欄（編集禁止） */
      if (user.displayName) {
        nameField.value    = user.displayName;
        nameField.readOnly = true;
      }

      /* 既にニックネーム登録済み？ */
      usersRef.child(user.uid).once("value", snap => {
        if (snap.exists()) {
          nameField.value = snap.val().nickname;
        } else {
          document.getElementById("nickname-modal").classList.remove("hidden");
        }
      });

      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      formWrap.style.display = "block";
    } catch (err) {
      console.error("ログイン失敗:", err);
      /* ブラウザがポップアップをブロックしている可能性あり */
      alert("ポップアップがブロックされていないか確認してください。");
    }
  });

  // ログアウト
  logoutBtn.addEventListener("click", async () => {
    await firebase.auth().signOut();
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    formWrap.style.display = "none";
    nameField.value = "";
    nameField.readOnly = false;
  });

  /* ニックネーム登録モーダル */
  document.getElementById("nickname-submit").addEventListener("click", async () => {
    const nick = document.getElementById("nickname-input").value.trim();
    const user = firebase.auth().currentUser;
    if (!nick || !user) return;

    await usersRef.child(user.uid).set({ nickname: nick });
    nameField.value    = nick;
    nameField.readOnly = true;
    document.getElementById("nickname-modal").classList.add("hidden");
  });

  /* ---------- タイムライン ---------- */
  postsRef.on("child_added", snap => addPost(snap.key, snap.val()));

  document.getElementById("timeline").addEventListener("click", e => {
    const btn = e.target.closest("button[data-reply]");
    if (!btn) return;
    const id  = btn.dataset.reply;
    const txt = btn.parentNode.querySelector("p").textContent;
    setReplyTarget(id, txt);
    document.getElementById("post-content-input").focus();
  });

  replyCancel.addEventListener("click", clearReplyTarget);

  /* ---------- 投稿送信 ---------- */
  document.getElementById("post-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!firebase.auth().currentUser) return alert("ログイン後に投稿できます");

    const text = document.getElementById("post-content-input").value.trim();
    if (!text) return;

    const filtered = await aiFilter(text);
    const ts = new Date().toISOString().slice(0, 16).replace("T", " ");

    await postsRef.push({
      user    : nameField.value || "匿名",
      time    : ts,
      content : filtered,
      parentId: replyToId || null
    });

    e.target.reset();
    clearReplyTarget();
  });

  /* ---------- キャラ選択保持 ---------- */
  const charSel = document.getElementById("char-select");
  charSel.value = localStorage.getItem("selectedChar") || "gal";
  charSel.addEventListener("change", () =>
    localStorage.setItem("selectedChar", charSel.value)
  );
});
