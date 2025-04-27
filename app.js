/* -------------------------------------------------- 0. AI フィルタ */
async function aiFilter(text) {
  const r = await fetch("https://peace-sns-ai.takusoarts2.workers.dev/", {
    method : "POST",
    headers: { "Content-Type": "application/json" },
    body   : JSON.stringify({ text })
  });
  return (await r.json()).filtered;
}

/* -------------------------------------------------- 1. Firebase Ref */
const db        = firebase.database();
const postsRef  = db.ref("posts");
const usersRef  = db.ref("users");

/* -------------------------------------------------- 2. キャラ絵文字 */
const charMap = { gal:"👧", ojou:"👸", nerd:"🤓", samurai:"⚔️" };

/* -------------------------------------------------- 3. タイムライン描画 */
const nodeMap = new Map();                  // id → DOM

function depthOf(pid,d=0){return!pid?d:depthOf(nodeMap.get(pid)?.dataset.parentId,d+1)}

function renderPost(id, post){
  const card = document.createElement("article");
  card.className = "bg-white rounded shadow p-4 flex flex-col gap-1 w-full";
  card.dataset.parentId = post.parentId||"";
  card.style.marginLeft  = `${depthOf(post.parentId)*1.5}rem`;

  const dispName = `${charMap[ localStorage.getItem("selectedChar")||"gal" ]||""}${post.user}`;
  card.innerHTML = `
    <h2 class="font-bold text-pink-500">${dispName}</h2>
    <p  class="text-xs text-gray-400">${post.time}</p>
    <p  class="break-words">${post.content}</p>
    <button data-reply="${id}" class="mt-2 text-xs text-blue-500 hover:underline self-start">リプライ</button>
  `;
  nodeMap.set(id, card);

  const tl = document.getElementById("timeline");
  if(!post.parentId){ tl.prepend(card); return; }

  const parent=nodeMap.get(post.parentId);
  if(!parent){ tl.prepend(card); return; }

  let cur=parent;
  while(cur.nextElementSibling && cur.nextElementSibling.style.marginLeft===parent.style.marginLeft){
    cur=cur.nextElementSibling;
  }
  cur.after(card);
}

/* -------------------------------------------------- 4. 返信ポップアップ */
const popup      = document.getElementById("reply-popup");
const popupPar   = document.getElementById("popup-parent");
const popupInput = document.getElementById("popup-input");
let   replyToId  = null;

function openPopup(id){
  const src = nodeMap.get(id);
  popupPar.textContent = src.querySelector("p.break-words").textContent;
  popup.classList.remove("hidden");
  popupInput.value="";
  popupInput.focus();
  replyToId = id;
}
function closePopup(){ popup.classList.add("hidden"); replyToId=null; }

document.getElementById("popup-close").onclick = closePopup;
document.getElementById("reply-cancel") .onclick = closePopup;

/* -------------------------------------------------- 5. ページロード */
document.addEventListener("DOMContentLoaded",()=>{
  const loginBtn  = document.getElementById("login-button");
  const logoutBtn = document.getElementById("logout-button");
  const formWrap  = document.getElementById("post-form-wrapper");
  const nameField = document.getElementById("post-user");
  const provider  = new firebase.auth.GoogleAuthProvider();

  /* ---------- Google ログイン ---------- */
  loginBtn.addEventListener("click",async()=>{
    try{
      const {user} = await firebase.auth().signInWithPopup(provider);
      nameField.value    = user.displayName||"";
      nameField.readOnly = true;

      usersRef.child(user.uid).once("value",s=>{
        if(s.exists()) nameField.value=s.val().nickname;
        else document.getElementById("nickname-modal").classList.remove("hidden");
      });

      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      formWrap.classList.remove("hidden");
    }catch(e){
      alert("ポップアップがブロックされていないか確認してください");
    }
  });

  logoutBtn.onclick = async()=>{
    await firebase.auth().signOut();
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    formWrap.classList.add("hidden");
    nameField.value=""; nameField.readOnly=false;
  };

  document.getElementById("nickname-submit").onclick = async()=>{
    const nick = document.getElementById("nickname-input").value.trim();
    const user = firebase.auth().currentUser;
    if(!nick||!user) return;
    await usersRef.child(user.uid).set({nickname:nick});
    nameField.value=nick; nameField.readOnly=true;
    document.getElementById("nickname-modal").classList.add("hidden");
  };

  /* ---------- 投稿取得 ---------- */
  postsRef.on("child_added", s=>renderPost(s.key, s.val()));

  /* ---------- 「リプライ」ボタン ---------- */
  document.getElementById("timeline").addEventListener("click",e=>{
    const btn=e.target.closest("button[data-reply]");
    if(btn) openPopup(btn.dataset.reply);
  });

  /* ---------- ポップアップ送信 ---------- */
  document.getElementById("popup-send").onclick = async()=>{
    if(!firebase.auth().currentUser) return alert("ログインしてね");
    const txt = popupInput.value.trim();
    if(!txt) return;
    const filtered = await aiFilter(txt);
    const ts = new Date().toISOString().slice(0,16).replace("T"," ");
    await postsRef.push({
      user    : nameField.value||"匿名",
      time    : ts,
      content : filtered,
      parentId: replyToId
    });
    closePopup();
  };

  /* ---------- 通常投稿送信 ---------- */
  document.getElementById("post-form").addEventListener("submit",async e=>{
    e.preventDefault();
    if(!firebase.auth().currentUser) return alert("ログインしてね");
    const t=document.getElementById("post-content-input").value.trim();
    if(!t) return;
    const filtered=await aiFilter(t);
    const ts=new Date().toISOString().slice(0,16).replace("T"," ");
    await postsRef.push({user:nameField.value||"匿名",time:ts,content:filtered,parentId:null});
    e.target.reset();
  });

  /* ---------- キャラ選択保持 ---------- */
  const sel=document.getElementById("char-select");
  sel.value=localStorage.getItem("selectedChar")||"gal";
  sel.onchange=()=>localStorage.setItem("selectedChar",sel.value);
});
