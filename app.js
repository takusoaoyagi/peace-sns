/* Peace SNS app.js – 名前入力削除 + ギャル固定 + 連打防止フラグ版 */
const FACE="👧";                         // キャラ固定

async function aiFilter(t){
  const r=await fetch("https://peace-sns-ai.takusoarts2.workers.dev/",{
    method:"POST",headers:{ "Content-Type":"application/json"},body:JSON.stringify({text:t})
  });return (await r.json()).filtered;
}

const db=firebase.database();
const postsRef=db.ref("posts");
const usersRef=db.ref("users");
const nodeMap=new Map();

function depth(pid,d=0){return !pid?d:depth(nodeMap.get(pid)?.dataset.pid,d+1)}

function render(id,p){
  const art=document.createElement("article");
  art.className="bg-white rounded shadow p-4 flex flex-col gap-1 w-full";
  art.dataset.pid=p.parentId||"";
  art.style.marginLeft=`${depth(p.parentId)*1.5}rem`;
  art.innerHTML=`
    <h2 class="font-bold text-pink-500">${FACE}${p.user}</h2>
    <p  class="text-xs text-gray-400">${p.time}</p>
    <p  class="break-words">${p.content}</p>
    <button data-reply="${id}" class="mt-2 text-xs text-blue-500 hover:underline self-start">リプライ</button>`;
  nodeMap.set(id,art);

  const tl=document.getElementById("timeline");
  if(!p.parentId){ tl.prepend(art); return; }
  const parent=nodeMap.get(p.parentId)??tl;
  let cur=parent;
  while(cur.nextElementSibling && cur.nextElementSibling.style.marginLeft>parent.style.marginLeft){
    cur=cur.nextElementSibling;
  }
  cur.after(art);
}

/* ---------- ポップアップ ---------- */
const popup=document.getElementById("reply-popup");
const parTxt=document.getElementById("popup-parent");
const popInput=document.getElementById("popup-input");
let replyToId=null;

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

/* ---------- main ---------- */
document.addEventListener("DOMContentLoaded",()=>{
  const login=document.getElementById("login-button");
  const logout=document.getElementById("logout-button");
  const formWrap=document.getElementById("post-form-wrapper");
  let displayName="";

  login.onclick=async()=>{
    try{
      const {user}=await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
      const snap=await usersRef.child(user.uid).get();
      if(snap.exists()) displayName=snap.val().nickname;
      else document.getElementById("nickname-modal").classList.remove("hidden");

      login.classList.add("hidden");
      logout.classList.remove("hidden");
      formWrap.classList.remove("hidden");
    }catch(e){ alert("ログイン失敗: "+e.message); }
  };
  logout.onclick=async()=>{ await firebase.auth().signOut(); displayName=""; login.classList.remove("hidden"); logout.classList.add("hidden"); formWrap.classList.add("hidden"); };

  document.getElementById("nickname-submit").onclick=async()=>{
    const nick=document.getElementById("nickname-input").value.trim();
    const u=firebase.auth().currentUser; if(!nick||!u) return;
    await usersRef.child(u.uid).set({nickname:nick});
    displayName=nick;
    document.getElementById("nickname-modal").classList.add("hidden");
  };

  postsRef.on("child_added",s=>render(s.key,s.val()));

  document.getElementById("timeline").onclick=e=>{
    const b=e.target.closest("button[data-reply]");
    if(b) openPop(b.dataset.reply);
  };

  /* ---- 連打防止フラグ ---- */
  let sending=false;

  document.getElementById("popup-send").onclick=async()=>{
    if(sending) return; sending=true;
    try{
      if(!firebase.auth().currentUser) return alert("ログインしてね");
      const txt=popInput.value.trim(); if(!txt) return;
      const filtered=await aiFilter(txt);
      const ts=new Date().toISOString().slice(0,16).replace("T"," ");
      await postsRef.push({user:displayName||"匿名",time:ts,content:filtered,parentId:replyToId});
      closePop();
    }finally{ sending=false; }
  };

  document.getElementById("post-form").onsubmit=async e=>{
    e.preventDefault();
    if(sending) return; sending=true;
    try{
      if(!firebase.auth().currentUser) return alert("ログインしてね");
      const txt=document.getElementById("post-content-input").value.trim(); if(!txt) return;
      const filtered=await aiFilter(txt);
      const ts=new Date().toISOString().slice(0,16).replace("T"," ");
      await postsRef.push({user:displayName||"匿名",time:ts,content:filtered,parentId:null});
      e.target.reset();
    }finally{ sending=false; }
  };
});
