/* --------------------------------------------------
   0. AI フィルタ
-------------------------------------------------- */
async function aiFilter(text) {
  const r = await fetch("https://peace-sns-ai.takusoarts2.workers.dev/", {
    method: "POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ text })
  });
  return (await r.json()).filtered;
}

/* --------------------------------------------------
   1. Firebase Refs
-------------------------------------------------- */
const db = firebase.database();
const postsRef = db.ref("posts");
const usersRef = db.ref("users");

/* --------------------------------------------------
   2. キャラ絵文字
-------------------------------------------------- */
const charMap = { gal:"👧", ojou:"👸", nerd:"🤓", samurai:"⚔️" };

/* --------------------------------------------------
   3. タイムライン描画（ツリー型）
-------------------------------------------------- */
const nodeMap = new Map();          // id ⇒ DOM 要素

function createCard(id, post) {
  const card = document.createElement("article");
  card.className =
    "bg-white rounded shadow p-4 flex flex-col gap-1 w-full";

  /* インデント深さを style で（階層×1.5rem）*/
  const depth = calcDepth(post.parentId);
  card.style.marginLeft = `${depth * 1.5}rem`;

  const displayUser = `${charMap[localStorage.getItem("selectedChar")||"gal"]||""}${post.user}`;

  card.innerHTML = `
    <h2 class="font-bold text-pink-500">${displayUser}</h2>
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

/* 階層深さを再帰で計算 */
function calcDepth(pid, d=0){
  if(!pid) return d;
  const node = nodeMap.get(pid);
  return node ? calcDepth(node.dataset.parentId, d+1) : d+1;
}

/* 受信時にツリーとして挿入 */
function addPost(id, post) {
  const tl = document.getElementById("timeline");
  const card = createCard(id, post);
  card.dataset.parentId = post.parentId || "";

  if (!post.parentId) {
    tl.prepend(card);                        // ルート投稿
  } else {
    const parentEl = nodeMap.get(post.parentId);
    parentEl?.after(card);                  // 親の直後に挿入
  }
}

/* --------------------------------------------------
   4. UI ヘルパ
-------------------------------------------------- */
const replyInfo  = document.getElementById("reply-info");
const replyText  = document.getElementById("reply-text");
const replyCancel= document.getElementById("reply-cancel");
let   replyToId  = null;

function setReplyTarget(id, preview){
  replyToId = id;
  replyText.textContent = `返信先 ▶ ${preview.slice(0,15)}…`;
  replyInfo.classList.remove("hidden");
}
function clearReplyTarget(){
  replyToId = null;
  replyInfo.classList.add("hidden");
}

/* --------------------------------------------------
   5. ページ読み込み
-------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  /* 省略していた既存コード(ログイン/ログアウト/ニックネーム等)は
     全く変えていません —— 前回の app.js そのままです。*/

  /* — タイムラインリアルタイム受信 — */
  postsRef.on("child_added", snap => addPost(snap.key, snap.val()));

  /* — リプライボタン — */
  document.getElementById("timeline").addEventListener("click", e=>{
    const btn = e.target.closest("button[data-reply]");
    if(!btn) return;
    const targetId   = btn.dataset.reply;
    const previewTxt = btn.parentNode.querySelector("p").textContent;
    setReplyTarget(targetId, previewTxt);
    document.getElementById("post-content-input").focus();
  });

  /* — リプライ取消ボタン — */
  replyCancel.addEventListener("click", clearReplyTarget);

  /* — 送信処理 (元コード+replyToId) — */
  document.getElementById("post-form").addEventListener("submit", async e=>{
    e.preventDefault();
    const cur = firebase.auth().currentUser;
    if(!cur) return alert("ログインしないと投稿できないよ！");

    const content = document.getElementById("post-content-input").value.trim();
    if(!content) return;
    const filtered = await aiFilter(content);
    const ts = new Date().toISOString().slice(0,16).replace("T"," ");

    await postsRef.push({
      user: document.getElementById("post-user").value || "匿名",
      time: ts,
      content: filtered,
      parentId: replyToId || null
    });
    e.target.reset();
    clearReplyTarget();
  });
});
