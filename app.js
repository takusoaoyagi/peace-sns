/* ---------- 0. AI フィルタ ---------- */
async function aiFilter(text){
  const r = await fetch("https://peace-sns-ai.takusoarts2.workers.dev/",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ text })
  });
  return (await r.json()).filtered;
}

/* ---------- 1. Firebase ---------- */
const db        = firebase.database();
const postsRef  = db.ref("posts");
const usersRef  = db.ref("users");

/* ---------- 2. 固定キャラ：ギャル ---------- */
const FACE = "👧";

/* ---------- 3. タイムライン描画 ---------- */
const nodeMap = new Map();                     // id → DOM

function depth(pid,d=0){return !pid?d:depth(nodeMap.get(pid)?.dataset.pid,d+1)}

function render(id, post){
  const art = document.createElement("article");
  art.className = "bg-white rounded shadow p-4 flex flex-col gap-1 w-full";
  art.dataset.pid = post.parentId || "";
  art.style.marginLeft = `${depth(post.parentId)*1.5}rem`;
  art.innerHTML = `
    <h2 class="font-bold text-pink-500">${FACE}${post.user}</h2>
    <p  class="text-xs text-gray-400">${post.time}</p>
    <p  class="break-words">${post.content}</p>
    <button data-reply="${id}" class="mt-2 text-xs text-blue-500 hover:underline self-start">リプライ</button>`;
  nodeMap.set(id, art);

  const tl = document.getElementById("timeline");
  if(!post.parentId){ tl.prepend(art); return; }

  const parent = nodeMap.get(post.parentId);
  if(!parent){ tl.prepend(art); return; }

  let cur = parent;
  while(cur.nextElementSibling &&
        cur.nextElementSibling.style.marginLeft > parent.style.marginLeft){
    cur = cur.nextElementSibling;
  }
  cur.after(art);
}

/* ---------- 4. 返信ポップアップ ---------- */
const popup      = document.getElementById("reply-popup");
const parTxt     = document.getElementById("popup-parent");
const popInput   = document.getElementById("popup-input");
let   replyToId  = null;

function openPop(id){
  const src = nodeMap.get(id);
  parTxt.textContent = src.querySelector("p.break-words").textContent;
  popInput.value = "";
  popInput.focus();
  popup.classList.remove("hidden");
  replyToId = id;
}
function closePop(){ popup.classList.add("hidden"); replyToId = null; }

document.getElementById("popup-close").onclick  = closePop;
document.getElementById("reply-cancel").onclick = closePop;

/* ---------- 5. DOMContentLoaded ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const loginB  = document.getElementById("login-button");
  const logoutB = document.getElementById("logout-button");
  const formW   = document.getElementById("post-form-wrapper");
  let   displayName = "";                                  // ニックネーム保持

  /* ログイン */
  loginB.onclick = async () => {
    try{
      const { user } = await firebase.auth().signInWithPopup(
        new firebase.auth.GoogleAuthProvider()
      );

      /* ニックネーム取得 or 登録モーダル */
      const snap = await usersRef.child(user.uid).get();
      if(snap.exists()){
        displayName = snap.val().nickname;
      }else{
        document.getElementById("nickname-modal").classList.remove("hidden");
      }

      loginB.classList.add("hidden");
      logoutB.classList.remove("hidden");
      formW.classList.remove("hidden");
    }catch(e){
      alert("ログイン失敗: " + e.message);
    }
  };

  /* ログアウト */
  logoutB.onclick = async () => {
    await firebase.auth().signOut();
    displayName = "";
    loginB.classList.remove("hidden");
    logoutB.classList.add("hidden");
    formW.classList.add("hidden");
  };

  /* ニックネーム登録 */
  document.getElementById("nickname-submit").onclick = async () => {
    const nick = document.getElementById("nickname-input").value.trim();
    const u = firebase.auth().currentUser;
    if(!nick || !u) return;
    await usersRef.child(u.uid).set({ nickname: nick });
    displayName = nick;
    document.getElementById("nickname-modal").classList.add("hidden");
  };

  /* タイムライン取得 */
  postsRef.on("child_added", snap => render(snap.key, snap.val()));

  /* リプライボタン */
  document.getElementById("timeline").onclick = e => {
    const b = e.target.closest("button[data-reply]");
    if(b) openPop(b.dataset.reply);
  };

  /* ポップアップ送信 */
  document.getElementById("popup-send").onclick = async () => {
    if(!firebase.auth().currentUser) return alert("ログインしてね");
    const txt = popInput.value.trim();
    if(!txt) return;
    const filtered = await aiFilter(txt);
    const ts = new Date().toISOString().slice(0,16).replace("T"," ");
    await postsRef.push({
      user     : displayName || "匿名",
      time     : ts,
      content  : filtered,
      parentId : replyToId
    });
    closePop();
  };

  /* 通常投稿送信 */
  document.getElementById("post-form").onsubmit = async e => {
    e.preventDefault();
    if(!firebase.auth().currentUser) return alert("ログインしてね");
    const txt = document.getElementById("post-content-input").value.trim();
    if(!txt) return;
    const filtered = await aiFilter(txt);
    const ts = new Date().toISOString().slice(0,16).replace("T"," ");
    await postsRef.push({
      user     : displayName || "匿名",
      time     : ts,
      content  : filtered,
      parentId : null
    });
    e.target.reset();
  };
});
