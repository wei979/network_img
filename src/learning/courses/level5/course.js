/**
 * Level 5 課程定義：綜合實戰
 *
 * 目標：
 * 1. 運用前四個 Level 的知識
 * 2. 分析真實網路場景
 * 3. 獨立進行網路流量分析
 * 4. 完成綜合挑戰
 */

export const level5Course = {
  id: 'level5',
  title: 'Level 5：綜合實戰',
  description: '運用所學知識分析真實網路場景。',
  estimatedTime: '90 分鐘',
  prerequisites: ['level4'],
  objectives: [
    '綜合運用所有網路協議知識',
    '獨立分析複雜的網路流量',
    '識別並判斷異常行為',
    '完成綜合分析挑戰'
  ],

  lessons: [
    // ========== 5.1 場景分析方法論 ==========
    {
      id: 'lesson-5-1',
      title: '分析方法論',
      description: '學習系統性的網路分析方法。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '分析流程概述',
          content: '網路流量分析的標準流程：\\n\\n1. **收集** - 擷取網路封包\\n2. **過濾** - 篩選相關流量\\n3. **觀察** - 識別流量模式\\n4. **分析** - 理解協議行為\\n5. **結論** - 形成分析報告',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-2',
          type: 'observe',
          target: null,
          title: '問題導向分析',
          content: '根據問題類型選擇分析重點：\\n\\n• **效能問題** → 延遲、超時、重傳\\n• **安全問題** → 異常連線、攻擊特徵\\n• **故障排除** → 連線失敗、協議錯誤',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-3',
          type: 'observe',
          target: null,
          title: '工具運用',
          content: 'MindMap 工具的分析能力：\\n\\n• 視覺化網路拓撲\\n• 即時協議識別\\n• 時間軸播放\\n• 連線詳情查看\\n• 異常標記顯示',
          action: 'none',
          position: 'center',
          hint: '結合這些功能可以快速定位問題。'
        }
      ]
    },

    // ========== 5.2 綜合場景一：網頁瀏覽 ==========
    {
      id: 'lesson-5-2',
      title: '場景一：網頁瀏覽分析',
      description: '分析一次完整的網頁瀏覽過程。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '瀏覽網頁的流量',
          content: '當你瀏覽一個網頁時，會產生以下流量：\\n\\n1. DNS 查詢 - 解析域名\\n2. TCP 握手 - 建立連線\\n3. TLS 握手 - HTTPS 加密\\n4. HTTP 請求 - 獲取頁面\\n5. 靜態資源請求 - CSS/JS/圖片',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-2',
          type: 'observe',
          target: '.mindmap-svg-container',
          title: '觀察網頁流量',
          content: '在 MindMap 中觀察：\\n\\n• DNS 查詢（橙色）通常先出現\\n• 接著是 TCP 握手（綠色）\\n• 然後是 HTTPS 請求（藍綠色）\\n\\n這就是一次網頁訪問的完整流程！',
          action: 'none',
          position: 'right',
          autoAdvance: 4000
        },
        {
          id: 'step-3',
          type: 'action',
          target: '.sidebar-timeline-item',
          title: '檢視連線順序',
          content: '點選時間軸中的連線，觀察時間戳記。DNS 查詢的時間應該早於 HTTP 請求。',
          action: 'click',
          position: 'left',
          validation: {
            type: 'state-change',
            condition: 'selectedConnectionId !== null'
          }
        }
      ]
    },

    // ========== 5.3 綜合場景二：攻擊檢測 ==========
    {
      id: 'lesson-5-3',
      title: '場景二：攻擊流量識別',
      description: '練習識別攻擊流量。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '攻擊識別檢核表',
          content: '快速識別攻擊的檢核清單：\\n\\n□ 短時間內大量連線？\\n□ 來源 IP 高度集中或分散？\\n□ 目標埠是否異常？\\n□ 封包大小是否一致？\\n□ 是否有大量失敗連線？',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-2',
          type: 'observe',
          target: '.mindmap-svg-container',
          title: '尋找攻擊跡象',
          content: '在目前的 MindMap 中尋找可能的攻擊跡象。注意：\\n\\n• 粉紅色連線 = Flood 攻擊\\n• 紅色閃爍 = 錯誤/超時\\n• 大量同向連線 = 可疑行為',
          action: 'none',
          position: 'right',
          hint: '不是所有流量都會有攻擊，這是正常的。'
        },
        {
          id: 'step-3',
          type: 'observe',
          target: null,
          title: '攻擊響應',
          content: '發現攻擊後的建議步驟：\\n\\n1. 記錄攻擊特徵（時間、來源、類型）\\n2. 評估影響範圍\\n3. 啟動防禦措施\\n4. 通知相關人員\\n5. 保留證據進行後續分析',
          action: 'none',
          position: 'center'
        }
      ]
    },

    // ========== 5.4 畢業挑戰 ==========
    {
      id: 'lesson-5-4',
      title: '畢業挑戰',
      description: '完成最終的綜合挑戰。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '挑戰說明',
          content: '恭喜你來到最後的畢業挑戰！\\n\\n你現在已經具備：\\n• OSI 七層模型知識\\n• TCP/UDP 協議理解\\n• 應用層協議識別能力\\n• 異常檢測技能\\n\\n接下來完成測驗，獲得你的結業認證！',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-2',
          type: 'observe',
          target: '.mindmap-svg-container',
          title: '最後的觀察',
          content: '再次仔細觀察 MindMap 中的所有連線。嘗試識別：\\n\\n• 每條連線的協議類型\\n• 正常與異常的連線\\n• 連線之間的時序關係',
          action: 'none',
          position: 'right',
          autoAdvance: 5000
        },
        {
          id: 'step-3',
          type: 'observe',
          target: null,
          title: '🎓 恭喜畢業！',
          content: '你已經完成了所有課程！\\n\\n從網路基礎到協議分析，再到安全檢測，你現在是一名合格的網路分析師了！\\n\\n完成最後的畢業測驗，獲取你的成就徽章吧！🏆',
          action: 'none',
          position: 'center'
        }
      ]
    }
  ],

  // 畢業測驗
  quiz: {
    id: 'quiz-level5',
    title: '畢業測驗',
    passingScore: 80,  // 畢業測驗要求更高
    questions: [
      {
        id: 'q1',
        type: 'multiple-choice',
        question: '瀏覽 HTTPS 網頁時，正確的協議順序是？',
        options: [
          'HTTP → DNS → TCP',
          'DNS → TCP → TLS → HTTP',
          'TCP → DNS → HTTP → TLS',
          'TLS → DNS → TCP → HTTP'
        ],
        correctAnswer: 1,
        explanation: '正確順序：先 DNS 解析域名，再 TCP 建立連線，然後 TLS 加密，最後 HTTP 傳輸資料。'
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: '以下哪個是 SYN Flood 攻擊的典型特徵？',
        options: [
          '大量完整的 TCP 連線',
          '大量半開的 TCP 連線',
          '大量 UDP 封包',
          '大量 DNS 查詢'
        ],
        correctAnswer: 1,
        explanation: 'SYN Flood 的特徵是大量 SYN 封包但沒有完成三次握手，形成大量半開連線。'
      },
      {
        id: 'q3',
        type: 'multiple-choice',
        question: '在 MindMap 中，橙色連線通常代表什麼協議？',
        options: [
          'TCP 握手',
          'HTTP 請求',
          'DNS 查詢',
          'SSH 連線'
        ],
        correctAnswer: 2,
        explanation: '橙色在 MindMap 中代表 DNS 查詢，紫色代表 HTTP，藍綠色代表 HTTPS。'
      },
      {
        id: 'q4',
        type: 'multiple-choice',
        question: '傳輸層有哪兩個主要協議？',
        options: [
          'HTTP 和 HTTPS',
          'TCP 和 UDP',
          'IP 和 ICMP',
          'DNS 和 DHCP'
        ],
        correctAnswer: 1,
        explanation: 'TCP 和 UDP 是傳輸層的兩個主要協議。HTTP/HTTPS 是應用層，IP/ICMP 是網路層。'
      },
      {
        id: 'q5',
        type: 'multiple-choice',
        question: '連線超時最可能發生在哪個情況？',
        options: [
          '伺服器正常回應',
          '網路順暢無阻',
          '伺服器無回應或網路中斷',
          '使用 UDP 協議'
        ],
        correctAnswer: 2,
        explanation: '連線超時通常是因為伺服器沒有回應，可能是伺服器故障或網路路徑中斷。'
      }
    ]
  }
}

export default level5Course
