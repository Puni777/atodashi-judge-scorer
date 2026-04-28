# 後出しジャッジ Scorer

体験型モラルカードゲーム「後出しジャッジ」の、物理カード前提の得点計算補助 Web アプリです。

タブレットやスマホを卓中央に置き、プレイヤー登録、ジャッジ選択、第1判断、第2判断、話し合い後の最終判断、得点計算、親ローテ、タイマーを補助します。シチュエーションカード、アイテムカード、界隈ルールカードは物理カード側で扱い、このアプリはスコアボードとして動きます。

- 公開版: https://puni777.github.io/atodashi-judge-scorer/
- GitHub Pages: `main` への push で自動デプロイ
- 対応人数: 3〜8人

## 主な機能

- 3〜8人のプレイヤー登録、名前設定、ラウンド数設定
- ジャッジカード選択と検索
- 第1判断、第2判断、最終判断の入力
- 旧 Python 実装と同じ採点ロジック
- 親の自動ローテーション
- 話し合いタイマー、時間切れアラーム
- GMキャラクターによる進行案内
- BGM / SE、音量調整、ON/OFF
- 画面テーマ切替
- localStorage による進行中ゲームの再開
- 同点順位対応の最終結果表示

## Stack

- Svelte 5 + Vite 8
- TypeScript 6
- Tailwind CSS v4
- Vitest
- GitHub Pages

## 開発

```bash
npm install
npm run dev
```

通常は `http://localhost:5173/` で開きます。

同じ Wi-Fi 上のスマホやタブレットから確認したい場合:

```bash
npm run dev -- --host 0.0.0.0 --port 5174
```

## 確認コマンド

```bash
npm run check
npm run test
npm run build
```

現状の確認結果:

- `svelte-check`: 0 errors / 0 warnings
- `vitest`: 4 files, 44 tests passed
- `vite build`: 成功

## デプロイ

`main` ブランチへの push で `.github/workflows/deploy.yml` が走り、GitHub Pages に自動デプロイされます。

ローカルで本番 base path を確認したい場合:

```powershell
$env:VITE_BASE_PATH="/atodashi-judge-scorer/"
npm run build
npx vite preview
```

PowerShell では Linux/macOS の `VITE_BASE_PATH=/... npm run build` 形式ではなく、上のように環境変数を先にセットしてください。

## データと素材

差し替えや調整は `public/` 配下の JSON / 音声 / 画像を編集します。

- `public/data/judges.json`: ジャッジカード
- `public/data/gm_messages.json`: GM の進行メッセージ
- `public/data/audio_assets.json`: BGM / SE の音声カタログ
- `public/audio/`: 音声ファイル
- `public/GM_icon/`: GM キャラクター画像

GitHub Pages のサブパスでも動くよう、アプリ内の読み込みは `import.meta.env.BASE_URL` を経由しています。

## ゲーム側の前提

このアプリは「後出しジャッジ」の得点計算補助に絞っています。

扱わないもの:

- シチュエーションカードの山札
- アイテムカードの手札や提出履歴
- 界隈ルールカードの管理
- 物理カードのシャッフル、配布、捨て札

これらはテーブル上の物理カードで進行します。Web 側を軽く保つことで、学校 Wi-Fi やスマホでも動かしやすくしています。
