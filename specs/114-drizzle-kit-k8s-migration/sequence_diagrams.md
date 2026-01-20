# マイグレーション実行フロー - シーケンス図

## K8s環境でのマイグレーション実行（本番想定）

```mermaid
sequenceDiagram
    participant Dev as 開発者
    participant GH as GitHub Actions
    participant K8s as Kubernetes Cluster
    participant MigJob as Migration Job Pod
    participant DB as PostgreSQL
    participant API as API Deployment

    Dev->>GH: git push (mainブランチ)
    GH->>GH: ビルド & Docker イメージ作成
    Note over GH: ghcr.io/takashiaihara/yomu-api:latest
    
    GH->>GH: 本番環境の手動承認待ち
    Note over GH: GitHub Environments保護ルール
    Dev->>GH: デプロイ承認
    
    GH->>K8s: kubectl apply migration-job.yaml
    Note over GH,K8s: Job名: yomu-migration-{timestamp}
    
    K8s->>MigJob: Pod作成 & 起動
    Note over MigJob: Image: ghcr.io/takashiaihara/yomu-api:latest<br/>Command: pnpm db:migrate
    
    MigJob->>DB: SELECT pg_try_advisory_lock(123456789)
    
    alt ロック取得成功
        DB-->>MigJob: acquired = true
        MigJob->>MigJob: マイグレーション開始ログ
        MigJob->>DB: BEGIN TRANSACTION
        MigJob->>DB: SELECT * FROM __drizzle_migrations__
        DB-->>MigJob: 適用済みマイグレーション一覧
        
        MigJob->>MigJob: 未適用マイグレーションを特定
        
        loop 各未適用マイグレーション
            MigJob->>DB: CREATE TABLE IF NOT EXISTS ...
            DB-->>MigJob: OK
            MigJob->>DB: INSERT INTO __drizzle_migrations__ ...
            DB-->>MigJob: OK
        end
        
        MigJob->>DB: COMMIT
        MigJob->>DB: SELECT hash FROM __drizzle_migrations__ ORDER BY created_at DESC LIMIT 1
        DB-->>MigJob: schema_version
        
        MigJob->>DB: SELECT pg_advisory_unlock(123456789)
        DB-->>MigJob: unlocked
        
        MigJob->>MigJob: メトリクスログ出力
        Note over MigJob: duration_ms, success=true,<br/>schema_version, timestamp
        
        MigJob->>K8s: Exit 0 (成功)
        K8s-->>GH: Job Complete
        
        GH->>GH: デプロイ継続判定
        GH->>K8s: kubectl apply deployment.yaml
        K8s->>API: 新しいPod作成 & ローリングアップデート
        API->>DB: アプリケーション接続
        Note over API,DB: 新しいスキーマで動作
        
    else ロック取得失敗（並行実行）
        DB-->>MigJob: acquired = false
        MigJob->>MigJob: エラーログ: "Failed to acquire advisory lock"
        MigJob->>K8s: Exit 1 (失敗)
        K8s-->>GH: Job Failed
        
        GH->>GH: デプロイブロック
        GH->>K8s: kubectl rollout undo deployment/yomu-api
        Note over GH: 前のバージョンに自動ロールバック
        GH->>Dev: アラート送信
    end
    
    alt マイグレーション失敗（SQL エラー等）
        MigJob->>DB: CREATE TABLE ... (エラー発生)
        DB-->>MigJob: ERROR: syntax error
        MigJob->>DB: ROLLBACK
        MigJob->>DB: SELECT pg_advisory_unlock(123456789)
        MigJob->>MigJob: エラーログ出力
        MigJob->>K8s: Exit 1 (失敗)
        K8s-->>GH: Job Failed
        GH->>K8s: kubectl rollout undo deployment/yomu-api
        GH->>Dev: アラート送信
    end
```

## ローカル開発環境（Docker Compose）

```mermaid
sequenceDiagram
    participant Dev as 開発者
    participant DC as Docker Compose
    participant API as API Container
    participant DB as PostgreSQL Container

    Dev->>DC: docker-compose up
    DC->>DB: PostgreSQL起動
    Note over DB: ヘルスチェック待機
    
    DC->>API: API Container起動
    Note over API: Command: sh -c "pnpm db:migrate && pnpm start"
    
    API->>DB: SELECT pg_try_advisory_lock(123456789)
    DB-->>API: acquired = true
    
    API->>DB: マイグレーション実行
    Note over API,DB: migrate.ts が実行される<br/>（K8s Jobと同じロジック）
    
    DB-->>API: マイグレーション完了
    API->>DB: SELECT pg_advisory_unlock(123456789)
    
    API->>API: pnpm start 実行
    Note over API: Honoサーバー起動
    
    API-->>Dev: API Ready (http://localhost:3000)
```

## 並行実行の防止メカニズム

```mermaid
sequenceDiagram
    participant Job1 as Migration Job 1
    participant Job2 as Migration Job 2
    participant DB as PostgreSQL

    par 同時実行
        Job1->>DB: SELECT pg_try_advisory_lock(123456789)
        Job2->>DB: SELECT pg_try_advisory_lock(123456789)
    end
    
    Note over DB: PostgreSQLが排他制御<br/>先着順で1つだけロック許可
    
    DB-->>Job1: acquired = true ✅
    DB-->>Job2: acquired = false ❌
    
    Job1->>DB: マイグレーション実行
    Job2->>Job2: エラー: "Failed to acquire advisory lock"
    Job2->>Job2: Exit 1
    
    Job1->>DB: マイグレーション完了
    Job1->>DB: SELECT pg_advisory_unlock(123456789)
    Job1->>Job1: Exit 0
```

## コンテナイメージの構成

```mermaid
graph TB
    subgraph "Docker Image: ghcr.io/takashiaihara/yomu-api:latest"
        A[Node.js Runtime]
        B[pnpm]
        C[apps/api/dist/*]
        D[apps/api/src/shared/db/migrate.ts]
        E[drizzle/migrations/*.sql]
        F[node_modules]
    end
    
    subgraph "K8s Migration Job"
        G[Command: pnpm db:migrate]
        H[Environment: DATABASE_URL]
        I[Resources: 128Mi/100m]
    end
    
    subgraph "K8s API Deployment"
        J[Command: pnpm start]
        K[Environment: DATABASE_URL + 他]
        L[Resources: 512Mi/500m]
    end
    
    A --> G
    D --> G
    E --> G
    F --> G
    
    A --> J
    C --> J
    F --> J
```

## 重要なポイント

### 1. 同じDockerイメージを使用

- **Migration Job**: `pnpm db:migrate` を実行
- **API Deployment**: `pnpm start` を実行
- **利点**: イメージの一貫性、マイグレーションとアプリの互換性保証

### 2. K8s Jobパターン

```yaml
# migration-job.yaml
apiVersion: batch/v1
kind: Job
spec:
  template:
    spec:
      containers:
      - name: migration
        image: ghcr.io/takashiaihara/yomu-api:latest
        command: ["pnpm", "db:migrate"]  # ← ここが違う
        envFrom:
        - configMapRef:
            name: yomu-config
        - secretRef:
            name: yomu-secrets
      restartPolicy: OnFailure
```

### 3. GitHub Actionsでの実行順序

```
1. Docker イメージビルド
   ↓
2. イメージをレジストリにプッシュ
   ↓
3. 手動承認待ち（本番のみ）
   ↓
4. Migration Job作成 & 実行
   ↓
5. Job完了待ち（300秒タイムアウト）
   ↓
6. 成功 → Deployment更新
   失敗 → ロールバック
```

この設計により、K8s環境では専用のJobコンテナでマイグレーションを実行し、成功した場合のみアプリケーションをデプロイします。
