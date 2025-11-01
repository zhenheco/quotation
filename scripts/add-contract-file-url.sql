-- Add contract_file_url column to quotations table
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS contract_file_url TEXT;

-- Add comment
COMMENT ON COLUMN quotations.contract_file_url IS '合約檔案 URL（上傳至儲存服務後的連結）';
