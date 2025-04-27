/* ---------- 0. AI フィルタ ---------- */
async function aiFilter(text){
  const r = await fetch("https://peace-sns-ai.takusoarts2.workers.dev/",{
    method:"POST", headers:{ "Content-Type":"application/json"},
    body:JSON.stringify({text})
  });
  return (await r.json()).filtered;
}

/* ---------- 1. Firebase ---------- */
const db        = firebase.database();
const postsRef  = db.ref("posts");
const usersRef  = db.ref("users");

/* ---------- 2. キャラ絵文字 ---------- */
const charMap = { gal:"👧", ojou:"👸", nerd:"🤓", samurai:"⚔️" };

/* ---------- 3. タイムライン描画 ---------- */
const nodeMap = new Map();               // id → DOM ノード

function depth(pid,d=0){return !pid?d:depth(nodeMap.get(pid)?.dataset.pid,d+1)}

function render(id,post){
  const card=document.createElement("article");
  card.className="bg-white rounded shadow p-4 flex flex-col gap-1 w-full";
  card.dataset.pid=post.parentId||"";
  card.style.marginLeft=`${depth(post.parentId)*1.5}rem`;

  const face = charMap[localStorage.getItem("selectedChar")||"gal"]||"";
  card.innerHTML=`
    <h2 class="font-bold text-pink-500">${face}${post.user}</h2>
    <p  class="text-xs text-gray-400">${post.time}</p>
    <p  class="break-words">${post.content}</p>
    <button data-reply="${id}"
            class="mt-2 text-xs text-blue-500 hover:underline self-start">リプライ</button>`;
  nodeMap.set(id,card);

  const tl=document.getElementById("timeline");
  if(!post.parentId){ tl.prepend(card); return; }

  const parent=nodeMap.get(post.parentId);
  if(!parent){ tl.prepend(card); return; }

  let cur=parent;
  while(cur.nextElementSibling &&
        cur.nextElementSibling.style.marginLeft>parent.style.marginLeft){
    cur=cur.nextElementSibling;
  }
  cur.after(card);
}

/* ---------- 4. 返信ポップアップ ---------- */
const popup     = document.getElementById("reply-popup");
const parTxt    = document.getElementById("popup-parent");
const popInput  = document.getElementById("popup-input");
let   replyToId = null;

function openPop(id){
  const src=nodeMap.get(id);
  parTxt.textContent=src.querySelector("p.break-words").textContent;
  popInput.value=""; popInput.focus();
  popup.classList.remove("hidden");
  replyToId=id;
}
function closePop(){ popup.classList.add("hidden"); replyToId=null; }

document.getElementById("popup-close").onclick=closePop;
document.getElementById("reply-cancel").onclick=closePop;

/* ---------- 5. DOMContentLoaded ---------- */
document.addEventListener("DOMContentLoaded",()=>{
  /* 5-1 ログイン / ログアウト */
  const login  = document.getElementById("login-button");
  const logout = document.getElementById("logout-button");
  const formW  = document.getElementById("post-form-wrapper");
  const nameEl = document.getElementById("post-user");
  const prov   = new firebase.auth.GoogleAuthProvider();

  login.onclick=async()=>{
    try{
      const {user}=await firebase.auth().signInWithPopup(prov);

      // 名前欄固定
      nameEl.value=user.displayName||""; nameEl.readOnly=true;

      // ニックネーム確認
      const s=await usersRef.child(user.uid).get();
      if(s.exists()) nameEl.value=s.val().nickname;
      else document.getElementById("nickname-modal").classList.remove("hidden");

      login.classList.add("hidden");
      logout.classList.remove("hidden");
      formW.classList.remove("hidden");
    }catch(e){
      alert("ログイン出来ませんでした\n" + e.message);
    }
  };

  logout.onclick=async()=>{
    await firebase.auth().signOut();
    login.classList.remove("hidden");
    logout.classList.add("hidden");
    formW.classList.add("hidden");
    nameEl.value=""; nameEl.readOnly=false;
  };

  /* 5-2 ニックネーム登録 */
  document.getElementById("nickname-submit").onclick=async()=>{
    const nick=document.getElementById("nickname-input").value.trim();
    const u=firebase.auth().currentUser;
    if(!nick||!u) return;
    await usersRef.child(u.uid).set({nickname:nick});
    nameEl.value=nick; nameEl.readOnly=true;
    document.getElementById("nickname-modal").classList.add("hidden");
  };

  /* 5-3 タイムライン */
  postsRef.on("child_added",s=>render(s.key,s.val()));

  /* 5-4 リプライボタン */
  document.getElementById("timeline").onclick=e=>{
    const b=e.target.closest("button[data-reply]");
    if(b) openPop(b.dataset.reply);
  };

  document.getElementById("popup-send").onclick=async()=>{
    const u=firebase.auth().currentUser;
    if(!u) return alert("ログインしてね");
    const txt=popInput.value.trim(); if(!txt) return;
    const filtered=await aiFilter(txt);
    const ts=new Date().toISOString().slice(0,16).replace("T"," ");
    await postsRef.push({user:nameEl.value||"匿名",time:ts,content:filtered,parentId:replyToId});
    closePop();
  };

  /* 5-5 通常投稿 */
  document.getElementById("post-form").onsubmit=async e=>{
    e.preventDefault();
    if(!firebase.auth().currentUser) return alert("ログインしてね");
    const t=document.getElementById("post-content-input").value.trim();
    if(!t) return;
    const filtered=await aiFilter(t);
    const ts=new Date().toISOString().slice(0,16).replace("T"," ");
    await postsRef.push({user:nameEl.value||"匿名",time:ts,content:filtered,parentId:null});
    e.target.reset();
  };

  /* 5-6 キャラ選択保持 */
  const sel=document.getElementById("char-select");
  sel.value=localStorage.getItem("selectedChar")||"gal";
  sel.onchange=()=>localStorage.setItem("selectedChar",sel.value);
});
