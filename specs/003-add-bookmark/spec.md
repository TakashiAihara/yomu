# Feature Specification: ブックマーク追加機能

**Feature Branch**: `003-add-bookmark`
**Created**: 2026-01-04
**Status**: Draft
**Input**: User description: "ブックマークの追加機能を追加したい。CLIでのブックマーク追加も含める。"

## Clarifications

### Session 2026-01-05

- Q: Which URL schemes should be rejected for security? → A: Allow only http and https schemes (reject file://, javascript://, data:, etc.)
- Q: What is the default limit when --limit not specified in bookmark list? → A: Default limit of 20 bookmarks when --limit not specified
- Q: What should the delete confirmation behavior be? → A: Interactive y/n with details shown (title, URL) before deleting, --force skips it
- Q: How should title field be stored when user doesn't provide --title? → A: Store NULL in database, CLI displays URL as fallback. Design allows future auto-fetch title feature
- Q: What is the maximum length for bookmark title field? → A: 500 characters

## User Scenarios & Testing *(mandatory)*

### User Story 1 - CLIでブックマークを追加 (Priority: P1)

認証済みユーザーとして、CLIコマンドでURLをブックマークに追加したい。ターミナルから素早くコンテンツを保存できるようにするため。

**Why this priority**: CLIアプリケーションの主要機能であり、これがなければ機能全体が成立しない。

**Independent Test**: ユーザーがCLIコマンドでURLをブックマークに追加し、そのブックマークが保存されていることを確認できればテスト完了。

**Acceptance Scenarios**:

1. **Given** 認証済みのユーザー, **When** `yomu bookmark add <URL>` コマンドを実行する, **Then** そのURLがブックマークに追加され、成功メッセージが表示される
2. **Given** 認証済みのユーザー, **When** タイトル付きで `yomu bookmark add <URL> --title "記事タイトル"` を実行する, **Then** 指定したタイトルでブックマークが保存される
3. **Given** 認証済みのユーザー, **When** 既にブックマーク済みのURLに対して追加を試みる, **Then** 重複追加されず、既にブックマーク済みである旨が表示される
4. **Given** 未認証のユーザー, **When** ブックマーク追加コマンドを実行する, **Then** ログインを促すメッセージが表示される
5. **Given** 認証済みのユーザー, **When** 無効なURL形式で追加を試みる, **Then** URLの形式エラーメッセージが表示される
6. **Given** 認証済みのユーザー, **When** 500文字を超えるタイトルで追加を試みる, **Then** タイトル長のバリデーションエラーが表示される

---

### User Story 2 - CLIでブックマーク一覧を表示 (Priority: P1)

認証済みユーザーとして、CLIコマンドで保存したブックマークの一覧を表示したい。保存したコンテンツを確認できるようにするため。

**Why this priority**: ブックマークを追加しても一覧表示できなければ意味がない。作成機能と同等に重要。

**Independent Test**: ブックマークを追加後、一覧コマンドで追加したブックマークが表示されることを確認できればテスト完了。

**Acceptance Scenarios**:

1. **Given** ブックマークを追加済みのユーザー, **When** `yomu bookmark list` コマンドを実行する, **Then** 保存したブックマークが新しい順に最大20件表示される（ID、タイトル、URL、追加日時）
2. **Given** ブックマークが0件のユーザー, **When** `yomu bookmark list` コマンドを実行する, **Then** 「ブックマークがありません」というメッセージが表示される
3. **Given** 大量のブックマークがあるユーザー, **When** `yomu bookmark list --limit 10` を実行する, **Then** 指定した件数のみ表示される
4. **Given** 20件以上のブックマークがあるユーザー, **When** `yomu bookmark list --offset 20` を実行する, **Then** 21件目以降のブックマークが表示される（デフォルト20件まで）

---

### User Story 3 - CLIでブックマークを削除 (Priority: P2)

認証済みユーザーとして、CLIコマンドで不要になったブックマークを削除したい。ブックマーク一覧を整理するため。

**Why this priority**: 追加・一覧表示ほど重要ではないが、ユーザーがブックマークを管理するために必要な機能。

**Independent Test**: ブックマークを削除し、一覧から消えていることを確認できればテスト完了。

**Acceptance Scenarios**:

1. **Given** ブックマークを追加済みのユーザー, **When** `yomu bookmark remove <ID>` コマンドを実行する, **Then** ブックマークの詳細（タイトル、URL）が表示され、y/n確認プロンプトが表示される。yを入力するとブックマークが削除される
2. **Given** ブックマークを削除しようとするユーザー, **When** `yomu bookmark remove <ID> --force` を実行する, **Then** 確認プロンプトなしで即座に削除される
3. **Given** ユーザー, **When** 存在しないIDで削除を試みる, **Then** 「ブックマークが見つかりません」というエラーが表示される
4. **Given** 削除確認中のユーザー, **When** 確認プロンプトでnを入力する, **Then** 削除がキャンセルされ、ブックマークは保持される

---

### Edge Cases

- 同じURLを複数回ブックマークしようとした場合 → 重複を防ぎ、既存のブックマークを維持
- ブックマークしたURLが後にアクセス不能になった場合 → ブックマークには残る（URLの有効性チェックは行わない）
- 大量のブックマーク（100件以上）がある場合 → `--limit` オプションと `--offset` オプションでページネーション対応
- APIサーバーに接続できない場合 → エラーメッセージを表示し、接続を確認するよう促す
- タイトルが指定されない場合 → データベースには NULL を保存し、CLI の表示時に URL をタイトルとして表示（将来的な OGP 自動取得機能の拡張余地を残す）
- タイトルが500文字を超える場合 → バリデーションエラーを表示し、タイトルを短縮するよう促す
- 危険なURLスキーム（file://, javascript://, data:など）を使用しようとした場合 → セキュリティのためhttp/httpsのみ許可し、エラーメッセージを表示

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: システムは認証済みユーザーがコンテンツをブックマークに追加できなければならない
- **FR-002**: システムは同一ユーザーによる同一コンテンツの重複ブックマークを防止しなければならない
- **FR-003**: システムはユーザーのブックマーク一覧を新しい順に表示できなければならない
- **FR-004**: システムはブックマークの追加日時を記録しなければならない
- **FR-005**: ユーザーは自分のブックマークを削除できなければならない
- **FR-006**: システムはブックマーク削除時にブックマークの詳細（タイトル、URL）を表示し、y/n形式の確認を求めなければならない（--forceフラグで確認をスキップ可能）
- **FR-007**: システムは未認証ユーザーのブックマーク操作を拒否しなければならない
- **FR-008**: システムはブックマーク操作の成功・失敗をユーザーに通知しなければならない
- **FR-009**: システムはセキュリティのためhttp/httpsスキームのURLのみを許可し、file://, javascript://, data:等の危険なスキームを拒否しなければならない
- **FR-010**: システムはブックマーク一覧表示時、--limitオプションが指定されない場合、デフォルトで20件を表示しなければならない
- **FR-011**: システムはブックマークのタイトルを500文字以内に制限し、超過する場合はバリデーションエラーを返さなければならない

### Key Entities

- **Bookmark**: ユーザーが保存したコンテンツへの参照。ユーザーID、URL（必須）、タイトル（NULL許可、最大500文字）、作成日時を持つ
- **User**: ブックマークを所有するユーザー。1人のユーザーは複数のブックマークを持てる
- **URL**: ブックマーク対象となるWebページのURL。http/httpsスキームのみ有効

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: ユーザーは3クリック以内でコンテンツをブックマークに追加できる
- **SC-002**: ブックマーク一覧は2秒以内に表示される
- **SC-003**: ブックマーク追加・削除操作は1秒以内に完了する
- **SC-004**: ユーザーは100件以上のブックマークを効率的にブラウズできる
- **SC-005**: ブックマーク機能の操作成功率が99%以上である

## Assumptions

- ユーザー認証機能（Google OAuth）は既に実装済み
- ブックマーク対象となる「コンテンツ」の定義は、URL形式のWebページを想定
- ブックマークにはタグやフォルダ分類機能は含まない（将来の拡張として検討）
- ブックマークの共有機能は含まない（プライベートなブックマークのみ）
- ブックマーク数に上限は設けない

## Out of Scope

- ブックマークのタグ付け・分類機能
- ブックマークの検索機能
- ブックマークの共有・公開機能
- ブックマークのインポート・エクスポート機能
- ブックマークの並び替え（手動順序変更）
- OGP/メタデータからの自動タイトル取得機能（将来の拡張として検討、データモデルは対応済み）
