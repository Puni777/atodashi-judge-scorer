# 後出しジャッジ Scorer

体験型モラルカードゲーム「後出しジャッジ」の物理カード前提・得点計算補助 Web アプリ。タブレットやスマホを卓中央に置き、プレイヤー登録・タイマー・第1/第2/最終判断の入力・得点計算を行う。

ゲーム本体（カードデータ・ロジック・企画書）は別リポジトリ。

## Stack

- Svelte 5 + Vite 8
- Tailwind CSS v4
- 静的サイトとして GitHub Pages にデプロイ

## 開発

```bash
npm install
npm run dev      # http://localhost:5173/
npm run build    # dist/ に静的サイト出力
```

## デプロイ

`main` ブランチへの push で `.github/workflows/deploy.yml` が `https://puni777.github.io/atodashi-judge-scorer/` に自動デプロイ。

ローカルで本番 base path で確認したい場合:

```bash
VITE_BASE_PATH=/atodashi-judge-scorer/ npm run build
npx vite preview
```
