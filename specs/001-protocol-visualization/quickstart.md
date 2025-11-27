# Quick Start: 網路通訊協議圖形化展示系統

**Date**: 2025-11-16
**Feature**: 001-protocol-visualization
**Purpose**: 提供開發者快速上手指南，涵蓋環境設定、開發流程、測試與部署

## 目錄

1. [環境需求](#環境需求)
2. [初始設定](#初始設定)
3. [開發流程](#開發流程)
4. [測試指南](#測試指南)
5. [常見問題](#常見問題)
6. [參考資源](#參考資源)

---

## 環境需求

### 必要軟體

| 軟體 | 版本 | 用途 |
|------|------|------|
| **Python** | 3.11+ | 後端開發 |
| **Node.js** | 18+ | 前端開發 |
| **npm** | 9+ | 套件管理 |
| **Git** | 2.30+ | 版本控制 |

### 選用軟體

- **Docker**: 用於容器化部署
- **VS Code**: 推薦的 IDE（含 Python 與 React 擴充）
- **Postman**: API 測試工具

---

## 初始設定

### 1. 複製專案

```bash
git clone <repository-url>
cd network_img
git checkout 001-protocol-visualization
```

### 2. 後端設定

#### 安裝 Python 依賴

```bash
# 建議使用虛擬環境
python -m venv venv

# 啟動虛擬環境 (Windows)
venv\Scripts\activate

# 啟動虛擬環境 (Linux/macOS)
source venv/bin/activate

# 安裝依賴
pip install -r requirements.txt
```

#### 配置環境變數

```bash
# 複製範例檔案
cp .env.example .env

# 編輯 .env 檔案，設定祕鑰
SECRET_KEY=your-random-secret-key-minimum-32-characters
SESSION_MAX_AGE=14400
CLEANUP_INTERVAL=3600
LOG_LEVEL=INFO
```

**產生隨機祕鑰**:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### 驗證後端安裝

```bash
# 啟動 FastAPI 開發伺服器
uvicorn analysis_server:app --host 0.0.0.0 --port 8000 --reload

# 測試健康檢查端點
curl http://localhost:8000/api/health
```

預期輸出：

```json
{
  "status": "ok",
  "timestamp": "2025-11-16T10:30:00Z"
}
```

### 3. 前端設定

#### 安裝 Node 依賴

```bash
npm install
```

#### 啟動 Vite 開發伺服器

```bash
npm run dev
```

預期輸出：

```
VITE v7.1.9  ready in 450 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

#### 驗證前端

開啟瀏覽器訪問 `http://localhost:5173/`，應該看到網路協定視覺化介面。

---

## 開發流程

### 後端開發

#### 1. 會話管理實作

**檔案**: `analysis_server.py`

**新增會話中介軟體**:

```python
from starlette.middleware.sessions import SessionMiddleware

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY"),
    session_cookie="session_id",
    max_age=int(os.getenv("SESSION_MAX_AGE", 14400)),
    same_site="lax",
    https_only=False  # 開發環境
)
```

**新增會話驗證依賴**:

```python
from fastapi import Depends, HTTPException, Request, status

async def require_session(request: Request) -> str:
    session_id = request.session.get("session_id")
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please login first"
        )
    return session_id
```

**更新端點使用驗證**:

```python
@app.get("/api/timelines")
async def get_timelines(
    request: Request,
    session_id: str = Depends(require_session)
):
    session_dir = get_session_data_dir(request)
    # ... 返回時間軸資料
```

#### 2. 檔案隔離實作

**新增輔助函數**:

```python
from pathlib import Path

def get_session_data_dir(request: Request) -> Path:
    session_id = request.session.get("session_id")
    if not session_id:
        raise ValueError("No session ID found")

    data_dir = Path("public/data") / session_id
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir
```

**更新 `NetworkAnalyzer` 呼叫**:

```python
@app.post("/api/analyze")
async def analyze_pcap(
    request: Request,
    file: UploadFile = File(...),
    session_id: str = Depends(require_session)
):
    session_dir = get_session_data_dir(request)
    pcap_path = session_dir / "uploaded.pcap"

    # 儲存上傳檔案
    with open(pcap_path, "wb") as f:
        f.write(await file.read())

    # 執行分析
    analyzer = NetworkAnalyzer(str(pcap_path))
    analyzer.load_packets()
    timelines = analyzer.generate_protocol_timelines()

    # 儲存結果到會話目錄
    output_path = session_dir / "protocol_timeline_sample.json"
    analyzer.save_results(str(session_dir))

    return {"message": "Analysis completed"}
```

#### 3. 清理排程器實作

**新增清理函數**:

```python
from apscheduler.schedulers.background import BackgroundScheduler
import shutil
import time

def cleanup_expired_sessions(max_age_seconds: int = 14400):
    data_dir = Path("public/data")
    if not data_dir.exists():
        return

    current_time = time.time()

    for session_dir in data_dir.iterdir():
        if not session_dir.is_dir():
            continue

        last_modified = session_dir.stat().st_mtime
        age = current_time - last_modified

        if age > max_age_seconds:
            try:
                shutil.rmtree(session_dir)
                print(f"Cleaned up expired session: {session_dir.name}")
            except Exception as e:
                print(f"Failed to cleanup {session_dir.name}: {e}")
```

**註冊啟動事件**:

```python
@app.on_event("startup")
async def start_cleanup_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        cleanup_expired_sessions,
        'interval',
        hours=1,
        kwargs={"max_age_seconds": int(os.getenv("SESSION_MAX_AGE", 14400))}
    )
    scheduler.start()
```

### 前端開發

#### 1. API 請求更新

**檔案**: `src/MindMap.jsx`

**確認 API 請求包含 credentials**:

```javascript
// 載入時間軸資料
const loadTimelines = async () => {
  try {
    const response = await fetch('/api/timelines', {
      credentials: 'include'  // 重要：包含 Cookie
    })

    if (response.status === 401) {
      // 會話過期，重導向登入
      window.location.href = '/login'
      return
    }

    if (!response.ok) {
      throw new Error('Failed to load timelines')
    }

    const data = await response.json()
    setTimelines(data.timelines)
  } catch (error) {
    console.error('Error loading timelines:', error)
    // 回退到靜態檔案
    loadStaticTimelines()
  }
}
```

#### 2. 上傳流程更新

**確認上傳包含 credentials**:

```javascript
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
      credentials: 'include'  // 重要：包含 Cookie
    })

    if (response.status === 401) {
      alert('會話已過期，請重新登入')
      window.location.href = '/login'
      return
    }

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    const result = await response.json()
    alert(`分析完成！封包數：${result.packet_count}`)

    // 重新載入時間軸
    await loadTimelines()
  } catch (error) {
    console.error('Upload error:', error)
    alert('上傳失敗，請稍後再試')
  }
}
```

---

## 測試指南

### 後端測試

#### 安裝測試依賴

```bash
pip install pytest httpx
```

#### 執行測試

```bash
# 執行所有測試
pytest tests/

# 執行特定測試檔案
pytest tests/test_session_middleware.py

# 顯示詳細輸出
pytest tests/ -v

# 顯示日誌
pytest tests/ -s
```

#### 測試範例

**檔案**: `tests/test_session_middleware.py`

```python
from fastapi.testclient import TestClient
from analysis_server import app

client = TestClient(app)

def test_health_check_no_session():
    """健康檢查端點不需要會話"""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_timelines_requires_session():
    """時間軸端點需要會話驗證"""
    response = client.get("/api/timelines")
    assert response.status_code == 401
    assert "detail" in response.json()

def test_upload_with_session():
    """上傳檔案需要會話驗證"""
    # 建立會話（簡化範例，實際需要登入流程）
    with client:
        client.cookies.set("session_id", "test-session-123")

        with open("tests/fixtures/sample.pcap", "rb") as f:
            response = client.post(
                "/api/analyze",
                files={"file": ("sample.pcap", f, "application/octet-stream")}
            )

        assert response.status_code == 200
        assert "message" in response.json()
```

### 前端測試

#### 執行測試

```bash
# 執行所有測試
npm test

# 監聽模式
npm test -- --watch

# 覆蓋率報告
npm test -- --coverage
```

#### 測試範例

**檔案**: `src/__tests__/MindMap.test.jsx`

```javascript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MindMap from '../MindMap'

describe('MindMap Component', () => {
  it('renders without crashing', () => {
    render(<MindMap />)
    expect(screen.getByText(/網路中心/i)).toBeInTheDocument()
  })

  it('shows upload button', () => {
    render(<MindMap />)
    const uploadButton = screen.getByText(/上傳封包/i)
    expect(uploadButton).toBeInTheDocument()
  })
})
```

---

## 常見問題

### Q1: `SECRET_KEY not set in environment` 錯誤

**原因**: 未設定環境變數

**解決方案**:

```bash
# 確認 .env 檔案存在
cat .env

# 如果不存在，複製範例檔案
cp .env.example .env

# 產生隨機祕鑰
python -c "import secrets; print(secrets.token_urlsafe(32))"

# 將生成的祕鑰貼入 .env 檔案的 SECRET_KEY=
```

### Q2: Vite 代理失敗，前端無法連接後端

**原因**: 後端伺服器未啟動或埠號不匹配

**解決方案**:

```bash
# 確認後端運行於 8000 埠
uvicorn analysis_server:app --host 0.0.0.0 --port 8000 --reload

# 檢查 vite.config.js 代理設定
cat vite.config.js | grep proxy
```

預期看到：

```javascript
server: {
  proxy: {
    '/api': 'http://localhost:8000'
  }
}
```

### Q3: PCAP 上傳後出現 401 錯誤

**原因**: 會話過期或 Cookie 未正確傳送

**解決方案**:

1. 確認前端請求包含 `credentials: 'include'`
2. 檢查瀏覽器 DevTools > Application > Cookies 是否有 `session_id`
3. 嘗試重新整理頁面（會建立新會話）

### Q4: 會話資料未隔離，多個用戶看到相同資料

**原因**: 會話 ID 未正確映射到目錄

**解決方案**:

檢查 `get_session_data_dir()` 函數是否正確提取 `session_id`：

```python
# 在端點中添加除錯日誌
@app.get("/api/timelines")
async def get_timelines(request: Request):
    session_id = request.session.get("session_id")
    print(f"Session ID: {session_id}")  # 除錯用
    # ...
```

### Q5: 清理排程器未執行

**原因**: 啟動事件未註冊或 APScheduler 未啟動

**解決方案**:

```bash
# 檢查日誌是否有排程器啟動訊息
# 應該看到 "Cleaned up expired session: ..." 訊息

# 手動觸發清理測試
python -c "from analysis_server import cleanup_expired_sessions; cleanup_expired_sessions(0)"
```

---

## 參考資源

### 文件

- [FastAPI 官方文件](https://fastapi.tiangolo.com/)
- [Starlette SessionMiddleware](https://www.starlette.io/middleware/#sessionmiddleware)
- [React 官方文件](https://react.dev/)
- [Vite 官方文件](https://vitejs.dev/)
- [Scapy 官方文件](https://scapy.readthedocs.io/)

### 專案檔案

- [spec.md](./spec.md) - 功能規格
- [research.md](./research.md) - 技術研究
- [data-model.md](./data-model.md) - 資料模型
- [contracts/api-spec.yaml](./contracts/api-spec.yaml) - API 契約

### 相關工具

- [OpenAPI Editor](https://editor.swagger.io/) - 線上編輯 API 規格
- [Postman](https://www.postman.com/) - API 測試
- [Docker](https://www.docker.com/) - 容器化部署
- [pytest](https://docs.pytest.org/) - Python 測試框架
- [Vitest](https://vitest.dev/) - JavaScript 測試框架

---

**最後更新**: 2025-11-16
**維護者**: 網路分析團隊
