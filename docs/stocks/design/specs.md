# Yomu RSS/Feed リーダー 仕様書

> **参照実装**: `modules/miniflux/` (Go 製 OSS RSS リーダー)
> **実装スタック**: Bun + TypeScript

---

## 1. ドメインモデル

### 1.1 エンティティ一覧

#### Feed（フィード）

| フィールド | 型 | 説明 |
|---|---|---|
| id | number | PK |
| userId | number | 所有ユーザー |
| categoryId | number \| null | カテゴリ |
| feedUrl | string | フィード取得元 URL |
| siteUrl | string | サイト URL |
| title | string | フィード表示名 |
| description | string | 説明 |
| checkedAt | Date | 最終確認日時 |
| nextCheckAt | Date | 次回確認予定日時 |
| etagHeader | string | HTTP ETag（差分取得用） |
| lastModifiedHeader | string | HTTP Last-Modified（差分取得用） |
| parsingErrorMsg | string | 直近のパースエラーメッセージ |
| parsingErrorCount | number | 連続パースエラー数 |
| scraperRules | string | 全文取得 CSS セレクタルール |
| rewriteRules | string | コンテンツ書き換えルール |
| blockFilterEntryRules | string | ブロックフィルタルール（正規表現） |
| keepFilterEntryRules | string | キープフィルタルール（正規表現） |
| userAgent | string | カスタム User-Agent |
| username | string | Basic 認証ユーザー名 |
| password | string | Basic 認証パスワード |
| disabled | boolean | フィード無効フラグ |
| crawler | boolean | 全文クローリング有効 |
| ignoreEntryUpdates | boolean | 既存エントリの更新を無視 |

#### Entry（エントリ）

| フィールド | 型 | 説明 |
|---|---|---|
| id | number | PK |
| userId | number | 所有ユーザー |
| feedId | number | 所属フィード |
| status | `"unread"` \| `"read"` | 既読状態 |
| hash | string | コンテンツの重複検出ハッシュ |
| title | string | 記事タイトル |
| url | string | 記事 URL |
| commentsUrl | string | コメント URL |
| publishedAt | Date | 公開日時 |
| createdAt | Date | DB 登録日時 |
| changedAt | Date | 更新日時 |
| content | string | 本文 HTML |
| author | string | 著者名 |
| shareCode | string | 公開共有コード |
| starred | boolean | ブックマーク状態 |
| readingTime | number | 推定読了時間（分） |
| tags | string[] | タグ |

#### Category（カテゴリ）

| フィールド | 型 | 説明 |
|---|---|---|
| id | number | PK |
| userId | number | 所有ユーザー |
| title | string | カテゴリ名 |
| hideGlobally | boolean | 全体表示から非表示 |

#### User（ユーザー）

| フィールド | 型 | 説明 |
|---|---|---|
| id | number | PK |
| username | string | 表示名 |
| isAdmin | boolean | 管理者フラグ |
| theme | string | UI テーマ |
| language | string | 表示言語 |
| timezone | string | タイムゾーン |
| entriesPerPage | number | 1 ページあたりのエントリ数 |
| entryOrder | string | エントリソート順 |
| entryDirection | `"asc"` \| `"desc"` | ソート方向 |
| showReadingTime | boolean | 読了時間表示 |
| markReadOnView | boolean | 閲覧時に自動既読 |
| blockFilterEntryRules | string | ユーザーレベルのブロックフィルタ |
| keepFilterEntryRules | string | ユーザーレベルのキープフィルタ |
| googleId | string \| null | Google OAuth ID |
| lastLoginAt | Date | 最終ログイン日時 |

#### Enclosure（メディア添付）

| フィールド | 型 | 説明 |
|---|---|---|
| id | number | PK |
| userId | number | 所有ユーザー |
| entryId | number | 所属エントリ |
| url | string | メディア URL |
| mimeType | string | MIME タイプ |
| size | number | ファイルサイズ（バイト） |
| mediaProgression | number | 再生進捗（秒） |

#### APIKey

| フィールド | 型 | 説明 |
|---|---|---|
| id | number | PK |
| userId | number | 所有ユーザー |
| token | string | API トークン |
| description | string | 用途メモ |
| lastUsedAt | Date \| null | 最終使用日時 |
| createdAt | Date | 作成日時 |

### 1.2 エンティティ関係

```
User 1──* Category
User 1──* Feed
User 1──* Entry
User 1──* APIKey
Category 1──* Feed
Feed 1──* Entry
Entry 1──* Enclosure
```

---

## 2. 機能仕様

### 2.1 フィード管理

| 機能 | 説明 |
|---|---|
| フィード追加 | URL を指定してフィードを購読（Atom/RSS/JSON Feed/RDF 対応） |
| フィード一覧取得 | ユーザーのフィード一覧（カテゴリ付き） |
| フィード更新 | タイトル・カテゴリ・スクレイピングルール等の変更 |
| フィード削除 | フィードとその全エントリを削除 |
| 手動更新 | 特定フィードを即時取得 |
| 全フィード更新 | ユーザーの全フィードを即時取得 |
| 既読化 | フィード内の全エントリを既読に変更 |
| フィード発見 | 指定 URL から購読可能なフィードを自動検出 |
| OPML インポート | OPML ファイルから一括購読 |
| OPML エクスポート | 購読フィードを OPML 形式で出力 |
| favicon 取得 | フィードのファビコンを取得・保存 |

### 2.2 エントリ管理

| 機能 | 説明 |
|---|---|
| エントリ一覧取得 | フィルタ・ページング・ソート付き |
| エントリ詳細取得 | コンテンツ付き単一エントリ |
| 既読状態変更 | 単体・複数の一括変更 |
| ブックマーク（スター）| エントリのお気に入り登録 |
| 全文取得 | 元サイトから記事全文をスクレイピング |
| 公開共有 | share_code による URL 共有 |
| 古いエントリ削除 | 既読エントリのフラッシュ |

### 2.3 カテゴリ管理

| 機能 | 説明 |
|---|---|
| カテゴリ作成 / 更新 / 削除 | 基本 CRUD |
| カテゴリ内フィード一覧 | カテゴリに属するフィード |
| カテゴリ内エントリ一覧 | カテゴリに属する全エントリ |
| カテゴリ内全既読化 | カテゴリ内の全エントリを既読化 |
| カテゴリ内フィード更新 | カテゴリ内の全フィードを即時取得 |

### 2.4 ユーザー管理

| 機能 | 説明 |
|---|---|
| ユーザー作成（管理者のみ）| 新規ユーザー登録 |
| ユーザー一覧（管理者のみ）| 全ユーザー一覧 |
| ユーザー設定変更 | テーマ・言語・タイムゾーン・フィルタ等 |
| ユーザー削除（管理者のみ）| ユーザーとその全データを削除 |
| 全既読化 | ユーザーの全エントリを既読化 |

### 2.5 認証

| 方式 | 用途 |
|---|---|
| Google OAuth 2.0 | Web UI / CLI ログイン |
| API キー認証 | REST API 向け Bearer トークン |

- ローカル認証（ユーザー名 + パスワード）は非対応
- 初回 OAuth ログイン時にユーザーレコードを自動作成
- 最初に登録したユーザーを管理者に昇格

### 2.6 フィルタリング

正規表現ベースのルールを以下のスコープで設定可能：

- **ユーザーレベル**: 全フィードに適用
- **フィードレベル**: 特定フィードのみに適用

**フィルタルール形式**（1 行 1 ルール、RE2 正規表現）:

```
EntryTitle=.*python.*
EntryURL=github\.com
EntryAuthor=著者名
EntryContent=キーワード
EntryTag=タグ名
EntryDate=before:2024-01-01
EntryDate=after:2024-01-01
EntryDate=max-age:30d
```

**処理順序**:

1. ユーザーのブロックフィルタ（マッチ → 除外）
2. フィードのブロックフィルタ（マッチ → 除外）
3. ユーザーのキープフィルタ（マッチしない → 除外）
4. フィードのキープフィルタ（マッチしない → 除外）

### 2.7 検索

- DuckDB の FTS 拡張（`PRAGMA create_fts_index`）による全文検索
- 検索対象：タイトル・本文・著者
- ランキング：BM25 スコア × 時間減衰（新しい記事を優先）
- インデックス対象カラム: `title`, `content`, `author`

### 2.8 フィード取得パイプライン

```
URL入力
  ↓
HTTP 取得（ETag/Last-Modified による差分取得）
  ↓
フォーマット判定（RSS 1/2 / Atom 0.3/1.0 / JSON Feed / RDF）
  ↓
パース
  ↓
エントリ処理
  ├─ トラッキングパラメータ除去
  ├─ フィルタリング（ブロック/キープルール）
  ├─ 全文スクレイピング（crawler=true 時）
  ├─ コンテンツ書き換え（rewriteRules）
  ├─ HTML サニタイズ（XSS 対策）
  └─ 読了時間計算
  ↓
DB 保存（重複チェックはハッシュで行う）
```

### 2.9 ポーリングスケジューラ

| スケジューラ | 説明 |
|---|---|
| `round_robin` | 固定間隔（デフォルト 30 分）でフィードを順番に取得 |
| `entry_frequency` | フィードの更新頻度に基づいて動的に間隔を決定 |

- フィードごとに `nextCheckAt` を管理
- パースエラー回数が閾値を超えたフィードは自動無効化

---

## 3. tRPC API 仕様

tRPC はエンドポイント URL を持たず、**ルーター → プロシージャ** の階層でAPIを定義する。
呼び出し側（CLI・Web UI）は TypeScript の型を共有するため、スキーマ定義ファイルが不要。

### 認証（tRPC コンテキスト）

各リクエストは tRPC の `context` に認証情報を格納して後続のプロシージャに渡す。

```
HTTP ヘッダ
  Authorization: Bearer <jwt>           ← Google OAuth セッション
  X-API-Key: <token>                    ← API キー認証
        ↓
createContext()  で検証 → ctx.user にセット
        ↓
authedProcedure / adminProcedure で使用
```

### ルーター構成

```
appRouter
├── user
├── category
├── feed
├── entry
├── enclosure
├── apiKey
└── opml
```

### プロシージャ一覧

凡例: `query` = 読み取り専用 / `mutation` = 変更あり / `(admin)` = 管理者のみ

#### user

| プロシージャ | 種別 | 説明 |
|---|---|---|
| `user.me` | query | ログイン中ユーザー情報 |
| `user.list` | query (admin) | 全ユーザー一覧 |
| `user.create` | mutation (admin) | ユーザー作成 |
| `user.update` | mutation | ユーザー設定変更 |
| `user.remove` | mutation (admin) | ユーザー削除 |
| `user.markAllAsRead` | mutation | 全エントリを既読化 |

#### category

| プロシージャ | 種別 | 説明 |
|---|---|---|
| `category.list` | query | カテゴリ一覧（未読数付き） |
| `category.create` | mutation | カテゴリ作成 |
| `category.update` | mutation | カテゴリ名変更 |
| `category.remove` | mutation | カテゴリ削除 |
| `category.feeds` | query | カテゴリ内フィード一覧 |
| `category.entries` | query | カテゴリ内エントリ一覧 |
| `category.refresh` | mutation | カテゴリ内全フィードを即時取得 |
| `category.markAllAsRead` | mutation | カテゴリ内全エントリを既読化 |

#### feed

| プロシージャ | 種別 | 説明 |
|---|---|---|
| `feed.list` | query | フィード一覧 |
| `feed.counters` | query | フィードごとの未読数・既読数 |
| `feed.get` | query | フィード詳細 |
| `feed.discover` | query | URL から購読可能なフィードを検出 |
| `feed.create` | mutation | フィード購読追加 |
| `feed.update` | mutation | フィード設定変更 |
| `feed.remove` | mutation | フィード削除 |
| `feed.refresh` | mutation | 特定フィードを即時取得 |
| `feed.refreshAll` | mutation | 全フィードを即時取得 |
| `feed.icon` | query | フィードの favicon |
| `feed.markAllAsRead` | mutation | フィード内全エントリを既読化 |
| `feed.entries` | query | フィード内エントリ一覧 |

#### entry

| プロシージャ | 種別 | 説明 |
|---|---|---|
| `entry.list` | query | エントリ一覧（フィルタ・ページング付き） |
| `entry.get` | query | エントリ詳細 |
| `entry.updateStatus` | mutation | 既読状態を変更（複数一括対応） |
| `entry.toggleBookmark` | mutation | ブックマークのトグル |
| `entry.fetchContent` | mutation | 元サイトから全文を再取得 |
| `entry.flushHistory` | mutation | 古い既読エントリを削除 |

#### enclosure

| プロシージャ | 種別 | 説明 |
|---|---|---|
| `enclosure.get` | query | エンクロージャ詳細 |
| `enclosure.updateProgression` | mutation | メディア再生進捗を更新 |

#### apiKey

| プロシージャ | 種別 | 説明 |
|---|---|---|
| `apiKey.list` | query | API キー一覧 |
| `apiKey.create` | mutation | API キー生成 |
| `apiKey.remove` | mutation | API キー削除 |

#### opml

| プロシージャ | 種別 | 説明 |
|---|---|---|
| `opml.export` | query | OPML 形式でフィードをエクスポート |
| `opml.import` | mutation | OPML ファイルから一括購読 |

### entry.list の入力スキーマ（Zod）

```ts
z.object({
  status:     z.enum(["unread", "read"]).optional(),
  starred:    z.boolean().optional(),
  feedId:     z.number().optional(),
  categoryId: z.number().optional(),
  search:     z.string().optional(),
  order:      z.enum(["publishedAt", "id"]).default("publishedAt"),
  direction:  z.enum(["asc", "desc"]).default("desc"),
  limit:      z.number().min(1).max(100).default(30),
  offset:     z.number().default(0),
  before:     z.date().optional(),
  after:      z.date().optional(),
})
```

---

## 4. 技術スタック（Bun 実装）

### ランタイム・パッケージ管理

- **Bun** (latest) — ランタイム、テスト、バンドル
- **pnpm + Turborepo** — monorepo 管理

### アプリケーション構成（monorepo）

```
apps/
  api/          Hono + tRPC API サーバー
  cli/          CLI ツール（ログイン・設定管理）
packages/
  db/           DuckDB スキーマ・マイグレーション・ライタークライアント
  feed-parser/  RSS/Atom/JSON Feed パーサー
  tsconfig/     共有 TypeScript 設定
  biome-config/ 共有 Biome 設定
```

### 主要ライブラリ候補

| 用途 | ライブラリ |
|---|---|
| HTTP フレームワーク | Hono |
| API レイヤー | tRPC |
| DB | **DuckDB**（`duckdb-neo` — Bun 対応）|
| DB クライアント | **Waddler**（`waddler/duckdb-neo`）— `sql\`\`` テンプレートタグで型安全な生 SQL |
| DB スキーマ管理 | `drizzle-kit`（マイグレーション生成のみ）|
| Feed パース | `@extractus/feed-extractor` または自前実装 |
| HTML サニタイズ | `isomorphic-dompurify` |
| HTML 全文抽出 | `@mozilla/readability` |
| Linter / Formatter | Biome |
| 認証 | Google OAuth 2.0 + JWT セッション |
| スケジューラ | Bun の `setInterval` ベース |
| バリデーション | Zod |

### DuckDB 採用による構成変化

- **DBサーバー不要**: 単一ファイル（`yomu.db`）に全データを格納
- **docker-compose から postgres・valkey を除外可能**: API コンテナ + DB ファイルのみ
- **ストレージ**: 永続化は volume マウントした `.db` ファイル1本
- **セッション管理**: DuckDB 内の `sessions` テーブルで管理（外部 KVS 不要）

### DB レイヤー構成

**クエリ実行**: Waddler（`waddler/duckdb-neo`）

```ts
import { waddler } from "waddler/duckdb-neo"
const sql = waddler({ dbUrl: "yomu.db" })

const entries = await sql<Entry>`
  select * from entries where feed_id = ${feedId}
`
```

- `sql<T>` のジェネリクスで結果の型を指定
- `sql.values()`・`sql.identifier()`・`sql.raw()` でパラメータを安全に組み立て
- 大量データは `.stream()` / `.chunked(n)` で処理

**スキーマ管理**: `drizzle-kit`（スキーマ定義 + マイグレーション生成のみ、ORM としては使わない）

**FTS インデックス**: マイグレーション内で `PRAGMA create_fts_index(entries, 'id', 'title', 'content', 'author')` を実行

---

## 5. 非機能要件

### DuckDB の書き込み制約と対策

DuckDB は同一ファイルへの **同時書き込みプロセスが1つ**に制限される（シングルライターモデル）。
RSS リーダーの書き込みパターンは以下の2つが競合する：

| 書き込み元 | 頻度 | 特性 |
|---|---|---|
| ポーリングワーカー | 定期（30分〜） | バルク INSERT（多数の新規エントリ） |
| ユーザー操作 | 随時 | 少量 UPDATE（既読・スター） |

**対策: 直列化ライター（Write Queue）**

```
ポーリング結果（エントリ配列）
ユーザー操作（mark-as-read 等）
          ↓
      Write Queue（非同期キュー）
          ↓
    シングルライタープロセス
          ↓
       DuckDB ファイル
```

- 書き込み処理は `packages/db` 内の `Writer` クラスが一元管理
- `BunWorker` または単純な Promise チェーンでシリアライズ
- ポーリング結果はメモリ上でバッファリングし、サイクル終了時に一括 INSERT
- 読み取りは並列可（DuckDB は concurrent read に対応）

### パフォーマンス

- フィード取得は HTTP の ETag / Last-Modified を活用して差分のみ取得
- エントリ一覧は `limit` + `offset` でページング
- 全文検索は DuckDB FTS 拡張（BM25 + 時間減衰）
- 未読カウント等の集計は DuckDB の列指向エンジンで高速処理

### セキュリティ

- HTML コンテンツは保存前にサニタイズ（XSS 対策）
- パスワードは bcrypt でハッシュ化
- API キーはランダム生成（`crypto.getRandomValues`）
- トラッキングパラメータを URL から除去

### 信頼性

- フィードのパースエラーは `parsingErrorCount` でカウント
- 連続エラーが閾値超過でフィードを自動無効化
- フィード取得はタイムアウト付き（デフォルト 20 秒）
- DB ファイルは定期的にチェックポイント（`PRAGMA wal_checkpoint`）

### クリーンアップ

- 既読エントリは設定日数後にアーカイブ（デフォルト 60 日）
- 未読エントリは設定日数後にアーカイブ（デフォルト 180 日）
- バッチサイズを制限してパフォーマンスを維持

### DuckDB 固有の活用ポイント

- **列指向集計**: カテゴリ・フィード別の未読数をワンクエリで集計
- **JSON サポート**: `tags` カラムを JSON 配列として保存・クエリ可能
- **Parquet エクスポート**: `COPY entries TO 'export.parquet'` で読書履歴をデータ分析可能
- **インメモリモード**: テスト時は `:memory:` で高速実行

---

## 6. 未対応（スコープ外）

miniflux に存在するが本実装では対応しない機能:

- Fever API 互換レイヤー
- Google Reader API 互換レイヤー
- WebAuthn / パスキー認証
- OpenID Connect 認証
- 外部サービス統合（Pinboard, Readwise, Slack 等）
- Prometheus メトリクスエンドポイント
- メディアプロキシ機能
- リバースプロキシ認証
- 多言語 UI（初期は日本語 / 英語のみ）
