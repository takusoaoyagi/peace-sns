// app.js

// 1. 初期サンプル投稿
const defaultPosts = [
  { user: '匿名', time: '2025-04-27 15:00', content: 'マジ最高の1日だった〜🌈💖' },
  { user: '匿名', time: '2025-04-27 14:30', content: 'おやつタイムがサイコー🍪✨' }
];

// 0. ダミーAIフィルタ関数（ここが“フェイクAPI”）
async function aiFilter(text) {
  // 500ms 待って「AIチェック済」風に書き換え
  await new Promise(r => setTimeout(r, 500));
  return text + ' （AIチェック済♡）';
}

// キャラ → 表示名マップ
const charMap = {
  gal: '👧 高校生ギャルちゃん',
  samurai: '🗡️ 侍くん',
  ojou: '👸 お嬢様',
  nerd: '🤓 オタクくん'
};

function loadPosts() {
  const saved = localStorage.getItem('posts');
  if (saved) return JSON.parse(saved);
  savePosts(defaultPosts);
  return defaultPosts;
}
function savePosts(posts) {
  localStorage.setItem('posts', JSON.stringify(posts));
}

let posts = [];

function addPost(post, save = true) {
  const selectedChar = localStorage.getItem('selectedChar') || 'gal';
  const displayUser = `${charMap[selectedChar]} ${post.user}`;
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

document.addEventListener('DOMContentLoaded', () => {
  // キャラ選択の初期設定
  const charSelect = document.getElementById('char-select');
  const savedChar = localStorage.getItem('selectedChar') || 'gal';
  charSelect.value = savedChar;
  charSelect.addEventListener('change', () => {
    localStorage.setItem('selectedChar', charSelect.value);
  });

  // 投稿ロード
  posts = loadPosts();
  posts.forEach(p => addPost(p, false));

  // フォーム送信
form.addEventListener('submit', async e => {
  e.preventDefault();
  const userInput = document.getElementById('post-user').value || '匿名';
  const contentInput = document.getElementById('post-content-input').value;

  // ① ダミーAIフィルタに投げて書き換え結果を受け取る
  const filteredContent = await aiFilter(contentInput);

  const now = new Date();
  const timestamp = now.toISOString().slice(0,16).replace('T',' ');

  // ② フィルタ後のテキストで投稿を追加
  addPost({ user: userInput, time: timestamp, content: filteredContent });
  form.reset();
});

