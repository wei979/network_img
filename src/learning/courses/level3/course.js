/**
 * Level 3 課程定義：應用層協議
 *
 * 目標：
 * 1. 理解 HTTP/HTTPS 請求響應流程
 * 2. 深入了解 DNS 域名解析機制
 * 3. 認識其他常見應用層協議
 * 4. 在 MindMap 中識別應用層流量
 */

export const level3Course = {
  id: 'level3',
  title: 'Level 3：應用層協議',
  description: '學習 HTTP、HTTPS、DNS 等常見協議的運作原理。',
  estimatedTime: '45 分鐘',
  prerequisites: ['level2'],
  objectives: [
    '理解 HTTP 請求和響應的結構',
    '了解 HTTPS 加密連線的建立過程',
    '深入學習 DNS 域名解析機制',
    '在 MindMap 中識別不同應用層協議'
  ],

  lessons: [
    // ========== 3.1 HTTP 協議基礎 ==========
    {
      id: 'lesson-3-1',
      title: 'HTTP 協議基礎',
      description: '學習 HTTP 請求響應的基本結構。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '什麼是 HTTP？',
          content: 'HTTP（超文本傳輸協議）是網頁瀏覽的基礎協議。每當你在瀏覽器輸入網址，就會發送 HTTP 請求。',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-2',
          type: 'theory',
          target: null,
          title: 'HTTP 請求響應動畫',
          content: '觀看動畫了解 HTTP 請求和響應的完整流程：Request → Processing → Response。',
          action: 'none',
          position: 'center',
          theoryComponent: 'HttpRequestDemo'
        },
        {
          id: 'step-3',
          type: 'observe',
          target: null,
          title: 'HTTP 方法',
          content: '常見的 HTTP 方法：\\n• GET：獲取資源\\n• POST：提交資料\\n• PUT：更新資源\\n• DELETE：刪除資源',
          action: 'none',
          position: 'center',
          hint: 'GET 是最常見的方法，用於獲取網頁內容。'
        }
      ]
    },

    // ========== 3.2 HTTPS 安全連線 ==========
    {
      id: 'lesson-3-2',
      title: 'HTTPS 安全連線',
      description: '了解 HTTPS 如何保護資料安全。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: 'HTTP vs HTTPS',
          content: 'HTTPS = HTTP + SSL/TLS 加密。它在傳輸層建立安全通道，確保資料不被竊聽或篡改。',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-2',
          type: 'observe',
          target: null,
          title: 'TLS 握手過程',
          content: 'HTTPS 連線建立需要額外的 TLS 握手：\\n1. Client Hello（客戶端問候）\\n2. Server Hello（伺服器回應）\\n3. 憑證驗證\\n4. 金鑰交換\\n5. 加密通訊開始',
          action: 'none',
          position: 'center',
          hint: '這就是為什麼 HTTPS 連線比 HTTP 稍慢的原因。'
        },
        {
          id: 'step-3',
          type: 'observe',
          target: '.sidebar-timeline-list',
          title: '識別 HTTPS 流量',
          content: '在 MindMap 中，HTTPS 連線會標記為「HTTPS-REQUEST」，通常使用 443 埠。',
          action: 'none',
          position: 'left',
          hint: '綠色鎖頭圖示通常表示 HTTPS。'
        }
      ]
    },

    // ========== 3.3 DNS 深入解析 ==========
    {
      id: 'lesson-3-3',
      title: 'DNS 深入解析',
      description: '深入了解 DNS 域名解析的完整流程。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: 'DNS 查詢類型',
          content: 'DNS 有多種查詢類型：\\n• A 記錄：域名 → IPv4 位址\\n• AAAA 記錄：域名 → IPv6 位址\\n• CNAME：別名記錄\\n• MX：郵件伺服器',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-2',
          type: 'theory',
          target: null,
          title: 'DNS 查詢動畫',
          content: '觀看動畫了解 DNS 解析的層級結構：根伺服器 → 頂級域 → 權威伺服器。',
          action: 'none',
          position: 'center',
          theoryComponent: 'DnsQueryDemo'
        },
        {
          id: 'step-3',
          type: 'observe',
          target: null,
          title: 'DNS 快取機制',
          content: 'DNS 結果會被快取以加速後續查詢：\\n• 瀏覽器快取\\n• 作業系統快取\\n• 路由器快取\\n• ISP DNS 快取',
          action: 'none',
          position: 'center',
          hint: 'TTL（存活時間）決定快取多久失效。'
        }
      ]
    },

    // ========== 3.4 常見應用層協議 ==========
    {
      id: 'lesson-3-4',
      title: '其他應用層協議',
      description: '認識更多應用層協議。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: 'FTP 檔案傳輸',
          content: 'FTP（檔案傳輸協議）用於在電腦之間傳輸檔案。它使用兩個連線：控制連線（21埠）和資料連線（20埠）。',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-2',
          type: 'observe',
          target: null,
          title: 'SSH 安全遠端',
          content: 'SSH（安全外殼協議）用於安全地遠端登入伺服器。它加密所有通訊內容，常用埠是 22。',
          action: 'none',
          position: 'center',
          hint: '在 MindMap 中會顯示為 SSH-SECURE。'
        },
        {
          id: 'step-3',
          type: 'observe',
          target: null,
          title: 'SMTP/POP3/IMAP',
          content: '電子郵件協議：\\n• SMTP（25埠）：發送郵件\\n• POP3（110埠）：下載郵件\\n• IMAP（143埠）：同步郵件',
          action: 'none',
          position: 'center'
        }
      ]
    },

    // ========== 3.5 實戰識別練習 ==========
    {
      id: 'lesson-3-5',
      title: '實戰識別練習',
      description: '在 MindMap 中識別應用層協議。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: '.mindmap-svg-container',
          title: '觀察應用層流量',
          content: '現在觀察 MindMap 中的連線。不同顏色和標籤代表不同的應用層協議。',
          action: 'none',
          position: 'right',
          autoAdvance: 3000
        },
        {
          id: 'step-2',
          type: 'action',
          target: '.sidebar-timeline-item',
          title: '點選查看詳情',
          content: '點選側邊欄中任意一條連線，查看其協議類型和詳細資訊。',
          action: 'click',
          position: 'left',
          validation: {
            type: 'state-change',
            condition: 'selectedConnectionId !== null'
          }
        },
        {
          id: 'step-3',
          type: 'observe',
          target: null,
          title: '協議識別總結',
          content: '協議顏色對照：\\n• 紫色：HTTP 請求\\n• 藍綠色：HTTPS 請求\\n• 橙色：DNS 查詢\\n• 綠色：SSH 連線',
          action: 'none',
          position: 'center'
        }
      ]
    },

    // ========== 3.6 Level 3 總結 ==========
    {
      id: 'lesson-3-6',
      title: 'Level 3 完成！',
      description: '回顧應用層協議知識。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '恭喜完成 Level 3！🎊',
          content: '你已經學會了：\\n• HTTP/HTTPS 請求響應\\n• TLS 安全握手\\n• DNS 域名解析\\n• 其他應用層協議\\n\\n準備好進入 Level 4 學習異常檢測了嗎？',
          action: 'none',
          position: 'center'
        }
      ]
    }
  ],

  // 測驗
  quiz: {
    id: 'quiz-level3',
    title: 'Level 3 測驗',
    passingScore: 70,
    questions: [
      {
        id: 'q1',
        type: 'multiple-choice',
        question: 'HTTPS 預設使用哪個埠？',
        options: ['80', '443', '8080', '22'],
        correctAnswer: 1,
        explanation: 'HTTPS 預設使用 443 埠，而 HTTP 使用 80 埠。'
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'DNS A 記錄的作用是什麼？',
        options: [
          '將域名對應到 IPv6 位址',
          '將域名對應到 IPv4 位址',
          '設定郵件伺服器',
          '設定域名別名'
        ],
        correctAnswer: 1,
        explanation: 'A 記錄用於將域名對應到 IPv4 位址，AAAA 記錄則對應 IPv6。'
      },
      {
        id: 'q3',
        type: 'multiple-choice',
        question: 'SSH 通常使用哪個埠？',
        options: ['21', '22', '23', '25'],
        correctAnswer: 1,
        explanation: 'SSH 預設使用 22 埠，FTP 使用 21，Telnet 使用 23，SMTP 使用 25。'
      }
    ]
  }
}

export default level3Course
