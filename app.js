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
    savePosts(defaultPosts);
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
  timeline.prepend(article);

  if (save) {
    posts.unshift(post);      // 配列の先頭に追加
    savePosts(posts);         // localStorage に保存
  }
}

// 5. ページロード時に実行
document.addEventListener('DOMContentLoaded', () => {
  posts = loadPosts();                         // 保存データ or デフォルト
  posts.forEach(post => addPost(post, false)); // false で再保存させない

  // フォーム送信処理
  const form = document.getElementById('post-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const userInput = document.getElementById('post-user').value;
    const contentInput = document.getElementById('post-content-input').value;
    const now = new Date();
    const timestamp = now.toISOString().slice(0,16).replace('T',' ');
    addPost({ user: userInput, time: timestamp, content: contentInput });
    form.reset();
  });
});
