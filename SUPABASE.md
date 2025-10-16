# Supabase CLI 使用指南

## 🔧 已安裝的工具

Supabase CLI 已作為本地依賴安裝（版本 2.51.0）。

您可以使用以下兩種方式執行命令：
- `npx supabase <command>`
- `npm run supabase:<command>`（使用預設腳本）

---

## 📋 常用命令

### 1. 登入 Supabase

首次使用需要登入：

```bash
npm run supabase:login
```

這會開啟瀏覽器進行認證。

### 2. 連結到現有專案

連結本地專案到您的 Supabase 雲端專案：

```bash
npm run supabase:link
```

系統會要求輸入：
- Project Reference ID（在 Supabase Dashboard → Settings → General 可找到）
- Database Password

### 3. 檢查狀態

檢查 Supabase 連線狀態：

```bash
npm run supabase:status
```

---

## 🗄️ 資料庫管理

### 推送 Schema 到雲端

將本地的 SQL schema 推送到 Supabase：

```bash
npm run supabase:db:push
```

這會執行 `supabase/migrations/` 目錄中的所有 migration 檔案。

### 從雲端拉取 Schema

將雲端的資料庫 schema 拉取到本地：

```bash
npm run supabase:db:pull
```

### 重置本地資料庫

重置本地開發資料庫（需要先啟動本地 Supabase）：

```bash
npm run supabase:db:reset
```

---

## 📝 Migration 管理

### 建立新的 Migration

建立新的資料庫遷移檔案：

```bash
npm run supabase:migration:new <migration_name>
```

例如：
```bash
npm run supabase:migration:new add_user_preferences
```

這會在 `supabase/migrations/` 建立新的 SQL 檔案。

### 手動執行 Schema

如果您已經手動在 Supabase Dashboard 執行了 [supabase-schema.sql](supabase-schema.sql)，可以將其移動到 migrations 目錄：

```bash
mkdir -p supabase/migrations
cp supabase-schema.sql supabase/migrations/20250101000000_initial_schema.sql
```

---

## 🔄 自動生成 TypeScript 類型

從資料庫 schema 自動生成 TypeScript 類型定義：

```bash
npm run supabase:gen:types
```

這會更新 [types/database.types.ts](types/database.types.ts)。

**注意**：此命令需要先啟動本地 Supabase 實例或連結到雲端專案。

---

## 🚀 完整設置流程（首次使用）

### 方式 1：使用雲端 Supabase（推薦）

1. **登入**：
   ```bash
   npm run supabase:login
   ```

2. **連結到雲端專案**：
   ```bash
   npm run supabase:link
   ```

3. **（可選）拉取現有 schema**：
   ```bash
   npm run supabase:db:pull
   ```

4. **生成 TypeScript 類型**：
   ```bash
   npm run supabase:gen:types
   ```

### 方式 2：使用本地 Supabase

1. **啟動本地 Supabase**（需要 Docker）：
   ```bash
   npx supabase start
   ```

2. **應用 schema**：
   ```bash
   npx supabase db reset
   ```

3. **生成類型**：
   ```bash
   npm run supabase:gen:types
   ```

---

## 📚 其他有用的命令

### 查看所有可用命令

```bash
npm run supabase -- --help
```

### 查看特定命令的幫助

```bash
npm run supabase -- db --help
```

### 執行自定義 SQL

```bash
npx supabase db execute --file path/to/your.sql
```

### 查看 migration 歷史

```bash
npx supabase migration list
```

---

## 🔐 環境變數

確保 [.env.local](.env.local) 包含：

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

您可以從 Supabase Dashboard → Settings → API 獲取這些值。

---

## 💡 最佳實踐

1. **總是使用 migrations**：不要直接在生產資料庫執行 SQL，使用 migration 檔案
2. **版本控制**：將 `supabase/migrations/` 加入 git
3. **定期備份**：使用 `npm run supabase:db:pull` 備份 schema
4. **測試 migrations**：在本地測試後再推送到生產環境

---

## 🆘 疑難排解

### 無法連線到 Supabase

1. 確認已登入：`npm run supabase:login`
2. 確認專案已連結：`npm run supabase:link`
3. 檢查網路連線

### TypeScript 類型生成失敗

1. 確保資料庫 schema 已正確部署
2. 檢查是否已連結到專案或啟動本地實例
3. 嘗試手動執行：`npx supabase gen types typescript --linked`

### Migration 衝突

如果出現 migration 衝突，檢查：
1. `supabase/migrations/` 中的檔案順序
2. 使用 `npx supabase migration list` 查看已應用的 migrations

---

## 📖 更多資源

- [Supabase CLI 官方文檔](https://supabase.com/docs/guides/cli)
- [Database Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [TypeScript 支援](https://supabase.com/docs/guides/api/generating-types)

---

**建立日期**：2025-10-16
**CLI 版本**：2.51.0
