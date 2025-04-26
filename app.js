// app.js

// 1. 初期サンプル投稿
const defaultPosts = [
  { user: '匿名', time: '2025-04-27 15:00', content: 'マジ最高の1日だった〜🌈💖' },
  { user: '匿名', time: '2025-04-27 14:30', content: 'おやつタイムがサイコー🍪✨' }
];

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
  const form = document.getElementById('post-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const userInput = document.getElementById('post-user').value || '匿名';
    const contentInput = document.getElementById('post-content-input').value;
    const now = new Date();
    const timestamp = now.toISOString().slice(0,16).replace('T',' ');
    addPost({ user: userInput, time: timestamp, content: contentInput });
    form.reset();
  });
});
