# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Network Protocol Visualization Tool** that combines:
- **Python backend** using Scapy for PCAP packet analysis
- **FastAPI** for serving analysis results via REST API
- **React + Vite frontend** for interactive network traffic visualization

The application analyzes Wireshark capture files (`.pcap`/`.pcapng`) and visualizes network protocols with animated demonstrations of TCP handshakes, DNS queries, HTTP requests, timeouts, and other network behaviors.

## Development Commands

### Backend (Python)

```bash
# Install dependencies (one-time setup)
pip install -r requirements.txt

# Start the FastAPI analysis server
uvicorn analysis_server:app --host 0.0.0.0 --port 8000 --reload

# Run standalone network analyzer on a PCAP file
python network_analyzer.py <path-to-pcap-file>
```

### Frontend (JavaScript/React)

```bash
# Install dependencies (one-time setup)
npm install

# Start Vite dev server (default: http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm preview

# Run linter
npm run lint

# Run tests
npm test
```

## Architecture

### Backend Architecture

**Core Components:**

1. **`network_analyzer.py`** - Main analysis engine
   - `NetworkAnalyzer` class: Loads PCAP files and performs analysis
   - Methods:
     - `load_packets()`: Reads PCAP using Scapy
     - `basic_statistics()`: Protocol distribution, packet sizes, IPs, ports
     - `detect_packet_loss()`: Identifies retransmissions and sequence gaps
     - `analyze_latency()`: Extracts RTT, handshake times, inter-packet delays
     - `generate_protocol_timelines()`: Builds timeline data for frontend animations
       - Calls: `_extract_tcp_handshakes()`, `_extract_udp_transfers()`, `_detect_http_requests()`, `_detect_timeouts()`
       - **Each timeline includes `protocolType` field** (e.g., `tcp-handshake`, `dns-query`, `http-request`, `udp-transfer`, `timeout`)
     - `_extract_tcp_handshakes()`: Detects TCP 3-way handshakes, marks as `protocolType: 'tcp-handshake'`
     - `_extract_udp_transfers()`: Detects UDP transfers, checks port 53 for DNS, marks as `'dns-query'` or `'udp-transfer'`
     - `_detect_http_requests()`: Detects HTTP (port 80) and HTTPS (port 443) sessions, marks as `'http-request'` or `'https-request'`
     - `_detect_timeouts()`: Identifies connections with >3s gaps, marks as `protocolType: 'timeout'`
     - `build_mind_map()`: Creates hierarchical connection graph
     - `save_results()`: Outputs JSON to `public/data/` for frontend consumption

2. **`analysis_server.py`** - FastAPI REST API
   - Endpoints:
     - `GET /api/health` - Health check
     - `GET /api/analysis` - Returns cached analysis results
     - `GET /api/timelines` - Returns protocol timeline data for animations
     - `POST /api/analyze` - Accepts uploaded PCAP file for analysis
   - Saves results to `public/data/` directory for static fallback

**Data Flow:**
```
PCAP Upload → FastAPI → NetworkAnalyzer → JSON Results → public/data/ → React Frontend
```

### Frontend Architecture

**Entry Point:**
- `src/main.jsx` → renders `App.jsx`

**Main Components:**

1. **`App.jsx`** - Navigation shell with view switcher
   - Routes between main app and protocol demo views
   - Provides tab-based navigation UI

2. **`MindMap.jsx`** - Main visualization component
   - Fetches analysis data from `/api/timelines` with fallback to static JSON
   - Renders network topology with animated protocol flows using `ProtocolAnimationController`
   - Includes file upload for new PCAP analysis
   - Uses SVG for node/edge rendering with animated dots
   - **Integrated Animation System**: Each connection creates a `ProtocolAnimationController` instance
     - Animation loop runs via `requestAnimationFrame` updating all controllers with delta time
     - Renders protocol-specific animations (TCP handshake, DNS query, HTTP request, etc.)
     - Displays animated dots moving along connections, stage labels, and progress percentages
     - Supports visual effects: blinking, pulsing, dashed lines, opacity changes

3. **Protocol Demo Components** (in `src/components/`):
   - `TcpHandshakeDemo.jsx` - TCP 3-way handshake animation
   - `TcpTeardownDemo.jsx` - TCP 4-way teardown animation
   - `HttpRequestDemo.jsx` - HTTP request/response flow
   - `DnsQueryDemo.jsx` - DNS query/response
   - `TimeoutDemo.jsx` - Connection timeout visualization
   - `UdpTransferDemo.jsx` - UDP packet transmission
   - `TimelineControl.jsx` - Playback controls (play/pause/speed)

4. **Animation Controller:**
   - `src/lib/ProtocolAnimationController.js` - Core animation engine
     - Manages protocol state progression through stages
     - Handles playback speed, seeking, progress tracking
     - Provides static factory methods for protocol types (e.g., `createTcpHandshake()`)
     - Returns renderable state with dot position, colors, visual effects
   - `src/lib/ProtocolStates.js` - Protocol definitions and color schemes

**Key Patterns:**

- **API + Static Fallback**: Frontend tries `/api/*` endpoints first, falls back to `/data/*.json` files in `public/` if backend is unavailable
- **Animation Loop**: Protocol demos use `requestAnimationFrame` with delta time to drive `ProtocolAnimationController.advance(delta)`
- **Playback Speed**: Controlled via `controller.setPlaybackSpeed(multiplier)` and monitored with `useEffect`

### Data Structures

**Protocol Timeline Format** (used for animations):
```javascript
{
  "sourceFiles": ["capture.pcap"],
  "generatedAt": "2025-10-23T...",
  "timelines": [
    {
      "id": "tcp-192.168.1.1-50000-8.8.8.8-443",
      "protocol": "tcp",
      "protocolType": "tcp-handshake",  // NEW: Specific protocol animation type
      "startEpochMs": 1234567890000,
      "endEpochMs": 1234567891500,
      "stages": [
        {
          "key": "syn",
          "label": "SYN Sent",
          "direction": "forward", // "forward" | "backward" | "both" | "wait" | "none"
          "durationMs": 500,
          "packetRefs": [0]
        },
        // ... more stages
      ],
      "metrics": {
        "rttMs": 12,
        "packetCount": 3
      }
    }
  ]
}
```

**Mind Map Format** (hierarchical connection view):
```javascript
{
  "name": "Network Traffic",
  "meta": { "total_packets": 1000, "protocols": 3 },
  "children": [
    {
      "name": "TCP (800)",
      "protocol": "tcp",
      "packet_count": 800,
      "children": [ /* source IPs */ ]
    }
  ]
}
```

## Configuration

### Vite Proxy Setup (`vite.config.js`)

The dev server proxies `/api` requests to `http://localhost:8000` (FastAPI backend).

**Expected behavior when backend is offline:**
- Browser shows `ERR_ABORTED` or `ECONNREFUSED` for `/api/*` requests
- Frontend automatically falls back to static JSON files in `public/data/`
- UI continues to render without blank pages

**To disable proxy** (frontend-only development):
- Comment out the `server.proxy` section in `vite.config.js`
- Restart dev server

### Environment Variables

- `VITE_ANALYZER_API` - Set to `'true'` to enable API features (used in `MindMap.jsx`)

## Common Development Tasks

### Adding a New Protocol Visualization

1. **Define protocol state** in `src/lib/ProtocolStates.js`:
   ```javascript
   'my-protocol': {
     stages: [
       { key: 'stage1', label: 'Stage 1', direction: 'forward', durationMs: 500, color: '#...' },
       // ...
     ],
     totalDuration: 1500,
     finalState: 'completed'
   }
   ```

2. **Add static factory method** in `ProtocolAnimationController.js`:
   ```javascript
   static createMyProtocol(connectionId, hooks = {}) {
     const timeline = { id: connectionId, protocolType: 'my-protocol', protocol: 'my' }
     return new ProtocolAnimationController(timeline, hooks)
   }
   ```

3. **Create demo component** in `src/components/MyProtocolDemo.jsx`:
   - Use `useRef` to store controller instance
   - Use `requestAnimationFrame` loop to call `controller.advance(delta)`
   - Render using `controller.getRenderableState()`
   - Include `TimelineControl` for playback controls

4. **Add to navigation** in `App.jsx`:
   - Import component
   - Add button to nav
   - Add route in main content

### Analyzing a PCAP File

**Via CLI:**
```bash
python network_analyzer.py path/to/capture.pcap
# Outputs: network_analysis_results.json, network_analysis_report.txt
# Also copies to: public/data/*.json
```

**Via Web UI:**
1. Start both backend and frontend
2. Navigate to main view
3. Click "上傳封包" (Upload Packet) button
4. Select `.pcap` or `.pcapng` file
5. Wait for analysis completion banner
6. Results are saved to `public/data/` and displayed immediately

### Running Tests

**Frontend tests** (Vitest + Testing Library):
```bash
npm test
```

Test files are in `src/__tests__/` and co-located `*.test.js` files.

**Setup:** `src/setupTests.js` configures jsdom environment.

## Important Notes

### Character Encoding

- The codebase contains Chinese (Traditional) UI text and documentation
- `NetworkAnalyzer._safe_print()` handles Unicode encoding issues during console output
- `analysis_server.py` uses temporary ASCII-named files when handling non-ASCII PCAP paths

### Data Persistence

- All analysis results are written to **both** root directory AND `public/data/`
- `public/data/` serves as the static fallback for frontend when API is unavailable
- Files generated:
  - `network_analysis_results.json` - Full analysis
  - `protocol_timeline_sample.json` - Timeline data
  - `network_mind_map.json` - Hierarchical connection graph

### Protocol Colors

Protocol color schemes are defined in:
- `src/MindMap.jsx` (`PROTOCOL_COLORS` constant)
- `src/lib/ProtocolStates.js` (`PROTOCOL_COLOR_MAP`)

Keep these synchronized when adding new protocol types.

### Animation Performance

- Protocol demos use `requestAnimationFrame` with delta time calculation
- Playback speed is controlled centrally via `setPlaybackSpeed()` - do NOT manually multiply delta in render loops
- For optimal performance, limit simultaneous animations and reuse controller instances

## File Organization

```
network_img/
├── network_analyzer.py       # Core PCAP analysis engine
├── analysis_server.py         # FastAPI REST API
├── requirements.txt           # Python dependencies
├── package.json               # Node dependencies & scripts
├── vite.config.js            # Vite config with API proxy
├── index.html                # HTML entry point
├── src/
│   ├── main.jsx              # React entry point
│   ├── App.jsx               # Main navigation shell
│   ├── MindMap.jsx           # Main visualization component
│   ├── lib/
│   │   ├── ProtocolAnimationController.js  # Animation engine
│   │   └── ProtocolStates.js               # Protocol definitions
│   ├── components/           # Protocol demo components
│   └── __tests__/            # Test files
└── public/
    └── data/                 # Static JSON files (API fallback)
```

## Recent Updates

### Protocol Animation Integration (2025-10-23)

**Overview**: Integrated protocol-specific animations from demo components into the main MindMap visualization.

**Backend Changes (`network_analyzer.py`)**:
1. Added `protocolType` field to all timeline entries for precise animation mapping
2. Enhanced protocol detection with new methods:
   - `_detect_http_requests()`: Detects HTTP/HTTPS traffic on ports 80/443
   - `_detect_timeouts()`: Identifies connection timeouts (>3s packet gaps)
3. Updated `_extract_tcp_handshakes()` to mark as `protocolType: 'tcp-handshake'`
4. Updated `_extract_udp_transfers()` to distinguish DNS (port 53) as `'dns-query'` vs generic `'udp-transfer'`
5. **Animation Duration Adjustment**: Set minimum animation durations to ensure visibility
   - TCP handshake: Each stage minimum 800ms (total ~2.4s)
   - UDP/DNS transfer: Minimum 1200ms
   - HTTP/HTTPS request: Stages 600ms / 800ms / 600ms (total ~2s)
   - This prevents real-world fast connections (<10ms) from being invisible in animations

**Frontend Changes (`MindMap.jsx`)**:
- Already integrated with `ProtocolAnimationController` (no changes needed)
- Animation system automatically recognizes and renders protocol types:
  - `tcp-handshake`: 3-stage animation (SYN → SYN-ACK → ACK) with color progression
  - `dns-query`: Query → Resolving → Response with purple coloring
  - `http-request` / `https-request`: Request → Processing → Response with status code colors
  - `udp-transfer`: Continuous forward-only animation with dashed lines
  - `timeout`: Progressively slowing animation with color change (green → yellow → orange → red)

**Testing**:
- Upload a new PCAP file via the web UI to regenerate timelines with `protocolType`
- Observe protocol-specific animations and visual effects in the main network graph
- Check sidebar timeline list for stage labels and progress indicators

### Progressive Information Disclosure (2025-10-23)

**Overview**: Implemented interactive information levels to solve visual crowding when displaying 30-50+ simultaneous protocol connections.

**Problem Solved**:
- Previous implementation showed all protocol labels (HTTPS-REQUEST, TCP-HANDSHAKE, TIMEOUT, etc.) simultaneously
- Label overlap made the graph difficult to read with many connections
- User requirement: Keep all information accessible while improving layout

**Solution - Three Interaction Levels**:

**Level 1: Clean Default View**
- Shows only colored animated dots and connection lines
- No text labels by default
- Color-coded by protocol type (defined in `PROTOCOL_COLORS` constant)
- Provides clean, uncluttered visualization of network topology

**Level 2: Hover Interaction**
- Mouse over any connection reveals:
  - Floating tooltip with protocol type, current stage, and progress percentage
  - Highlighted connection (thicker stroke, larger dot)
  - All other connections dimmed to 15% opacity for focus
- Tooltip follows cursor position
- No permanent changes to the graph

**Level 3: Click Interaction**
- Click any connection to select it (click again to deselect)
- Selected connection shows:
  - Protocol and stage labels directly on the graph
  - Progress percentage with completion indicator
  - Thicker stroke (2.4px) and larger dot (2.8 radius)
  - Persistent highlight even when mouse moves away
- Sidebar list item highlighted with cyan border and ring effect
- Click sidebar item to select/deselect corresponding graph connection
- Both graph and sidebar stay synchronized

**Implementation Details** (`src/MindMap.jsx`):

**State Management** (lines 173-176):
```javascript
const [hoveredConnectionId, setHoveredConnectionId] = useState(null)
const [selectedConnectionId, setSelectedConnectionId] = useState(null)
const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
```

**Connection Rendering** (lines 540-547):
```javascript
const isHovered = hoveredConnectionId === connection.id
const isSelected = selectedConnectionId === connection.id
const shouldShowLabel = isHovered || isSelected
const isDimmed = hoveredConnectionId && !isHovered && !isSelected
const finalOpacity = isDimmed ? opacity * 0.15 : opacity
```

**Event Handlers** (lines 550-563):
```javascript
<g
  onMouseEnter={(e) => {
    setHoveredConnectionId(connection.id)
    setTooltipPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }}
  onMouseLeave={() => setHoveredConnectionId(null)}
  onClick={() => setSelectedConnectionId(
    selectedConnectionId === connection.id ? null : connection.id
  )}
  style={{ cursor: 'pointer' }}
>
```

**Conditional Label Rendering** (lines 605-628):
- Labels only rendered when `shouldShowLabel === true`
- Uses `pointerEvents: 'none'` to prevent tooltip interference

**Floating Tooltip** (lines 665-688):
- Positioned absolutely using client coordinates
- Only shown when hovering (not when selected)
- Dark translucent background with border and shadow

**Sidebar Highlighting** (lines 717-732):
- Selected connections show cyan border with ring effect
- Click handler toggles selection state
- Hover effects on non-selected items

**User Experience Benefits**:
- Default view: Clean, no clutter, easy to see overall network structure
- On-demand details: Information appears only when needed
- Focus by dimming: "Highlight by dimming others" technique reduces visual noise
- Bidirectional interaction: Click graph OR sidebar to select connections
- Scalable: Works with 30-50 connections, ready for larger datasets

**Technical Pattern**:
- State-driven conditional rendering (React pattern)
- Opacity manipulation for focus management
- Synchronized state between graph visualization and sidebar list
- Absolute positioning for floating UI elements (tooltip)

### Moving Labels on Animated Dots (2025-10-23)

**Overview**: Added text labels that follow animated dots to provide real-time context about what each moving packet represents.

**Problem Solved**:
- Previously, animated dots moved along connections without any text description
- Users couldn't easily understand what each moving dot represented (protocol type, current stage)
- Required hovering or clicking to see connection details

**Solution - Always-Visible Moving Labels**:

**Implementation** (`src/MindMap.jsx` lines 604-624):
- Added two `<text>` elements positioned relative to each animated dot:
  1. **Protocol label** (line 605-614): Shows protocol type in uppercase (e.g., "TCP-HANDSHAKE", "HTTPS-REQUEST", "DNS-QUERY")
     - Position: 3.5 units above dot center (`y={dotY - 3.5}`)
     - Style: White text, 2.2px font, semibold weight
     - Opacity: Matches connection opacity (respects dimming during hover)

  2. **Stage label** (line 615-624): Shows current stage description (e.g., "SYN Sent", "Request", "等待回應")
     - Position: 1.8 units above dot center (`y={dotY - 1.8}`)
     - Style: Cyan text, 1.8px font
     - Opacity: 90% of connection opacity for subtle hierarchy

**Key Features**:
- **Synchronized movement**: Text labels use same `dotX` and `dotY` coordinates as animated dots
- **Always visible**: Unlike connection labels (which only show on hover/click), moving labels are always displayed
- **Respects interaction states**: Labels dim along with their connections when another connection is hovered
- **Pointer events disabled**: `style={{ pointerEvents: 'none' }}` prevents labels from interfering with click/hover interactions
- **Text anchoring**: `textAnchor="middle"` centers text horizontally above each dot

**Visual Hierarchy**:
```
┌─────────────────┐  ← Protocol Type (white, larger, semibold)
│  TCP-HANDSHAKE  │
├─────────────────┤  ← Stage Label (cyan, smaller)
│    SYN Sent     │
└────────●────────┘  ← Animated Dot
```

**Example Protocol Labels**:
- `TCP-HANDSHAKE` → "SYN Sent" / "SYN-ACK 收到" / "ACK 確認"
- `HTTPS-REQUEST` → "Request" / "Processing" / "Response"
- `DNS-QUERY` → "Query" / "Resolving" / "Response"
- `UDP-TRANSFER` → "UDP 傳輸"
- `TIMEOUT` → "等待回應" / "連線超時"

**User Experience Benefits**:
- **Immediate context**: Users can see what each packet is doing without interaction
- **Real-time feedback**: Labels move with packets, showing protocol flow in action
- **Clear identification**: Protocol type and current stage both visible at a glance
- **Maintains clean view**: Small font sizes prevent overwhelming the visualization
- **Works with progressive disclosure**: Moving labels provide basic info; hover/click reveals full details

**Technical Details**:
- Uses existing `protocolType` and `stageLabel` variables already computed for each connection
- Position offsets (-3.5, -1.8) carefully chosen to avoid overlapping with dot (radius 1.6-2.8)
- Opacity inheritance ensures labels fade when their connection is dimmed
- SVG text rendering with `text-anchor="middle"` for perfect centering
- Tailwind CSS classes for consistent styling with rest of application

**Testing**:
- Visit http://localhost:5173 and observe animated dots
- Each moving dot should now display protocol type and current stage above it
- Labels should move smoothly with their dots along connection paths
- When hovering over a connection, labels of other connections should dim proportionally
- Verify all protocol types show appropriate labels (TCP, HTTP, HTTPS, DNS, UDP, TIMEOUT)

### Pause and Focus Mode Controls (2025-10-23)

**Overview**: Added animation control and focus mode features to allow users to pause network animations and isolate specific connections for detailed observation.

**Problem Solved**:
- Users needed ability to pause animations to examine specific moments in network flow
- With many simultaneous connections (30-50+), focusing on one connection was difficult
- Required a way to hide all other connections temporarily to reduce visual noise

**Solution - Dual Control System**:

**1. Pause/Resume Control**:
- **Pause Button**: Freezes all animations at their current state
- **Play Button**: Resumes animation from where it was paused
- Visual feedback: Button color changes (amber when playing, green when paused)
- All protocol animations stop advancing when paused
- Dot positions and labels remain frozen until resumed

**2. Focus Mode (Special Display)**:
- **Activation**: Only appears when a connection is selected
- **"特定顯示" (Special Display)** button: Hides all connections except the selected one
- **"退出焦點" (Exit Focus)** button: Returns to normal view showing all connections
- **Auto-pause**: Automatically pauses animations when entering focus mode
- Complete isolation of selected connection for detailed analysis

**Implementation Details** (`src/MindMap.jsx`):

**State Management** (lines 178-180):
```javascript
// 動畫控制狀態
const [isPaused, setIsPaused] = useState(false)
const [isFocusMode, setIsFocusMode] = useState(false)
```

**Animation Loop Modification** (lines 339-342):
```javascript
controllersRef.current.forEach((controller, id) => {
  // 只有在未暫停時才推進動畫
  if (!isPaused) {
    controller.advance(delta)
  }
  nextStates[id] = controller.getRenderableState()
})
```

**Focus Mode Filtering** (lines 527-530):
```javascript
// 焦點模式: 只顯示選中的連線
if (isFocusMode && selectedConnectionId && connection.id !== selectedConnectionId) {
  return null
}
```

**UI Controls** (lines 465-498):

1. **Pause/Play Button**:
   - Icon: `<Pause>` or `<Play>` from lucide-react
   - Color: Amber background when playing, green when paused
   - Text: "暫停" (Pause) or "播放" (Play)
   - Always visible

2. **Focus Mode Button**:
   - Icon: `<Eye>` (enter focus) or `<EyeOff>` (exit focus)
   - Color: Purple for "特定顯示", cyan for "退出焦點"
   - Only visible when `selectedConnectionId` is set
   - Automatically pauses animation on activation

**Interaction Flow**:

```
Normal View (All Connections)
         ↓ [Click Connection]
Connection Selected
         ↓ [Click "特定顯示"]
Focus Mode Activated (Auto-Pause)
         ↓ Only selected connection visible
         ↓ [Click "退出焦點"]
Return to Normal View
```

**Key Features**:

**Pause Functionality**:
- Stops all `controller.advance(delta)` calls
- `requestAnimationFrame` loop continues (for potential UI updates)
- State preserved: can resume from exact same position
- Independent of focus mode: can pause in normal or focus view

**Focus Mode Functionality**:
- Filters connections during render: `return null` for non-selected
- Prevents dimming logic when in focus mode: `!isFocusMode && hoveredConnectionId...`
- Auto-pause on entry ensures stable observation
- Exiting focus mode does not automatically resume (user controls playback)

**User Experience Benefits**:
- **Temporal control**: Pause to examine specific protocol stages
- **Visual isolation**: Focus mode eliminates distraction from other connections
- **Flexible workflow**: Can pause without focusing, or focus without examining details
- **Clear state indication**: Button colors and icons show current mode
- **Non-destructive**: All connections remain in memory, just hidden from view

**Technical Details**:
- Pause check inside animation loop prevents unnecessary computations
- Focus mode uses early return for performance (doesn't render hidden connections)
- State dependencies properly managed in useEffect: `[timelines, isPaused]`
- Button visibility controlled by `selectedConnectionId` existence
- Auto-pause triggered before setting focus mode to ensure clean transition

**Added Icons** (lines 14-17):
```javascript
import {
  // ... existing icons
  Pause,    // For pause button
  Play,     // For play/resume button
  Eye,      // For "特定顯示" (enter focus)
  EyeOff    // For "退出焦點" (exit focus)
} from 'lucide-react'
```

**Testing**:
1. Visit http://localhost:5173
2. Observe animations playing by default
3. Click "暫停" button - all dots should freeze in place
4. Click "播放" button - animations should resume
5. Click any connection to select it
6. "特定顯示" button should appear
7. Click "特定顯示" - only selected connection visible, others hidden
8. Animations should auto-pause on entering focus mode
9. Click "退出焦點" - all connections reappear
10. Verify pause/play works independently in both normal and focus modes

**Use Cases**:
- **Protocol Analysis**: Pause during TCP handshake to examine SYN/ACK timing
- **Presentation**: Focus on specific connection while explaining to audience
- **Debugging**: Isolate suspicious connection to study its behavior
- **Education**: Step through protocol stages by pausing at key moments
- **Performance Monitoring**: Pause to read exact stage labels and progress percentages
