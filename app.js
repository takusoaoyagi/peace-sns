// 0. 本物 AIフィルタ関数
async function aiFilter(text) {
  const res = await fetch(
    "https://peace-sns-ai.takusoarts2.workers.dev/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    }
  );
  const data = await res.json();
  return data.filtered;
}

// 1. Firebase Realtime Database 参照（1 引数だけ）
const postsRef = firebaseRef("posts");

// 2. キャラクターと絵文字の対応表
const charMap = {
  gal: '👧',
  ojou: '👸',
  nerd: '🤓',
  samurai: '⚔️'
};

// 3. 投稿を画面に追加
function addPost(post) {
  const selectedChar = localStorage.getItem('selectedChar') || 'gal';
  const displayUser  = `${charMap[selectedChar] || ''}${post.user}`;
  const timeline     = document.getElementById('timeline');
  const article      = document.createElement('article');
  article.className  = 'post';
  article.innerHTML  = `
    <h2 class="post-user">${displayUser}</h2>
    <p class="post-time">${post.time}</p>
    <p class="post-content">${post.content}</p>
  `;
  timeline.prepend(article);
}

// 4. ページ読み込み時
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn  = document.getElementById('login-button');
  const logoutBtn = document.getElementById('logout-button');
  const provider  = new firebase.auth.GoogleAuthProvider();

  // ── ログイン
  loginBtn.addEventListener('click', async () => {
    try {
      await firebase.auth().signInWithPopup(provider);
      loginBtn.style.display  = 'none';
      logoutBtn.style.display = 'inline-block';
    } catch (e) {
      console.error('ログイン失敗', e);
    }
  });

  // ── ログアウト
  logoutBtn.addEventListener('click', async () => {
    try {
      await firebase.auth().signOut();
      loginBtn.style.display  = 'inline-block';
      logoutBtn.style.display = 'none';
    } catch (e) {
      console.error('ログアウト失敗', e);
    }
  });

  // ── Firebase からリアルタイムで受信
  firebaseOnChildAdded(postsRef, snap => addPost(snap.val()));

  // ── キャラ選択
  const charSel   = document.getElementById('char-select');
  charSel.value   = localStorage.getItem('selectedChar') || 'gal';
  charSel.addEventListener('change', () =>
    localStorage.setItem('selectedChar', charSel.value)
  );

  // ── 投稿送信
  document.getElementById('post-form').addEventListener('submit', async e => {
    e.preventDefault();

    const userInput    = document.getElementById('post-user').value || '匿名';
    const contentInput = document.getElementById('post-content-input').value;
    const filtered     = await aiFilter(contentInput);

    const now = new Date();
    const ts  = now.toISOString().slice(0,16).replace('T',' ');

    firebasePush(postsRef, { user: userInput, time: ts, content: filtered });
    e.target.reset();
  });
});
