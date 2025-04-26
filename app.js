// app.js
// 1. サンプル投稿データを配列で定義
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

// 2. DOMが読み込まれたらタイムラインに投稿を並べる
function renderPosts() {
  const timeline = document.getElementById('timeline');
  posts.forEach(post => {
    const article = document.createElement('article');
    article.className = 'post';
    article.innerHTML = `
      <h2 class="post-user">${post.user}</h2>
      <p class="post-time">${post.time}</p>
      <p class="post-content">${post.content}</p>
    `;
    timeline.appendChild(article);
  });
}

// 3. ページ読み込み完了で実行
document.addEventListener('DOMContentLoaded', renderPosts);
