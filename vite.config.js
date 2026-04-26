import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

// GH Pages 用: 公開リポジトリ名に合わせて環境変数で渡す。
// 例: VITE_BASE_PATH=/atodashi-judge-scorer/ npm run build
// 未指定なら / （ローカル dev / カスタムドメイン用）
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [svelte(), tailwindcss()],
})
