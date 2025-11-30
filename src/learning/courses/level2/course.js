/**
 * Level 2 課程定義：傳輸層協議
 *
 * 目標：
 * 1. 理解 TCP 三次握手原理
 * 2. 理解 TCP 四次揮手原理
 * 3. 理解 UDP 傳輸特性
 * 4. 在 MindMap 中識別不同傳輸層協議
 */

export const level2Course = {
  id: 'level2',
  title: 'Level 2：傳輸層協議',
  description: '深入了解 TCP 與 UDP 協議的運作原理，學習識別不同傳輸層行為。',
  estimatedTime: '45 分鐘',
  prerequisites: ['level1'],
  objectives: [
    '理解 TCP 連線建立（三次握手）的過程',
    '理解 TCP 連線關閉（四次揮手）的過程',
    '了解 UDP 無連線傳輸的特性',
    '在 MindMap 中識別 TCP 和 UDP 連線'
  ],

  lessons: [
    // ========== 2.1 TCP 三次握手 ==========
    {
      id: 'lesson-2-1',
      title: 'TCP 三次握手',
      description: '學習 TCP 連線建立的過程。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '什麼是 TCP？',
          content: 'TCP（傳輸控制協議）是一種可靠的、面向連線的傳輸層協議。在傳輸資料之前，必須先建立連線。',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-2',
          type: 'theory',
          target: null,
          title: 'TCP 三次握手動畫',
          content: '讓我們通過動畫來了解 TCP 建立連線的過程。點擊下方按鈕觀看三次握手的完整過程。',
          action: 'none',
          position: 'center',
          theoryComponent: 'TcpHandshakeDemo'  // 嵌入 Demo 組件
        },
        {
          id: 'step-3',
          type: 'observe',
          target: '.mindmap-svg-container',
          title: '在 MindMap 中識別 TCP 握手',
          content: '現在觀察 MindMap 中的連線。帶有「TCP-HANDSHAKE」標籤的連線就是 TCP 三次握手。',
          action: 'none',
          position: 'right',
          hint: '綠色的連線通常是 TCP 協議。'
        },
        {
          id: 'step-4',
          type: 'action',
          target: '.sidebar-timeline-item',
          title: '選擇一條 TCP 連線',
          content: '在右側時間軸列表中，找到並點擊任意一條連線，觀察詳細資訊。',
          action: 'click',
          position: 'left',
          hint: '點擊側邊欄中的連線項目。',
          validation: {
            type: 'state-change',
            condition: 'selectedConnectionId !== null'
          }
        }
      ]
    },

    // ========== 2.2 TCP 四次揮手 ==========
    {
      id: 'lesson-2-2',
      title: 'TCP 四次揮手',
      description: '學習 TCP 連線關閉的過程。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '為什麼需要四次揮手？',
          content: 'TCP 是全雙工協議，兩個方向的資料傳輸需要分別關閉，所以關閉連線需要四次揮手。',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-2',
          type: 'theory',
          target: null,
          title: 'TCP 四次揮手動畫',
          content: '觀看動畫了解 TCP 關閉連線的完整過程：FIN → ACK → FIN → ACK。',
          action: 'none',
          position: 'center',
          theoryComponent: 'TcpTeardownDemo'
        },
        {
          id: 'step-3',
          type: 'observe',
          target: null,
          title: '握手 vs 揮手',
          content: '三次握手建立連線，四次揮手關閉連線。握手時 SYN-ACK 可以合併，但揮手時兩個 FIN 必須分開發送。',
          action: 'none',
          position: 'center',
          hint: '這是 TCP 面試常考的知識點！'
        }
      ]
    },

    // ========== 2.3 UDP 傳輸 ==========
    {
      id: 'lesson-2-3',
      title: 'UDP 傳輸',
      description: '學習 UDP 無連線傳輸的特性。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '什麼是 UDP？',
          content: 'UDP（用戶資料報協議）是一種無連線的傳輸層協議。它不建立連線，直接發送資料，速度快但不保證可靠性。',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-2',
          type: 'theory',
          target: null,
          title: 'UDP 傳輸動畫',
          content: '觀看動畫了解 UDP 傳輸的特點：快速、無連線、無確認。',
          action: 'none',
          position: 'center',
          theoryComponent: 'UdpTransferDemo'
        },
        {
          id: 'step-3',
          type: 'observe',
          target: null,
          title: 'TCP vs UDP',
          content: '• TCP：可靠、有連線、較慢（如：HTTP、FTP）\\n• UDP：不可靠、無連線、較快（如：DNS、視訊串流）',
          action: 'none',
          position: 'center',
          hint: 'DNS 查詢通常使用 UDP 協議。'
        }
      ]
    },

    // ========== 2.4 DNS 查詢 ==========
    {
      id: 'lesson-2-4',
      title: 'DNS 查詢',
      description: '學習 DNS 域名解析的過程。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '什麼是 DNS？',
          content: 'DNS（域名系統）將域名（如 google.com）轉換為 IP 位址。瀏覽網頁時，第一步就是 DNS 查詢。',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-2',
          type: 'theory',
          target: null,
          title: 'DNS 查詢動畫',
          content: '觀看動畫了解 DNS 查詢和響應的過程。',
          action: 'none',
          position: 'center',
          theoryComponent: 'DnsQueryDemo'
        },
        {
          id: 'step-3',
          type: 'observe',
          target: '.sidebar-timeline-list',
          title: '在 MindMap 中識別 DNS',
          content: '在時間軸列表中，尋找帶有「DNS-QUERY」標籤的連線。DNS 查詢通常是紫色顯示。',
          action: 'none',
          position: 'left',
          hint: 'DNS 通常使用 53 埠。'
        }
      ]
    },

    // ========== 2.5 Level 2 總結 ==========
    {
      id: 'lesson-2-5',
      title: 'Level 2 完成！',
      description: '回顧傳輸層協議知識。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '恭喜完成 Level 2！🎊',
          content: '你已經學會了：\\n• TCP 三次握手和四次揮手\\n• UDP 無連線傳輸\\n• DNS 域名查詢\\n• 在 MindMap 中識別不同協議\\n\\n準備好進入 Level 3 學習應用層協議了嗎？',
          action: 'none',
          position: 'center'
        }
      ]
    }
  ],

  // 測驗
  quiz: {
    id: 'quiz-level2',
    title: 'Level 2 測驗',
    passingScore: 70,
    questions: [
      {
        id: 'q1',
        type: 'multiple-choice',
        question: 'TCP 三次握手的第一個封包是什麼？',
        options: ['SYN', 'ACK', 'SYN-ACK', 'FIN'],
        correctAnswer: 0,
        explanation: 'TCP 連線由客戶端發送 SYN 封包開始。'
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'UDP 和 TCP 的主要區別是什麼？',
        options: [
          'UDP 是有連線的',
          'TCP 是無連線的',
          'UDP 是無連線的',
          'UDP 比 TCP 可靠'
        ],
        correctAnswer: 2,
        explanation: 'UDP 是無連線協議，不需要建立連線即可傳輸資料。'
      },
      {
        id: 'q3',
        type: 'multiple-choice',
        question: 'DNS 通常使用哪個傳輸層協議？',
        options: ['TCP', 'UDP', 'HTTP', 'ICMP'],
        correctAnswer: 1,
        explanation: 'DNS 查詢通常使用 UDP 協議，因為查詢資料量小且需要快速響應。'
      }
    ]
  }
}

export default level2Course
