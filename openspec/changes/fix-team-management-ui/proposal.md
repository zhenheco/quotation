# 修復團隊管理頁面 UI 問題

## 摘要

修復團隊管理頁面的兩個 UI 問題：
1. 側邊欄高亮邏輯錯誤
2. 團隊管理頁面缺少公司列表視覺化介面

## 問題分析

### 問題 1：側邊欄高亮邏輯錯誤

**現況**：
- 點擊「團隊管理」（`/settings/team`）時，「系統設定」（`/settings`）也會亮起
- 原因：`Sidebar.tsx` 第 84 行使用 `pathname.startsWith(href)` 判斷
- `/zh/settings/team` 開頭包含 `/zh/settings`，導致兩者都被標記為 active

**預期**：
- 團隊管理是獨立的頂層選單項目，不應觸發系統設定的高亮

### 問題 2：團隊管理頁面缺少公司列表視覺化

**現況**：
- 目前只有一個 dropdown 選擇公司
- 沒有公司卡片/列表讓使用者點擊進入
- 成員列表直接顯示，沒有明確的公司分區

**預期**：
- 先顯示公司列表（類似系統設定頁面的公司卡片）
- 點擊公司後才展開顯示該公司的成員

## 變更範圍

1. `components/Sidebar.tsx` - 修改 active 判斷邏輯
2. `app/[locale]/settings/team/page.tsx` - 重構團隊管理頁面

## 相關規格

- sidebar-navigation
- team-management-ui
