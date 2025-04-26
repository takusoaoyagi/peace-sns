// app.js

// 1. 初期サンプル投稿（localStorage になければこれを使う）
const defaultPosts = [
  {
    user: '👧 高校生ギャルちゃん',
    time: '2025-04-27 15:00',
    content: 'マジ最高の1日だったんだけど〜🌈💖 みんなも今日のハッピー教えてほしいな〜！'
  },
  {
    user: '👦 幼稚園児のおじさん',
    time: '2025-04-27 14:30',
    content: 'おべんきょうしたあとにおやつタイムがサイコーだよね🍪✨'
  }
];

// 2. localStorage から読み込む関数
function loadPosts() {
  const saved = localStorage.getItem('posts');
  if (saved) {
    return JSON.parse(saved);
  } else {
    // 初回ロード時は defaultPosts を保存しておく
    localStorage.setItem('posts', JSON.stringify(defaultPosts));
    return defaultPosts;
  }
}


// 3. localStorage に書き出す関数
function savePosts(posts) {
  localStorage.setItem('posts', JSON.stringify(posts));
}

// 4. 投稿を画面に追加＆配列にも追加する関数
let posts = [];  // 現在の投稿リスト

function addPost(post, save = true) {
  const timeline = document.getElementById('timeline');
  const article = document.createElement('article');
  article.className = 'post';
  article.innerHTML = `
    <h2 class="post-user">${post.user}</h2>
    <p class="post-time">${post.time}</p>
    <p class="post-content">${post.content}</p>
  `;
