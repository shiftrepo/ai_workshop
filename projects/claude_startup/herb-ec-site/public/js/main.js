// メインJavaScriptファイル

// ページ読み込み完了時の処理
document.addEventListener('DOMContentLoaded', () => {
  console.log('和ハーブストア ページが読み込まれました');

  // カートボタンのイベントリスナー
  const cartButtons = document.querySelectorAll('.btn-outline-success');
  cartButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      const productName = event.target.closest('.card').querySelector('.card-title').textContent;
      alert(`「${productName}」をカートに追加しました`);
    });
  });

  // 検索フォームの送信イベント
  const searchForm = document.querySelector('form');
  if (searchForm) {
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const searchTerm = event.target.querySelector('input[type="search"]').value;
      alert(`「${searchTerm}」の検索結果はまだ実装されていません`);
    });
  }
});