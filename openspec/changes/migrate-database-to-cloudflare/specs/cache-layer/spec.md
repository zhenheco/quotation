# cache-layer Spec Deltas

## ADDED Requirements

### Requirement: KV 快取抽象層

應用 MUST 提供統一的 KV 快取介面，簡化快取操作。

#### Scenario: KVCache 客戶端初始化
```gherkin
Given Workers 環境中有 KV binding
When 初始化快取客戶端
Then 建立 KVCache 實例
And 使用 env.CACHE namespace
```

#### Scenario: 讀取快取
```gherkin
Given 需要從快取讀取資料
When 呼叫 cache.get<T>(key)
Then 使用 kv.get(key, 'json')
And 回傳型別為 T | null
```

#### Scenario: 寫入快取
```gherkin
Given 需要寫入快取
When 呼叫 cache.set(key, value, { ttl: 3600 })
Then 使用 JSON.stringify 序列化 value
And 設定 expirationTtl
And 非同步寫入（不阻塞回應）
```

#### Scenario: 刪除快取
```gherkin
Given 需要失效特定快取
When 呼叫 cache.delete(key)
Then 立即刪除該 key
```

#### Scenario: 批次刪除快取
```gherkin
Given 需要失效多個相關快取
When 呼叫 cache.deleteMany(keys)
Or cache.list(prefix)
Then 刪除所有匹配的 keys
```

---

### Requirement: Cache-Aside 模式

快取 MUST 使用 Cache-Aside 模式，確保資料一致性。

#### Scenario: 快取命中
```gherkin
Given 呼叫 getCached(cache, key, fetchFn, ttl)
When KV 中存在該 key
Then 直接回傳快取值
And 不執行 fetchFn
And 回應時間 < 5ms
```

#### Scenario: 快取未命中
```gherkin
Given 呼叫 getCached(cache, key, fetchFn, ttl)
When KV 中不存在該 key
Then 執行 fetchFn 從 D1 查詢
And 將結果寫入 KV
And 設定 TTL
And 回傳查詢結果
```

#### Scenario: 快取失效策略
```gherkin
Given 資料更新（如 updateCompany）
When 寫入操作成功
Then 立即刪除相關快取 key
And 下次讀取時重新載入
```

---

### Requirement: 快取 Key 命名規範

快取 key MUST 遵循一致的命名模式，便於管理和除錯。

#### Scenario: Key 格式
```gherkin
Given 需要建立快取 key
When 快取不同類型資料
Then 匯率: exchange_rate:{from}:{to}:{date}
And 權限: user_permissions:{userId}
And 公司: company:{companyId}
And 產品: products:user:{userId} (可選)
```

#### Scenario: Key 唯一性
```gherkin
Given 建立快取 key
When 使用動態參數
Then 確保 key 唯一識別資料
And 避免衝突
```

---

### Requirement: TTL 策略

不同類型的資料 MUST 使用適當的 TTL，平衡效能和一致性。

#### Scenario: 匯率 TTL
```gherkin
Given 匯率資料每日更新一次
When 寫入 KV
Then 設定 TTL = 86400 秒（24 小時）
```

#### Scenario: 權限 TTL
```gherkin
Given 權限變更不頻繁但需要即時性
When 寫入 KV
Then 設定 TTL = 3600 秒（1 小時）
```

#### Scenario: 公司設定 TTL
```gherkin
Given 公司設定極少變更
When 寫入 KV
Then 設定 TTL = 7200 秒（2 小時）
```

#### Scenario: 產品快取 TTL（可選）
```gherkin
Given 產品價格可能更新
When 寫入 KV（如果使用）
Then 設定 TTL = 1800 秒（30 分鐘）
```

---

### Requirement: 快取效能監控

系統 MUST 追蹤快取命中率，用於效能優化。

#### Scenario: 記錄快取命中
```gherkin
Given 快取操作完成
When KV 命中
Then 記錄 console.log('KV HIT: {key}')
And 可選：寫入 D1 metrics 表
```

#### Scenario: 記錄快取未命中
```gherkin
Given 快取操作完成
When KV 未命中
Then 記錄 console.log('KV MISS: {key}')
And 可選：寫入 D1 metrics 表
```

#### Scenario: 計算快取命中率
```gherkin
Given 收集一段時間的快取統計
When 分析效能
Then 命中率 = 命中次數 / 總請求次數
And 目標命中率 > 80%
```

---

### Requirement: KV 一致性處理

系統 MUST 處理 KV 最終一致性（60 秒全球同步）。

#### Scenario: 寫入後立即失效
```gherkin
Given 更新資料（如變更使用者角色）
When 寫入 D1 成功
Then 立即刪除 KV 快取
And 下次讀取從 D1 載入最新資料
```

#### Scenario: 關鍵資料不使用 KV
```gherkin
Given 付款交易需要強一致性
When 處理付款
Then 不使用 KV 快取
And 直接從 D1 查詢
```

#### Scenario: 快取過期自動更新
```gherkin
Given KV 資料過期（TTL 到期）
When 下次請求該 key
Then KV 回傳 null（已過期）
And getCached 執行 fetchFn
And 重新寫入 KV
```
