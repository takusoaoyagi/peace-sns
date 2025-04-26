// app.js

// 既存のサンプル投稿データ
const posts = [
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

// 投稿を画面に追加する関数
function addPost(post) {
  const timeline = document.getElementById('timeline');
  const article = document.createElement('article');
  article.className = 'post';
  article.innerHTML = `
    <h2 class="post-user">${post.user}</h2>
    <p class="post-time">${post.time}</p>
    <p class="post-content">${post.content}</p>
  `;
  timeline.prepend(article); // 先頭に追加
}

// 初期投稿とフォーム連携
document.addEventListener('DOMContentLoaded', () => {
  // 初期投稿をレンダリング
  posts.forEach(addPost);

  // フォーム送信時の動き
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
