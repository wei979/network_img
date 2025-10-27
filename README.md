# 網路流量分析與視覺化平台

一個結合 **FastAPI + Scapy** 後端與 **React + Vite** 前端的網路封包分析平台，提供直觀的視覺化介面來分析 PCAP/PCAPNG 檔案，幫助網路工程師、測試人員和營運人員快速理解網路流量模式。

![網路心智圖示例](https://via.placeholder.com/800x400/1a1a2e/ffffff?text=Network+Mind+Map+Visualization)

## ✨ 功能特色

### 🔍 深度封包分析
- **多協議支援**：TCP、UDP、HTTP、HTTPS、DNS、ICMP 等主流協議
- **統計分析**：封包數量、協議分佈、端口統計、連線摘要
- **效能指標**：RTT 延遲、封包遺失率、握手分析
- **異常偵測**：自動識別網路異常模式和潛在問題

### 🎨 豐富的視覺化
- **互動式心智圖**：節點拖拽、縮放平移、動態連線展示
- **協議動畫演示**：TCP 三向交握、UDP 傳輸、DNS 查詢等動畫模擬
- **時間軸分析**：封包流向的時序視覺化
- **儀表板總覽**：關鍵指標的統一展示

### 🚀 現代化架構
- **雙模式資料源**：支援即時 API 分析與離線 JSON 快取
- **響應式設計**：適配桌面與行動裝置
- **模組化架構**：易於擴展和維護
- **高效能渲染**：基於 React 19 和 Vite 7

## 🛠️ 技術棧

### 後端
- **FastAPI** - 現代化的 Python Web 框架
- **Scapy** - 強大的封包處理庫
- **Uvicorn** - ASGI 伺服器

### 前端
- **React 19** - 使用者介面庫
- **Vite 7** - 快速建置工具
- **Tailwind CSS** - 實用優先的 CSS 框架
- **Lucide React** - 美觀的圖示庫
- **Vitest** - 快速的測試框架

## 📦 安裝與設定

### 系統需求
- Python 3.8+
- Node.js 16+
- npm 或 yarn

### 1. 克隆專案
```bash
git clone <repository-url>
cd network_img
```

### 2. 後端設定
```bash
# 建立虛擬環境
python -m venv venv

# 啟動虛擬環境 (Windows)
venv\Scripts\activate
# 啟動虛擬環境 (macOS/Linux)
source venv/bin/activate

# 安裝依賴
pip install -r requirements.txt
```

### 3. 前端設定
```bash
# 安裝依賴
npm install
```

## 🚀 快速開始

### 啟動開發環境

1. **啟動後端服務**
```bash
uvicorn analysis_server:app --host 0.0.0.0 --port 8000 --reload
```

2. **啟動前端開發伺服器**
```bash
npm run dev
```

3. **開啟瀏覽器**
訪問 `http://localhost:5173` 開始使用

### 基本使用流程

1. **上傳封包檔案**
   - 點擊「上傳封包」按鈕
   - 選擇 `.pcap` 或 `.pcapng` 檔案
   - 等待分析完成

2. **查看分析結果**
   - **心智圖**：查看網路拓撲和連線關係
   - **儀表板**：檢視統計數據和效能指標
   - **協議演示**：觀看各種協議的動畫模擬

3. **互動操作**
   - 拖拽節點調整佈局
   - 縮放和平移檢視區域
   - 使用時間軸控制播放速度

## 📚 API 文件

### 端點概覽

| 方法 | 端點 | 描述 |
|------|------|------|
| GET | `/api/health` | 健康檢查 |
| GET | `/api/analysis` | 獲取分析結果 |
| GET | `/api/timelines` | 獲取時間軸資料 |
| POST | `/api/analyze` | 上傳並分析封包檔案 |

### 詳細說明

#### `POST /api/analyze`
上傳 PCAP/PCAPNG 檔案進行分析

**請求**
```bash
curl -X POST \
  -F "file=@sample.pcap" \
  http://localhost:8000/api/analyze
```

**回應**
```json
{
  "analysis": {
    "basic_stats": {
      "total_packets": 1234,
      "protocols": {"TCP": 800, "UDP": 300, "ICMP": 134},
      "duration_seconds": 60.5
    },
    "packet_loss": {
      "tcp_retransmissions": 5,
      "estimated_loss_rate": 0.004
    },
    "latency": {
      "avg_rtt_ms": 25.3,
      "tcp_handshakes": 45
    }
  }
}
```

## 🏗️ 專案結構

```
network_img/
├── 📁 src/                     # React 前端原始碼
│   ├── 📁 components/          # 協議演示組件
│   ├── 📁 lib/                 # 核心邏輯庫
│   ├── 📁 __tests__/           # 測試檔案
│   ├── 📄 App.jsx              # 主應用組件
│   ├── 📄 MindMap.jsx          # 心智圖組件
│   └── 📄 NetworkAnalysisViewer.jsx  # 分析檢視器
├── 📁 public/
│   └── 📁 data/                # 靜態資料檔案
├── 📁 docs/                    # 專案文件
├── 📁 scripts/                 # 工具腳本
├── 📄 analysis_server.py       # FastAPI 主程式
├── 📄 network_analyzer.py      # 封包分析核心
├── 📄 requirements.txt         # Python 依賴
├── 📄 vite.config.js          # Vite 設定
└── 📄 package.json            # Node.js 依賴與腳本
```

## 🧪 測試

### 執行測試
```bash
# 前端測試
npm run test

# 程式碼檢查
npm run lint
```

### 測試覆蓋範圍
- ✅ 協議動畫控制器
- ✅ 時間軸邏輯
- ⏳ UI 組件測試（規劃中）

## 🔧 開發指南

### 新增協議支援

1. **後端擴展**
```python
# 在 network_analyzer.py 中新增協議處理
def analyze_custom_protocol(self, packets):
    # 實作自定義協議分析邏輯
    pass
```

2. **前端組件**
```jsx
// 在 src/components/ 中建立新的演示組件
export function CustomProtocolDemo() {
    // 實作協議動畫邏輯
}
```

### 自定義視覺化

修改 `src/MindMap.jsx` 中的渲染邏輯：
```jsx
// 自定義節點樣式
const nodeStyle = {
    fill: getProtocolColor(node.protocol),
    stroke: '#ffffff',
    strokeWidth: 2
};
```

## 📊 資料格式

### 分析結果結構
```json
{
  "basic_stats": {
    "total_packets": "number",
    "protocols": "object",
    "top_ports": "array"
  },
  "packet_loss": {
    "tcp_retransmissions": "number",
    "estimated_loss_rate": "number"
  },
  "latency": {
    "avg_rtt_ms": "number",
    "tcp_handshakes": "number"
  },
  "top_connections": "array"
}
```

### 心智圖資料結構
```json
{
  "nodes": [
    {
      "id": "string",
      "label": "string",
      "protocol": "string",
      "x": "number",
      "y": "number"
    }
  ],
  "connections": [
    {
      "source": "string",
      "target": "string",
      "protocol": "string",
      "packet_count": "number"
    }
  ]
}
```

## 🚀 部署

### 生產環境建置
```bash
# 建置前端
npm run build

# 啟動生產伺服器
uvicorn analysis_server:app --host 0.0.0.0 --port 8000
```

### Docker 部署（可選）
```dockerfile
# Dockerfile 範例
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "analysis_server:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🤝 貢獻指南

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

### 程式碼風格
- 遵循 ESLint 設定
- 使用 Prettier 格式化
- 撰寫有意義的提交訊息


## 🙏 致謝

感謝以下開源專案的貢獻：
- [Scapy](https://scapy.net/) - 強大的封包處理庫
- [FastAPI](https://fastapi.tiangolo.com/) - 現代化的 Web 框架
- [React](https://reactjs.org/) - 使用者介面庫
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架

---
