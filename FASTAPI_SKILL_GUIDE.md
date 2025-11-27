# FastAPI 技能使用指南

## 技能位置
- 📁 完整目錄: `output/fastapi/`
- 📦 打包檔案: `output/fastapi.zip` (127KB)

## 文件結構

### SKILL.md (3.8KB)
**用途**: 快速參考與常見程式碼模式
**內容**:
- 8 種常見模式（Forms、Security、Types）
- 4 個完整程式碼範例
- 何時使用此技能的指引

### references/tutorial.md (173KB, 24頁)
**用途**: 基礎教學
**涵蓋主題**:
- 第一個 FastAPI 應用
- 路徑參數與查詢參數
- 請求體與回應模型
- 依賴注入系統
- 表單與文件上傳

### references/advanced.md (130KB)
**用途**: 進階功能
**涵蓋主題**:
- WebSockets
- 自訂回應類型
- 後台任務
- 中介軟體
- CORS 設定

### references/api.md (160KB)
**用途**: 完整 API 參考
**涵蓋主題**:
- FastAPI 類別完整參數
- 所有裝飾器與函數
- 型別註解規範

### references/deployment.md (11KB)
**用途**: 部署指南
**涵蓋主題**:
- 版本管理策略
- Docker 容器化
- HTTPS 與代理設定

## 專案整合範例

### 當前專案架構
```
network_img/
├── analysis_server.py    # FastAPI 伺服器 ← 使用技能
├── network_analyzer.py   # PCAP 分析引擎
└── src/
    └── MindMap.jsx       # React 前端
```

### 實際應用場景

#### 場景 1: 新增 WebSocket 即時推送
**需求**: 即時推送新封包分析結果

**查詢方式**:
```bash
grep -A 20 "## WebSockets" output/fastapi/references/advanced.md
```

**找到的程式碼**:
```python
from fastapi import FastAPI, WebSocket

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Message: {data}")
```

#### 場景 2: 優化依賴注入
**需求**: 重構 analysis_server.py 的共用邏輯

**查詢方式**:
```bash
grep -A 30 "^## Dependencies" output/fastapi/references/tutorial.md
```

**學到的模式**:
```python
from typing import Annotated
from fastapi import Depends

async def get_analyzer():
    """共用的分析器實例"""
    return NetworkAnalyzer()

@app.post("/analyze")
async def analyze(
    file: UploadFile,
    analyzer: Annotated[NetworkAnalyzer, Depends(get_analyzer)]
):
    return analyzer.analyze(file)
```

#### 場景 3: 加入 CORS 支援
**需求**: 允許 Vite 開發伺服器跨域請求

**查詢方式**:
```bash
grep -B 5 -A 15 "CORSMiddleware" output/fastapi/references/advanced.md
```

#### 場景 4: 後台任務處理大型 PCAP
**需求**: 上傳大檔案後在背景分析

**查詢方式**:
```bash
grep -A 20 "background task" output/fastapi/references/advanced.md
```

## 快速查詢命令

### 按主題搜尋
```bash
# 依賴注入
grep -n "Dependencies" output/fastapi/references/tutorial.md

# 測試
grep -n "Testing" output/fastapi/references/advanced.md

# 安全性
grep -n "Security" output/fastapi/references/tutorial.md

# 資料庫
grep -n "SQL" output/fastapi/references/tutorial.md
```

### 按關鍵字搜尋
```bash
# 搜尋所有包含 "async" 的範例
grep -r "async def" output/fastapi/

# 搜尋回應模型
grep -r "response_model" output/fastapi/

# 搜尋錯誤處理
grep -r "HTTPException" output/fastapi/
```

### 查看完整章節
```bash
# Dependencies 完整章節
sed -n '/^## Dependencies¶/,/^## /p' output/fastapi/references/tutorial.md | head -50

# WebSocket 完整章節
sed -n '/^## WebSockets¶/,/^## /p' output/fastapi/references/advanced.md
```

## 與開發工作流整合

### 開發時即時查詢
當您在寫 `analysis_server.py` 時：

1. **遇到問題**: 不知道如何處理文件上傳
2. **快速查詢**: `grep -A 10 "UploadFile" output/fastapi/SKILL.md`
3. **找到答案**: 看到範例程式碼
4. **立即應用**: 複製並調整到專案中

### Claude Code 協作
在對話中提及：
```
"根據 output/fastapi/references/tutorial.md 的 Dependencies 章節，
幫我重構 analysis_server.py 的共用邏輯"
```

## 進階技巧

### 建立索引加速查詢
```bash
# 建立主題索引
grep "^## " output/fastapi/references/*.md > fastapi_index.txt

# 建立程式碼範例索引
grep -n "```python" output/fastapi/references/*.md > fastapi_examples.txt
```

### 結合 AI 助手
將查詢結果提供給 Claude：
```
我在 FastAPI 技能中找到這段關於 WebSocket 的說明：
[貼上查詢結果]

請幫我整合到 analysis_server.py，實現即時封包推送功能。
```

## 更新技能

當 FastAPI 發布新版本時：
```bash
# 重新抓取最新文檔
mcp__skill-seeker__scrape_docs \
  config_path: configs/fastapi.json \
  unlimited: true

# 技能會自動更新
```

## 技能價值

✅ **離線可用**: 不需網路連接
✅ **結構化**: 按主題分類，快速定位
✅ **完整**: 涵蓋 62 頁官方文檔
✅ **可搜尋**: 使用 grep/find 快速查詢
✅ **程式碼範例**: 包含可直接使用的程式碼
✅ **持續更新**: 可重新抓取最新版本

