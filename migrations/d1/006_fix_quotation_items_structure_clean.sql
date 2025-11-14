CREATE TABLE quotation_items_backup AS SELECT * FROM quotation_items;

DROP TABLE quotation_items;

CREATE TABLE quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  product_id TEXT,
  description TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

INSERT INTO quotation_items (
  id, quotation_id, product_id, description, quantity,
  unit_price, discount, subtotal, created_at, updated_at
)
SELECT
  id, quotation_id, product_id, description, quantity,
  unit_price, discount, subtotal, created_at, updated_at
FROM quotation_items_backup;

DROP TABLE quotation_items_backup;