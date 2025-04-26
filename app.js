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

// 1. Firebase Realtime Database 参照
const postsRef = firebaseRef(db, "posts");

// 2. キャラクターと絵文字の対応表
const charMap = {
  gal: '👧',
  ojou: '👸',
  nerd: '🤓',
  samurai: '⚔️'
};

// 3. 投稿を画面に追加
function addPost(post, save = true) {
  const selectedChar = localStorage.getItem('selectedChar') || 'gal';
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
}

// 4. ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', () => {

  // Firebase からリアルタイムで投稿を受け取る
  firebaseOnChildAdded(postsRef, (snapshot) => {
    const post = snapshot.val();
    addPost(post, false);
  });

  // キャラ選択の初期化
  const charSelect = document.getElementById('char-select');
  const savedChar = localStorage.getItem('selectedChar') || 'gal';
  charSelect.value = savedChar;
  charSelect.addEventListener('change', () => {
    localStorage.setItem('selectedChar', charSelect.value);
  });

  // フォーム送信時
  const form = document.getElementById('post-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const userInput = document.getElementById('post-user').value || '匿名';
    const contentInput = document.getElementById('post-content-input').value;

    const filteredContent = await aiFilter(contentInput);

    const now = new Date();
    const timestamp = now.toISOString().slice(0, 16).replace('T', ' ');

    // Firebase に投稿を保存
    firebasePush(postsRef, {
      user: userInput,
      time: timestamp,
      content: filteredContent
    });

    form.reset();
  });
});
