/**
 * Level 1 課程定義：認識介面 + OSI 基礎
 *
 * 目標：
 * 1. 理解 OSI 七層模型基礎
 * 2. 認識封包結構
 * 3. 熟悉 MindMap 介面操作
 * 4. 了解節點與連線的概念
 */

export const level1Course = {
  id: 'level1',
  title: 'Level 1：認識介面與 OSI 基礎',
  description: '從網路基礎開始，認識 MindMap 工具介面並學習 OSI 七層模型。',
  estimatedTime: '30 分鐘',
  prerequisites: [],  // 無前置條件
  objectives: [
    '理解 OSI 七層模型的基本概念',
    '認識網路封包的基本結構',
    '學會 MindMap 介面的基本操作',
    '理解網路圖中節點與連線的含義'
  ],

  lessons: [
    // ========== 1.1 歡迎與導覽 ==========
    {
      id: 'lesson-1-1',
      title: '歡迎來到網路分析世界',
      description: '了解這個工具能做什麼，以及學習路徑規劃。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,  // 無特定目標，顯示在畫面中央
          title: '歡迎！🎉',
          content: '歡迎來到網路協議視覺化工具的學習之旅！在這個課程中，你將學習如何分析網路流量並成為一名網路分析師。',
          action: 'none',
          position: 'center',
          autoAdvance: null  // 需要手動點擊下一步
        },
        {
          id: 'step-2',
          type: 'observe',
          target: null,
          title: '學習目標',
          content: '完成所有課程後，你將能夠：\n• 理解各種網路協議的工作原理\n• 識別正常與異常的網路行為\n• 分析實際的網路封包擷取檔案\n• 發現並報告潛在的安全威脅',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-3',
          type: 'observe',
          target: '.mindmap-header',  // MindMap 的標題區域
          title: '這是 MindMap',
          content: '這是你的主要分析工具 - MindMap。它會將網路流量視覺化為互動式圖形，讓你一眼就能看出網路中發生了什麼。',
          action: 'none',
          position: 'bottom',
          hint: '接下來的課程中，你將學會如何使用它的所有功能。'
        }
      ]
    },

    // ========== 1.2 OSI 七層模型 ==========
    {
      id: 'lesson-1-2',
      title: 'OSI 七層模型',
      description: '理解網路通訊的分層架構。',
      steps: [
        {
          id: 'step-1',
          type: 'theory',
          target: null,
          title: 'OSI 模型簡介',
          content: 'OSI（開放式系統互連）模型將網路通訊分為 7 層。每一層負責特定的功能，讓複雜的網路通訊變得可以理解和管理。',
          action: 'none',
          position: 'center',
          theoryContent: {
            title: 'OSI 七層模型',
            layers: [
              { number: 7, name: '應用層', englishName: 'Application', description: '直接與用戶互動的介面', examples: 'HTTP, HTTPS, DNS, FTP, SMTP', color: '#ef4444' },
              { number: 6, name: '表示層', englishName: 'Presentation', description: '資料格式轉換、加密解密', examples: 'SSL/TLS, JPEG, ASCII', color: '#f97316' },
              { number: 5, name: '會話層', englishName: 'Session', description: '建立、管理、終止會話', examples: 'NetBIOS, RPC', color: '#eab308' },
              { number: 4, name: '傳輸層', englishName: 'Transport', description: '端到端的可靠傳輸', examples: 'TCP, UDP', color: '#22c55e' },
              { number: 3, name: '網路層', englishName: 'Network', description: '邏輯定址與路由', examples: 'IP, ICMP, ARP', color: '#3b82f6' },
              { number: 2, name: '資料連結層', englishName: 'Data Link', description: '實體定址與錯誤偵測', examples: 'Ethernet, MAC', color: '#8b5cf6' },
              { number: 1, name: '實體層', englishName: 'Physical', description: '電氣訊號傳輸', examples: '網路線、光纖、Wi-Fi', color: '#ec4899' }
            ]
          }
        },
        {
          id: 'step-2',
          type: 'theory',
          target: null,
          title: '傳輸層（Layer 4）',
          content: '傳輸層是我們最常分析的一層。TCP 提供可靠的連線導向傳輸，UDP 提供快速但不保證送達的傳輸。',
          action: 'none',
          position: 'center',
          hint: '在 MindMap 中，你會看到 TCP-HANDSHAKE、UDP-TRANSFER 等標籤，它們都是傳輸層協議。'
        },
        {
          id: 'step-3',
          type: 'theory',
          target: null,
          title: '應用層（Layer 7）',
          content: '應用層協議是我們日常使用的服務。HTTP/HTTPS 用於網頁瀏覽，DNS 用於域名解析，SMTP 用於電子郵件。',
          action: 'none',
          position: 'center',
          hint: '在 MindMap 中，你會看到 HTTPS-REQUEST、DNS-QUERY 等標籤。'
        }
      ]
    },

    // ========== 1.3 認識 MindMap 介面 ==========
    {
      id: 'lesson-1-3',
      title: '認識 MindMap 介面',
      description: '學習 MindMap 的基本操作。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: '.mindmap-svg-container',  // SVG 圖形區域
          title: '網路圖區域',
          content: '這是網路圖的主要顯示區域。每個圓點代表一個網路設備（電腦、伺服器），連線代表設備之間的通訊。',
          action: 'none',
          position: 'right',
          autoAdvance: 3000
        },
        {
          id: 'step-2',
          type: 'action',
          target: '.mindmap-svg-container',
          title: '嘗試拖曳節點',
          content: '用滑鼠拖曳任意一個圓點，你可以調整節點的位置。這有助於你更好地觀察網路拓撲。',
          action: 'drag',
          position: 'right',
          hint: '按住節點不放，然後移動滑鼠。',
          validation: {
            type: 'interaction',
            action: 'drag'
          }
        },
        {
          id: 'step-3',
          type: 'action',
          target: '.mindmap-svg-container',
          title: '嘗試縮放視圖',
          content: '使用滑鼠滾輪可以縮放網路圖。放大可以看到更多細節，縮小可以看到整體結構。',
          action: 'scroll',
          position: 'right',
          hint: '向上滾動放大，向下滾動縮小。'
        },
        {
          id: 'step-4',
          type: 'observe',
          target: '.upload-button',  // 上傳按鈕
          title: '上傳按鈕',
          content: '這是上傳 PCAP 檔案的按鈕。PCAP 檔案是用 Wireshark 等工具擷取的網路封包檔案。',
          action: 'none',
          position: 'bottom',
          hint: '在後續課程中，你會學習如何上傳和分析 PCAP 檔案。'
        }
      ]
    },

    // ========== 1.4 節點與連線概念 ==========
    {
      id: 'lesson-1-4',
      title: '節點與連線概念',
      description: '理解網路圖中的元素代表什麼。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: '.mindmap-node',  // 網路節點
          title: '網路節點',
          content: '每個圓點代表一個網路端點，可能是你的電腦、伺服器、或其他網路設備。節點上的文字是 IP 位址。',
          action: 'none',
          position: 'right'
        },
        {
          id: 'step-2',
          type: 'observe',
          target: '.mindmap-connection',  // 連線
          title: '網路連線',
          content: '連線上移動的小點代表正在傳輸的資料。顏色表示協議類型：綠色是 TCP、紫色是 DNS、藍色是 HTTP。',
          action: 'none',
          position: 'right'
        },
        {
          id: 'step-3',
          type: 'observe',
          target: '.sidebar-timeline-list',  // 側邊欄
          title: '連線詳情側邊欄',
          content: '右側的側邊欄顯示所有偵測到的連線。點擊任意一條可以查看詳細資訊，包括協議類型、傳輸時間等。',
          action: 'none',
          position: 'left'
        },
        {
          id: 'step-4',
          type: 'action',
          target: '.sidebar-timeline-item',
          title: '選擇一條連線',
          content: '點擊側邊欄中的任意一條連線，觀察網路圖中對應連線的變化。',
          action: 'click',
          position: 'left',
          hint: '被選中的連線會以高亮顯示。',
          validation: {
            type: 'state-change',
            condition: 'selectedConnectionId !== null'
          }
        }
      ]
    },

    // ========== 1.5 Level 1 總結 ==========
    {
      id: 'lesson-1-5',
      title: 'Level 1 完成！',
      description: '回顧所學內容並準備進入下一關。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '恭喜完成 Level 1！🎊',
          content: '你已經學會了：\n• OSI 七層模型的基本概念\n• MindMap 介面的基本操作\n• 網路圖中節點與連線的含義\n\n準備好進入 Level 2 學習傳輸層協議了嗎？',
          action: 'none',
          position: 'center'
        }
      ]
    }
  ],

  // 測驗
  quiz: {
    id: 'quiz-level1',
    title: 'Level 1 測驗',
    passingScore: 70,
    questions: [
      {
        id: 'q1',
        type: 'multiple-choice',
        question: 'OSI 模型共有幾層？',
        options: ['4 層', '5 層', '7 層', '10 層'],
        correctAnswer: 2,
        explanation: 'OSI 模型由七層組成：實體層、資料連結層、網路層、傳輸層、會議層、表現層、應用層。'
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: '在 MindMap 中，每個圓點代表什麼？',
        options: ['一個封包', '一個網路設備', '一個連線', '一個協議'],
        correctAnswer: 1,
        explanation: '在 MindMap 中，每個圓點代表一個網路設備（如電腦或伺服器），連線代表設備之間的通訊。'
      },
      {
        id: 'q3',
        type: 'multiple-choice',
        question: 'TCP/IP 屬於 OSI 模型的哪一層？',
        options: ['實體層', '資料連結層', '網路層 / 傳輸層', '應用層'],
        correctAnswer: 2,
        explanation: 'TCP 屬於傳輸層（Layer 4），IP 屬於網路層（Layer 3）。'
      }
    ]
  }
}

export default level1Course
