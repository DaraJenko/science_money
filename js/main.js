/* =============================================
   main.js — ノートの余白
   ジャンル / サブジャンルの切り替えと記事一覧の描画を管理します
   ============================================= */

/* ----- ジャンル名の対応表 -----
 * 英語キーから日本語表示名を引くための対応表です。
 */
const genreNames = {
  all:     "新着記事",
  physics: "物理",
  math:    "数学",
  it:      "IT",
  deals:   "お得情報",
};

/* ----- HTML要素の取得 -----
 * 操作対象の要素をあらかじめ変数に入れておきます。
 */
const listEl        = document.getElementById("article-list");
const titleEl       = document.getElementById("genre-title");
const codeEl        = document.getElementById("genre-code");
const countEl       = document.getElementById("genre-count");
const subBarEl      = document.getElementById("subgenre-bar");
const subInnerEl    = document.getElementById("subgenre-inner");

/* ----- 状態管理 -----
 * 現在選択中のジャンル・サブジャンルを1か所にまとめておく。
 * URLの ?genre=xxx&sub=yyy から初期値を読み込めるようにする。
 */
const params = new URLSearchParams(location.search);
const state = {
  genre: params.get("genre") || "all",
  sub:   params.get("sub")   || null, // nullのときは「そのジャンルの全部」
};

/* ----- URLを書き換える -----
 * ページ遷移はしないが、リンクを共有・再読み込みしたときに
 * 同じ絞り込み状態を再現できるようにアドレスバーだけ更新する。
 */
function updateUrl() {
  const url = new URL(location.href);
  if (state.genre === "all") {
    url.searchParams.delete("genre");
    url.searchParams.delete("sub");
  } else {
    url.searchParams.set("genre", state.genre);
    if (state.sub) {
      url.searchParams.set("sub", state.sub);
    } else {
      url.searchParams.delete("sub");
    }
  }
  history.replaceState(null, "", url);
}

/* ----- サブジャンル一覧の生成 -----
 * 記事データの中から、指定ジャンルに含まれるサブジャンルを
 * 登場順・重複なしで抜き出す。
 */
function collectSubGenres(articles, genre) {
  const seen = new Map(); // key: subGenre, value: subGenreLabel
  articles
    .filter(a => a.genre === genre)
    .forEach(a => {
      if (a.subGenre && !seen.has(a.subGenre)) {
        seen.set(a.subGenre, a.subGenreLabel);
      }
    });
  return seen;
}

/* ----- サブジャンルバーの描画 -----
 * 「すべて」ジャンルのときはバーごと隠す。
 * それ以外のときは「(ジャンル)すべて」＋各サブジャンルのボタンを並べる。
 */
function renderSubGenreBar(articles) {
  if (state.genre === "all") {
    subBarEl.classList.remove("visible");
    subInnerEl.innerHTML = "";
    return;
  }

  const subGenres = collectSubGenres(articles, state.genre);

  const allBtn = `<button class="subgenre-btn${state.sub ? "" : " active"}" data-sub="">${genreNames[state.genre]}すべて</button>`;

  const subBtns = [...subGenres.entries()].map(([key, label]) => `
    <button class="subgenre-btn${state.sub === key ? " active" : ""}" data-sub="${key}">${label}</button>
  `).join("");

  subInnerEl.innerHTML = allBtn + subBtns;
  subBarEl.classList.add("visible");

  // ボタンにクリックイベントを登録する
  subInnerEl.querySelectorAll(".subgenre-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.sub = btn.dataset.sub || null;
      renderSubGenreBar(articles); // active状態を更新するため再描画
      render(articles);
      updateUrl();
    });
  });
}

/* ----- render 関数 -----
 * 現在の state（ジャンル・サブジャンル）で記事一覧を絞り込み、画面を更新します。
 */
function render(articles) {
  // 選択中のジャンル・サブジャンルで絞り込み、新着順に並び替える
  const filtered = articles
    .filter(a => state.genre === "all" || a.genre === state.genre) // ジャンルで絞り込む
    .filter(a => !state.sub || a.subGenre === state.sub)           // サブジャンルで絞り込む（未選択なら素通し）
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // sort()は2要素を比較した結果が負のときaが先、正のときbが先。そのため、b-aは降順(新着順)、a-bは昇順。

  // 記事一覧をHTMLに変換して<ul>に書き込む
  // タグ部分は<span>ではなく<button>にして、クリックでそのサブジャンル一覧に絞り込めるようにする。
  // `(バッククォート)で囲むとテンプレートリテラルになり、${}で変数を文字列中に埋め込める。
  listEl.innerHTML = filtered.map(a => `
    <li>
      <a href="${a.url}">
        <span class="date">${a.date}</span>
        <button type="button" class="tag" data-genre="${a.genre}" data-sub="${a.subGenre || ""}">${a.subGenreLabel || a.genreLabel}</button>
        <span class="title">${a.title}</span>
      </a>
    </li>
  `).join("");

  // 一覧内のタグボタンにクリックイベントを登録する
  // ここでは記事へのリンク(<a>)の内側にあるボタンなので、
  // クリックが親の<a>まで伝わらないよう stopPropagation で止める。
  listEl.querySelectorAll(".tag").forEach(tagBtn => {
    tagBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectGenre(articles, tagBtn.dataset.genre, tagBtn.dataset.sub || null);
    });
  });

  // セクション見出しを更新する
  const subLabel = state.sub
    ? (filtered[0]?.subGenreLabel || [...collectSubGenres(articles, state.genre)].find(([k]) => k === state.sub)?.[1])
    : null;
  titleEl.textContent = subLabel ? `${genreNames[state.genre]} - ${subLabel}` : genreNames[state.genre];
  codeEl.textContent  = state.sub ? state.sub.toUpperCase() : state.genre.toUpperCase();
  countEl.textContent = `${filtered.length}件`;
}

/* ----- ジャンル・サブジャンルの選択をまとめて行う -----
 * ジャンルボタンのクリック、記事一覧のタグのクリックなど、
 * 「表示するジャンル・サブジャンルを切り替える」処理を1か所にまとめる。
 */
function selectGenre(articles, genre, sub) {
  state.genre = genre;
  state.sub = sub;

  // ジャンルボタンのactive状態を更新する
  document.querySelectorAll(".genre-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.genre === genre);
  });

  renderSubGenreBar(articles);
  render(articles);
  updateUrl();

  // ページ上部（ジャンルメニュー付近）にスクロールして、切り替わったことが分かりやすいようにする
  document.querySelector("nav.genre-bar").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ----- ジャンルボタンのクリックイベント -----
 * ボタンがクリックされたら active クラスを付け替えて render を呼び出します。
 * articlesを引数として受け取るため、fetch完了後にイベントを登録します。
 */
function setupButtons(articles) {
  document.querySelectorAll(".genre-btn").forEach(btn => { // querySelectorAll:CSSセレクタが使える。getElementByClassだとclass名だけでしか指定できないし、forEachも使えない。
    btn.addEventListener("click", () => {
      // ジャンルを切り替えるときはサブジャンルの絞り込みをリセットする
      selectGenre(articles, btn.dataset.genre, null);
    });
  });
}

/* ----- JSONファイルの読み込みと初期表示 -----
 * fetch()でarticles.jsonを非同期に読み込み、完了後に描画します。
 * 記事を追加するときは articles.json に1行追加するだけです。
 * ?v=${Date.now()} はキャッシュバスティング。毎回異なるURLにすることで
 * ブラウザが古いキャッシュを使わず、常に最新のJSONを取得するようにします。
 */
fetch(`articles.json?v=${Date.now()}`)
  .then(res => res.json())      // レスポンスをJSONとして解析して、配列を返す。
  .then(articles => {
    setupButtons(articles);     // ボタンのイベントを登録する

    // URLパラメータから初期状態を復元し、ジャンルボタンのactive状態も合わせる
    document.querySelectorAll(".genre-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.genre === state.genre);
    });

    renderSubGenreBar(articles);
    render(articles);           // 初期表示（URLの指定 or 全記事）
  })
  .catch(err => {
    // 読み込みに失敗したときはエラーメッセージを表示する
    console.error("articles.jsonの読み込みに失敗しました:", err);
    listEl.innerHTML = "<li>記事の読み込みに失敗しました。</li>";
  });
