# claim-fusen

主張・出典・根拠を管理するAPIです。現在はAPIの整備を先に進めています。
既存のFrontendは削除し、APIが概ね揃った後に再構築します。

## 構成

- `apps/server`：Nitro v3 / Drizzle / PostgreSQLのAPI
- `shared/schemas`：API入力のZodスキーマと型
- `bruno`：APIを確認するリクエスト
- `compose.yaml`：開発用PostgreSQL

## 開発

`.env.example` を参考に `.env` を設定し、PostgreSQLとmigrationを準備します。
詳しいAPI仕様とDBの準備手順は [Server README](apps/server/README.md) を参照してください。

```powershell
pnpm install --frozen-lockfile
pnpm run dev:server
```

## 確認

```powershell
pnpm typecheck
pnpm run test:server
pnpm run build:server
```
