/* --------------------------------------------------
   0. AI フィルタ（Cloudflare Worker）
-------------------------------------------------- */
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

/* --------------------------------------------------
   1. Firebase Refs（compat API）
-------------------------------------------------- */
const postsRef = firebase.database().ref("posts");
const usersRef = firebase.database().ref("users");

/* --------------------------------------------------
   2. キャラ絵文字
-------------------------------------------------- */
const charMap = {
  gal: "👧",
  ojou: "👸",
  nerd: "🤓",
  samurai: "⚔️"
};

/* --------------------------------------------------
   3. 投稿をタイムラインに追加
-------------------------------------------------- */
function addPost(post) {
  const selectedChar = localStorage.getItem("selectedChar") || "gal";
  const displayUser = `${charMap[selectedChar] || ""}${post.user}`;

  const tl = document.getElementById("timeline");
  const card = document.createElement("article");
  card.className =
    "post bg-white rounded shadow p-4 flex flex-col gap-1";

  card.innerHTML = `
    <h2 class="post-user font-bold text-pink-500">${displayUser}</h2>
    <p  class="post-time text-xs text-gray-400">${post.time}</p>
    <p  class="post-content mt-1 break-words">${post.content}</p>
  `;
  tl.prepend(card);
}

/* --------------------------------------------------
   4. ニックネーム登録モーダル
-------------------------------------------------- */
function showNicknameModal() {
  document.getElementById("nickname-modal").classList.remove("hidden");
}
function hideNicknameModal() {
  document.getElementById("nickname-modal").classList.add("hidden");
}

/* --------------------------------------------------
   5. ページ読み込み
-------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  /* ボタン / Provider */
  const loginBtn = document.getElementById("login-button");
  const logoutBtn = document.getElementById("logout-button");
  const provider = new firebase.auth.GoogleAuthProvider();
  const nameField = document.getElementById("post-user");

  /* ───── ログイン処理 ───── */
  loginBtn.addEventListener("click", async () => {
    try {
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;
      console.log("ログイン成功:", user.displayName);

      // 名前欄に Google 表示名
      if (nameField && user.displayName) {
        nameField.value = user.displayName;
        nameField.readOnly = true; // 🔥 ここ追加！編集禁止！
      }

      // ニックネーム登録済みか確認
      usersRef.child(user.uid).once("value", snap => {
        if (snap.exists()) {
          const nick = snap.val().nickname;
          if (nameField) nameField.value = nick;
        } else {
          showNicknameModal();
        }
      });

      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
    } catch (e) {
      console.error("ログイン失敗:", e);
    }
  });

  /* ───── ログアウト処理 ───── */
  logoutBtn.addEventListener("click", async () => {
    try {
      await firebase.auth().signOut();
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
      if (nameField) {
        nameField.value = "";
        nameField.readOnly = false;
      }
    } catch (e) {
      console.error("ログアウト失敗:", e);
    }
  });

  /* ───── ニックネーム登録ボタン ───── */
  document.getElementById("nickname-submit")
    .addEventListener("click", async () => {
      const nicknameInput = document.getElementById("nickname-input");
      const nickname = nicknameInput.value.trim();
      const user = firebase.auth().currentUser;

      if (!nickname || !user) {
        alert("ニックネームを入力してね！");
        return;
      }

      await usersRef.child(user.uid).set({ nickname });

      if (nameField) {
        nameField.value = nickname;
        nameField.readOnly = true; // 🔥 ここもreadonlyに！
      }

      hideNicknameModal();

      // 🔥 モーダル閉じたあとログアウトボタンも確実に表示
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
    });

  /* ───── Firebase からリアルタイム受信 ───── */
  postsRef.on("child_added", snap => addPost(snap.val()));

  /* ───── キャラ選択保存 ───── */
  const charSel = document.getElementById("char-select");
  charSel.value = localStorage.getItem("selectedChar") || "gal";
  charSel.addEventListener("change", () =>
    localStorage.setItem("selectedChar", charSel.value)
  );

  /* ───── 投稿送信 ───── */
  document.getElementById("post-form")
    .addEventListener("submit", async e => {
      e.preventDefault();

      const currentUser = firebase.auth().currentUser;
      if (!currentUser) {
        alert("ログインしないと投稿できないよ！");
        return;
      }

      const user = document.getElementById("post-user").value || "匿名";
      const text = document.getElementById("post-content-input").value;
      if (!text.trim()) return;

      const filtered = await aiFilter(text);
      const now = new Date();
      const ts = now.toISOString().slice(0, 16).replace("T", " ");

      postsRef.push({ user, time: ts, content: filtered });
      e.target.reset();
    });
});
