

// app.js

// 0. 本物 AIフィルタ関数
async function aiFilter(text) {
  const res = await fetch(
    "https://peace-sns-ai.takusoarts2.workers.dev/",  // ← 末尾スラッシュ付きでOK
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    }
  );
  const data = await res.json();
  return data.filtered;
}

// ── Firebase Realtime Database 参照 ──
const postsRef = db.ref("posts");  // /posts ノードを参照


// 1. 初期サンプル投稿
const defaultPosts = [
  { user: '匿名', time: '2025-04-27 15:00', content: 'マジ最高の1日だった〜🌈💖' },
  { user: '匿名', time: '2025-04-27 14:30', content: 'おやつタイムがサイコー🍪✨' }
];

// キャラクターと絵文字の対応表（絵文字だけにしました）
const charMap = {
  gal: '👧',
  ojou: '👸',
  nerd: '🤓',
  samurai: '⚔️'
};


// 2. localStorage から読み込む
function loadPosts() {
  const saved = localStorage.getItem('posts');
  if (saved) {
    return JSON.parse(saved);
  } else {
    savePosts(defaultPosts);
    return defaultPosts;
  }
}

// 3. localStorage に保存
function savePosts(posts) {
  localStorage.setItem('posts', JSON.stringify(posts));
}

// 投稿リスト格納用
let posts = [];

// 4. 投稿を画面に追加＆必要なら保存
function addPost(post, save = true) {
  const selectedChar = localStorage.getItem('selectedChar') || 'gal';
// 画面に表示するときのユーザー名（絵文字＋本名）
const displayUser = `${charMap[selectedChar] || ''}${post.user}`;
  const timeline = document.getElementById('timeline');
  const article = document.createElement('article');
  article.className = 'post';
  article.innerHTML = `
    <h2 class="post-user">${displayUser}</h2>
    <p class="post-time">${post.time}</p>
    <p class="post-content">${post.content}</p>
  `;
  timeline.prepend(article);

  if (save) {
    posts.unshift(post);
    savePosts(posts);
  }
}

// 5. ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', () => {
    // ── Firebase から既存＆新着投稿をリアルタイムで受け取る ──
  postsRef
    .limitToLast(50)
    .on('child_added', snapshot => {
      const post = snapshot.val();
      addPost(post, false);  // 画面描画のみ、DBには再保存しない
    });
  // posts = loadPosts();          // ← コメントアウト
  // posts.forEach(p => addPost(p, false));  // ← コメントアウト

  // キャラ選択の初期化
  const charSelect = document.getElementById('char-select');
  const savedChar = localStorage.getItem('selectedChar') || 'gal';
  charSelect.value = savedChar;
  charSelect.addEventListener('change', () => {
    localStorage.setItem('selectedChar', charSelect.value);
  });

  // 投稿を読み込んで画面表示
  posts = loadPosts();
  posts.forEach(p => addPost(p, false));

  // フォーム送信時
  const form = document.getElementById('post-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const userInput = document.getElementById('post-user').value || '匿名';
    const contentInput = document.getElementById('post-content-input').value;

    // ダミーAIフィルタを通す
    const filteredContent = await aiFilter(contentInput);

    const now = new Date();
    const timestamp = now.toISOString().slice(0,16).replace('T',' ');

    // Firebase に保存すると child_added で自動描画されます
    postsRef.push({ user: userInput, time: timestamp, content: filteredContent });

    form.reset();

    
  });
});
