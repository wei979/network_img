# Implementation Plan: 網路通訊協議圖形化展示系統

**Branch**: `001-protocol-visualization` | **Date**: 2025-11-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-protocol-visualization/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

本功能旨在完成網路通訊協議的圖形化展示系統，涵蓋從後端 PCAP 解析、協定時間軸生成，到前端動畫渲染與互動控制的完整流程。系統已有基礎架構（Python + Scapy 後端、React + Vite 前端、力導向圖視覺化），本次規劃重點為：

1. **會話管理與多用戶隔離**：實施會話驗證與資料隔離機制
2. **API 安全性強化**：為所有端點（除健康檢查外）新增會話驗證
3. **資料生命週期管理**：實作會話結束時的自動清理機制
4. **日誌策略標準化**：將錯誤日誌輸出到 stdout/stderr，依賴容器日誌管理

技術方向：沿用現有 FastAPI + React 架構，新增會話中介軟體、檔案命名空間隔離、自動清理排程器。

## Technical Context

**Language/Version**:
- 後端：Python 3.11+
- 前端：JavaScript (ES2022+), React 19

**Primary Dependencies**:
- 後端：FastAPI 0.104+, Scapy 2.5+, Uvicorn 0.24+, python-multipart (檔案上傳), itsdangerous (會話管理)
- 前端：React 19.2, Vite 7.1, Tailwind CSS 3.x, lucide-react (圖示), Vitest (測試)

**Storage**:
- 檔案系統：PCAP 檔案與 JSON 結果儲存於 `public/data/<session_id>/`
- 會話儲存：使用 FastAPI SessionMiddleware (cookie-based)
- 無資料庫：純檔案系統架構

**Testing**:
- 後端：pytest (需新增), unittest (內建)
- 前端：Vitest + Testing Library (已配置)

**Target Platform**:
- 後端：Linux/macOS/Windows (Python 跨平台)
- 前端：現代瀏覽器 (Chrome 90+, Firefox 88+, Edge 90+)
- 部署：Docker 容器 + Kubernetes (選用)

**Project Type**: Web application (frontend + backend)

**Performance Goals**:
- PCAP 解析：1,000-5,000 封包在 5 秒內完成（SC-001）
- 動畫播放：60 FPS 無卡頓（SC-002）
- API 響應：健康檢查 <50ms, 時間軸查詢 <200ms
- 力導向圖：30 節點在 3 秒內穩定（SC-005）
- 並發上傳：支援至少 10 個會話同時上傳與解析

**Constraints**:
- 前端凍結時間：處理大型檔案時不可超過 2 秒（SC-008）
- 互動延遲：懸停提示框 <100ms（SC-006）、拖曳節點 <50ms（SC-011）
- CPU 使用率：100+ 連線時不超過 80%（SC-010）
- 記憶體：單一會話解析 PCAP 不可超過 500MB
- 瀏覽器相容性：支援 ES2022 語法，不支援 IE

**Scale/Scope**:
- 用戶規模：預期 10-50 個同時線上用戶
- 資料規模：單一 PCAP 檔案 <500MB, 10K-100K 封包
- 連線數：單一視覺化最多支援 200 個協定連線
- 協定類型：當前支援 6 種（TCP 握手、DNS 查詢、HTTP、HTTPS、UDP 傳輸、逾時）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### 必要檢查項目

✅ **技術棧一致性**
- 後端：Python 3.11+ ✓ (憲法要求)
- FastAPI + Scapy + Uvicorn ✓ (憲法指定)
- 前端：React 19 + Vite 7 + Tailwind ✓ (憲法指定)
- 所有依賴符合憲法規範

✅ **目錄結構遵守**
- 根目錄包含 `network_analyzer.py`, `analysis_server.py` ✓
- `src/` 存放 React 程式 ✓
- `src/components` 為協定示範元件 ✓
- `src/lib` 為動畫核心（`ProtocolAnimationController.js`）✓
- `public/data` 為靜態回退資料 ✓

✅ **後端契約**
- `NetworkAnalyzer` 需完成封包載入、統計、時間軸、心智圖並輸出 JSON ✓ (已存在)
- FastAPI 提供 `/api/health|analysis|timelines|analyze` ✓ (需新增會話驗證)
- 所有結果同步寫入 `public/data` ✓ (需調整為 `public/data/<session_id>/`)

✅ **前端契約**
- `MindMap.jsx` 維持 API 優先 → 靜態回退流程 ✓
- 使用 `ProtocolAnimationController` 管理動畫 ✓
- 上傳流程使用 FormData POST `/api/analyze` ✓
- 協定示範元件使用控制器工廠 ✓

✅ **資料與回退策略**
- `public/data` 為 API 失效時的資料來源 ✓
- Vite 代理 `/api` 到 FastAPI ✓
- 維持 JSON 版本控制狀態 ✓

⚠️ **新增需求檢查**
- 會話驗證機制：需實作（規格 FR-011a）
- 多用戶並發隔離：需實作（規格 FR-013a）
- 會話結束自動清理：需實作（規格 FR-010）
- 日誌輸出到 stdout/stderr：需實作（規格 FR-013b）

### 檢查結果

**狀態**: ✅ PASS (有條件通過)

**說明**:
- 核心架構符合憲法要求
- 新增功能（會話管理、資料隔離、自動清理）不違反現有契約
- 需在 Phase 1 設計會話中介軟體與檔案命名空間邏輯
- 需更新 `analysis_server.py` 以支援會話驗證

**待設計項目**:
1. FastAPI SessionMiddleware 配置與祕鑰管理
2. 會話 ID 到檔案路徑的映射機制
3. 定期清理過期會話檔案的排程器
4. API 端點的會話驗證裝飾器

## Project Structure

### Documentation (this feature)

```text
specs/001-protocol-visualization/
├── spec.md              # 功能規格（已完成）
├── plan.md              # 本檔案（已完成）
├── research.md          # Phase 0 輸出（已完成）
├── data-model.md        # Phase 1 輸出（已完成）
├── quickstart.md        # Phase 1 輸出（已完成）
├── contracts/           # Phase 1 輸出（已完成）
│   └── api-spec.yaml    # OpenAPI 規格
└── checklists/
    └── requirements.md  # 規格品質檢查清單（已完成）
```

### Source Code (repository root)

本專案採用 **Web application** 結構（Option 2），但前後端位於相同 repository：

```text
# 後端（Python + FastAPI）
network_analyzer.py          # PCAP 解析核心（現有）
analysis_server.py           # FastAPI API 伺服器（需擴充）
requirements.txt             # Python 依賴（需更新）

# 前端（React + Vite）
src/
├── main.jsx                 # React 入口點（現有）
├── App.jsx                  # 主導航殼層（現有）
├── MindMap.jsx              # 主視覺化元件（現有）
├── components/              # 協定示範元件（現有）
│   ├── TcpHandshakeDemo.jsx
│   ├── DnsQueryDemo.jsx
│   ├── HttpRequestDemo.jsx
│   └── TimelineControl.jsx
├── lib/                     # 動畫核心（現有）
│   ├── ProtocolAnimationController.js
│   └── ProtocolStates.js
└── __tests__/               # 前端測試（現有）
    └── ProtocolAnimationController.test.js

# 測試（需新增後端測試）
tests/                       # 新增後端測試目錄
├── test_session_middleware.py
├── test_file_isolation.py
├── test_cleanup_scheduler.py
└── fixtures/
    └── sample.pcap

# 靜態資料與公開資產
public/
└── data/                    # 靜態回退資料（需調整結構）
    ├── protocol_timeline_sample.json  # 預載示範資料
    └── <session_id>/        # 動態會話資料（運行時生成）
        ├── network_analysis_results.json
        ├── protocol_timeline_sample.json
        └── network_mind_map.json

# 配置檔案
vite.config.js               # Vite 配置（現有，需確認代理設定）
package.json                 # Node 依賴（現有）
tailwind.config.js           # Tailwind 配置（現有）
vitest.config.js             # Vitest 配置（現有）
.env.example                 # 環境變數範例（需新增）
```

**Structure Decision**:

採用單一 repository 的 Web application 結構，前後端分離但共享版本控制。理由：

1. **現有架構**: 專案已採用此結構，保持一致性
2. **簡化部署**: 單一 Docker 映像即可包含前後端
3. **開發便利**: 前後端可在相同編輯器中開發，減少工具切換
4. **API 契約同步**: 規格變更時前後端可同步更新

**新增目錄**:
- `tests/`: 後端 pytest 測試（Python）
- `public/data/<session_id>/`: 會話隔離的動態資料
- `.env.example`: FastAPI 祕鑰與配置範本

## Complexity Tracking

> 本專案無憲法違規項目，此章節留空。

## Phase Summary

### Phase 0: Research Completed ✅

**目標**: 解決所有技術決策問題，為實作提供明確指引

**輸出**: `research.md` (6 個研究決策)

**關鍵決策**:
1. **會話管理**: Starlette SessionMiddleware + itsdangerous，cookie-based 儲存
2. **檔案隔離**: `public/data/<session_id>/` 命名空間，每會話獨立目錄
3. **自動清理**: APScheduler 每小時掃描，14400 秒（4 小時）過期
4. **端點驗證**: FastAPI Depends 依賴注入，`require_session()` 裝飾器
5. **日誌策略**: Python logging 模組，輸出到 stdout/stderr，無檔案日誌
6. **環境配置**: python-dotenv 載入 .env，SECRET_KEY 最低 32 字元

**新增依賴**:
- APScheduler==3.10.4 (排程器)
- python-dotenv==1.0.0 (環境變數)
- pytest==7.4.3 (測試框架)
- httpx==0.25.2 (測試用 HTTP 客戶端)

### Phase 1: Design Completed ✅

**目標**: 定義完整的資料模型、API 契約與開發指南

**輸出**:
- `data-model.md` (7 個核心實體)
- `contracts/api-spec.yaml` (OpenAPI 3.0.3 規格)
- `quickstart.md` (開發者上手指南)

**資料模型**:
1. **Session**: 會話生命週期管理（UUID、時間戳、過期時間）
2. **Packet**: 運行時記憶體封包資料（源/目標 IP、協定、時間戳）
3. **ProtocolTimeline**: 協定時間軸核心（ID、類型、階段、指標）
4. **AnimationStage**: 動畫階段定義（方向、持續時間、封包參考）
5. **AnimationController**: 前端控制器（播放速度、進度、渲染狀態）
6. **NetworkNode**: 力導向圖節點（座標、速度、連線計數）
7. **NetworkConnection**: 網路連線視覺化（來源/目標、協定、動畫控制器）

**API 契約** (4 個端點):
- `GET /api/health` - 健康檢查（無驗證）
- `GET /api/analysis` - 取得分析結果（需驗證）
- `GET /api/timelines` - 取得時間軸資料（需驗證）
- `POST /api/analyze` - 上傳並分析 PCAP（需驗證，最大 500MB）

**安全性設計**:
- Cookie-based 會話驗證（sessionCookie: apiKey in cookie）
- 401 Unauthorized 統一錯誤回應
- 檔案格式驗證（只接受 .pcap/.pcapng）
- 並發隔離（每會話獨立處理）

**開發指南涵蓋**:
- 環境需求與安裝步驟
- 後端/前端開發流程（含程式碼範例）
- 測試指南（pytest + Vitest）
- 5 個常見問題故障排除
- 參考資源與專案檔案索引

### 規劃成果統計

**文件產出**:
- 規格文件：1 個 (spec.md，38 個功能需求)
- 研究文件：1 個 (research.md，6 個決策)
- 設計文件：3 個 (data-model.md, api-spec.yaml, quickstart.md)
- 檢查清單：1 個 (requirements.md，全數通過 ✅)
- 規劃文件：1 個 (本檔案)

**總計**：7 個文件，涵蓋從需求分析到實作指引的完整規劃

**憲法合規性**：✅ PASS（有條件通過，需實作 4 個待設計項目）

**技術棧確認**：
- 後端：Python 3.11+, FastAPI 0.104+, Scapy 2.5+, APScheduler 3.10+
- 前端：React 19.2, Vite 7.1, Tailwind CSS 3.x, Vitest
- 測試：pytest (後端), Vitest + Testing Library (前端)
- 部署：Docker + Kubernetes (選用)

## Next Steps

### Phase 2: Task Breakdown

執行 `/speckit.tasks` 命令以生成實作任務清單：

**預期產出**: `specs/001-protocol-visualization/tasks.md`

**任務分類**:
1. **後端任務**:
   - 實作 SessionMiddleware 配置
   - 新增 `require_session()` 依賴
   - 實作 `get_session_data_dir()` 輔助函數
   - 更新 `/api/analyze` 端點（會話隔離）
   - 更新 `/api/timelines` 端點（會話隔離）
   - 實作 `cleanup_expired_sessions()` 函數
   - 註冊 APScheduler 啟動事件
   - 新增 `.env.example` 配置範本
   - 更新 `requirements.txt` (新增 APScheduler, python-dotenv)

2. **前端任務**:
   - 更新 API 請求（確保 `credentials: 'include'`）
   - 新增會話過期處理（401 → 重導向登入）
   - 測試上傳流程（含會話驗證）

3. **測試任務**:
   - 建立 `tests/` 目錄結構
   - 撰寫會話中介軟體測試
   - 撰寫檔案隔離測試
   - 撰寫清理排程器測試
   - 準備測試用 PCAP 檔案

4. **文件任務**:
   - 更新 README.md（新增會話管理說明）
   - 更新 CLAUDE.md（新增會話相關開發指引）

### Phase 3: Implementation

執行 `/speckit.implement` 命令以執行實作任務：

**預期行為**:
- 系統將逐一執行 tasks.md 中的任務
- 自動建立分支 `001-protocol-visualization`（已建立）
- 程式碼變更後自動執行測試驗證
- 完成後可選擇建立 Pull Request

### 手動實作建議

若選擇手動實作，建議順序：

**第一階段：核心基礎設施**
1. 環境配置（.env.example）
2. 依賴更新（requirements.txt）
3. 會話中介軟體（SessionMiddleware）
4. 檔案隔離邏輯（get_session_data_dir）

**第二階段：API 端點更新**
5. 會話驗證依賴（require_session）
6. 更新 `/api/analyze` 端點
7. 更新 `/api/timelines` 端點
8. 更新 `/api/analysis` 端點

**第三階段：生命週期管理**
9. 清理函數（cleanup_expired_sessions）
10. 排程器註冊（startup 事件）

**第四階段：前端整合**
11. 更新 API 請求（credentials: 'include'）
12. 會話過期處理（401 錯誤）

**第五階段：測試與驗證**
13. 撰寫後端測試
14. 執行端對端測試
15. 效能驗證（並發上傳）

**建議工具**:
- 後端開發：`uvicorn analysis_server:app --reload`
- 前端開發：`npm run dev`
- 後端測試：`pytest tests/ -v`
- 前端測試：`npm test`
- API 測試：Postman 或 curl

## Conclusion

本規劃文件已完成所有 Phase 0（Research）與 Phase 1（Design）階段的工作，產出完整的技術決策、資料模型、API 契約與開發指南。

**準備就緒**：
- ✅ 所有技術疑問已解決
- ✅ 資料結構已定義
- ✅ API 契約已確立
- ✅ 開發指南已撰寫
- ✅ 憲法合規性已驗證

**下一步**：執行 `/speckit.tasks` 產生實作任務清單，或開始手動實作。

---

**文件版本**: 1.0
**最後更新**: 2025-11-16
**規劃者**: Claude (Speckit Planning Agent)
**狀態**: ✅ Planning Complete - Ready for Implementation
