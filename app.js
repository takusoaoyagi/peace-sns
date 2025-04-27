/* --------------------------------------------------
   0. AI フィルタ
-------------------------------------------------- */
async function aiFilter(text) {
  const r = await fetch("https://peace-sns-ai.takusoarts2.workers.dev/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
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
const nodeMap = new Map();        // id → DOM

function createCard(id, post) {
  const card = document.createElement("article");
  card.className = "bg-white rounded shadow p-4 flex flex-col gap-1 w-full";

  // インデント
  const depth = calcDepth(post.parentId);
  card.style.marginLeft = `${depth * 1.5}rem`;

  const ch = localStorage.getItem("selectedChar") || "gal";
  const display = `${charMap[ch] || ""}${post.user}`;

  card.innerHTML = `
    <h2 class="font-bold text-pink-500">${display}</h2>
    <p  class="text-xs text-gray-400">${post.time}</p>
    <p  class="break-words">${post.content}</p>
    <button data-reply="${id}"
            class="mt-2 self-start text-xs text-blue-500 hover:underline">
      リプライ
    </button>
  `;
  nodeMap.set(id, card);
  return card;
}

// 再帰的に親をたどって深さ計算
function calcDepth(pid, d = 0) {
  if (!pid) return d;
  const parentNode = nodeMap.get(pid);
  if (!parentNode) return d + 1;          // まだ DOM が無い場合
  return calcDepth(parentNode.dataset.parentId, d + 1);
}

function addPost(id, post) {
  const tl   = document.getElementById("timeline");
  const card = createCard(id, post);
  card.dataset.parentId = post.parentId || "";

  if (!post.parentId) {
    tl.prepend(card);                      // ルート投稿
    return;
  }

  const parentEl = nodeMap.get(post.parentId);
  if (!parentEl) {
    tl.prepend(card);                      // 親が未描画なら暫定先頭
    return;
  }

  /* -------- 親と同階層の末尾を探してその後ろに差し込む -------- */
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
  /* --- 既存のログイン / ログアウト / ニックネーム処理
         は前回のままなので省略（ここは変更なし） --- */

  /* --- タイムライン受信 --- */
  postsRef.on("child_added", snap => addPost(snap.key, snap.val()));

  /* --- リプライボタン（イベントデリゲート） --- */
  document.getElementById("timeline").addEventListener("click", e => {
    const btn = e.target.closest("button[data-reply]");
    if (!btn) return;
    const id  = btn.dataset.reply;
    const txt = btn.parentNode.querySelector("p").textContent;
    setReplyTarget(id, txt);
    document.getElementById("post-content-input").focus();
  });

  /* --- リプライ取消 --- */
  replyCancel.addEventListener("click", clearReplyTarget);

  /* --- 投稿送信 --- */
  document.getElementById("post-form").addEventListener("submit", async e => {
    e.preventDefault();

    if (!firebase.auth().currentUser) {
      alert("ログインしないと投稿できないよ！");
      return;
    }

    const user   = document.getElementById("post-user").value || "匿名";
    const text   = document.getElementById("post-content-input").value.trim();
    if (!text) return;

    const filtered = await aiFilter(text);
    const ts       = new Date().toISOString().slice(0, 16).replace("T", " ");

    await postsRef.push({
      user, time: ts, content: filtered,
      parentId: replyToId || null
    });

    e.target.reset();
    clearReplyTarget();
  });
});
