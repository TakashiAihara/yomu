# yomu — Claude Code Instructions

## Tech Stack

### Monorepo

- **Package manager**: pnpm (workspaces)
- **Task runner**: Turborepo (`turbo run <task>`)
- **Packages**: `packages/` 配下に各パッケージ。現状: `@yomu/feed-parser`

### Language / Runtime

- **TypeScript + Bun** が第一選択
- `type` を使う（`interface` は `implements` / `extends` が必要な場合のみ）
- ESM (`"type": "module"`)

### Formatter / Linter

- **oxfmt**: フォーマッター（Prettier 互換）
  - `pnpm format` → `oxfmt .`（書き込み）
  - `pnpm format:check` → `oxfmt --check .`
  - 設定: `.oxfmtrc.json`
- **oxlint**: リンター（ESLint 互換）
  - `pnpm lint` → `oxlint packages/ --vitest-plugin`
  - `pnpm lint:fix` → `oxlint packages/ --vitest-plugin --fix`
  - 設定: `.oxlintrc.json`
- Biome は削除済み。使わない

### Testing

- **vitest** (`pnpm --filter <pkg> test:run`)
- テストデータは `src/__fixtures__/` にビルダー関数として定義する
  - `buildFeed(entries, overrides)` / `buildEntry(overrides)` / `buildItem(overrides)` パターン
  - WireMock・MSW 等の外部モックサーバーは使わない
- fetch のモックは `vi.stubGlobal("fetch", vi.fn().mockResolvedValue(...))` を使い、`src/test-utils.ts` に `mockFetch()` ヘルパーとして切り出す
- mock 定義は必ず別ファイル（`__fixtures__/` または `test-utils.ts`）に分離する。テストファイルにインラインで書かない

### Git Hooks

- lefthook（未設定、今後追加予定）

## Design

- **DB**: DuckDB（組み込み）+ Waddler クライアント
- **HTTP**: Hono
- **API**: tRPC（REST エンドポイント構造は使わない）
- **Auth**: Google OAuth 2.0 + API キーのみ。ローカル認証なし
