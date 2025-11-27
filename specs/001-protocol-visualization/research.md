# Research: 網路通訊協議圖形化展示系統

**Date**: 2025-11-16
**Feature**: 001-protocol-visualization
**Purpose**: 解決技術決策與最佳實踐研究

## 研究目標

本文件記錄為實作會話管理、多用戶隔離、資料生命週期管理與日誌標準化所需的技術研究與決策。

## 1. FastAPI 會話管理方案

### Decision

採用 **Starlette SessionMiddleware** 搭配 `itsdangerous` 進行 cookie-based 會話管理。

### Rationale

1. **內建支援**: Starlette（FastAPI 底層框架）原生提供 SessionMiddleware
2. **無狀態架構**: Cookie-based 會話適合水平擴展，不需要共享會話儲存（Redis 等）
3. **簡化部署**: 無需額外的會話儲存服務，降低複雜度
4. **安全性**: 使用 `itsdangerous` 簽章確保 cookie 不可偽造
5. **符合規格**: 規格要求「會話驗證」（FR-011a），不需要持久化會話資料

### Implementation Pattern

```python
from starlette.middleware.sessions import SessionMiddleware
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

# 添加會話中介軟體
app.add_middleware(
    SessionMiddleware,
    secret_key="your-secret-key-here",  # 從環境變數載入
    session_cookie="session_id",
    max_age=3600 * 4,  # 4 小時過期
    same_site="lax",
    https_only=False  # 開發環境設為 False，生產環境設為 True
)

# 會話驗證裝飾器
def require_session(func):
    async def wrapper(request: Request, *args, **kwargs):
        if "session_id" not in request.session:
            raise HTTPException(status_code=401, detail="Unauthorized")
        return await func(request, *args, **kwargs)
    return wrapper
```

### Alternatives Considered

| 方案 | 優點 | 缺點 | 為何未選擇 |
|------|------|------|------------|
| **JWT Token** | 無狀態、可撤銷 | 需客戶端管理 token、增加前端複雜度 | 規格未要求 token 機制，cookie 更簡單 |
| **Redis Session** | 支援集中式會話管理 | 需額外服務、增加部署複雜度 | 規格只要求單一實例，過度設計 |
| **Database Session** | 可持久化會話資料 | 規格明確不使用資料庫 | 違反「無資料庫」架構約束 |

### Configuration

需在 `.env` 檔案中設定：

```bash
SECRET_KEY=your-random-secret-key-minimum-32-characters
SESSION_MAX_AGE=14400  # 4 小時（秒）
```

### References

- [Starlette SessionMiddleware 文件](https://www.starlette.io/middleware/#sessionmiddleware)
- [FastAPI Security Best Practices](https://fastapi.tiangolo.com/tutorial/security/)

---

## 2. 檔案命名空間隔離策略

### Decision

採用 **會話 ID 作為目錄命名空間** 的隔離策略：`public/data/<session_id>/`

### Rationale

1. **自然隔離**: 每個會話的檔案位於獨立目錄，不會互相干擾
2. **簡化路徑解析**: 直接使用 `session_id` 拼接路徑，無需複雜的映射表
3. **清理容易**: 刪除會話時只需移除整個目錄
4. **除錯友善**: 可直接在檔案系統中查看特定會話的所有檔案
5. **符合規格**: FR-013a 要求「使用會話 ID 作為命名空間隔離」

### Implementation Pattern

```python
import os
from pathlib import Path
from fastapi import Request

def get_session_data_dir(request: Request) -> Path:
    """
    取得當前會話的資料目錄路徑

    Args:
        request: FastAPI Request 物件，包含 session

    Returns:
        Path: 會話資料目錄的絕對路徑

    Raises:
        ValueError: 如果會話 ID 不存在
    """
    session_id = request.session.get("session_id")
    if not session_id:
        raise ValueError("No session ID found")

    # 使用 Path 確保跨平台相容性
    data_dir = Path("public/data") / session_id
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir

# 使用範例
async def save_analysis_result(request: Request, data: dict):
    session_dir = get_session_data_dir(request)
    result_path = session_dir / "network_analysis_results.json"

    with open(result_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
```

### Security Considerations

1. **路徑注入防護**: 使用 `Path.resolve()` 防止 `../` 攻擊
2. **會話 ID 驗證**: 確保 session_id 只包含安全字元（UUID 格式）
3. **權限檢查**: 確保只有擁有該會話的用戶可以存取對應目錄

```python
import re
from uuid import UUID

def validate_session_id(session_id: str) -> bool:
    """驗證 session_id 格式是否安全"""
    try:
        # 嘗試解析為 UUID（SessionMiddleware 使用 UUID）
        UUID(session_id)
        return True
    except ValueError:
        return False
```

### Alternatives Considered

| 方案 | 優點 | 缺點 | 為何未選擇 |
|------|------|------|------------|
| **扁平化檔名** | 簡單 | 檔案數量多時效能差、難以清理 | 無法有效隔離與管理 |
| **資料庫映射** | 靈活、可查詢 | 違反「無資料庫」約束 | 規格禁止 |
| **Hash 目錄樹** | 高效能 | 過度複雜、除錯困難 | 專案規模不需要 |

---

## 3. 會話過期清理排程器

### Decision

採用 **APScheduler** 搭配定期掃描策略，每小時清理過期會話檔案。

### Rationale

1. **輕量級**: APScheduler 是純 Python 排程器，無需額外服務（如 Celery）
2. **FastAPI 相容**: 可在 FastAPI 啟動事件中初始化
3. **可配置**: 清理頻率與保留時間可透過環境變數調整
4. **資源友善**: 使用 BackgroundScheduler，不阻塞主執行緒
5. **符合規格**: FR-010 要求「會話結束後自動清理這些臨時檔案」

### Implementation Pattern

```python
from apscheduler.schedulers.background import BackgroundScheduler
from pathlib import Path
import time
import shutil

def cleanup_expired_sessions(max_age_seconds: int = 14400):
    """
    清理過期的會話檔案

    Args:
        max_age_seconds: 會話最大存活時間（秒），預設 4 小時
    """
    data_dir = Path("public/data")
    if not data_dir.exists():
        return

    current_time = time.time()

    for session_dir in data_dir.iterdir():
        if not session_dir.is_dir():
            continue

        # 檢查目錄最後修改時間
        last_modified = session_dir.stat().st_mtime
        age = current_time - last_modified

        if age > max_age_seconds:
            try:
                shutil.rmtree(session_dir)
                print(f"Cleaned up expired session: {session_dir.name}")
            except Exception as e:
                print(f"Failed to cleanup {session_dir.name}: {e}")

# FastAPI 啟動事件
@app.on_event("startup")
async def start_cleanup_scheduler():
    scheduler = BackgroundScheduler()
    # 每小時執行一次清理
    scheduler.add_job(
        cleanup_expired_sessions,
        'interval',
        hours=1,
        kwargs={"max_age_seconds": int(os.getenv("SESSION_MAX_AGE", 14400))}
    )
    scheduler.start()
```

### Configuration

需在 `.env` 檔案中設定：

```bash
SESSION_MAX_AGE=14400      # 會話最大存活時間（秒）
CLEANUP_INTERVAL=3600      # 清理頻率（秒），預設 1 小時
```

### Alternatives Considered

| 方案 | 優點 | 缺點 | 為何未選擇 |
|------|------|------|------------|
| **Lazy Deletion** | 無需背景任務 | 檔案累積、佔用空間 | 規格要求「自動清理」 |
| **Celery** | 強大、可擴展 | 需 Redis/RabbitMQ、過度複雜 | 專案規模不需要 |
| **Cron Job** | 系統層級 | 增加部署複雜度、不同平台語法不同 | APScheduler 更可攜 |

### Dependencies

需新增到 `requirements.txt`：

```
APScheduler==3.10.4
```

---

## 4. API 端點會話驗證裝飾器

### Decision

使用 **FastAPI Depends** 實作可重用的會話驗證依賴注入。

### Rationale

1. **FastAPI 最佳實踐**: 使用 Depends 進行依賴注入是官方推薦模式
2. **可重用性**: 所有需要驗證的端點都可使用相同依賴
3. **清晰語意**: 程式碼一眼可見哪些端點需要驗證
4. **易於測試**: 可在測試中覆寫依賴行為
5. **符合規格**: FR-011a 要求「未登入的請求應返回 HTTP 401 Unauthorized」

### Implementation Pattern

```python
from fastapi import Depends, HTTPException, Request, status

async def require_session(request: Request) -> str:
    """
    會話驗證依賴，確保用戶已登入

    Args:
        request: FastAPI Request 物件

    Returns:
        str: 會話 ID

    Raises:
        HTTPException: 401 如果未登入
    """
    session_id = request.session.get("session_id")
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please login first",
            headers={"WWW-Authenticate": "Session"},
        )
    return session_id

# 使用範例
@app.get("/api/timelines")
async def get_timelines(
    request: Request,
    session_id: str = Depends(require_session)
):
    """取得協定時間軸資料（需要會話驗證）"""
    session_dir = get_session_data_dir(request)
    # ... 返回時間軸資料
```

### Exception Handling

需在 FastAPI 應用程式中註冊統一的異常處理器：

```python
from fastapi.responses import RedirectResponse

@app.exception_handler(401)
async def unauthorized_handler(request: Request, exc: HTTPException):
    """處理未授權請求，重導向至登入頁面"""
    # API 請求返回 JSON
    if request.url.path.startswith("/api/"):
        return JSONResponse(
            status_code=401,
            content={"detail": "Unauthorized"}
        )
    # 網頁請求重導向
    return RedirectResponse(url="/login")
```

### Alternatives Considered

| 方案 | 優點 | 缺點 | 為何未選擇 |
|------|------|------|------------|
| **Middleware 驗證** | 集中控制 | 無法靈活排除特定端點 | `/api/health` 不需驗證 |
| **Decorator 裝飾器** | Python 原生 | 與 FastAPI 風格不一致 | Depends 是 FastAPI 慣例 |
| **Manual Check** | 簡單直接 | 程式碼重複、容易遺漏 | 不符合 DRY 原則 |

---

## 5. 日誌輸出策略

### Decision

使用 Python 標準 `logging` 模組輸出到 stdout/stderr，依賴容器日誌管理。

### Rationale

1. **符合規格**: FR-013b 要求「將所有錯誤訊息、警告訊息、系統異常輸出到 stdout/stderr」
2. **12-Factor App**: 符合十二要素應用程式原則（Logs as Event Streams）
3. **容器友善**: Docker/Kubernetes 會自動收集 stdout/stderr
4. **無狀態**: 不寫入檔案系統，適合水平擴展
5. **除錯便利**: 開發環境可直接在終端機查看日誌

### Implementation Pattern

```python
import logging
import sys

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)  # 一般訊息到 stdout
    ]
)

logger = logging.getLogger(__name__)

# 使用範例
def parse_pcap_file(file_path: str):
    try:
        # ... 解析邏輯
        logger.info(f"Successfully parsed PCAP file: {file_path}")
    except Exception as e:
        logger.error(f"Failed to parse PCAP file {file_path}: {e}", exc_info=True)
        raise
```

### Log Levels

| Level | 用途 | 輸出目標 |
|-------|------|----------|
| **DEBUG** | 詳細除錯資訊 | stdout（開發環境） |
| **INFO** | 一般資訊（請求、成功） | stdout |
| **WARNING** | 警告訊息（損壞封包、降級功能） | stdout |
| **ERROR** | 錯誤訊息（解析失敗、API 錯誤） | stderr |
| **CRITICAL** | 嚴重錯誤（伺服器無法啟動） | stderr |

### Structured Logging (Optional Enhancement)

可使用 `python-json-logger` 輸出結構化 JSON 日誌，方便 ELK 等工具解析：

```python
from pythonjsonlogger import jsonlogger

logHandler = logging.StreamHandler(sys.stdout)
formatter = jsonlogger.JsonFormatter(
    '%(asctime)s %(name)s %(levelname)s %(message)s'
)
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)

# 輸出範例
# {"asctime": "2025-11-16 10:30:00", "name": "network_analyzer", "levelname": "INFO", "message": "PCAP parsed", "session_id": "abc123"}
```

### Alternatives Considered

| 方案 | 優點 | 缺點 | 為何未選擇 |
|------|------|------|------------|
| **檔案日誌** | 可本地查閱 | 違反規格 FR-013b | 規格明確禁止 |
| **Syslog** | 系統整合 | 配置複雜、不跨平台 | stdout 更簡單 |
| **第三方服務** | 進階分析 | 增加依賴、成本 | 專案規模不需要 |

---

## 6. 環境變數管理

### Decision

使用 **python-dotenv** 載入 `.env` 檔案，並提供 `.env.example` 範本。

### Rationale

1. **安全性**: 祕鑰不寫入程式碼或版本控制
2. **簡化配置**: 開發、測試、生產環境使用不同 `.env`
3. **標準做法**: Python 社群廣泛使用的慣例
4. **易於部署**: Docker/Kubernetes 可直接注入環境變數

### Implementation Pattern

**.env.example** (提交至 Git)：

```bash
# FastAPI 會話管理
SECRET_KEY=your-random-secret-key-minimum-32-characters
SESSION_MAX_AGE=14400

# 清理排程
CLEANUP_INTERVAL=3600

# 日誌層級
LOG_LEVEL=INFO

# CORS 設定（可選）
ALLOWED_ORIGINS=http://localhost:5173
```

**載入環境變數**：

```python
from dotenv import load_dotenv
import os

# 載入 .env 檔案
load_dotenv()

# 使用環境變數
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY not set in environment")

SESSION_MAX_AGE = int(os.getenv("SESSION_MAX_AGE", "14400"))
```

### Dependencies

需新增到 `requirements.txt`：

```
python-dotenv==1.0.0
```

---

## 研究總結

### 核心技術決策

| 需求 | 選擇方案 | 依賴 |
|------|----------|------|
| 會話管理 | Starlette SessionMiddleware | itsdangerous（內建） |
| 檔案隔離 | 會話 ID 目錄命名空間 | pathlib（內建） |
| 自動清理 | APScheduler 定期掃描 | APScheduler==3.10.4 |
| API 驗證 | FastAPI Depends 依賴注入 | 無（FastAPI 內建） |
| 日誌輸出 | logging 到 stdout/stderr | logging（內建） |
| 環境配置 | python-dotenv | python-dotenv==1.0.0 |

### 新增依賴清單

需更新 `requirements.txt` 新增以下套件：

```text
# 現有依賴（保持不變）
fastapi==0.104.1
uvicorn==0.24.0
scapy==2.5.0
python-multipart==0.0.6

# 新增依賴
APScheduler==3.10.4      # 會話清理排程器
python-dotenv==1.0.0     # 環境變數管理
pytest==7.4.3            # 後端測試（選用）
httpx==0.25.2            # API 測試客戶端（選用）
```

### 開發優先順序

1. **Phase 1a**: 實作會話中介軟體與驗證依賴
2. **Phase 1b**: 實作檔案命名空間隔離邏輯
3. **Phase 1c**: 實作清理排程器
4. **Phase 1d**: 更新所有 API 端點使用會話驗證
5. **Phase 2**: 撰寫後端測試覆蓋會話流程

### 風險與緩解措施

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| 祕鑰洩漏 | 高（會話可偽造） | 使用環境變數、加入 `.gitignore` |
| 清理失敗 | 中（磁碟空間累積） | 添加監控、手動清理腳本 |
| 並發競爭 | 低（檔案寫入衝突） | 使用 UUID 確保唯一性 |
| 會話過期 | 低（用戶體驗） | 提供清楚的登入提示 |

---

**研究完成日期**: 2025-11-16
**下一步**: 進入 Phase 1 設計資料模型與 API 契約
