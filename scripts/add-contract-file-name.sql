-- Add contract_file_name column to quotations table
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS contract_file_name TEXT;

-- Add comment
COMMENT ON COLUMN quotations.contract_file_name IS '合約檔案原始檔名（用於顯示）';
