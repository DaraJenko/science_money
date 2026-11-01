/* =============================================
   article.js — ノートの余白
   記事ページの公開日・最終更新日をJSONから取得して表示します
   ============================================= */

/* ----- articles.jsonの読み込み -----
 * 現在のページのURLと一致する記事データを探し、日付を書き込みます。
 * "../"を付けることで、articlesフォルダの1つ上にあるjsonを参照します。
 */
fetch(`../articles.json?v=${Date.now()}`)
  .then(res => res.json())
  .then(articles => {
    // location.pathname : 現在のページのパス。例："/notes/articles/it-001.html"
    // endsWith(a.url)   : パスの末尾がarticleのurlと一致するか確認する
    const article = articles.find(a => location.pathname.endsWith(a.url));
    if (!article) return; // 一致する記事が見つからなければ何もしない

    // 公開日・最終更新日をHTMLに書き込む
    document.getElementById("date-published").textContent = article.date    + " 公開";
    document.getElementById("date-updated").textContent   = article.updated + " 最終更新";

    // カテゴリタグを設定する。
    // サブジャンルがあればその名前を、なければジャンル名を表示し、
    // クリックするとトップページで同じ絞り込み状態の一覧が開くようにする。
    const tagEl = document.getElementById("article-tag");
    if (tagEl) {
      tagEl.textContent = article.subGenreLabel || article.genreLabel;
      const query = article.subGenre
        ? `?genre=${encodeURIComponent(article.genre)}&sub=${encodeURIComponent(article.subGenre)}`
        : `?genre=${encodeURIComponent(article.genre)}`;
      tagEl.setAttribute("href", `../index.html${query}`);
    }

    // headのメタ情報をJSONの値で上書きする。Googleのクローラーが読み取る。
    document.querySelector('meta[property="article:modified_time"]')
            .setAttribute("content", article.updated);
  })
  .catch(err => {
    console.error("articles.jsonの読み込みに失敗しました:", err);
  });
