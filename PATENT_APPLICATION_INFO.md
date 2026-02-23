# WireMap 專利申請準備文件

> 本文件整理自 WireMap（network_img）完整原始碼分析，供專利申請撰寫參考。

---

## 一、技術核心資訊

### 1. WireMap 完整系統架構圖

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        使用者瀏覽器 (React + Vite)                       │
│                                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────────────────┐  │
│  │ App.jsx  │  │  Protocol    │  │         MindMap.jsx               │  │
│  │ 導覽外殼  │→│  Demo 元件群  │  │  ┌─────────────────────────────┐  │  │
│  │          │  │ (6 種協定動畫)│  │  │  SVG 視覺化引擎              │  │  │
│  └──────────┘  └──────────────┘  │  │  ├─ 格位佈局演算法            │  │  │
│                                   │  │  ├─ 五力導向模擬              │  │  │
│                                   │  │  ├─ 折線動畫系統              │  │  │
│                                   │  │  ├─ 三層漸進式資訊揭露        │  │  │
│                                   │  │  ├─ 封包粒子系統              │  │  │
│                                   │  │  └─ 雙模式視圖 (遠景/近景)    │  │  │
│                                   │  └─────────────────────────────┘  │  │
│                                   └───────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────┐  ┌─────────────────────────────────┐ │
│  │ ProtocolAnimationController   │  │ ProtocolStates.js               │ │
│  │ 協定動畫狀態機引擎             │  │ 11 種協定狀態定義 + 色彩方案    │ │
│  │ ├─ advance(delta) 時間推進     │  │ ├─ tcp-handshake (3 階段)       │ │
│  │ ├─ getRenderableState() 渲染   │  │ ├─ tcp-teardown (4 階段)        │ │
│  │ ├─ seek() / seekToProgress()  │  │ ├─ http/https-request (4 階段)  │ │
│  │ └─ setPlaybackSpeed() 速度控制 │  │ ├─ dns-query (3 階段)           │ │
│  └───────────────────────────────┘  │ ├─ udp-transfer (1 階段)        │ │
│                                      │ ├─ timeout (3 階段)             │ │
│                                      │ ├─ psh-flood / syn-flood 等     │ │
│                                      │ └─ icmp-ping / ssh-secure       │ │
│                                      └─────────────────────────────────┘ │
│                                                                         │
│              ┌────── API 請求（/api/*）──────┐                           │
│              │         ↕ 失敗時              │                           │
│              │    靜態 JSON 備援              │                           │
│              │  (/data/*.json)               │                           │
└──────────────┼───────────────────────────────┼───────────────────────────┘
               │  Vite Proxy (:5173 → :8000)   │
               ↓                               ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    FastAPI REST API 伺服器 (analysis_server.py)          │
│                                                                         │
│  端點:                                                                   │
│  ├─ GET  /api/health          健康檢查                                   │
│  ├─ GET  /api/analysis        完整分析結果                                │
│  ├─ GET  /api/timelines       協定時間軸（含攻擊分析）                     │
│  ├─ GET  /api/attacks         攻擊偵測結果                                │
│  ├─ POST /api/analyze         上傳 PCAP 檔案 → 觸發分析                   │
│  ├─ POST /api/packets/batch   批次封包查詢                                │
│  ├─ POST /api/packets/statistics  時間桶攻擊時間軸                        │
│  └─ GET  /api/packets/{id}    單一連線封包詳情                            │
│                                                                         │
│  會話管理:                                                                │
│  ├─ UUID 會話隔離（每用戶獨立 public/data/{UUID}/ 目錄）                   │
│  ├─ APScheduler 定期清理過期會話（預設 4 小時）                            │
│  └─ 非 ASCII 路徑自動處理（臨時檔案機制）                                  │
└──────────────┬──────────────────────────────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    核心分析引擎 (network_analyzer.py)                     │
│                    NetworkAnalyzer 類別 — 1,843 行                       │
│                                                                         │
│  ┌─── 封包載入層 ────────────────────────────────────────────────────┐   │
│  │  load_packets() → Scapy rdpcap → self.packets[]                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                         ↓                                               │
│  ┌─── 分析層（六大分析模組並行）────────────────────────────────────┐   │
│  │  1. basic_statistics()        → 協定分布 / IP / 端口 / 連線      │   │
│  │  2. detect_packet_loss()      → 重傳偵測 + 序號間隙偵測          │   │
│  │  3. analyze_latency()         → ICMP RTT / TCP 握手延遲 / 封包間隔│   │
│  │  4. detect_attacks()          → 多指標攻擊分類 + 異常評分 (0-100) │   │
│  │  5. build_mind_map()          → 三層階層式連線拓撲圖              │   │
│  │  6. generate_protocol_timelines() → 協定動畫時間軸產生            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                         ↓                                               │
│  ┌─── 時間軸產生層（六種偵測器）──────────────────────────────────────┐   │
│  │  a. _extract_tcp_handshakes()     → SYN/SYN-ACK/ACK 三向握手      │   │
│  │  b. _extract_tcp_teardowns()      → FIN/ACK/RST 四向揮手          │   │
│  │  c. _extract_generic_tcp_connections() → 通用 TCP + 洪泛攻擊偵測  │   │
│  │  d. _extract_udp_transfers()      → UDP 傳輸 + DNS 查詢識別       │   │
│  │  e. _detect_http_requests()       → HTTP/HTTPS 請求回應偵測       │   │
│  │  f. _detect_timeouts()            → >3 秒間隙逾時偵測             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                         ↓                                               │
│  ┌─── 輸出層 ──────────────────────────────────────────────────────┐   │
│  │  save_results() → 雙路徑持久化                                    │   │
│  │  ├─ 根目錄: network_analysis_results.json                        │   │
│  │  └─ public/data/{session}/                                       │   │
│  │     ├─ network_analysis_results.json   (完整分析)                 │   │
│  │     ├─ protocol_timeline_sample.json   (動畫時間軸)               │   │
│  │     ├─ network_mind_map.json           (階層拓撲)                 │   │
│  │     └─ connection_packets.json         (封包詳情)                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

**資料流摘要**：

```
PCAP 檔案上傳 → FastAPI 接收 → NetworkAnalyzer 六大模組分析
→ protocolType 標記的時間軸 JSON → public/data/ 雙路持久化
→ React 前端拉取 → ProtocolAnimationController 狀態機驅動
→ SVG 格位佈局 + 折線動畫 + 漸進式揭露 → 使用者互動式視覺化
```

---

### 2. 核心技術特點——與現有網路監控工具的差異化技術手段

| 技術面向 | WireMap 獨特技術手段 | 傳統工具做法 |
|---------|---------------------|-------------|
| **封包分析到動畫映射** | 自創 `protocolType` 欄位（如 `tcp-handshake`、`dns-query`、`timeout`），每個網路交互自動分類並對應精確的狀態機動畫 | Wireshark 僅提供靜態封包列表，無動畫映射 |
| **動畫時間調整演算法** | 最低動畫持續時間機制（TCP 800ms、UDP 1200ms、HTTP 600/800/600ms），確保高速連線（<10ms）不會在視覺上消失，同時保留真實時間指標 | 無此概念 |
| **格位指數擴散佈局** | `BASE_SPREAD_MULTIPLIER / layer^SPREAD_DECAY`（25 / layer^0.9）指數距離放大，結合五力導向模擬 | Nmap/Wireshark 無拓撲視覺化；Zabbix 使用靜態地圖 |
| **三層漸進式資訊揭露** | Level 1（乾淨預設）→ Level 2（懸停+暗淡 15%）→ Level 3（點擊選取+側邊欄同步） | 傳統工具不做資訊密度控制 |
| **洪泛攻擊型態辨識** | 來源端口多樣性分析（unique_ports/total_packets > 0.8），結合 TCP 旗標比例分類 6 種攻擊類型 + 0-100 異常評分 | Wireshark 需手動分析、Snort 依賴規則庫 |
| **協定狀態機動畫引擎** | 通用 `ProtocolAnimationController` 類別，支援 advance/seek/playback speed，搭配 11 種預定義協定狀態 | 無同類技術 |
| **封包粒子生命週期** | 三階段視覺：Spawn（擴散光暈）→ Travel（沿折線移動）→ Arrive（螺旋吸收效果） | 無同類技術 |
| **雙模式視圖切換** | 遠景模式（聚合連線+對數粗細）↔ 近景模式（個別封包動畫），自動判斷攻擊流量切換為洪泛粒子系統 | 無同類技術 |

---

### 3. 使用的關鍵技術完整列表

#### 後端技術

| 技術 | 版本 | 用途 |
|------|------|------|
| **Python** | 3.x | 核心程式語言 |
| **Scapy** | 2.5.0 | PCAP 封包解析與深度封包檢測（DPI） |
| **FastAPI** | 0.110.1 | 非同步 REST API 框架 |
| **Uvicorn** | 0.27.1 | ASGI 伺服器（支援 WebSocket） |
| **APScheduler** | 3.10.4 | 背景排程（會話清理） |
| **python-multipart** | 0.0.9 | PCAP 檔案上傳處理 |
| **python-dotenv** | 1.0.0 | 環境變數管理 |
| **Starlette SessionMiddleware** | - | Cookie 會話管理 |

#### 前端技術

| 技術 | 版本 | 用途 |
|------|------|------|
| **React** | 19.2.0 | UI 框架（使用 Hooks 架構） |
| **Vite** | 7.1.9 | 建構工具 + 開發伺服器 + API 代理 |
| **Tailwind CSS** | 4.1.14 | 原子化 CSS 樣式系統 |
| **Lucide React** | 0.545.0 | 圖示庫（Pause/Play/Eye/EyeOff 等） |
| **SVG** | - | 向量圖形渲染（節點/邊/動畫圓點/標籤） |
| **requestAnimationFrame** | Web API | 60fps 動畫驅動 |
| **Vitest** | 3.2.4 | 前端單元測試框架 |
| **Testing Library** | 16.3.0 | React 元件測試 |

#### 自研核心模組

| 模組 | 位置 | 功能 |
|------|------|------|
| **NetworkAnalyzer** | `network_analyzer.py` | 1,843 行，封包分析引擎 |
| **ProtocolAnimationController** | `src/lib/ProtocolAnimationController.js` | 371 行，協定動畫狀態機 |
| **ProtocolStates** | `src/lib/ProtocolStates.js` | 500+ 行，11 種協定定義 |
| **MindMap** | `src/MindMap.jsx` | 1,675 行，核心視覺化元件 |
| **格位佈局演算法** | `MindMap.jsx` (generateGridPositions + applyGridSpread) | 環帶螺旋掃描 + 指數擴散 |
| **折線動畫系統** | `MindMap.jsx` (lerpPoint + pointOnPolyline) | 累計距離插值 |
| **洪泛攻擊偵測器** | `network_analyzer.py` (_extract_generic_tcp_connections) | 端口多樣性分析 |
| **異常評分系統** | `network_analyzer.py` (detect_attacks) | 複合加權 0-100 評分 |

---

### 4. 系統主要功能列表及說明

| 功能編號 | 功能名稱 | 簡要說明 |
|---------|---------|---------|
| F01 | **PCAP 封包上傳與分析** | 使用者透過 Web UI 上傳 Wireshark 擷取檔（.pcap/.pcapng），系統自動執行深度封包分析 |
| F02 | **協定分布統計** | 自動辨識 TCP/UDP/ICMP/其他協定，統計封包數、位元組數、IP 分布、端口分布 |
| F03 | **TCP 三向握手偵測與視覺化** | 偵測 SYN → SYN-ACK → ACK 序列，產生三階段動畫時間軸 |
| F04 | **TCP 四向揮手偵測與視覺化** | 偵測 FIN-ACK-FIN-ACK 或 RST 強制關閉，最多五階段動畫 |
| F05 | **DNS 查詢偵測與視覺化** | 透過 UDP port 53 辨識 DNS 流量，產生 Query → Resolving → Response 動畫 |
| F06 | **HTTP/HTTPS 請求偵測與視覺化** | 透過 port 80/443 辨識，產生 Request → Processing → Response 三階段動畫 |
| F07 | **UDP 傳輸視覺化** | 偵測非 DNS 的 UDP 流量並產生前向動畫 |
| F08 | **連線逾時偵測** | 識別封包間隙 >3 秒的連線，產生「等待回應」→「連線超時」的視覺化效果 |
| F09 | **封包遺失偵測** | 雙管齊下：TCP 重傳偵測（序號回退）+ 序號間隙偵測（>1000 bytes 門檻） |
| F10 | **延遲分析** | ICMP 往返時間、TCP 握手延遲、封包間隔統計三合一分析 |
| F11 | **網路攻擊偵測與分類** | 自動辨識 SYN Flood、RST Flood、FIN Flood、PSH Flood、URG-PSH-FIN Attack、Port Scan 六種攻擊型態 |
| F12 | **異常評分系統** | 複合加權 0-100 分數，結合 RST 比例/握手完成率/無資料拆線率/連線速率等指標 |
| F13 | **階層式網路拓撲圖** | 三層心智圖：協定 → 來源 IP → 目的 IP:Port，呈現網路連線全貌 |
| F14 | **格位指數擴散佈局** | 節點自動排列：環帶螺旋掃描產生格位 + 指數擴散放大距離 + 五力導向微調 |
| F15 | **三層漸進式資訊揭露** | Level 1 乾淨預設 → Level 2 懸停工具提示+他方暗淡 → Level 3 點擊選取+固定標籤 |
| F16 | **折線動畫系統** | 封包圓點沿「來源→中心→目的地」折線平滑移動，標籤同步跟隨 |
| F17 | **暫停/焦點模式** | 暫停凍結所有動畫；焦點模式隱藏其他連線專注觀察 |
| F18 | **雙模式視圖切換** | 遠景聚合模式（對數線寬）↔ 近景詳細模式（個別封包動畫） |
| F19 | **封包粒子系統** | 三階段生命週期：Spawn 光暈 → Travel 折線移動 → Arrive 螺旋吸收 |
| F20 | **攻擊時間桶分析** | 可調時間桶（100ms-1000ms）統計每桶封包數/位元組/TCP 旗標，呈現攻擊時間演變 |
| F21 | **多使用者會話隔離** | UUID 會話目錄 + Cookie 管理 + 4 小時自動過期清理 |
| F22 | **API + 靜態備援機制** | 前端優先查詢 API，後端離線時自動切換至 public/data/*.json 靜態檔案 |
| F23 | **協定示範動畫** | 六種獨立協定教學動畫（TCP Handshake、TCP Teardown、HTTP、DNS、UDP、Timeout） |
| F24 | **拖曳互動** | 節點可拖曳重排、畫布平移/縮放（滑鼠滾輪+觸控手勢）、慣性滾動 |
| F25 | **批次封包查詢** | 單一 API 請求查詢多條連線封包（最大 100 條），支援分頁 |

---

## 二、創新與可專利性

### 5. 最具創新性的部分

以下依創新程度排序，前三項為**最核心可專利主張**：

#### 🔺 創新一：protocolType 時間軸驅動的協定動畫映射系統

**技術內容**：後端分析引擎自動將每個網路交互分類為特定 `protocolType`（如 `tcp-handshake`、`dns-query`、`http-request`、`timeout`、`syn-flood` 等），每個類型攜帶結構化的多階段時間軸（stages array），前端 `ProtocolAnimationController` 狀態機直接消費此時間軸驅動精確的階段式動畫。

**獨特性**：
- 從封包層級的原始位元旗標到視覺動畫的**端到端自動映射**，不需人工標註
- `protocolType` 作為橋接後端分析與前端動畫的**統一語義鍵**
- 最低動畫持續時間機制（800ms/1200ms/600ms）保證高速連線可見性，同時原始指標不失真

#### 🔺 創新二：格位指數擴散佈局演算法

**技術內容**：
1. **環帶螺旋掃描**產生初始格位（Layer 0 中心 → Layer N 外擴）
2. **指數距離放大**：`spreadMultiplier = BASE_SPREAD_MULTIPLIER / layer^SPREAD_DECAY = 25 / layer^0.9`
3. **五力導向微調**：庫侖斥力 + 虎克引力 + 重力 + 碰撞解析 + 邊界斥力

**獨特性**：
- 結合離散格位（防重疊）與連續力場（調美觀）的**混合佈局策略**
- 指數衰減確保近中心節點充分展開、遠端節點適度收斂
- 適應 30-50+ 節點規模而不致視覺混亂

#### 🔺 創新三：三層漸進式資訊揭露互動系統

**技術內容**：
- **Level 1**（預設）：僅顯示彩色動畫圓點與連線，零文字標籤
- **Level 2**（懸停）：浮動工具提示 + 聚焦連線增粗 + 其餘暗淡至 15% 透明度
- **Level 3**（點擊）：持續標籤 + 側邊欄雙向同步 + 焦點模式可隱藏其他連線

**獨特性**：
- 「以暗淡他者來突顯目標」技術比傳統高亮更有效（保持全貌上下文）
- 圖形與側邊欄的**雙向選取同步**
- 可擴展至任意連線數量而不犧牲可讀性

#### 其他重要創新

| 創新項目 | 技術要點 |
|---------|---------|
| **封包粒子三階段生命週期** | Spawn 光暈擴散 → Travel 折線追蹤 → Arrive 螺旋吸收，每階段獨立視覺特效 |
| **洪泛攻擊來源端口多樣性偵測** | `unique_ports/total_packets > 0.8` 識別洪泛模式，結合旗標比例分類 6 種攻擊 |
| **複合異常評分演算法** | RST 比例(30 分) + 握手完成率(25 分) + 無資料拆線率(25 分) + 連線速率(20 分) + URG-PSH-FIN(30 分) 等加權歸一化至 0-100 |
| **雙向連線正規化** | `tuple(sorted([...]))` 確保 A→B 與 B→A 合併為單一連線，同時保留方向性動畫 |
| **遠景/近景雙模式自動切換** | 遠景聚合（對數線寬）、近景展開（封包動畫），攻擊流量自動切換為洪泛粒子系統 |
| **折線累計距離插值** | `pointOnPolyline()` 沿多段折線以均勻速度移動圓點，而非傳統直線插值 |

---

### 6. 自行設計的演算法與獨特資料處理流程

#### 演算法 A：TCP 三向握手有狀態偵測

```
輸入：排序封包序列
資料結構：handshakes = { client_key(5-tuple) → {syn_time, syn_ack_time, ack_time} }

步驟：
1. 掃描封包，提取 TCP 旗標（位元運算：flags & 0x02 = SYN, flags & 0x10 = ACK）
2. SYN-only → 記錄 handshakes[client_key].syn_time
3. SYN+ACK → 查找 handshakes[reverse_key]（反向 5-tuple），更新 syn_ack_time
4. ACK-only → 查找 handshakes[client_key]，若有 syn_ack_time → 握手完成
5. 輸出：stages[] 含 min(800ms, 實際延遲) 的動畫時間軸

創新點：反向 5-tuple 配對 + 最低動畫持續時間機制
時間複雜度：O(n)，空間複雜度：O(c) 其中 c = 並行連線數
```

#### 演算法 B：洪泛攻擊來源端口多樣性分析

```
輸入：TCP 封包序列
資料結構：flood_groups = { (src_ip, dst_ip, dst_port) → {ports: Set, packets: [], flags: Counter} }

步驟：
1. 忽略來源端口，以 (src_ip, dst_ip, dst_port) 分組
2. 統計每組的：
   - unique_ports = 不重複來源端口數量
   - total_packets = 總封包數
   - flags = {SYN: n, FIN: n, PSH: n, URG: n, RST: n}
3. 洪泛判斷：total_packets > 50 AND unique_ports > 20 AND unique_ports/total > 0.8
4. 攻擊分類（優先序）：
   a. URG+PSH+FIN 比例均 > 0.5 → urg-psh-fin-flood
   b. PSH 比例 > 0.6 → psh-flood
   c. SYN 比例 > 0.8 → syn-flood
   d. FIN 比例 > 0.8 → fin-flood
   e. 其他 → generic-tcp-flood

創新點：以端口多樣性而非單純封包量判斷洪泛
時間複雜度：O(n)
```

#### 演算法 C：格位指數擴散佈局

```
輸入：節點列表、畫布尺寸
常數：GRID_SIZE=1000, GRID_SPACING=60, BASE_SPREAD=25, DECAY=0.9

步驟：
1. generateGridPositions()：
   - Layer 0：中心 (500, 500)
   - Layer 1-N：環帶掃描（上→右→下→左），每圈 8*layer 個格位
   - 備援：極座標散佈（angle = 2π*i/count）

2. applyGridSpread()：
   - offset = (gridPos - center) / spacing → 格位偏移
   - layer = max(|offsetX|, |offsetY|) → 契比雪夫距離
   - multiplier = 25 / layer^0.9 → 指數擴散因子
   - newPos = center + offset * spacing * multiplier → 擴散座標

3. 五力導向模擬（requestAnimationFrame 循環）：
   - 庫侖斥力：F = k / d²（節點間）
   - 虎克引力：F = k * (d - target)（連線間）
   - 重力：F = k * d（向中心）
   - 碰撞解析：d < MIN_DISTANCE → 強制排斥
   - 邊界斥力：d_edge < threshold → 推回
   - 速度積分 + 阻尼（0.85）

創新點：離散格位 + 連續力場的混合策略；指數衰減的距離放大
```

#### 演算法 D：複合異常評分

```
輸入：封包統計指標
輸出：anomaly_score (0-100)

公式：
score = 0
+ min(30, rst_ratio * 30)                       // RST 比例貢獻 (最高 30)
+ min(25, (1 - handshake_completion_rate) * 25)  // 握手失敗率 (最高 25)
+ min(25, teardown_without_data_rate * 25)       // 無資料拆線率 (最高 25)
+ min(20, connections_per_second / 5)            // 連線速率 (最高 20)
+ min(30, urg_psh_fin_ratio * 100)               // URG-PSH-FIN (最高 30)
+ min(15, (urg_ratio - 0.2) * 50)               // URG 比例 (最高 15)
+ min(25, (psh_ratio - 0.5) * 50)               // PSH 洪泛 (最高 25)

最終 score = min(100, score)

創新點：多維度加權歸一化，各指標有明確上限，防止單一指標壟斷
```

#### 演算法 E：折線累計距離插值

```
輸入：polyline = [{x,y}, ...], progress ∈ [0,1]
輸出：{x, y} 精確位置

步驟：
1. 計算 totalLength = Σ √[(x_i+1 - x_i)² + (y_i+1 - y_i)²]
2. targetDist = progress * totalLength
3. 逐段累加距離：
   for i = 0 to segments:
     cumulative += segmentLength[i]
     if cumulative >= targetDist:
       remaining = targetDist - (cumulative - segmentLength[i])
       t = remaining / segmentLength[i]
       return lerp(points[i], points[i+1], t)

創新點：非均勻折線上的均勻速度移動，不受線段長短比例影響
```

#### 獨特資料處理流程

```
PCAP 原始封包
    ↓ [Scapy rdpcap]
記憶體封包列表 (self.packets[])
    ↓ [六大分析模組]
    ├→ 統計分析 → 協定/IP/端口分布
    ├→ 封包遺失 → 重傳+序號間隙
    ├→ 延遲分析 → ICMP RTT + TCP 握手延遲 + 封包間隔
    ├→ 攻擊偵測 → 分類+評分
    ├→ 拓撲建構 → 三層心智圖
    └→ 時間軸產生 → protocolType 標記的多階段結構
    ↓ [JSON 序列化]
四份結構化 JSON 檔案
    ↓ [API 或靜態備援]
ProtocolAnimationController 狀態機消費
    ↓ [requestAnimationFrame 驅動]
SVG 動態渲染（格位佈局 + 折線動畫 + 漸進揭露）
```

---

### 7. 與市面類似工具的差異比較

| 功能面向 | **WireMap** | **Wireshark** | **Nmap** | **Zabbix** | **ntopng** |
|---------|-----------|-------------|---------|-----------|-----------|
| **核心定位** | 封包分析 + 互動式協定動畫視覺化 | 封包分析器（靜態列表） | 網路掃描器 | 基礎設施監控 | 流量分析 |
| **PCAP 分析** | ✅ 完整分析 + 自動分類 | ✅ 業界標準 | ❌ 非設計目標 | ❌ 非設計目標 | ⚠️ 有限支援 |
| **協定動畫** | ✅ 11 種協定狀態機動畫 | ❌ 僅靜態序列圖 | ❌ 無 | ❌ 無 | ❌ 無 |
| **網路拓撲視覺化** | ✅ 動態力導向圖 + 格位擴散 | ❌ 無拓撲圖 | ⚠️ 簡易拓撲 | ✅ 靜態地圖 | ⚠️ 流量矩陣 |
| **漸進式資訊揭露** | ✅ 三層互動系統 | ❌ 全部資訊一次呈現 | ❌ 無 | ❌ 傳統儀表板 | ❌ 傳統儀表板 |
| **攻擊偵測與分類** | ✅ 6 種攻擊型態 + 異常評分 | ⚠️ 手動分析 | ⚠️ 掃描偵測 | ❌ 需外掛 | ⚠️ 異常偵測 |
| **攻擊視覺化** | ✅ 洪泛粒子系統 + 時間桶分析 | ❌ 無 | ❌ 無 | ❌ 無 | ❌ 無 |
| **封包動態播放** | ✅ 暫停/播放/焦點模式/速度控制 | ❌ 靜態瀏覽 | N/A | N/A | ❌ 僅圖表 |
| **互動式拖曳** | ✅ 節點拖曳 + 平移縮放 + 慣性 | ❌ 表格介面 | ❌ 文字介面 | ⚠️ 有限拖曳 | ❌ 固定版面 |
| **Web 存取** | ✅ React SPA，無需安裝 | ❌ 需安裝桌面軟體 | ❌ 命令列工具 | ✅ Web UI | ✅ Web UI |
| **學習友善度** | ✅ 動畫教學模式 + 協定示範 | ❌ 專業門檻高 | ❌ 專業門檻高 | ❌ 監控導向 | ❌ 分析導向 |
| **多使用者支援** | ✅ UUID 會話隔離 | ❌ 單機軟體 | ❌ 單機軟體 | ✅ 帳號系統 | ✅ 帳號系統 |
| **離線備援** | ✅ 靜態 JSON 自動備援 | N/A | N/A | ❌ 需伺服器 | ❌ 需伺服器 |

**關鍵差異總結**：

1. **Wireshark 的差距**：Wireshark 提供最深度的封包分析，但完全缺乏動態視覺化能力。WireMap 不取代 Wireshark 的分析深度，而是將分析結果轉化為**可互動的動態視覺化體驗**。

2. **Nmap 的差距**：Nmap 專注於網路探索與安全審計，不處理歷史封包分析或視覺化。

3. **Zabbix/ntopng 的差距**：這些工具專注於即時監控與統計圖表，缺乏**封包層級的協定動畫**與**互動式拓撲探索**。

4. **WireMap 的獨特定位**：唯一將 PCAP 深度分析、協定狀態機動畫、力導向拓撲圖、漸進式資訊揭露、攻擊偵測視覺化整合於單一 Web 應用的工具。

---

## 三、應用與商業化

### 8. 目標使用場景與對象

| 使用場景 | 目標對象 | 使用方式 |
|---------|---------|---------|
| **資安教育與培訓** | 大專院校資訊/資安系所學生、資安培訓機構學員 | 透過協定動畫直觀理解 TCP/IP 協定運作、攻擊手法視覺化（SYN Flood、Port Scan 等） |
| **網路管理與故障排除** | 企業 IT 部門網管人員、系統管理員 | 上傳問題時段 PCAP 檔案，快速識別逾時、封包遺失、異常連線模式 |
| **資安事件分析** | SOC (Security Operations Center) 分析師、CSIRT 團隊 | 分析攻擊封包檔，識別攻擊型態（6 種分類）、評估威脅嚴重程度（異常評分） |
| **CTF 競賽與資安研究** | CTF 參賽者、資安研究人員 | 快速分析比賽提供的 PCAP 檔案，視覺化異常流量模式 |
| **課堂教學示範** | 網路概論/資安課程教師 | 使用協定示範動畫（TCP Handshake Demo、DNS Demo 等）進行教學展示 |
| **企業安全評估** | 滲透測試團隊、資安顧問 | 分析測試結果 PCAP，產生視覺化報告呈現給非技術利害關係人 |
| **網路效能優化** | 效能工程師、DevOps 團隊 | 分析延遲指標（ICMP RTT、TCP 握手延遲）、識別效能瓶頸 |

### 9. 能解決的現有工具不足之處

| 問題 | 現有工具的不足 | WireMap 的解決方案 |
|------|--------------|------------------|
| **封包分析的認知門檻過高** | Wireshark 呈現數千行封包列表，初學者需數週才能理解 TCP 三向握手的實際運作 | 動畫視覺化將抽象協定轉為直觀可見的 SYN → SYN-ACK → ACK 動態流程 |
| **無法直觀呈現攻擊行為** | 傳統工具需手動過濾封包、計算統計量才能判斷是否存在攻擊 | 自動偵測 6 種攻擊型態 + 0-100 異常評分 + 洪泛粒子系統即時呈現攻擊強度 |
| **大量連線的視覺混亂** | 現有網路視覺化工具在 30+ 連線時資訊過載 | 三層漸進式揭露 + 遠景/近景雙模式 + 焦點模式，按需顯示資訊 |
| **靜態分析缺乏時間維度** | 傳統工具以統計圖表呈現結果，無法感受封包在時間軸上的流動 | requestAnimationFrame 驅動的即時動畫 + 暫停/播放/速度控制 + 時間桶分析 |
| **從分析到視覺化的斷層** | 使用者需在不同工具間切換（Wireshark 分析 → Excel 統計 → 繪圖工具視覺化） | 端到端整合：PCAP 上傳 → 自動分析 → 即時視覺化，單一 Web 介面完成 |
| **無法向非技術人員解釋** | 資安分析師難以向管理層解釋封包層級的攻擊行為 | 視覺化呈現讓非技術人員也能理解攻擊模式和嚴重程度 |
| **教學工具與實際工具脫節** | 教科書的協定圖解是靜態的，與實際封包行為脫節 | 直接分析真實 PCAP 並動態呈現，理論與實務零落差 |

---

## 四、開發背景

### 10. 研發計畫與經費來源

- 此研發成果**非來自特定計畫**，為自主研發。
- **未接受** NSTC（國家科學及技術委員會）或任何政府機關經費補助。
- 無企業合作或其他外部經費來源。

### 11. 指導教授資訊

- **指導教授**：林暐庭
- **所屬系所**：資訊工程系
- **學校名稱**：國立高雄科技大學

### 12. 共同創作人

共同創作人共 **2 位**：

| 創作人 | 貢獻比例 | 主要貢獻 |
|--------|---------|---------|
| 學生（主要開發者） | 75% | 系統架構設計、核心封包分析引擎（NetworkAnalyzer）開發、前端視覺化元件（MindMap / ProtocolAnimationController）實作、演算法設計（格位擴散佈局、洪泛偵測、異常評分）、協定動畫狀態機、REST API 開發、全端整合 |
| 林暐庭（指導教授） | 25% | 研究方向指導、技術方案審核、創新性評估、學術指導 |

---

## 附錄

### A. 技術術語表

| 術語 | 說明 |
|------|------|
| PCAP | Packet Capture，封包擷取檔案格式 |
| Scapy | Python 封包操作函式庫 |
| protocolType | WireMap 自創的協定分類欄位，橋接後端分析與前端動畫 |
| 三向握手 | TCP Three-way Handshake (SYN → SYN-ACK → ACK) |
| 洪泛攻擊 | Flood Attack，以大量封包癱瘓目標的攻擊手法 |
| 異常評分 | Anomaly Score，0-100 的威脅程度量化指標 |
| 格位擴散 | Grid Spread，WireMap 自創的佈局演算法 |
| 漸進式揭露 | Progressive Disclosure，依互動深度逐步顯示資訊 |
| 狀態機 | State Machine，管理動畫階段轉移的運算模型 |
| 折線插值 | Polyline Interpolation，沿多段線段均勻移動的方法 |

### B. 原始碼結構索引

```
network_img/
├── network_analyzer.py          # 核心封包分析引擎 (1,843 行)
├── analysis_server.py           # FastAPI REST API 伺服器 (830 行)
├── requirements.txt             # Python 依賴
├── package.json                 # Node.js 依賴
├── vite.config.js              # Vite 建構設定 (含 API 代理)
├── index.html                  # HTML 入口
├── src/
│   ├── main.jsx                # React 入口
│   ├── App.jsx                 # 導覽外殼 (136 行)
│   ├── MindMap.jsx             # 核心視覺化元件 (1,675 行)
│   ├── lib/
│   │   ├── ProtocolAnimationController.js  # 動畫狀態機 (371 行)
│   │   └── ProtocolStates.js               # 11 種協定定義 (500+ 行)
│   ├── components/
│   │   ├── TcpHandshakeDemo.jsx    # TCP 握手教學動畫
│   │   ├── TcpTeardownDemo.jsx     # TCP 揮手教學動畫
│   │   ├── HttpRequestDemo.jsx     # HTTP 請求教學動畫
│   │   ├── DnsQueryDemo.jsx        # DNS 查詢教學動畫
│   │   ├── TimeoutDemo.jsx         # 逾時教學動畫
│   │   ├── UdpTransferDemo.jsx     # UDP 傳輸教學動畫
│   │   └── TimelineControl.jsx     # 播放控制元件
│   └── __tests__/              # 測試檔案
└── public/
    └── data/                   # 靜態 JSON 備援 + 會話資料
```

### C. 可專利請求項彙總

以下為建議的專利請求項（Claims）方向：

1. **一種網路協定動畫映射方法**：透過 protocolType 欄位將封包分析結果自動對應至多階段狀態機動畫，包含最低動畫持續時間調整機制。

2. **一種網路拓撲格位指數擴散佈局方法**：結合環帶螺旋掃描格位產生、指數距離放大（BASE_SPREAD / layer^DECAY）、及五力導向微調的混合佈局演算法。

3. **一種網路視覺化的漸進式資訊揭露系統**：三層互動模型（乾淨預設 → 懸停暗淡聚焦 → 點擊選取同步），包含圖形與側邊欄的雙向選取同步機制。

4. **一種基於來源端口多樣性的洪泛攻擊偵測方法**：以 `unique_ports / total_packets` 比例識別洪泛模式，結合 TCP 旗標比例分類多種攻擊型態。

5. **一種網路封包的粒子生命週期視覺化方法**：三階段（Spawn 光暈 → Travel 折線追蹤 → Arrive 螺旋吸收）的封包動畫系統。

6. **一種折線累計距離插值動畫方法**：在非均勻線段構成的折線上實現均勻速度的動畫移動。

7. **一種複合式網路異常評分方法**：多維度加權指標（RST 比例、握手完成率、連線速率等）歸一化至 0-100 分的威脅量化系統。

8. **一種網路分析系統的雙模式視圖切換方法**：遠景聚合模式（對數線寬連線）與近景詳細模式（封包動畫），結合攻擊流量自動切換為洪泛粒子系統。

---

*本文件產生日期：2026-02-23*
*基於 WireMap (network_img) 原始碼 v0.0.0 完整分析*
