# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
## Network Analyzer Integration

1. Install Python dependencies once: `pip install -r requirements.txt`.
2. Start the analysis API: `uvicorn analysis_server:app --host 0.0.0.0 --port 8000`.
3. In another terminal, install and launch the frontend: `npm install` (first time) then `npm run dev`.
4. Visit the Vite dev server, use **上傳封包** to upload a Wireshark `.pcap`/`.pcapng` file, and wait for the status banner to confirm completion.
5. The resulting JSON is saved to `public/data/`, so static hosting will keep serving the newest results even without the API running.

The viewer automatically pulls from `/api/analysis` when the service is online and falls back to the bundled JSON if the API is unavailable.

---

## 開發時的 /api 代理錯誤說明

現象：在瀏覽器或 Vite 終端會看到 `net::ERR_ABORTED` 或 `AggregateError [ECONNREFUSED]`，多半發生在 `GET /api/timelines` 或 `GET /api/analysis`。

原因：`vite.config.js` 將 `/api` 代理到 `http://localhost:8000`。當 FastAPI 後端未啟動時，代理的連線會被拒絕，屬於預期行為。

前端行為（不會整頁空白）：
- `MindMap.jsx` 先嘗試 `API_TIMELINES_URL`（`/api/timelines`），若失敗會自動回退到 `STATIC_TIMELINES_URL`（`/data/protocol_timeline_sample.json`）並繼續渲染。
- 其他視圖也會偏向使用 `public/data/` 下的樣本或先前分析產生的檔案作為備援。

解法選項：
- 啟動後端（推薦）：依上方步驟執行 `uvicorn analysis_server:app --port 8000 --reload`，代理錯誤即會消失。若 `public/data/protocol_timeline_sample.json` 存在，`/api/timelines` 會回傳示例時間線。
- 前端-only 開發時暫時關閉代理：打開 `vite.config.js`，將 `server.proxy` 的 `/api` 區塊註解或移除後重啟 dev server。此時 `/api` 請求會直接失敗，但 UI 仍使用靜態檔案。
- 僅用靜態資料：在開發模式下調整載入策略，優先載入 `/data/*.json`，避免依賴後端。

如何確認備援已生效：
- 開啟 DevTools 的 Network：你會看到 `GET /api/timelines` 失敗，但 `GET /data/protocol_timeline_sample.json` 成功；UI 會顯示示例時間線，不會整頁空白。

若仍是空白頁：
- 請確認 `public/data/` 目錄存在以下檔案：`protocol_timeline_sample.json`、`network_analysis_results.json`、`network_mind_map.json`。

---

## 動畫播放速度統一（開發說明）

`TcpHandshakeDemo.jsx` 已更新為：
- 在渲染迴圈中呼叫 `controller.advance(delta)`（不再手動乘以倍速）。
- 以 `controller.setPlaybackSpeed(playbackSpeed)` 控制倍率，並在 `useEffect` 中監聽 `playbackSpeed` 的變更：

```jsx
useEffect(() => {
  controllerRef.current?.setPlaybackSpeed(playbackSpeed)
}, [playbackSpeed])
```

其他 Demo 目前保持固定速度。如果需要也加入速度控制，請沿用同一模式加上 UI slider 與上述 `useEffect`。

## �Ұʻ���

- �Y�ݭn�s�u FastAPI ���R�A�ȡA�Цb .env �ΩR�O�C�]�w VITE_ANALYZER_API=true�A�ñҰ� uvicorn analysis_server:app --host 0.0.0.0 --port 8000�C
- �Y���Ұʫ�ݡA�i�O�d�w�]�]�γ]�� alse�^�A�e�ݷ|�ϥ� public/data �U���֨��ɨ��קK�ߥX API �s�u���~�C

