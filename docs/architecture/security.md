# セキュリティガイドライン

Yomuプロジェクトにおけるセキュリティのベストプラクティスと注意事項をまとめたドキュメントです。

---

## 機密情報管理の原則

### 絶対のルール

**「コンテナイメージに機密情報を含めない」**

---

## 1. Dockerイメージのセキュリティ

### ✅ 安全な実装

```dockerfile
# OK: プレースホルダーのみ
ENV NODE_ENV=production
ENV PORT=3000

# OK: ソースコードのみ
COPY apps/api/ ./apps/api/

# OK: ビルド成果物のみ
COPY --from=builder /app/apps/api/dist ./apps/api/dist
```

### ❌ 危険な実装（絶対禁止）

```dockerfile
# NG: .envファイルをコピー
COPY .env ./

# NG: 機密情報をハードコード
ENV DATABASE_URL=postgresql://user:password@host/db
ENV SESSION_SECRET=my-secret-key
ENV GOOGLE_CLIENT_SECRET=xxx

# NG: 秘密鍵をコピー
COPY secrets/ ./secrets/
COPY id_rsa ./
```

---

## 2. .dockerignore

### 必須の除外項目

```
# 環境変数ファイル
.env
.env.*
!.env.example

# 秘密鍵
*.pem
*.key
id_rsa
id_rsa.pub

# 認証情報
secrets/
credentials/

# 開発ファイル
node_modules
.git
tests
coverage
```

---

## 3. .gitignore

### 必須の除外項目

```
# 環境変数
.env
.env.local
.env.*.local

# K8s Secrets
k8s/**/secret.yaml
!k8s/**/secret.yaml.example

# 認証情報
*.pem
*.key
credentials/
```

---

## 4. Secrets管理

### GitHub Secrets (CI/CD用)

**用途:** ビルド・デプロイパイプライン

```yaml
# .github/workflows/build.yml
env:
  REGISTRY: ghcr.io

jobs:
  build:
    steps:
      - name: Login to GHCR
        with:
          password: ${{ secrets.GITHUB_TOKEN }}  # GitHub提供
```

**使用例:**

- GITHUB_TOKEN (自動提供)
- Docker Registry認証
- デプロイ用トークン

**特徴:**

- GitHub Actions実行時のみアクセス可能
- コンテナイメージには含まれない
- ビルド・デプロイプロセスでのみ使用

---

### K8s Secrets (アプリケーション用)

**用途:** アプリケーション実行時

```bash
# Secretsの作成
kubectl create secret generic yomu-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=SESSION_SECRET="$(openssl rand -base64 32)" \
  --from-literal=GOOGLE_CLIENT_SECRET="..." \
  -n yomu
```

```yaml
# deployment.yamlでの使用
envFrom:
- secretRef:
    name: yomu-secrets
```

**使用例:**

- DATABASE_URL
- GOOGLE_CLIENT_SECRET
- SESSION_SECRET
- API Keys

**特徴:**

- コンテナ実行時に環境変数として注入
- K8sクラスタ内でのみ存在
- イメージには含まれない

---

## 5. セキュリティフロー

### 開発環境

```
開発者
  ↓
.env (ローカル)
  ↓ (Gitにコミットされない)
アプリケーション
```

### 本番環境

```
GitHub Repository (Public)
  ├── ソースコード (公開OK)
  ├── Dockerfile (機密情報なし)
  └── K8s Manifests (機密情報なし)
  
  ↓ GitHub Actions
  
GitHub Secrets (CI/CD)
  └── GITHUB_TOKEN
  
  ↓ Build
  
Docker Image (Public)
  ├── ビルド済みコード
  └── 機密情報なし ✅
  
  ↓ Deploy
  
K8s Secrets (実行時)
  ├── DATABASE_URL
  ├── SESSION_SECRET
  └── GOOGLE_CLIENT_SECRET
  
  ↓ Inject
  
Running Container
  └── 環境変数として注入 ✅
```

---

## 6. Public イメージのリスク評価

### リスク

1. **ソースコードの露出**
   - ビルド済みコードが見える
   - リバースエンジニアリング可能
   - **影響**: リポジトリが既にPublicなので追加リスクは小

2. **依存関係の露出**
   - 使用ライブラリ・バージョンが分かる
   - 脆弱性を突かれる可能性
   - **対策**: 定期的なアップデート、Dependabot

3. **設定ファイルの漏洩**
   - Dockerfileに含めると漏洩
   - **対策**: 環境変数で管理、.dockerignore

### 安全性の確認

| 項目 | 状態 | 対策 |
|------|------|------|
| .env除外 | ✅ | .dockerignore |
| Secret除外 | ✅ | .gitignore |
| 機密情報ハードコード | ✅ なし | Dockerfile確認 |
| 実行時注入 | ✅ | K8s Secrets |

---

## 7. チェックリスト

### デプロイ前の確認

- [ ] .dockerignore に .env が含まれている
- [ ] .gitignore に secret.yaml が含まれている
- [ ] Dockerfileに機密情報のハードコードがない
- [ ] K8s Secretsが作成されている
- [ ] deployment.yamlでSecretsを参照している
- [ ] .env.exampleのみコミットされている

### コードレビュー時の確認

- [ ] 新しい環境変数は.env.exampleに追加されているか
- [ ] 機密情報がコードにハードコードされていないか
- [ ] 新しいSecretはK8s Secretsに追加されているか
- [ ] ログに機密情報が出力されていないか

---

## 8. インシデント対応

### 機密情報が漏洩した場合

1. **即座にローテーション**

   ```bash
   # 新しいSecretを生成
   NEW_SECRET=$(openssl rand -base64 32)
   
   # K8s Secretsを更新
   kubectl create secret generic yomu-secrets \
     --from-literal=SESSION_SECRET="$NEW_SECRET" \
     --dry-run=client -o yaml | kubectl apply -f -
   
   # Podを再起動
   kubectl rollout restart deployment/yomu-api -n yomu
   ```

2. **影響範囲の確認**
   - どの機密情報が漏洩したか
   - いつから公開されていたか
   - アクセスログの確認

3. **再発防止**
   - .gitignoreの見直し
   - CI/CDでのチェック追加
   - チーム教育

### Dockerイメージに機密情報が含まれていた場合

1. **イメージの削除**

   ```bash
   # GHCRから削除
   # https://github.com/TakashiAihara?tab=packages
   # Package settings → Delete package
   ```

2. **Gitの履歴から削除**

   ```bash
   # BFG Repo-Cleanerなどを使用
   # または新しいリポジトリに移行
   ```

3. **機密情報のローテーション**
   - すべての漏洩した機密情報を変更

---

## 9. ベストプラクティス

### 環境変数の命名

```bash
# Good
DATABASE_URL=postgresql://...
SESSION_SECRET=xxx
GOOGLE_CLIENT_SECRET=xxx

# Bad (機密情報が分かりにくい)
DB=postgresql://...
SECRET=xxx
KEY=xxx
```

### Secret.yamlの管理

```yaml
# secret.yaml.example (コミットOK)
apiVersion: v1
kind: Secret
metadata:
  name: yomu-secrets
stringData:
  DATABASE_URL: "postgresql://user:password@host/db"
  SESSION_SECRET: "your-secret-here"

# secret.yaml (コミット禁止、.gitignoreで除外)
apiVersion: v1
kind: Secret
metadata:
  name: yomu-secrets
stringData:
  DATABASE_URL: "postgresql://real:real@real/real"
  SESSION_SECRET: "real-secret-here"
```

### ログ出力

```typescript
// Good
console.log('Database connected');

// Bad (機密情報を出力)
console.log('Database connected:', process.env.DATABASE_URL);
console.log('Session secret:', process.env.SESSION_SECRET);
```

---

## 10. 監査

### 定期的な確認

- 月1回: .dockerignore, .gitignore の見直し
- 月1回: Dependabot アラートの確認
- 四半期: セキュリティ監査
- 年1回: 機密情報のローテーション

### ツール

```bash
# Secretsのスキャン
git secrets --scan

# 依存関係の脆弱性チェック
npm audit

# Dockerイメージのスキャン
docker scan ghcr.io/takashiaihara/yomu-api:latest
```

---

## まとめ

### 重要な原則

1. **コンテナに機密情報を含めない**
2. **実行時にK8s Secretsから注入**
3. **GitHub SecretsはCI/CD用のみ**
4. **.dockerignore, .gitignoreを厳格に管理**
5. **定期的な監査とローテーション**

### 安全性の確保

- ✅ 多層防御
- ✅ 最小権限の原則
- ✅ 定期的な見直し
- ✅ インシデント対応計画
