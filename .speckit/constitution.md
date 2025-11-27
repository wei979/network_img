# Project Constitution

## 任務與範疇
- 建置一套以 Scapy + FastAPI 分析 PCAP/PCAPNG，並用 React/Vite 呈現互動協定動畫的網路協定視覺化平臺 (`CLAUDE.md:7`).
- 核心體驗：拓撲/心智圖總覽、TCP/DNS/HTTP/UDP/Timeout/異常等多協定演示、透過上傳觸發再分析 (`src/App.jsx:14`, `src/MindMap.jsx:1002`, `network_analyzer.py:173`).

## 技術棧與目錄
- 後端：Python 3.11+、FastAPI、Scapy、Uvicorn (`CLAUDE.md:17`–`CLAUDE.md:31`).
- 前端：React 19、Vite 7、Tailwind、Vitest (`package.json:1`, `CLAUDE.md:33`–`CLAUDE.md:48`).
- 佈局（`CLAUDE.md:294`）：根目錄含 `network_analyzer.py`、`analysis_server.py`；`src/` 存 React 程式；`src/components` 為協定示範；`src/lib` 為動畫核心；`src/__tests__` 放 Vitest；`public/data` 為靜態回退。

## 工作流程
- 後端：`pip install -r requirements.txt`、`uvicorn analysis_server:app --host 0.0.0.0 --port 8000 --reload` (`CLAUDE.md:20`, `CLAUDE.md:23`).
- 前端：`npm install`、`npm run dev`、`npm run build`、`npm preview`、`npm run lint`、`npm test` (`CLAUDE.md:33`–`CLAUDE.md:48`).
- 分析：UI 上傳 `handleFileUpload` 或 CLI `python network_analyzer.py <pcap>` (`src/MindMap.jsx:1041`, `CLAUDE.md:235`).
- 樣本：`python scripts/export_protocol_timeline_sample.py` 重建 `docs/` 與 `public/data/` 時間軸 (`scripts/export_protocol_timeline_sample.py:1`).

## 後端契約
- `NetworkAnalyzer` 需完成封包載入、統計、遺失/延遲偵測、時間軸、心智圖並輸出 JSON (`network_analyzer.py:35`, `network_analyzer.py:48`, `network_analyzer.py:459`, `network_analyzer.py:510`, `network_analyzer.py:595`, `network_analyzer.py:774`).
- FastAPI 必須提供 `/api/health|analysis|timelines|analyze` 並處理上傳驗證與背景分析 (`analysis_server.py:86`, `analysis_server.py:91`, `analysis_server.py:99`, `analysis_server.py:107`).
- 所有結果需同步寫入 `public/data` 以支援靜態回退 (`analysis_server.py:16`, `CLAUDE.md:271`).

## 前端契約
- `App.jsx` 新增功能時必須同時更新導覽按鈕與主視區 (`src/App.jsx:14`).
- `MindMap.jsx` 必須維持 API 優先（`ANALYZER_API_ENABLED`）→靜態回退流程，並以 `ProtocolAnimationController` 管理每條時間軸的動畫 (`src/MindMap.jsx:27`, `src/MindMap.jsx:945`, `src/MindMap.jsx:960`, `src/MindMap.jsx:967`, `src/MindMap.jsx:1002`).
- 上傳流程需以 FormData POST `/api/analyze`、顯示進度/錯誤並於成功後刷新 (`src/MindMap.jsx:1041`, `src/MindMap.jsx:1057`).
- 協定示範元件必須使用控制器工廠與 `TimelineControl`，維持與主視覺一致的動畫語意 (`src/components/TcpHandshakeDemo.jsx:6`, `src/components/TimelineControl.jsx:1`).
- 禁止繞過 `ProtocolAnimationController` 直接修改渲染狀態，所有播放速度與階段邏輯應透過控制器 API (`src/lib/ProtocolAnimationController.js:70`, `src/lib/ProtocolAnimationController.js:91`).

## 資料、腳本與回退
- `public/data` 為 API 失效時的資料來源；Vite 代理 `/api` 到 FastAPI，但前端必須在失敗時自動切換 (`vite.config.js:5`, `CLAUDE.md:71`, `src/MindMap.jsx:967`).
- `PCAP_FILES` 清單定義樣本來源，更新後務必重新執行腳本並提交新 JSON (`scripts/export_protocol_timeline_sample.py:14`, `scripts/export_protocol_timeline_sample.py:160`).
- 維持 Analyzer 輸出的 `network_analysis_results.json`、`network_mind_map.json`、`protocol_timeline_sample.json` 版本控制狀態 (`CLAUDE.md:271`).

## 品質與測試
- 以 `npm test` 執行 Vitest + Testing Library；`src/__tests__/ProtocolAnimationController.test.js` 歸檔動畫控制器行為，新增協定應同步擴充測試 (`CLAUDE.md:48`, `CLAUDE.md:254`, `src/__tests__/ProtocolAnimationController.test.js:1`, `src/__tests__/ProtocolAnimationController.test.js:16`).
- `src/setupTests.js` 已在 Vite 設定中註冊，新增測試請遵循 jsdom 環境 (`vite.config.js:13`).
- 建議為 `NetworkAnalyzer` 新增單元測試或 fixtures 驗證（例如 `generate_report`）以維持分析正確度 (`network_analyzer.py:675`).

## 貢獻守則
- 保持繁體中文與 Unicode 內容，並善用 `_safe_print` 等防護（`network_analyzer.py:28`, `CLAUDE.md:265`）。
- 協定色彩需在 `MindMap` 與 `ProtocolStates` 同步 (`CLAUDE.md:280`).
- 動畫效能：重複使用控制器、集中處理播放速度、避免額外 delta 乘法 (`CLAUDE.md:288`).
- 新增協定視覺時依 CLAUDE 流程：定義 state → 控制器工廠 → Demo component → App 導覽 (`CLAUDE.md:202`).
- 參考近期 SVG NaN 修復紀錄，新增力導向或座標邏輯時務必驗證 (`CLAUDE.md:317`).
