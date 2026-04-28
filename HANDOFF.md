# 引き継ぎ資料: 後出しジャッジ Scorer

最終更新: 2026-04-28

この資料は、カードゲーム「後出しジャッジ」の得点計算補助 Web アプリを引き継ぐためのメモです。目的、現在の実装、設計上の決定事項、触るべきファイル、既知の注意点をまとめています。

---

## 1. プロジェクトの目的

このリポジトリでは、体験型モラルカードゲーム「後出しジャッジ」の **Scorer** を作っています。

- ゲーム本体は物理カードで遊ぶ
- Web アプリは卓上に置くスコアボードとして使う
- アプリの担当範囲は、プレイヤー登録、ジャッジ選択、判断入力、得点計算、親ローテ、タイマー、進行案内
- シチュエーションカード、アイテムカード、界隈ルールカードの管理は物理カード側に任せる

直近の利用想定は、2026 年 5 月末以降の高校 1 年生向けテストプレイです。学校 Wi-Fi で SSH が使えない可能性があるため、GitHub Pages で静的配信できることが重要です。

---

## 2. リポジトリ情報

- GitHub: `Puni777/atodashi-judge-scorer`
- 公開 URL: https://puni777.github.io/atodashi-judge-scorer/
- ローカル: `C:\Users\puni\Documents\claude\atodashi-judge-scorer\`
- デプロイ: `main` push で GitHub Actions から GitHub Pages に自動反映

旧 Python 実装は別リポジトリです。

- GitHub: `Puni777/atodashi_judge`
- ローカル: `C:\Users\puni\Documents\claude\atodashi_judge\`
- 参照価値が高いファイル:
  - `game.py`: 元の採点ロジック
  - `scorer/session.py`: スコアラー用ステートマシン
  - `scorer/app.py`: Flet 版 UI
  - `tests/test_scorer_session.py`: 採点ロジックの比較元
  - `data/judges.json`: ジャッジカード

---

## 3. 技術スタック

| 項目 | 内容 |
|---|---|
| UI | Svelte 5.55.4 |
| Build | Vite 8.0.10 |
| Language | TypeScript 6.0.3, `strict: true` |
| CSS | Tailwind CSS 4.2.4 |
| Test | Vitest 4.1.5 |
| 型チェック | svelte-check 4.4.6 |
| Deploy | GitHub Pages |

Svelte 5 の runes を使っています。クラス内 state は `.svelte.ts` ファイルに置いています。

---

## 4. 現在の機能

実装済み:

- 3〜8人のプレイヤー登録
- プレイヤー名、ラウンド数、タイマー秒数の設定
- テーマ選択
- BGM / SE の ON/OFF と音量調整
- GM キャラクターの進行案内
- 進行中も表示できるフローティング GM
- ジャッジカード一覧と検索
- 第1判断、第2判断、最終判断の入力
- 前回判断の表示
- 最終判断フェーズのカウントダウンタイマー
- 時間切れアラーム
- 採点と累計スコア表示
- 親ローテーション
- 同点順位対応の最終結果
- localStorage による進行中ゲームの保存と再開
- UI 設定の保存
- GitHub Pages 向けの base path 対応

現在も扱わないもの:

- シチュエーションカードの山札
- アイテムカードの手札、提出履歴、捨て札
- 界隈ルールカードの管理
- 物理カードのシャッフルや配布

この切り分けは意図的です。アプリを「軽いスコアラー」に保つことで、卓上での操作が単純になり、物理カードゲームとしての体験を邪魔しないようにしています。

---

## 5. ディレクトリ構成

```text
atodashi-judge-scorer/
├── HANDOFF.md
├── README.md
├── 企画書.txt
├── index.html
├── package.json
├── vite.config.js
├── vitest.config.ts
├── svelte.config.js
├── public/
│   ├── data/
│   │   ├── judges.json
│   │   ├── gm_messages.json
│   │   └── audio_assets.json
│   ├── audio/
│   │   ├── bgm/
│   │   └── se/
│   ├── GM_icon/
│   └── favicon.svg
└── src/
    ├── App.svelte
    ├── app.css
    ├── main.ts
    ├── components/
    │   ├── Setup.svelte
    │   ├── RoundHeader.svelte
    │   ├── JudgeSelect.svelte
    │   ├── JudgmentPhase.svelte
    │   ├── ChildJudgmentRow.svelte
    │   ├── TimerDisplay.svelte
    │   ├── RoundScore.svelte
    │   ├── GameOver.svelte
    │   └── GameMasterGuide.svelte
    └── lib/
        ├── types.ts
        ├── audio/
        │   ├── assets.ts
        │   ├── assets.test.ts
        │   └── audioManager.ts
        └── scorer/
            ├── session.svelte.ts
            ├── session.test.ts
            ├── timer.svelte.ts
            ├── timer.test.ts
            ├── judges.ts
            ├── gmMessages.ts
            └── gmMessages.test.ts
```

---

## 6. コア仕様

### 6.1 フェーズ

`src/lib/types.ts` の `Phase` で管理しています。

```text
SETUP
→ ROUND_START
→ PARENT_SETUP
→ FIRST_JUDGMENT
→ SECOND_JUDGMENT
→ FINAL_JUDGMENT
→ ROUND_SCORE
→ ROUND_START または GAME_OVER
```

主な遷移メソッドは `src/lib/scorer/session.svelte.ts` の `ScoreSession` にあります。

- `startGame`
- `enterParentSetup`
- `setJudge`
- `enterFirstJudgment`
- `submitFirst`
- `advanceToSecond`
- `submitSecond`
- `advanceToFinal`
- `submitFinal`
- `finalizeRound`
- `nextRound`
- `resetToSetup`

### 6.2 採点ロジック

採点は旧 Python 実装と一致させています。

親の得点:

```text
第一判断 → 第二判断で変わった子の人数
+ 第二判断 → 最終判断で変わった子の人数
```

子の得点:

```text
第二判断 → 最終判断で自分が変えた場合: 0 点
第二判断から据え置いた場合:
  他の子のうち、第二判断から最終判断で変わり、
  かつ自分の最終判断と一致した人数
```

代表例:

```text
親=A、子=B/C
B: 1st=0 → 2nd=1 → final=1
C: 1st=0 → 2nd=0 → final=1
結果: A=2, B=1, C=0
```

### 6.3 親ローテーション

```ts
players[roundIndex % players.length]
```

`totalRounds` が指定されない場合は、開始時にプレイヤー人数分で確定します。

### 6.4 人数

現在は 3〜8人です。

- `src/lib/scorer/session.svelte.ts`: `MIN_PLAYERS = 3`, `MAX_PLAYERS = 8`
- `src/components/Setup.svelte`: `[3, 4, 5, 6, 7, 8]`

人数を変える場合は、ロジックと UI の両方を更新してください。

---

## 7. UI フロー

操作モデルは pass-and-play ではなく、1 台を卓中央に置くスコアボードです。

1. Setup
   プレイヤー人数、名前、ラウンド数、話し合い時間、テーマ、GM表示、音声を設定する
2. RoundStart
   今回の親を表示する
3. ParentSetup
   親がジャッジカードを選ぶ
4. FirstJudgment
   子全員が第1判断を入力する
5. SecondJudgment
   親が物理アイテムカードを追加したあと、子全員が第2判断を入力する
6. FinalJudgment
   話し合いと子のアイテム追加後、子全員が最終判断を入力する
7. RoundScore
   ラウンドごとの得点差分と累計を表示する
8. GameOver
   最終順位を表示する。同点は同順位

GM メッセージは現在フェーズ、入力進捗、タイマー状態に応じて変わります。

---

## 8. 永続化

`src/App.svelte` で localStorage を使っています。

- `atodashi-judge-scorer:session:v1`: 進行中ゲーム
- `atodashi-judge-scorer:ui:v1`: UI 設定

セッション保存対象:

- phase
- config
- players
- roundIndex
- roundState
- history
- timer snapshot
- savedAt

読み込み時は `parseScoreSessionSnapshot` で検証してから復元します。不正な保存データは破棄されます。

タイマーは `endsAt` から残り時間を再計算します。復元時点で期限切れなら expired 扱いになります。

---

## 9. GM メッセージ

実装:

- `src/components/GameMasterGuide.svelte`
- `src/lib/scorer/gmMessages.ts`
- `public/data/gm_messages.json`

特徴:

- 口パク画像の切替
- タイピング表示
- `prefers-reduced-motion` 対応
- inline 表示と floating 表示
- floating GM のダブルタップで「セットアップに戻る」メニュー
- `{parent}`, `{judge}`, `{round}`, `{totalRounds}`, `{remaining}` などのテンプレート変数
- v1 形式の単一文 JSON への後方互換

GM アイコン:

- `public/GM_icon/0_ほほえみ.png`
- `public/GM_icon/1_閉じ口.png`
- `public/GM_icon/2_開口.png`

---

## 10. 音声

実装:

- `src/lib/audio/audioManager.ts`
- `src/lib/audio/assets.ts`
- `public/data/audio_assets.json`
- `public/audio/`

音声 ID:

- SE: `tap`, `confirm`, `roundScore`, `finalScore`, `alarm`
- BGM: `main`

特徴:

- SE と BGM の個別 ON/OFF
- SE と BGM の音量調整
- BGM 自動再生のブラウザ制限に合わせ、最初のユーザー操作後に再開
- Web Audio API を優先し、HTMLAudioElement にフォールバック
- 音声カタログが壊れている場合は fallback に倒す
- GitHub Pages の base path に対応

音声素材を差し替える場合は、ファイルを `public/audio/` に置き、`public/data/audio_assets.json` を更新します。

---

## 11. データファイル

### 11.1 ジャッジカード

`public/data/judges.json`

```json
{
  "version": 1,
  "type": "judge",
  "cards": []
}
```

読み込み:

- `src/lib/scorer/judges.ts`

### 11.2 GM メッセージ

`public/data/gm_messages.json`

version 2 は、各メッセージを文字列または文字列配列で書けます。

### 11.3 音声カタログ

`public/data/audio_assets.json`

version 1 です。`src/lib/audio/assets.ts` の `parseAudioAssets` と同期してください。

---

## 12. GitHub Pages と base path

`vite.config.js` で base path を切り替えます。

```js
base: process.env.VITE_BASE_PATH || '/'
```

GitHub Actions では次を渡しています。

```text
VITE_BASE_PATH=/atodashi-judge-scorer/
```

コード内で public asset を読むときは、必ず `import.meta.env.BASE_URL` を使ってください。`/data/...` のような絶対パスにすると、GitHub Pages のサブパスで壊れます。

---

## 13. 開発コマンド

```bash
npm install
npm run dev
npm run check
npm run test
npm run build
```

同じ Wi-Fi 上のスマホから確認する場合:

```bash
npm run dev -- --host 0.0.0.0 --port 5174
```

PowerShell で本番 base path を確認する場合:

```powershell
$env:VITE_BASE_PATH="/atodashi-judge-scorer/"
npm run build
npx vite preview
```

---

## 14. 現在の検証状態

2026-04-28 時点の確認結果:

- `npm run check`: 0 errors / 0 warnings
- `npm run test`: 4 files, 44 tests passed
- `npm run build`: 成功

ビルドサイズ:

```text
dist/index.html                  0.47 kB, gzip 0.33 kB
dist/assets/index-*.css          31.40 kB, gzip 7.47 kB
dist/assets/index-*.js           95.08 kB, gzip 32.67 kB
```

---

## 15. テスト構成

テストは 4 ファイル、44 ケースです。

- `src/lib/scorer/session.test.ts`
  - フェーズ遷移
  - 採点ロジック
  - 親ローテ
  - 3択ジャッジ
  - themeId
  - タイマー連携
  - snapshot 復元
  - reset
  - standings / rankedStandings
- `src/lib/scorer/timer.test.ts`
  - start / tick / expired / stop
  - イベント購読
  - fake timers
  - snapshot 復元
- `src/lib/scorer/gmMessages.test.ts`
  - テンプレート置換
  - フェーズ別メッセージ
  - v1 / v2 JSON 互換
  - fallback
- `src/lib/audio/assets.test.ts`
  - 音声カタログ parse
  - 音量 clamp
  - loader URL

採点ロジックを触る場合は、旧 Python 実装のテストと数値がズレないように確認してください。

---

## 16. Svelte 5 の注意点

### 16.1 クラス state は `.svelte.ts` に置く

`ScoreSession` や `CountdownTimer` は、クラスフィールドに `$state` を持っています。

```ts
export class ScoreSession {
  phase: Phase = $state(Phase.Setup)
}
```

この書き方には `.svelte.ts` 拡張子が必要です。

### 16.2 `new ScoreSession()` を `$state(...)` で包まない

次のように包むと、クラス内部の変更が期待通り UI に反映されません。

```ts
let session = $state(new ScoreSession())
```

現在の正しい形:

```ts
let session = new ScoreSession()
```

### 16.3 `Map.set()` は deep proxy で拾われない

判断入力や得点差分は `Record<number, number>` の `IdMap` を使っています。`Map` に戻す場合は `svelte/reactivity` の `SvelteMap` を検討してください。

### 16.4 型 import

`verbatimModuleSyntax: true` のため、型は `import type` で分けてください。

```ts
import { Phase } from '../types'
import type { Player } from '../types'
```

---

## 17. コーディング方針

- ロジックは `src/lib/scorer/` に寄せる
- UI は `src/components/` に分ける
- カード管理は増やさず、物理カード前提を守る
- fetch は `import.meta.env.BASE_URL` 経由にする
- localStorage から読む値は必ず parse / validate する
- 採点ロジック変更時はテストを先に読む
- `.svelte.ts` の runes まわりを普通の `.ts` に移動しない
- GitHub Pages での動作を意識する

---

## 18. 既知の制限と今後の候補

現在の既知制限:

- フェーズを戻す Undo は未実装
- ラウンド履歴は `session.history` にあるが、振り返り画面は未実装
- localStorage はブラウザ単位。複数端末同期はしない
- 音声はブラウザの自動再生制限を受ける
- プレイヤー人数は 3〜8人固定
- ジャッジカードは Web 側では `judges.json` のみ。シチュエーションやアイテムは持たない

今後の拡張候補:

- Undo / 1 フェーズ戻る
- ラウンド履歴の振り返り画面
- テストプレイ後の得点バランス調整
- 高校生テストプレイ用の説明文や簡易モード
- 端末サイズ別の実機 UI 調整
- 音声素材の差し替え、追加

---

## 19. 開発を再開するとき

最初に見る場所:

1. `git status --short`
2. `npm run check`
3. `npm run test`
4. `src/App.svelte`
5. `src/lib/scorer/session.svelte.ts`
6. 変更したい画面に対応する `src/components/*.svelte`

データや素材だけ変えたい場合:

1. `public/data/*.json`
2. `public/audio/`
3. `public/GM_icon/`

大きめの UI 変更をする場合は、スマホ幅とタブレット幅で必ず確認してください。このアプリは卓上で複数人が覗き込む前提なので、ボタンの大きさ、前回判断の見やすさ、GM 表示の邪魔にならなさが重要です。

---

## 20. ユーザー対応メモ

ユーザーは Python やロジック設計には強い一方、Web フロントエンドやデプロイ周りは前提を省かず説明した方がよいです。

- Svelte / Vite / GitHub Pages の話は一段かみ砕く
- 採点ロジックや状態遷移の話はエンジニア前提でよい
- コミットと push はユーザーが手動で行う流儀
- 迷ったら「スコアラーは軽く、物理カードを主役にする」方針に戻る
