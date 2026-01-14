# アーキテクチャ決定記録

## 概要

Yomuプロジェクトのインフラ・デプロイ戦略に関する重要な決定事項をまとめたドキュメントです。

---

## 1. デプロイ環境の選択

### 決定事項

**Proxmox VE上のK3sクラスタを採用**

### 理由

- 複数サービスを運用予定
- マイクロサービス構成を実現したい
- 月額予算: 約¥1,000
- 既存のProxmox VE環境を活用
- 学習目的も兼ねる

### 検討した代替案

| 選択肢 | メリット | デメリット | 結論 |
|--------|---------|-----------|------|
| **Fly.io** | マネージド、簡単 | 複数サービスで高額化 | ❌ |
| **Railway** | UI優秀 | 月¥1,500-2,200 | ❌ |
| **Coolify** | Vercel風UI | Docker Wrapper感 | ❌ |
| **K3s on Proxmox** | 柔軟、低コスト | 運用負荷 | ✅ 採用 |

### コスト試算

```
Proxmox VE (K3s):
- 電気代: 約¥1,000/月
- サービス追加: ¥0
- 合計: ¥1,000/月

Fly.io (3サービス):
- API × 3: $11.64
- PostgreSQL × 3: $75
- Redis × 3: $30
- 合計: $116.64/月 (¥17,496)
```

---

## 2. K3sクラスタ構成

### クラスタ仕様

```yaml
k1 (192.168.0.41): Control Plane
  cores: 2
  memory: 6GB
  rootfs: 50GB
  role: K3s Server

k2 (192.168.0.42): Worker
  cores: 2
  memory: 6GB
  rootfs: 50GB
  role: K3s Agent

k3 (192.168.0.43): Worker
  cores: 2
  memory: 6GB
  rootfs: 50GB
  role: K3s Agent

合計リソース:
  CPU: 6 cores
  RAM: 18GB
  Storage: 150GB
```

### LXC設定

```bash
features: nesting=1,keyctl=1
unprivileged: 1
OS: Ubuntu 24.04 LTS
```

**重要な設定:**

- `nesting=1`: コンテナ内でDockerコンテナ実行に必要
- `keyctl=1`: K8s/K3sの認証・暗号化に必要
- `unprivileged=1`: セキュリティ重視

### リソース配分

```
k1 (Server): 6GB
├── K3s Control Plane: ~1.5GB
├── etcd: ~500MB
├── システム: ~500MB
└── 余剰: ~3.5GB (Pod実行可能)

k2/k3 (Worker): 6GB each
├── K3s Agent: ~500MB
├── システム: ~500MB
└── 余剰: ~5GB (Pod実行)

合計Pod実行可能: ~13.5GB
想定サービス数: 10-15サービス
```

---

## 3. GitOps戦略: ArgoCD

### 決定事項

**ArgoCDを採用し、各アプリケーションが自己完結する構成**

### アーキテクチャ

```
homelab-k3s (インフラリポジトリ)
├── argocd/install.yaml    # ArgoCD本体のみ
└── shared/                # 共有リソース
    ├── postgres/
    └── valkey/

yomu (アプリケーションリポジトリ)
├── apps/                  # ソースコード
├── k8s/
│   ├── argocd/
│   │   └── application.yaml  # 自分自身のApplication定義
│   └── yomu/
│       ├── deployment.yaml
│       └── service.yaml
```

### 重要な設計判断

**App of Apps パターンを採用しない**

理由:

- サービス追加時に2つのリポジトリを編集する必要がある
- 各サービスが独立して完結すべき
- 管理が煩雑になる

**各アプリケーションが自分のApplication定義を持つ**

メリット:

- ✅ 1つのリポジトリで完結
- ✅ サービス追加が簡単
- ✅ 独立性が高い
- ✅ homelab-k3sを触る必要がない

### デプロイフロー

```
1. yomuリポジトリで開発
2. git push
3. ArgoCD Application登録 (初回のみ)
   kubectl apply -f k8s/argocd/application.yaml
4. 以降は自動同期
```

---

## 4. リポジトリ構成

### homelab-k3s (Private推奨)

**役割:** インフラのみ

```
homelab-k3s/
├── argocd/
│   └── install.yaml       # ArgoCD本体
└── shared/                # 共有リソース
    ├── postgres/
    └── valkey/
```

**含まれるもの:**

- ArgoCD本体のインストール定義
- 共有リソース（PostgreSQL, Valkey）

**含まれないもの:**

- アプリケーション固有の設定
- Application定義（各アプリが管理）

### yomu (Public)

**役割:** アプリケーション全体

```
yomu/
├── apps/                  # ソースコード
├── k8s/
│   ├── argocd/
│   │   ├── application.yaml
│   │   └── README.md
│   └── yomu/
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── configmap.yaml
│       └── secret.yaml.example
└── .github/workflows/
    └── build.yml          # Docker image build
```

---

## 5. Dockerイメージ戦略

### 決定事項

**GitHub Container Registry (GHCR) Public を使用**

### セキュリティ原則

**「コンテナ内に機密情報は絶対に含めない」**

### 安全性の確保

```
機密情報の管理:
1. ビルド時: .dockerignore で .env を除外
2. イメージ: 機密情報を含まない
3. 実行時: K8s Secrets で環境変数注入
```

### .dockerignore

```
.env
.env.*
!.env.example
```

### Dockerfile

```dockerfile
# OK: プレースホルダーのみ
ENV NODE_ENV=production
ENV PORT=3000

# NG: 絶対にやらない
# ENV DATABASE_URL=postgresql://...
# COPY .env ./
```

### コスト

| 項目 | Public | Private |
|------|--------|---------|
| ストレージ | 無料 | $0.008/GB/日 |
| 帯域幅 | 無料 | $0.50/GB |
| **合計** | **¥0/月** | **¥3,675/月** |

### リスク評価

**Public イメージのリスク:**

- ソースコードが見える → リポジトリが既にPublicなので問題なし
- 依存関係が見える → セキュリティアップデートで対応

**安全性:**

- ✅ .dockerignore で .env 除外
- ✅ Dockerfileで機密情報ハードコードなし
- ✅ K8s Secretsで実行時注入
- ✅ .gitignore で secret.yaml 除外

---

## 6. Secrets管理

### GitHub Secrets vs K8s Secrets

| 用途 | GitHub Secrets | K8s Secrets |
|------|---------------|-------------|
| **目的** | CI/CD | アプリケーション実行 |
| **使用タイミング** | ビルド・デプロイ時 | コンテナ起動時 |
| **例** | GITHUB_TOKEN | DATABASE_URL, SESSION_SECRET |

### GitHub Secrets (CI/CD用)

```yaml
# .github/workflows/build.yml
- name: Log in to GHCR
  with:
    password: ${{ secrets.GITHUB_TOKEN }}  # 自動提供
```

**必要なもの:**

- `GITHUB_TOKEN` (自動提供、設定不要)

### K8s Secrets (アプリケーション用)

```bash
kubectl create secret generic yomu-secrets \
  --from-literal=DATABASE_URL="..." \
  --from-literal=GOOGLE_CLIENT_SECRET="..." \
  --from-literal=SESSION_SECRET="..." \
  -n yomu
```

**必要なもの:**

- DATABASE_URL
- VALKEY_URL
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- SESSION_SECRET

### セキュリティフロー

```
GitHub Repository (Public)
  ↓
GitHub Secrets (CI/CD)
  ↓
Docker Image (Public, 機密情報なし)
  ↓
K8s Secrets (実行時)
  ↓
Running Container (環境変数注入)
```

---

## 7. CI/CD戦略

### ビルドパイプライン

```yaml
# .github/workflows/build.yml
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Login to GHCR
      - Build & Push Docker image
```

### デプロイパイプライン

**ArgoCD自動同期**

```yaml
# k8s/argocd/application.yaml
syncPolicy:
  automated:
    prune: true
    selfHeal: true
```

**フロー:**

1. git push
2. GitHub Actions: Dockerイメージビルド
3. ArgoCD: 変更検知（3分ごと）
4. 自動デプロイ

---

## 8. 既存サービスの扱い

### 決定事項

**Jellyfin/Komga等のメディアサーバーはK3sに移行しない**

### 理由

```
メディアサーバーの特徴:
- 大容量ストレージ (数百GB〜TB)
- GPU/ハードウェアアクセラレーション
- 単一インスタンスで十分
- 水平スケール不要

K8sのメリットがない:
- ステートフル
- 永続ストレージ管理が複雑
- オーバーヘッドが無駄
```

### 推奨構成

```
Proxmox VE
├── K3s クラスタ (新規サービス)
│   ├── Yomu
│   ├── Service2
│   └── Service3
│
└── 独立LXC (既存サービス)
    ├── Jellyfin
    ├── Komga
    └── その他
```

---

## 9. 今後の拡張性

### サービス追加時

```bash
# 1. 新しいリポジトリ作成
mkdir service2
cd service2

# 2. K8sマニフェスト作成
mkdir -p k8s/argocd
mkdir -p k8s/service2

# 3. Application定義作成
cat > k8s/argocd/application.yaml <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: service2
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/TakashiAihara/service2
    path: k8s/service2
  destination:
    namespace: service2
  syncPolicy:
    automated: {}
EOF

# 4. デプロイ
kubectl apply -f k8s/argocd/application.yaml
```

**homelab-k3sは触らない！**

### スケーリング

```
現在: 18GB RAM
├── 軽量サービス (256MB): 約50サービス
├── 中規模サービス (512MB): 約25サービス
└── Yomu規模 (1GB): 約13サービス

リソース不足時:
- Worker追加 (LXC 1台追加)
- 既存LXCのメモリ増強
```

---

## まとめ

### 主要な決定事項

1. **環境**: Proxmox VE + K3s (月¥1,000)
2. **GitOps**: ArgoCD (各アプリ自己完結)
3. **リポジトリ**: homelab-k3s (インフラ) + yomu (アプリ)
4. **イメージ**: GHCR Public (無料、安全)
5. **Secrets**: K8s Secrets (実行時注入)
6. **既存サービス**: K3s移行せず、独立LXC

### 設計原則

- **各サービスが自己完結**: 1リポジトリで完結
- **機密情報の分離**: コンテナに含めない
- **適材適所**: K8s向きサービスのみK8sへ
- **コスト最適化**: 無料枠活用、セルフホスト

### 次のステップ

1. ArgoCD インストール
2. Yomu Secrets作成
3. Yomu Application登録
4. 動作確認
