# Supabase Storage Bucket 設定文件

## 合約檔案儲存 (Quotation Contracts)

本系統使用 Supabase Storage 儲存報價單合約檔案。

### Bucket 建立

在 Supabase Dashboard 中建立名為 `quotation-contracts` 的 Storage Bucket：

1. 前往 Supabase Dashboard → Storage
2. 點擊「Create Bucket」
3. Bucket 名稱：`quotation-contracts`
4. 設定為 **Public** (允許讀取)

### 檔案路徑結構

```
quotation-contracts/
└── {user_id}/
    └── {quotation_id}/
        └── {timestamp}_{filename}
```

範例：
```
quotation-contracts/
└── 123e4567-e89b-12d3-a456-426614174000/
    └── abc123-def456/
        └── 1735776000000_contract.pdf
        └── 1735776123456_contract_v2.pdf
```

### 檔案命名規則

- 使用時間戳記 (`Date.now()`) 作為前綴
- 保留原始檔案名稱
- 格式：`{timestamp}_{original_filename}`
- 範例：`1735776000000_contract.pdf`

### 版本控制

系統設計為保留所有版本的合約檔案：
- 每次上傳新合約時，**不會刪除**舊檔案
- 新檔案使用不同的時間戳記
- 使用者可以查看所有歷史版本

### 安全性設定

#### RLS (Row Level Security) 政策

在 Supabase Dashboard → Storage → quotation-contracts → Policies 設定：

1. **SELECT (讀取) 政策**
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'quotation-contracts');
```

2. **INSERT (上傳) 政策**
```sql
CREATE POLICY "User can upload contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quotation-contracts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

3. **DELETE (刪除) 政策**
```sql
CREATE POLICY "User can delete own contracts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'quotation-contracts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 使用限制

- **檔案類型**：所有類型 (`*/*`)
- **檔案大小上限**：10MB
- **合約欄位**：選填 (optional)

### 相關欄位

在 `quotations` 資料表中：
- 欄位名稱：`contract_file_url`
- 類型：`text`
- 可為空：`true`
- 儲存內容：合約檔案的 Public URL

### 程式碼範例

#### 上傳合約檔案

```typescript
const uploadContractFile = async (quotationId: string): Promise<string | null> => {
  if (!contractFile) return null

  try {
    setUploadingContract(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登入')

    const timestamp = Date.now()
    const fileExt = contractFile.name.split('.').pop()
    const fileName = `${timestamp}_${contractFile.name}`
    const filePath = `${user.id}/${quotationId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('quotation-contracts')
      .upload(filePath, contractFile, {
        contentType: contractFile.type,
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('quotation-contracts')
      .getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error('上傳合約失敗:', error)
    return null
  } finally {
    setUploadingContract(false)
  }
}
```

#### 取得合約檔案 URL

```typescript
const { data: { publicUrl } } = supabase.storage
  .from('quotation-contracts')
  .getPublicUrl(filePath)
```

#### 刪除合約檔案

```typescript
const deleteContractFile = async (filePath: string) => {
  const { error } = await supabase.storage
    .from('quotation-contracts')
    .remove([filePath])

  if (error) throw error
}
```

### 常見問題

#### Q: 為什麼不使用 `upsert: true`？
A: 我們希望保留所有版本的合約檔案，因此不使用 upsert，而是使用時間戳記產生不同的檔案名稱。

#### Q: 如何查看合約的所有版本？
A: 可以使用 Supabase Storage API 列出特定資料夾下的所有檔案：
```typescript
const { data, error } = await supabase.storage
  .from('quotation-contracts')
  .list(`${userId}/${quotationId}`)
```

#### Q: 如果使用者刪除了資料庫中的報價單，合約檔案會怎樣？
A: 合約檔案仍會保留在 Storage 中。如果需要清理，可以設定 Database Trigger 或定期執行清理腳本。

### 清理策略 (可選)

如果需要清理未使用的合約檔案，可以建立清理腳本：

```sql
CREATE OR REPLACE FUNCTION cleanup_orphaned_contracts()
RETURNS void AS $$
DECLARE
  contract_path text;
BEGIN
  -- 列出所有 Storage 中的合約檔案
  -- 檢查是否在 quotations 表中有對應的記錄
  -- 如果沒有，則刪除

  -- 這需要自訂邏輯，依據專案需求實作
END;
$$ LANGUAGE plpgsql;
```

### 監控與日誌

- 在 Supabase Dashboard → Storage → quotation-contracts 可以查看：
  - 總檔案數量
  - 總儲存空間使用量
  - 最近上傳的檔案

### 成本考量

Supabase Storage 計價方式：
- **免費方案**：1GB 儲存空間
- **Pro 方案**：100GB 儲存空間
- 超過額度：$0.021 per GB per month

假設每個合約檔案平均 2MB：
- 500 個合約 = 1GB (免費方案足夠)
- 50,000 個合約 = 100GB (需要 Pro 方案)

### 遷移注意事項

如果從其他儲存系統遷移到 Supabase Storage：

1. 匯出所有合約檔案
2. 重新上傳到 Supabase Storage (保持路徑結構)
3. 更新 `quotations.contract_file_url` 欄位
4. 驗證所有連結可正常存取
