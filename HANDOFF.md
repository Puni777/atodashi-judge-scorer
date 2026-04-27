# 引き継ぎ資料 — 後出しジャッジ Scorer (atodashi-judge-scorer)

このドキュメントは、別の AI または開発者が本リポジトリでの実装を引き継ぐための前提情報をまとめたものです。これ 1 つを読めば、リポジトリの目的・設計意図・現在のコード構造・既知の落とし穴が把握できることを目的としています。

---

## 1. プロジェクトの目的

カードゲーム「**後出しジャッジ**」の **得点計算補助 Web アプリ** を作っています。

- **位置づけ**: ゲーム本体は物理カードでプレイする。本アプリはあくまで「判断入力＋得点計算＋親ローテ」だけを補助する卓上スコアボード
- **ユーザー**: ユーザー（オーナー）は大学 4 年生のチームで開発中。**Web 開発の経験は浅い**（フレームワーク用語の前提を共有していない）一方、**Python / ロジック設計の力はある**ので、フロント周りは丁寧に説明、ロジック議論はエンジニア前提で OK
- **直近のマイルストーン**: 2026 年 5 月末以降に **高校 1 年生にテストプレイ**してもらう。学校 Wi-Fi で SSH 不可のため、クラウド静的配信（GitHub Pages）が必須
- **重視する観点**: 「大学生チームが高校生に見せる」状況なので、**完成度・見栄え**もこだわる前提

---

## 2. リポジトリと関連プロジェクト

### 本リポジトリ
- GitHub: `Puni777/atodashi-judge-scorer` (**public**)
- 公開 URL: https://puni777.github.io/atodashi-judge-scorer/
- ローカル: `C:\Users\puni\Documents\claude\atodashi-judge-scorer\`
- デプロイ: GitHub Actions で `main` push 時に自動 → GitHub Pages

### 旧 Python 実装（移植元）
- GitHub: `Puni777/atodashi_judge` (**private**)
- ローカル: `C:\Users\puni\Documents\claude\atodashi_judge\`
- 重要ファイル（移植元として参照する）:
  - [`game.py`](../atodashi_judge/game.py) — `RoundState`, `score_round` 等のコアロジック
  - [`scorer/session.py`](../atodashi_judge/scorer/session.py) — 物理カード前提の軽量ステートマシン（本アプリの直接の元）
  - [`scorer/app.py`](../atodashi_judge/scorer/app.py) — Flet 製 Web UI（UI フローの参考。判断画面の構造は移植済み）
  - [`tests/test_scorer_session.py`](../atodashi_judge/tests/test_scorer_session.py) — テストケース（vitest に移植済み）
  - [`data/judges.json`](../atodashi_judge/data/judges.json) — ジャッジカード 12 枚（既に `public/data/judges.json` にコピー済み）

旧プロジェクトには `situations.json`（30 枚）/ `items.json`（40 枚）/ `kaiwai_rules.json`（12 枚）もあるが、**本アプリでは扱わない**（後述「設計上の決定事項」）。

---

## 3. 技術スタック

| | バージョン | 備考 |
|---|---|---|
| Svelte | 5.55.4 | runes (`$state`, `$derived`, `$props`, `$effect`) を使用 |
| TypeScript | 6.0.3 | `strict: true` |
| Vite | 8.0.10 | `@sveltejs/vite-plugin-svelte` v7 |
| Tailwind CSS | 4.2.4 | `@tailwindcss/vite` 経由（設定ファイル不要、CSS 内 `@import "tailwindcss"`） |
| vitest | 4.1.5 | ロジックテスト用。svelte plugin 経由で `.svelte.ts` も処理可能 |
| jsdom | 29.0.2 | （現状未使用、必要になれば DOM テストに） |
| svelte-check | 4.4.6 | 型チェック (`npm run check`) |

---

## 4. ディレクトリ構成

```
atodashi-judge-scorer/
├── HANDOFF.md                           # このファイル
├── README.md
├── index.html                           # エントリ。/src/main.ts を読む
├── package.json
├── tsconfig.json
├── vite.config.js                       # GH Pages 用に base を環境変数で切替
├── vitest.config.ts                     # svelte plugin を含む（runes コンパイル必須）
├── svelte.config.js                     # vitePreprocess() を設定
├── public/
│   ├── data/
│   │   └── judges.json                  # ジャッジカード 12 枚（旧プロジェクトと同期）
│   └── favicon.svg
├── .github/workflows/                   # GH Pages 自動デプロイ
└── src/
    ├── main.ts                          # Svelte 5 mount
    ├── app.css                          # Tailwind v4 の @import のみ
    ├── vite-env.d.ts
    ├── App.svelte                       # フェーズルーター（全コンポーネントの分岐元）
    ├── components/
    │   ├── Setup.svelte                 # 人数 / 名前 / ラウンド数 / タイマー
    │   ├── RoundHeader.svelte           # ラウンド N / 親 / 全員のスコア（常時表示）
    │   ├── JudgeSelect.svelte           # ジャッジ 12 枚から 1 枚（検索付き）
    │   ├── JudgmentPhase.svelte         # 1st/2nd/最終の共通レイアウト
    │   ├── ChildJudgmentRow.svelte      # 子 1 人分の入力ボックス（前回判断併記）
    │   ├── TimerDisplay.svelte          # 最終判断の MM:SS カウントダウン
    │   ├── RoundScore.svelte            # ラウンド差分 + 累計
    │   └── GameOver.svelte              # 同順位対応の最終結果
    └── lib/
        ├── types.ts                     # 公開型・enum・定数
        └── scorer/
            ├── session.svelte.ts        # ScoreSession + rankedStandings
            ├── session.test.ts          # 13 ケース
            ├── timer.svelte.ts          # CountdownTimer + イベントエミッタ
            ├── timer.test.ts            # 8 ケース
            └── judges.ts                # judges.json fetcher
```

**`.svelte.ts` 拡張子は重要**: Svelte 5 の `$state` rune を使うクラスを書くにはこの拡張子が必要（後述「落とし穴」参照）。

---

## 5. コアロジック仕様

### 5.1 採点アルゴリズム（Python と完全一致）

`src/lib/scorer/session.svelte.ts` の `scoreRound`:

```
親:
  shifted_on_second = 子のうち 第1判断 ≠ 第2判断 の人数
  shifted_on_final  = 子のうち 第2判断 ≠ 最終判断 の人数
  親の得点δ = shifted_on_second + shifted_on_final

各子:
  if 最終判断 ≠ 第2判断:           # 自分が変えた
    子の得点δ = 0
  else:                              # 自分は据え置き
    pulled = 他の子のうち
             「第2→最終で変え、かつ最終が自分と一致」する人数
    子の得点δ = pulled
```

代表テストケース（`test_full_round_flow_and_scoring`）:
- 親=A、子=B/C
- B: 1st=0 → 2nd=1 → final=1（最終で据え置き）
- C: 1st=0 → 2nd=0 → final=1（最終で変えた）
- 期待値: **A=2, B=1, C=0**

### 5.2 フェーズ遷移

```
SETUP → ROUND_START → PARENT_SETUP → FIRST_JUDGMENT
  → SECOND_JUDGMENT → FINAL_JUDGMENT → ROUND_SCORE
  → (次のラウンド) ROUND_START | (最終ラウンドなら) GAME_OVER
```

- `Phase` enum は `src/lib/types.ts`
- 各フェーズの遷移メソッドは `ScoreSession` 上にある（`enterParentSetup`, `enterFirstJudgment`, `advanceToSecond`, `advanceToFinal`, `finalizeRound`, `nextRound`）
- 入力チェック: 第 2 判断は第 1 判断が必須、最終判断は第 2 判断が必須、option index は `0 ≤ x < judge.options.length`

### 5.3 親ローテと total rounds

- 親 = `players[roundIndex % players.length]`（id 0 から順番）
- `config.totalRounds` が `null` のとき → プレイヤー人数（親一巡）。`startGame` 時に `players.length` で確定

### 5.4 タイマー（CountdownTimer）

`src/lib/scorer/timer.svelte.ts`:

- 最終判断フェーズに入ると自動で start、`finalizeRound` / `nextRound` / `startGame` で stop / reset
- **イベント API**: `'started' / 'tick' / 'expired' / 'stopped'` を `timer.on(event, cb)` で購読可能。`on` は unsubscribe 関数を返す
- **Scheduler 注入**: コンストラクタ引数で `setInterval / clearInterval` を差し替え可能（テストでは noop scheduler で `tick()` 手動呼び出し）
- **0 秒設定 = OFF**: `start(0)` は何もしない
- **時間切れで自動採点はしない**: 操作ミスで判断が揃わぬまま締まると困るため、視覚的アラートのみ

将来の音再生はこう足せる:

```ts
// 例: App.svelte の onMount 内で
session.timer.on('expired', () => new Audio('/sounds/buzzer.mp3').play())
session.timer.on('tick', (sec) => {
  if (sec === 30 || sec === 10) new Audio('/sounds/warn.mp3').play()
})
```

### 5.5 同順位（rankedStandings）

`src/lib/scorer/session.svelte.ts` から名前付きエクスポート:

```ts
export function rankedStandings(players: Player[]): { rank: number; player: Player }[]
```

- standard competition ranking（1, 1, 3 形式）
- 5 人 [5, 5, 3, 3, 0] → ranks [1, 1, 3, 3, 5]
- 全員同点なら全員 1 位（GameOver 画面では全員 🥇）

---

## 6. UI フロー（卓上 scoreboard モデル）

**重要な前提**: 端末を回す pass-and-play ではなく、**1 台を卓上に置いて全員で操作する**モデル。1 画面に全子の判断ボタンが並ぶ。

1. **Setup**: 人数（2〜6）・名前・ラウンド数（空欄で人数）・タイマー（既定 3:00、ON/OFF 切替）
2. **RoundStart**: 「親: X さん」「ジャッジを選ぶ」ボタン
3. **ParentSetup**: 12 枚から検索付きで 1 枚選び「決定」
4. **FirstJudgment**: 全子のボックスを縦に並べ、各自選択肢を押す。全員入力で「親がアイテムを追加 → 次へ」が有効化
5. **SecondJudgment**: 同上 + 各子に「第1: 〇〇」を併記。ヒント「親がアイテムを追加したあと」
6. **FinalJudgment**: 同上 + 「第2: 〇〇」併記 + **TimerDisplay 表示**（残り時間）。「採点する」で採点
7. **RoundScore**: 各人の差分（+N）と累計、「次のラウンドへ」または「結果発表」
8. **GameOver**: 同順位対応の順位表 + 「もう 1 試合」（同メンバーで再スタート）

`RoundHeader` は ParentSetup〜RoundScore で常時表示。

---

## 7. 設計上の決定事項（変えない方針）

| 項目 | 決定 | 理由 |
|---|---|---|
| シチュエーションカード | **持たない** | 物理カードに任せる、UI 複雑度を下げる |
| アイテムカード（親/子） | **持たない** | 同上 |
| 界隈ルール | **持たない** | 同上 |
| 山札・捨て札・手札 | **持たない** | スコアラーは判断と得点のみ管轄 |
| 操作モデル | 卓上 scoreboard | pass-and-play ではない。1 画面で全員分入力 |
| タイマー期限切れ | 自動採点しない | 操作ミスで未入力のまま締まる事故防止 |
| 判断履歴の表示 | 第 2 / 最終 で前回値を併記 | 紙ゲームのメモ役を肩代わり（Python 版にはない補助） |
| プレイヤー人数 | 2〜6 人 | Python 実装と同じ |

memory にも記録済み: [project_scorer_design.md](C:\Users\puni\.claude\projects\C--Users-puni-Documents-claude-atodashi-judge-scorer\memory\project_scorer_design.md)

---

## 8. 知っておくべき落とし穴

### 8.1 `$state` はクラスインスタンスを deeply proxy しない

❌ これは動かない（過去にハマった）:
```ts
// .svelte ファイル内
let session = $state(new ScoreSession())
session.phase = Phase.RoundStart  // 値は変わるが UI は再レンダリングしない
```

✅ クラスのフィールドに `$state` を書く（`.svelte.ts` 拡張子必須）:
```ts
// session.svelte.ts
export class ScoreSession {
  phase: Phase = $state(Phase.Setup)
  // ...
}

// .svelte ファイル
let session = new ScoreSession()  // $state でラップしない
```

→ vitest でも `.svelte.ts` を扱うため、`vitest.config.ts` に `@sveltejs/vite-plugin-svelte` を入れている。

### 8.2 `Map` は `$state` の deep proxy で観測されない

`Map.set()` のミューテーションは Svelte の deep proxy が拾わない。本リポジトリでは `Record<number, number>`（POJO）で代用している（`IdMap` 型）。`Map` を使うなら `svelte/reactivity` の `SvelteMap` を使うこと。

### 8.3 `verbatimModuleSyntax: true` の TypeScript 設定

型 import は必ず `import type { ... }` と書く。値とまぜて書けない:
```ts
// ❌ NG
import { Phase, type Player } from '../types'  // 一部環境で警告
// ✅ OK
import { Phase } from '../types'
import type { Player } from '../types'
```

### 8.4 GitHub Pages 用の `base` パス

`vite.config.js` で `base: process.env.VITE_BASE_PATH || '/'` としている。GH Actions では `/atodashi-judge-scorer/` を渡してビルドする。**fetch するときは必ず `import.meta.env.BASE_URL` を使う**（`src/lib/scorer/judges.ts` 参照）。

### 8.5 PowerShell 5.1 環境

開発ホストは Windows / PowerShell 5.1（bash も併用可）。`&&` は使えない。シェルコマンドを書く際は `;` + `if ($?)` を使うか、bash で書く。

---

## 9. テスト

```bash
npm run test       # vitest run
npm run test:watch # ウォッチモード
```

現在 **23 ケース全 pass**:

- `src/lib/scorer/session.test.ts` (13 ケース)
  - `test_scorer_session.py` の関連ケースを移植したもの
  - プレイヤー人数バリデーション、フェーズ遷移、採点数値一致、親ローテ、3 択判断、`rankedStandings` 同順位パターン 3 種、Timer 連携 2 種
- `src/lib/scorer/timer.test.ts` (8 ケース)
  - CountdownTimer の start/tick/expired/stop/event listener、`vi.useFakeTimers` での実 setInterval 検証

採点ロジックの数値整合は **Python 側のテストと完全一致**するよう書かれている。ロジック変更時は必ず双方を見て差分が出ないようにする。

---

## 10. ビルド・デプロイ

```bash
npm run dev       # 開発: http://localhost:5173/
npm run check     # 型チェック (svelte-check)
npm run test      # vitest
npm run build     # 本番ビルド (dist/)
npm run preview   # build 結果のローカル確認
```

GitHub Pages へのデプロイは `main` への push で自動。`.github/workflows/` 配下を参照。

現在のビルドサイズ: **JS 63 KB / gzip 22.5 KB**（目標 < 100 KB を満たす）。

---

## 11. コーディング規約・スタイル

- **TypeScript**: `strict: true`、`noUncheckedIndexedAccess` 相当（配列アクセスで `?` を意識）
- **コンポーネント**: `<script lang="ts">` 必須。props は `let { x }: Props = $props()` 形式
- **rune の使い方**:
  - `$state` で reactive な可変値
  - `$derived` で算出値（`$derived.by(() => ...)` も併用）
  - `$props` で受け取り。コールバックも prop として渡す（custom events ではなく）
- **クラスで state**: 必ず `.svelte.ts` ファイルに置き、フィールドに `$state(...)` を書く
- **エラー表示**: ScoreSession の `throw` は App.svelte の `safe(() => ...)` ラッパで `runError` に変換、上部に黄色のバナーで表示
- **スタイル**: Tailwind ユーティリティ。ダークグラデ + 紫アクセント (`bg-purple-500` 系) + emerald(成功) / amber(警告) / red(エラー) で統一
- **タップターゲット**: 判断ボタンは `min-h-[56px]`、卓上で誤タップしないサイズ
- **コメント**: 設計意図や Python 側との対応を残す。「なぜそう書いたか」を優先

---

## 12. 残作業 / 将来の拡張

### 進行中（現状ブランチに未コミットの変更あり）
直近の追加機能（タイマー / 検索 / 同順位）はまだ commit されていない。`git status`:
```
modified:   src/App.svelte
modified:   src/components/GameOver.svelte
modified:   src/components/JudgeSelect.svelte
modified:   src/components/Setup.svelte
modified:   src/lib/scorer/session.svelte.ts
modified:   src/lib/scorer/session.test.ts
modified:   src/lib/types.ts
new file:   src/components/TimerDisplay.svelte
new file:   src/lib/scorer/timer.svelte.ts
new file:   src/lib/scorer/timer.test.ts
new file:   HANDOFF.md  (このファイル)
```
ユーザー（オーナー）が手動で commit / push する流儀。

### スコープ外（将来やる）
- **タイマー音再生**: `timer.on('expired', ...)` のフックは用意済み。あとは `Audio` を流すだけ
- **ラウンド履歴の振り返り画面**: `session.history` に各 RoundState が積まれている
- **Undo / 入力ミス修正**: 同フェーズ内なら option を押し直せるが、フェーズを戻すのは未実装
- **localStorage 永続化**: リロード復帰
- **アニメーション・効果音**（タイマー音以外）・トランジション
- **同点時のタイブレーク**: 現状は同順位のまま終了

### 既知の制限
- judges.json は 12 枚固定（Python 側と同期）。追加したい場合は両方を更新
- プレイヤー人数 2〜6 人。これ以上増やすには `MIN_PLAYERS` / `MAX_PLAYERS` 定数の見直し

---

## 13. 開発を進めるときに最初にすること

1. `npm install` で依存をインストール
2. `npm run check && npm run test` で全部通るか確認（**通らない状態でいきなり編集しない**）
3. `npm run dev` でブラウザ確認しながら作業
4. 採点ロジック変更時は **必ず** Python 側 (`atodashi_judge/game.py` と `tests/test_scorer_session.py`) を比較し、テスト数値が一致するよう保つ
5. UI を変えるときは memory の方針（卓上 scoreboard、シチュ/アイテム持たない、見栄え重視）と矛盾しないか毎回確認

---

## 14. ユーザー対応のヒント

- フロントエンド/Web インフラの説明では略語や前提を省略せず、「これは○○という概念です」と一段かみ砕く
- Python 側の設計議論はエンジニア前提で OK（ステートマシンの分離など、ロジック設計力は高い）
- コミット & プッシュはユーザー側で実施する流儀（AI 側からは原則 commit しない）
- 大きな変更を始める前に **AskUserQuestion** で確認するか、`/loop` の plan モードで方針を固めると安全

---

## 15. 関連リンク

- **本リポジトリ**: https://github.com/Puni777/atodashi-judge-scorer
- **公開版**: https://puni777.github.io/atodashi-judge-scorer/
- **Svelte 5 docs**: https://svelte.dev/docs/svelte/overview
- **Tailwind CSS v4**: https://tailwindcss.com/docs/installation/using-vite
- **vitest**: https://vitest.dev/

何か不明点があればコードコメントを優先的に読み、それでも不明ならユーザーに直接確認すること。**「動いてるからヨシ」ではなく「ロジック数値が Python と一致しているか」「memory の方針からズレていないか」を都度チェック**するのがこのプロジェクトの肝。
