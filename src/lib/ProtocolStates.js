/**
 * 協議狀態定義 - 根據計畫補充.md 規劃
 * 定義各種網路協議的視覺化動畫階段和效果
 */

export const PROTOCOL_STATES = {
  // TCP 三次握手
  'tcp-handshake': {
    stages: [
      { 
        step: 'SYN', 
        label: 'SYN 發送中',
        direction: 'forward', 
        color: '#3b82f6', // 藍色
        duration: 500,
        icon: '→'
      },
      { 
        step: 'SYN-ACK', 
        label: 'SYN-ACK 回應',
        direction: 'backward', 
        color: '#10b981', // 綠色
        duration: 500,
        icon: '←'
      },
      { 
        step: 'ACK', 
        label: 'ACK 確認',
        direction: 'forward', 
        color: '#f59e0b', // 黃色
        duration: 500,
        icon: '→'
      }
    ],
    finalState: 'established',
    finalColor: '#10b981', // 連線建立後變綠色實線
    totalDuration: 1500,
    description: 'TCP 三次握手建立連線'
  },

  // TCP 四次揮手 (斷線)
  'tcp-teardown': {
    stages: [
      { 
        step: 'FIN', 
        label: '請求斷線',
        direction: 'forward', 
        color: '#f97316', // 橙色
        duration: 400,
        icon: '→'
      },
      { 
        step: 'ACK', 
        label: '確認斷線',
        direction: 'backward', 
        color: '#f97316', 
        duration: 400,
        icon: '←'
      },
      { 
        step: 'FIN', 
        label: '對方斷線',
        direction: 'backward', 
        color: '#f97316', 
        duration: 400,
        icon: '←'
      },
      { 
        step: 'ACK', 
        label: '完全關閉',
        direction: 'forward', 
        color: '#f97316', 
        duration: 400,
        icon: '→'
      }
    ],
    finalState: 'closed',
    finalColor: '#6b7280', // 最終變灰色並淡出
    colorTransition: ['#10b981', '#f97316', '#6b7280', 'transparent'],
    totalDuration: 1600,
    description: 'TCP 四次揮手關閉連線'
  },

  // DNS 查詢
  'dns-query': {
    stages: [
      { 
        step: 'Query', 
        label: 'DNS 查詢中',
        direction: 'forward', 
        color: '#8b5cf6', // 紫色
        duration: 100,
        icon: '→'
      },
      { 
        step: 'Resolving', 
        label: '解析中...',
        direction: 'wait', 
        color: '#8b5cf6', 
        duration: 200,
        icon: '⟳',
        spinning: true
      },
      { 
        step: 'Response', 
        label: '解析成功',
        direction: 'backward', 
        color: '#8b5cf6', 
        duration: 100,
        icon: '←'
      }
    ],
    finalState: 'resolved',
    finalColor: '#10b981',
    totalDuration: 400,
    description: 'DNS 域名解析查詢',
    successEffect: 'flash-green' // 成功時閃爍綠光
  },

  // HTTP/HTTPS 請求
  'http-request': {
    stages: [
      { 
        step: 'TLS Handshake', 
        label: 'TLS 握手',
        direction: 'both', 
        color: '#fbbf24', // 金色
        duration: 800,
        icon: '⇄',
        isSecure: true
      },
      { 
        step: 'GET', 
        label: '發送請求',
        direction: 'forward', 
        color: '#06b6d4', // 藍色
        duration: 200,
        icon: '→'
      },
      { 
        step: 'Processing', 
        label: '等待回應',
        direction: 'wait', 
        color: '#06b6d4', 
        duration: 300,
        icon: '⋯',
        pulsing: true
      },
      { 
        step: '200 OK', 
        label: '200 OK',
        direction: 'backward', 
        color: '#10b981', // 綠色 (2xx)
        duration: 200,
        icon: '←',
        statusCode: 200
      }
    ],
    finalState: 'completed',
    totalDuration: 1500,
    description: 'HTTP/HTTPS 請求回應',
    statusCodeColors: {
      '2xx': '#10b981', // 綠色
      '3xx': '#3b82f6', // 藍色
      '4xx': '#f97316', // 橙色
      '5xx': '#ef4444'  // 紅色
    }
  },

  // HTTPS 請求 (包含 TLS 握手)
  'https-request': {
    stages: [
      { 
        step: 'TLS Handshake', 
        label: 'TLS 握手',
        direction: 'both', 
        color: '#22c55e', // 綠色 (安全)
        duration: 800,
        icon: '🔒',
        isSecure: true
      },
      { 
        step: 'GET', 
        label: '發送請求',
        direction: 'forward', 
        color: '#06b6d4', // 藍色
        duration: 200,
        icon: '→'
      },
      { 
        step: 'Processing', 
        label: '等待回應',
        direction: 'wait', 
        color: '#06b6d4', 
        duration: 300,
        icon: '⋯',
        pulsing: true
      },
      { 
        step: '200 OK', 
        label: '200 OK',
        direction: 'backward', 
        color: '#10b981', // 綠色 (2xx)
        duration: 200,
        icon: '←',
        statusCode: 200
      }
    ],
    finalState: 'completed',
    totalDuration: 1500,
    description: 'HTTPS 安全請求回應',
    statusCodeColors: {
      '2xx': '#10b981', // 綠色
      '3xx': '#3b82f6', // 藍色
      '4xx': '#f97316', // 橙色
      '5xx': '#ef4444'  // 紅色
    }
  },

  // 連線超時
  'timeout': {
    stages: [
      { 
        step: 'Request', 
        label: '等待回應...',
        direction: 'forward', 
        color: '#fbbf24', // 黃色
        duration: 1000,
        icon: '→',
        speed: 1.0
      },
      { 
        step: 'Waiting', 
        label: '回應延遲',
        direction: 'wait', 
        color: '#f59e0b', // 橙色
        duration: 2000,
        icon: '⏳',
        speed: 0.5
      },
      { 
        step: 'Timeout', 
        label: '連線超時',
        direction: 'none', 
        color: '#ef4444', // 紅色
        duration: 1000,
        icon: '⚠️',
        blinking: true
      }
    ],
    finalState: 'timeout',
    finalColor: '#ef4444',
    colorTransition: ['#10b981', '#fbbf24', '#f59e0b', '#ef4444'],
    totalDuration: 4000,
    description: '連線超時處理',
    warningEffect: 'blink-red'
  },

  // UDP 傳輸
  'udp-transfer': {
    stages: [
      { 
        step: 'Transfer', 
        label: 'UDP 傳輸中',
        direction: 'forward', 
        color: '#60a5fa', // 淡藍色
        duration: 300,
        icon: '→→→',
        unreliable: true,
        opacity: 0.7
      }
    ],
    finalState: 'sent',
    finalColor: '#60a5fa',
    totalDuration: 300,
    description: 'UDP 不可靠傳輸',
    connectionStyle: 'dashed' // 虛線連接
  },

  // ICMP Ping
  'icmp-ping': {
    stages: [
      { 
        step: 'Echo Request', 
        label: 'Ping...',
        direction: 'forward', 
        color: '#f8fafc', // 白色
        duration: 50,
        icon: '→',
        speed: 2.0
      },
      { 
        step: 'Echo Reply', 
        label: 'Pong!',
        direction: 'backward', 
        color: '#f8fafc', 
        duration: 50,
        icon: '←',
        speed: 2.0
      }
    ],
    finalState: 'completed',
    finalColor: '#10b981',
    totalDuration: 100,
    description: 'ICMP Ping 測試',
    successEffect: 'flash-green',
    showRTT: true
  },

  // SSH/TLS 加密連線
  'ssh-secure': {
    stages: [
      { 
        step: 'Handshake', 
        label: '加密握手中',
        direction: 'both', 
        color: '#fbbf24', // 金色
        duration: 1000,
        icon: '🔒',
        secure: true,
        blinking: true
      },
      { 
        step: 'Established', 
        label: '建立安全通道',
        direction: 'none', 
        color: '#10b981', 
        duration: 500,
        icon: '🔐'
      },
      { 
        step: 'Transfer', 
        label: '加密傳輸中',
        direction: 'both', 
        color: '#10b981', 
        duration: 2000,
        icon: '🛡️',
        encrypted: true
      }
    ],
    finalState: 'secure',
    finalColor: '#10b981',
    totalDuration: 3500,
    description: 'SSH/TLS 安全連線',
    connectionStyle: 'encrypted', // 帶有加密圖案的線條
    securityLevel: 'high'
  }
}

/**
 * 根據協議類型和具體情況獲取協議狀態
 */
export function getProtocolState(protocolType, options = {}) {
  const baseState = PROTOCOL_STATES[protocolType]
  if (!baseState) {
    return null
  }

  // 根據選項自定義狀態
  const customizedState = { ...baseState }
  
  // HTTP 狀態碼自定義
  if (protocolType === 'http-request' && options.statusCode) {
    const statusCategory = Math.floor(options.statusCode / 100) + 'xx'
    const statusColor = baseState.statusCodeColors[statusCategory] || '#6b7280'
    
    // 更新最後階段的顏色和標籤
    const lastStage = customizedState.stages[customizedState.stages.length - 1]
    lastStage.color = statusColor
    lastStage.label = `${options.statusCode} ${getStatusText(options.statusCode)}`
    lastStage.step = `${options.statusCode}`
  }

  // DNS 解析結果自定義
  if (protocolType === 'dns-query' && options.resolvedIP) {
    const lastStage = customizedState.stages[customizedState.stages.length - 1]
    lastStage.label = `解析成功: ${options.resolvedIP}`
  }

  // ICMP RTT 自定義
  if (protocolType === 'icmp-ping' && options.rttMs) {
    const lastStage = customizedState.stages[customizedState.stages.length - 1]
    lastStage.label = `Pong! (${options.rttMs}ms)`
  }

  return customizedState
}

/**
 * 獲取 HTTP 狀態碼對應的文字
 */
function getStatusText(statusCode) {
  const statusTexts = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable'
  }
  return statusTexts[statusCode] || 'Unknown'
}

/**
 * 獲取協議的預設顏色
 */
export const PROTOCOL_COLORS = {
  tcp: '#38bdf8',
  udp: '#60a5fa',
  http: '#a855f7',
  https: '#14b8a6',
  dns: '#f97316',
  icmp: '#facc15',
  ssh: '#fbbf24',
  tls: '#fbbf24'
}

/**
 * 獲取協議顏色
 */
export function getProtocolColor(protocol) {
  return PROTOCOL_COLORS[protocol?.toLowerCase()] || '#6b7280'
}