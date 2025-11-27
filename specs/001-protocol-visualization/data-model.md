# Data Model: 網路通訊協議圖形化展示系統

**Date**: 2025-11-16
**Feature**: 001-protocol-visualization
**Purpose**: 定義系統中的資料結構、實體關係與驗證規則

## 概述

本系統採用**純檔案系統架構**，無資料庫。所有資料以 JSON 格式儲存於檔案系統中，並透過會話 ID 進行命名空間隔離。

## 核心實體

### 1. Session（會話）

**用途**: 追蹤用戶會話，提供資料隔離與自動清理機制

**實作層級**: FastAPI SessionMiddleware (Cookie-based)

**屬性**:

| 欄位 | 類型 | 必填 | 說明 | 驗證規則 |
|------|------|------|------|----------|
| `session_id` | UUID | ✓ | 會話唯一識別碼 | UUID v4 格式 |
| `created_at` | float | ✓ | 會話建立時間（Unix timestamp） | > 0 |
| `last_accessed` | float | ✓ | 最後存取時間（Unix timestamp） | > created_at |
| `max_age` | int | ✓ | 會話最大存活時間（秒） | 預設 14400（4小時） |

**生命週期**:
1. **建立**: 用戶首次訪問時由 SessionMiddleware 自動建立
2. **更新**: 每次 API 請求更新 `last_accessed`
3. **過期**: 當 `current_time - last_accessed > max_age` 時過期
4. **清理**: 過期會話由 APScheduler 每小時掃描並刪除

**檔案系統映射**:
```
public/data/<session_id>/
├── [會話專屬檔案]
```

**範例**:
```python
# Cookie 內容（已簽章，不可偽造）
{
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": 1700123400.123,
    "last_accessed": 1700123500.456
}
```

---

### 2. Packet（封包）

**用途**: 網路捕獲檔案（PCAP/PCAPNG）中的單一資料單元

**實作層級**: Scapy Packet 物件（運行時記憶體）

**屬性**:

| 欄位 | 類型 | 必填 | 說明 | 驗證規則 |
|------|------|------|------|----------|
| `timestamp` | float | ✓ | 封包時間戳（epoch秒） | > 0 |
| `src_ip` | str | ✓ | 來源 IP 位址 | IPv4/IPv6 格式 |
| `src_port` | int | ○ | 來源埠號 | 0-65535（TCP/UDP） |
| `dst_ip` | str | ✓ | 目的 IP 位址 | IPv4/IPv6 格式 |
| `dst_port` | int | ○ | 目的埠號 | 0-65535（TCP/UDP） |
| `protocol` | str | ✓ | 協定類型 | TCP/UDP/ICMP/ARP/其他 |
| `length` | int | ✓ | 封包長度（bytes） | > 0 |
| `payload` | bytes | ○ | 封包負載資料 | 二進位資料 |

**生命週期**:
1. **載入**: `NetworkAnalyzer.load_packets()` 從 PCAP 檔案讀取
2. **分析**: 提取協定、IP、埠等資訊用於時間軸生成
3. **釋放**: 分析完成後不持久化，僅保留統計結果

**驗證規則**:
- `src_ip` 與 `dst_ip` 必須是有效的 IP 位址（使用 `ipaddress` 模組驗證）
- `src_port` 與 `dst_port` 對於 TCP/UDP 協定必須存在
- `timestamp` 必須遞增（同一 PCAP 檔案內）

**範例**:
```python
# Scapy Packet 物件
packet = IP(src="192.168.1.100", dst="8.8.8.8") / TCP(sport=54321, dport=443)
```

---

### 3. ProtocolTimeline（協定時間軸）

**用途**: 從封包序列中提取的邏輯連線，描述協定互動流程

**實作層級**: JSON 檔案（`protocol_timeline_sample.json`）

**屬性**:

| 欄位 | 類型 | 必填 | 說明 | 驗證規則 |
|------|------|------|------|----------|
| `id` | str | ✓ | 唯一識別碼 | `{protocol}-{src_ip}-{src_port}-{dst_ip}-{dst_port}-{index}` |
| `protocolType` | str | ✓ | 協定動畫類型 | `tcp-handshake` / `dns-query` / `http-request` / `https-request` / `udp-transfer` / `timeout` |
| `protocol` | str | ✓ | 傳輸層協定 | `tcp` / `udp` |
| `startEpochMs` | int | ✓ | 開始時間（epoch 毫秒） | > 0 |
| `endEpochMs` | int | ✓ | 結束時間（epoch 毫秒） | >= startEpochMs |
| `stages` | Array\<Stage\> | ✓ | 階段序列 | 至少 1 個階段 |
| `metrics` | Object | ✓ | 度量資料 | 包含 RTT、封包計數等 |

**子結構 - Stage（階段）**:

| 欄位 | 類型 | 必填 | 說明 | 驗證規則 |
|------|------|------|------|----------|
| `key` | str | ✓ | 階段唯一鍵值 | `syn` / `syn-ack` / `ack` / `query` / `response` 等 |
| `label` | str | ✓ | 階段顯示名稱 | 繁體中文或英文 |
| `direction` | str | ✓ | 封包方向 | `forward` / `backward` / `both` / `wait` / `none` |
| `durationMs` | int | ✓ | 階段持續時間（毫秒） | >= 600（FR-008 最小持續時間） |
| `packetRefs` | Array\<int\> | ✓ | 封包索引參考 | 空陣列表示無封包 |

**生命週期**:
1. **生成**: `NetworkAnalyzer.generate_protocol_timelines()` 分析封包序列
2. **儲存**: 輸出至 `public/data/<session_id>/protocol_timeline_sample.json`
3. **載入**: 前端透過 `/api/timelines` 或靜態回退載入
4. **清理**: 隨會話過期一起刪除

**驗證規則**:
- `id` 必須唯一（使用索引後綴避免重複，FR-037）
- `stages` 陣列不可為空
- 每個 `stage.durationMs` 必須符合最小持續時間（FR-008）
- `endEpochMs - startEpochMs` 應等於所有 `stage.durationMs` 的總和

**範例**:
```json
{
  "id": "tcp-192.168.1.100-54321-8.8.8.8-443-0",
  "protocolType": "tcp-handshake",
  "protocol": "tcp",
  "startEpochMs": 1700123400000,
  "endEpochMs": 1700123402400,
  "stages": [
    {
      "key": "syn",
      "label": "SYN Sent",
      "direction": "forward",
      "durationMs": 800,
      "packetRefs": [0]
    },
    {
      "key": "syn-ack",
      "label": "SYN-ACK 收到",
      "direction": "backward",
      "durationMs": 800,
      "packetRefs": [1]
    },
    {
      "key": "ack",
      "label": "ACK 確認",
      "direction": "forward",
      "durationMs": 800,
      "packetRefs": [2]
    }
  ],
  "metrics": {
    "rttMs": 12,
    "packetCount": 3
  }
}
```

---

### 4. AnimationStage（動畫階段）

**用途**: 協定時間軸中的單一步驟，定義動畫行為

**實作層級**: JavaScript 物件（`ProtocolStates.js`）

**屬性**:

| 欄位 | 類型 | 必填 | 說明 | 驗證規則 |
|------|------|------|------|----------|
| `key` | str | ✓ | 階段鍵值 | 與 ProtocolTimeline.stages[].key 對應 |
| `label` | str | ✓ | 階段標籤 | 顯示在動畫圓點上方 |
| `direction` | str | ✓ | 動畫方向 | `forward` / `backward` / `both` / `wait` / `none` |
| `durationMs` | int | ✓ | 階段持續時間 | > 0 |
| `color` | str | ○ | 階段顏色 | CSS 顏色值（hex/rgb） |

**生命週期**:
1. **定義**: 在 `src/lib/ProtocolStates.js` 中預先定義所有協定的階段
2. **載入**: 前端 `ProtocolAnimationController` 建立時載入
3. **渲染**: `requestAnimationFrame` 循環中根據進度渲染動畫

**驗證規則**:
- `key` 必須在協定狀態中唯一
- `direction` 必須是有效的方向常數
- `color` 如提供必須是有效的 CSS 顏色

**範例**:
```javascript
// src/lib/ProtocolStates.js
export const PROTOCOL_STATES = {
  'tcp-handshake': {
    stages: [
      { key: 'syn', label: 'SYN Sent', direction: 'forward', durationMs: 800, color: '#3b82f6' },
      { key: 'syn-ack', label: 'SYN-ACK 收到', direction: 'backward', durationMs: 800, color: '#10b981' },
      { key: 'ack', label: 'ACK 確認', direction: 'forward', durationMs: 800, color: '#06b6d4' }
    ],
    totalDuration: 2400,
    finalState: 'completed'
  }
}
```

---

### 5. AnimationController（動畫控制器）

**用途**: 管理單一時間軸的動畫狀態與進度

**實作層級**: JavaScript Class（`ProtocolAnimationController.js`）

**屬性**:

| 欄位 | 類型 | 必填 | 說明 | 驗證規則 |
|------|------|------|------|----------|
| `timeline` | ProtocolTimeline | ✓ | 時間軸資料 | 必須是有效的時間軸物件 |
| `progress` | float | ✓ | 當前進度 | 0.0 到 1.0 |
| `currentStage` | int | ✓ | 當前階段索引 | 0 到 stages.length-1 |
| `playbackSpeed` | float | ✓ | 播放速度倍率 | > 0，預設 1.0 |
| `finalState` | str | ✓ | 最終狀態 | `completed` / `failed` / `timeout` |

**方法**:

| 方法 | 參數 | 返回 | 說明 |
|------|------|------|------|
| `advance(deltaMs)` | `deltaMs: number` | `void` | 推進動畫 delta 毫秒 |
| `reset()` | - | `void` | 重置到起始狀態 |
| `setPlaybackSpeed(speed)` | `speed: number` | `void` | 設定播放速度 |
| `seek(progress)` | `progress: number` | `void` | 跳轉到特定進度（0-1） |
| `getRenderableState()` | - | `Object` | 取得當前可渲染狀態 |

**生命週期**:
1. **建立**: 前端載入時間軸後為每條連線建立控制器
2. **更新**: 每幀 `requestAnimationFrame` 呼叫 `advance(delta)`
3. **暫停**: 用戶點擊暫停時停止呼叫 `advance()`
4. **銷毀**: 切換 PCAP 檔案或焦點模式時清理

**驗證規則**:
- `progress` 必須在 [0.0, 1.0] 範圍內
- `playbackSpeed` 必須 > 0
- `currentStage` 必須是有效的階段索引

**範例**:
```javascript
const controller = new ProtocolAnimationController(timeline)
controller.setPlaybackSpeed(1.5)  // 1.5x 速度

// 每幀更新
requestAnimationFrame((time) => {
  const delta = time - lastTime
  controller.advance(delta)
  const state = controller.getRenderableState()
  renderAnimation(state)
})
```

---

### 6. NetworkNode（網路節點）

**用途**: 拓撲圖中的 IP 位址節點

**實作層級**: JavaScript 物件（`MindMap.jsx`）

**屬性**:

| 欄位 | 類型 | 必填 | 說明 | 驗證規則 |
|------|------|------|------|----------|
| `id` | str | ✓ | 節點 ID（IP 位址） | IPv4/IPv6 格式 |
| `label` | str | ✓ | 顯示名稱 | 通常與 id 相同 |
| `x` | float | ✓ | 畫布 X 座標 | 在 viewBox 範圍內 |
| `y` | float | ✓ | 畫布 Y 座標 | 在 viewBox 範圍內 |
| `vx` | float | ○ | X 方向速度 | 力導向模擬用 |
| `vy` | float | ○ | Y 方向速度 | 力導向模擬用 |
| `isCenter` | bool | ✓ | 是否為中心節點 | 連線數最多的節點 |
| `protocols` | Array\<str\> | ✓ | 參與的協定類型 | 例如 `['tcp', 'http']` |

**生命週期**:
1. **建立**: `buildNodeLayout(timelines)` 分析時間軸生成節點
2. **初始化**: 隨機分布於畫布中央附近（協定分艙極座標播種）
3. **模擬**: 力導向圖模擬調整位置直到穩定
4. **互動**: 用戶可拖曳調整位置
5. **銷毀**: 切換 PCAP 檔案時清理

**驗證規則**:
- `x` 和 `y` 必須是有限數值（`isFinite(x) && isFinite(y)`，FR-036）
- 檢測到 NaN 時自動重置到畫布中心（FR-036）
- `id` 必須是唯一的 IP 位址

**範例**:
```javascript
{
  id: "192.168.1.100",
  label: "192.168.1.100",
  x: 500,
  y: 500,
  vx: 0.5,
  vy: -0.3,
  isCenter: false,
  protocols: ["tcp", "http"]
}
```

---

### 7. NetworkConnection（網路連線）

**用途**: 拓撲圖中的連線線段，對應協定時間軸

**實作層級**: JavaScript 物件（`MindMap.jsx`）

**屬性**:

| 欄位 | 類型 | 必填 | 說明 | 驗證規則 |
|------|------|------|------|----------|
| `id` | str | ✓ | 連線唯一識別碼 | `{timeline.id}-{index}` 格式（FR-037） |
| `originalId` | str | ✓ | 原始時間軸 ID | 保留供參考 |
| `sourceId` | str | ✓ | 來源節點 ID（IP） | 必須存在於節點清單 |
| `targetId` | str | ✓ | 目的節點 ID（IP） | 必須存在於節點清單 |
| `protocolType` | str | ✓ | 協定類型 | 與 ProtocolTimeline.protocolType 對應 |
| `timelineId` | str | ✓ | 對應的時間軸 ID | 指向 ProtocolTimeline.id |

**生命週期**:
1. **建立**: `buildConnections(timelines)` 從時間軸生成連線
2. **渲染**: SVG `<path>` 元素繪製連線
3. **動畫**: 關聯的 `AnimationController` 驅動圓點移動
4. **互動**: 懸停高亮、點擊選中、焦點模式
5. **銷毀**: 切換 PCAP 檔案時清理

**驗證規則**:
- `id` 必須唯一（使用索引後綴，FR-037）
- `sourceId` 和 `targetId` 必須存在於節點清單
- `timelineId` 必須對應到有效的時間軸

**範例**:
```javascript
{
  id: "tcp-192.168.1.100-54321-8.8.8.8-443-0",
  originalId: "tcp-192.168.1.100-54321-8.8.8.8-443",
  sourceId: "192.168.1.100",
  targetId: "8.8.8.8",
  protocolType: "tcp-handshake",
  timelineId: "tcp-192.168.1.100-54321-8.8.8.8-443-0"
}
```

---

## 資料流程

### 1. PCAP 上傳與解析流程

```
用戶上傳 PCAP
    ↓
POST /api/analyze (需會話驗證)
    ↓
儲存至 public/data/<session_id>/uploaded.pcap
    ↓
NetworkAnalyzer.load_packets() → Packet[]
    ↓
NetworkAnalyzer.generate_protocol_timelines() → ProtocolTimeline[]
    ↓
儲存至 public/data/<session_id>/protocol_timeline_sample.json
    ↓
返回 200 OK
```

### 2. 前端動畫渲染流程

```
GET /api/timelines (需會話驗證)
    ↓
載入 ProtocolTimeline[]
    ↓
buildNodeLayout() → NetworkNode[]
    ↓
buildConnections() → NetworkConnection[]
    ↓
為每個 Connection 建立 AnimationController
    ↓
requestAnimationFrame 循環
    ↓
controller.advance(delta) → getRenderableState()
    ↓
SVG 渲染動畫圓點與標籤
```

### 3. 會話過期清理流程

```
APScheduler 每小時觸發 cleanup_expired_sessions()
    ↓
掃描 public/data/* 所有會話目錄
    ↓
檢查 st_mtime（最後修改時間）
    ↓
如果 current_time - st_mtime > SESSION_MAX_AGE
    ↓
shutil.rmtree(session_dir)
    ↓
日誌記錄清理結果
```

---

## 檔案系統結構

```
public/data/
├── protocol_timeline_sample.json      # 預載示範資料（靜態）
├── network_mind_map.json               # 預載心智圖（靜態）
├── <session_id_1>/                     # 會話 1 的動態資料
│   ├── uploaded.pcap                   # 上傳的 PCAP 檔案
│   ├── network_analysis_results.json   # 完整分析結果
│   ├── protocol_timeline_sample.json   # 協定時間軸
│   └── network_mind_map.json           # 網路拓撲
├── <session_id_2>/                     # 會話 2 的動態資料
│   └── ...
└── <session_id_n>/                     # 會話 N 的動態資料
    └── ...
```

---

## 驗證與錯誤處理

### 資料驗證優先順序

1. **後端輸入驗證** (FastAPI Pydantic models)
2. **業務邏輯驗證** (NetworkAnalyzer)
3. **前端防禦性檢查** (isFinite, null checks)

### 錯誤處理策略

| 錯誤類型 | 處理方式 | 用戶反饋 |
|----------|----------|----------|
| **無效 PCAP 格式** | 返回 400 Bad Request | 「不支援的檔案格式」 |
| **損壞的封包** | 跳過並記錄（FR-013b） | 「檔案包含 X 個無法解析的封包」 |
| **未登入請求** | 返回 401 Unauthorized | 重導向至登入頁面 |
| **會話過期** | 返回 401 Unauthorized | 「會話已過期，請重新登入」 |
| **檔案過大** | 返回 413 Payload Too Large | 「檔案超過 500MB 限制」 |
| **NaN 座標** | 自動重置到畫布中心（FR-036） | 無（自動修復） |

---

**資料模型版本**: 1.0
**最後更新**: 2025-11-16
**下一步**: 生成 API 契約規格（OpenAPI）
