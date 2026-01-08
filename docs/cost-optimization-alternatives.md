# コスト最適化: Google Cloud 以外の選択肢

月額 $10 以下で PostgreSQL、Redis、Pub/Sub を含む構成の選択肢です。

## 要件

- PostgreSQL（データベース）
- Redis/Valkey（キャッシュ）
- Pub/Sub（メッセージング）
- コンテナ実行環境（Cloud Run 相当）
- **予算: 月額 $10 以下**

## 選択肢比較

### 1. Railway（推奨）

**月額**: 約 $5-10/月（使用量による）

**構成**:
- PostgreSQL: $5/月（20GB、バックアップ付き）
- Redis: $5/月（1GB）
- Pub/Sub: なし（代替: PostgreSQL の LISTEN/NOTIFY または Redis Pub/Sub）
- アプリ: $5/月（512MB RAM、0.5 vCPU）

**メリット**:
- シンプルなデプロイ（GitHub連携）
- 自動スケーリング
- 無料枠あり（$5/月分のクレジット）
- PostgreSQL と Redis が統合管理

**デメリット**:
- Pub/Sub 専用サービスなし（Redis Pub/Sub で代替可能）
- リージョン選択が限定的

**合計**: 約 $10-15/月（無料枠活用で $5-10/月）

---

### 2. Fly.io

**月額**: 約 $3-8/月

**構成**:
- PostgreSQL: $2.50/月（1GB、共有CPU）
- Redis: $2.50/月（256MB）
- Pub/Sub: なし（代替: Redis Pub/Sub または PostgreSQL LISTEN/NOTIFY）
- アプリ: 無料枠内（3 shared-cpu-1x、256MB RAM）

**メリット**:
- 非常に安価
- グローバル分散
- 無料枠が充実

**デメリット**:
- Pub/Sub 専用サービスなし
- 小規模インスタンスはパフォーマンス制限あり

**合計**: 約 $5-8/月（無料枠活用で $3-5/月）

---

### 3. Render

**月額**: 約 $7-12/月

**構成**:
- PostgreSQL: $7/月（1GB、バックアップ付き）
- Redis: $10/月（25MB）または $15/月（100MB）
- Pub/Sub: なし（代替: Redis Pub/Sub）
- アプリ: 無料枠（スリープあり）または $7/月（常時起動）

**メリット**:
- シンプルなUI
- 自動デプロイ
- 無料枠あり

**デメリット**:
- Redis がやや高め
- Pub/Sub 専用サービスなし

**合計**: 約 $14-24/月（無料枠活用で $7-14/月）

---

### 4. VPS（セルフホスト）- Hetzner Cloud

**月額**: 約 $6-8/月

**構成**:
- VPS (CPX11): $6.50/月（2 vCPU、4GB RAM）
  - PostgreSQL: セルフホスト
  - Redis: セルフホスト
  - Pub/Sub: Redis Pub/Sub または RabbitMQ（セルフホスト）
  - アプリ: 同じVPS上で実行

**メリット**:
- 最も安価
- 完全なコントロール
- リソースを柔軟に配分

**デメリット**:
- 運用負荷が高い（バックアップ、セキュリティ、監視）
- スケーリングが手動
- 高可用性の設定が複雑

**合計**: 約 $6.50/月（固定）

---

### 5. Supabase + Fly.io/Railway（ハイブリッド）

**月額**: 約 $0-5/月

**構成**:
- Supabase (無料枠):
  - PostgreSQL: 無料（500MB、2時間バックアップ）
  - Realtime: 無料（Pub/Sub 代替として使用可能）
- Fly.io/Railway:
  - Redis: $2.50-5/月
  - アプリ: 無料枠内

**メリット**:
- 無料枠が充実
- Supabase Realtime で Pub/Sub 代替
- マネージドサービス

**デメリット**:
- 無料枠の制限あり（500MB DB、2時間バックアップ）
- 本番環境には制約がある可能性

**合計**: 約 $2.50-5/月（無料枠活用）

---

### 6. DigitalOcean App Platform

**月額**: 約 $12-15/月

**構成**:
- PostgreSQL: $15/月（1GB、バックアップ付き）
- Redis: $15/月（1GB）
- Pub/Sub: なし（代替: Redis Pub/Sub）
- アプリ: 無料枠内（Basic）

**メリット**:
- 信頼性が高い
- シンプルな管理

**デメリット**:
- やや高め（$10 を超える）
- Pub/Sub 専用サービスなし

**合計**: 約 $15/月

---

## 推奨構成

### 最安値: VPS（Hetzner Cloud）
- **月額**: $6.50
- **構成**: 1台のVPSにすべてをセルフホスト
- **適している人**: 運用スキルあり、コスト最優先

### バランス型: Railway
- **月額**: $5-10（無料枠活用）
- **構成**: マネージドサービス
- **適している人**: 運用負荷を下げたい、シンプルなデプロイ

### 無料重視: Supabase + Fly.io
- **月額**: $2.50-5
- **構成**: 無料枠を最大限活用
- **適している人**: 小規模アプリ、無料枠で十分

---

## Pub/Sub の代替案

専用の Pub/Sub サービスがない場合の代替:

1. **Redis Pub/Sub**
   - Redis に標準搭載
   - 軽量なメッセージングに適している
   - 永続化なし（メッセージが失われる可能性）

2. **PostgreSQL LISTEN/NOTIFY**
   - PostgreSQL に標準搭載
   - 軽量な通知に適している
   - 複雑なメッセージングには不向き

3. **RabbitMQ（セルフホスト）**
   - VPS でセルフホスト可能
   - 本格的なメッセージキュー
   - 運用負荷が高い

4. **Supabase Realtime**
   - WebSocket ベース
   - Pub/Sub の代替として使用可能
   - 無料枠あり

---

## 移行の考慮事項

### Google Cloud から移行する場合

1. **Terraform の書き換え**
   - 各プラットフォーム用の Terraform プロバイダーが必要
   - Railway、Fly.io などは Terraform サポートあり

2. **アプリケーションコードの変更**
   - 接続文字列の変更
   - 環境変数の調整
   - Pub/Sub の実装変更（Redis Pub/Sub など）

3. **デプロイフローの変更**
   - CI/CD パイプラインの更新
   - Docker イメージのレジストリ変更

4. **監視・ログ**
   - 各プラットフォームの監視ツールに移行

---

## 次のステップ

1. **要件の明確化**
   - トラフィック量の見積もり
   - データ量の見積もり
   - Pub/Sub の使用パターン

2. **プロトタイプ**
   - 1つのプラットフォームで試作
   - パフォーマンステスト
   - コスト検証

3. **段階的移行**
   - 開発環境から移行
   - 本番環境への段階的移行

---

## 参考リンク

- [Railway Pricing](https://railway.app/pricing)
- [Fly.io Pricing](https://fly.io/docs/about/pricing/)
- [Render Pricing](https://render.com/pricing)
- [Hetzner Cloud Pricing](https://www.hetzner.com/cloud)
- [Supabase Pricing](https://supabase.com/pricing)
- [DigitalOcean App Platform Pricing](https://www.digitalocean.com/pricing/app-platform)
