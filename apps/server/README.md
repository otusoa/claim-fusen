# DBスキーマ

[Drizzleスキーマ関係](https://outline-wiki.pitamai.com/doc/drizzle-mhjKRATQUp)に基づく初期スキーマ。
背景は[claim-fusen 草稿](https://outline-wiki.pitamai.com/doc/claim-fusen-bsY8XvKb2Q)を参照。

対象は `projects`、`claims`、`sources`、`evidences`、`claim_evidences` の5テーブル。
API、認証、画面、Question、Claim同士のRelationは今後の実装範囲。

## コマンド

リポジトリのルートで実行する。

```sh
pnpm install
pnpm typecheck
pnpm db:generate
pnpm db:check
```

型チェック・migration生成・migrationの整合性確認にはDB接続は不要。
初回migrationは `drizzle/0000_initial_schema.sql` に生成済み。

実際のDBへ適用するときは `apps/server/.env.example` を
`apps/server/.env` にコピーし、`DATABASE_URL` を接続先に合わせて設定してから実行する。

```sh
pnpm db:migrate
```

## データの扱い

- IDはDBが生成するUUID。日時はタイムゾーン付きtimestamp。
- Project削除はClaimとEvidence、Claim/Evidence削除は中間テーブルへcascadeする。
- SourceはProjectに所属せず、Evidenceから参照中のSourceの削除はrestrictする。
- 同一Claim・Evidence・typeの組み合わせはunique制約で重複を防ぐ。
- `status`とRelationの`type`はDBではtext。候補値はTypeScriptの型として定義しており、DBのenumやCHECK制約には固定しない。外部入力のvalidationはAPI実装時に行う。
- `updated_at`は作成時に`now()`を設定する。更新時は呼び出し側で明示的に設定する。DBトリガーやDrizzle専用の自動更新は導入していない。
- ClaimとEvidenceが同一Projectに属するかの検証は今回のDB制約には含まない。API実装時に方針を決める。

`src/db/schema/` はテーブル定義、`src/db/relations.ts` は関連の取得用定義。
`src/db/index.ts` の `createDb(pool)` に呼び出し側で管理するPostgreSQL Poolを渡すと、relationsを利用できる。
スキーマのimportだけでDBへの接続は発生しない。
