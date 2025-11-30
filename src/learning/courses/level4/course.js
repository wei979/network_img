/**
 * Level 4 課程定義：異常檢測與安全分析
 *
 * 目標：
 * 1. 識別連線超時現象
 * 2. 了解常見網路攻擊類型
 * 3. 學習分析異常流量特徵
 * 4. 在 MindMap 中識別可疑行為
 */

export const level4Course = {
  id: 'level4',
  title: 'Level 4：異常檢測與安全分析',
  description: '識別超時、攻擊流量等異常行為。',
  estimatedTime: '60 分鐘',
  prerequisites: ['level3'],
  objectives: [
    '理解連線超時的原因和表現',
    '認識常見的網路攻擊類型',
    '學習分析異常流量的方法',
    '在 MindMap 中識別可疑連線'
  ],

  lessons: [
    // ========== 4.1 連線超時分析 ==========
    {
      id: 'lesson-4-1',
      title: '連線超時分析',
      description: '學習識別和分析連線超時。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '什麼是連線超時？',
          content: '連線超時是指在規定時間內未收到預期的回應。常見原因包括：\\n• 伺服器無回應\\n• 網路壅塞\\n• 防火牆阻擋\\n• 路由問題',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-2',
          type: 'theory',
          target: null,
          title: '超時動畫演示',
          content: '觀看動畫了解連線超時的表現：請求發送後長時間無回應，最終超時。',
          action: 'none',
          position: 'center',
          theoryComponent: 'TimeoutDemo'
        },
        {
          id: 'step-3',
          type: 'observe',
          target: '.sidebar-timeline-list',
          title: '識別超時連線',
          content: '在 MindMap 中，超時連線會標記為「TIMEOUT」，顏色從綠色逐漸變為紅色，表示等待時間過長。',
          action: 'none',
          position: 'left',
          hint: '黃橙色通常表示連線正在超時過程中。'
        }
      ]
    },

    // ========== 4.2 SYN Flood 攻擊 ==========
    {
      id: 'lesson-4-2',
      title: 'SYN Flood 攻擊',
      description: '了解 SYN Flood DoS 攻擊原理。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '什麼是 SYN Flood？',
          content: 'SYN Flood 是一種 DoS 攻擊：\\n• 攻擊者發送大量 SYN 封包\\n• 使用偽造的來源 IP\\n• 伺服器回應 SYN-ACK 但收不到 ACK\\n• 佔用伺服器資源導致無法服務',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-2',
          type: 'observe',
          target: null,
          title: 'SYN Flood 特徵',
          content: '識別 SYN Flood 的特徵：\\n• 短時間內大量 SYN 封包\\n• 來源 IP 分散或偽造\\n• 很少有完成的三次握手\\n• 半開連線數量異常高',
          action: 'none',
          position: 'center',
          hint: '正常情況下，SYN 後應該很快有 ACK。'
        },
        {
          id: 'step-3',
          type: 'observe',
          target: null,
          title: '防禦方法',
          content: 'SYN Flood 防禦策略：\\n• SYN Cookies\\n• 限制半開連線數\\n• 速率限制\\n• 防火牆規則',
          action: 'none',
          position: 'center'
        }
      ]
    },

    // ========== 4.3 PSH Flood 攻擊 ==========
    {
      id: 'lesson-4-3',
      title: 'PSH Flood 攻擊',
      description: '了解 PSH Flood 攻擊的特徵。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '什麼是 PSH Flood？',
          content: 'PSH Flood 是 TCP 洪水攻擊的一種：\\n• 發送大量帶有 PSH 標誌的封包\\n• 強制接收方立即處理資料\\n• 消耗目標的 CPU 和記憶體資源',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-2',
          type: 'observe',
          target: '.mindmap-svg-container',
          title: '識別 PSH Flood',
          content: '在 MindMap 中，PSH Flood 攻擊會顯示為粉紅色，並標記為「PSH-FLOOD」。大量連線集中到同一目標是典型特徵。',
          action: 'none',
          position: 'right',
          hint: '注意觀察是否有大量連線指向同一個節點。'
        },
        {
          id: 'step-3',
          type: 'observe',
          target: null,
          title: 'PSH vs SYN Flood',
          content: '區別兩種攻擊：\\n• SYN Flood：攻擊連線建立階段\\n• PSH Flood：攻擊資料傳輸階段\\n\\n兩者都會導致服務不可用。',
          action: 'none',
          position: 'center'
        }
      ]
    },

    // ========== 4.4 異常流量特徵 ==========
    {
      id: 'lesson-4-4',
      title: '異常流量分析',
      description: '學習識別各種異常流量模式。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '流量基線',
          content: '建立正常流量基線是異常檢測的基礎：\\n• 正常的連線數量範圍\\n• 典型的資料傳輸量\\n• 常見的通訊模式\\n• 預期的協議分布',
          action: 'none',
          position: 'center'
        },
        {
          id: 'step-2',
          type: 'observe',
          target: null,
          title: '異常指標',
          content: '常見的異常指標：\\n• 連線數量突然暴增\\n• 非預期的埠活動\\n• 異常的封包大小\\n• 重複的失敗連線\\n• 非工作時間的大量活動',
          action: 'none',
          position: 'center',
          hint: '這些都可能是攻擊或入侵的跡象。'
        },
        {
          id: 'step-3',
          type: 'observe',
          target: null,
          title: '分析工具',
          content: '網路分析工具可以幫助識別異常：\\n• Wireshark：詳細封包分析\\n• MindMap：視覺化流量模式\\n• IDS/IPS：自動化威脅檢測',
          action: 'none',
          position: 'center'
        }
      ]
    },

    // ========== 4.5 實戰檢測練習 ==========
    {
      id: 'lesson-4-5',
      title: '實戰檢測練習',
      description: '在 MindMap 中識別可疑行為。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: '.mindmap-svg-container',
          title: '觀察流量模式',
          content: '仔細觀察 MindMap 中的流量模式。尋找：\\n• 異常顏色的連線（紅色、粉紅色）\\n• 大量連線指向同一目標\\n• 快速閃爍的連線',
          action: 'none',
          position: 'right',
          autoAdvance: 4000
        },
        {
          id: 'step-2',
          type: 'action',
          target: '.sidebar-timeline-item',
          title: '檢查可疑連線',
          content: '點選任意看起來可疑的連線，查看其詳細資訊。注意協議類型、封包數量和時間模式。',
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
          title: '異常類型總結',
          content: '異常類型快速參考：\\n• 紅色閃爍：超時或錯誤\\n• 粉紅色：可能的 Flood 攻擊\\n• 大量同源連線：可能的掃描行為\\n• 非常規埠：可能的後門通訊',
          action: 'none',
          position: 'center'
        }
      ]
    },

    // ========== 4.6 Level 4 總結 ==========
    {
      id: 'lesson-4-6',
      title: 'Level 4 完成！',
      description: '回顧異常檢測知識。',
      steps: [
        {
          id: 'step-1',
          type: 'observe',
          target: null,
          title: '恭喜完成 Level 4！🛡️',
          content: '你已經學會了：\\n• 連線超時的分析方法\\n• SYN Flood 和 PSH Flood 攻擊\\n• 異常流量的識別技巧\\n• 在 MindMap 中檢測可疑行為\\n\\n準備好進入最終的綜合實戰了嗎？',
          action: 'none',
          position: 'center'
        }
      ]
    }
  ],

  // 測驗
  quiz: {
    id: 'quiz-level4',
    title: 'Level 4 測驗',
    passingScore: 70,
    questions: [
      {
        id: 'q1',
        type: 'multiple-choice',
        question: 'SYN Flood 攻擊的目標是什麼？',
        options: [
          '竊取資料',
          '消耗伺服器連線資源',
          '植入惡意程式',
          '修改網頁內容'
        ],
        correctAnswer: 1,
        explanation: 'SYN Flood 通過發送大量半開連線來消耗伺服器資源，導致服務不可用。'
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: '連線超時最常見的原因是什麼？',
        options: [
          '用戶端設定錯誤',
          '伺服器無回應或網路問題',
          '協議版本不相容',
          '加密金鑰過期'
        ],
        correctAnswer: 1,
        explanation: '連線超時通常是因為伺服器沒有回應或網路路徑出現問題。'
      },
      {
        id: 'q3',
        type: 'multiple-choice',
        question: '哪個顏色通常表示 PSH Flood 攻擊？',
        options: ['綠色', '藍色', '粉紅色', '黃色'],
        correctAnswer: 2,
        explanation: '在 MindMap 中，PSH Flood 攻擊使用粉紅色來標示。'
      }
    ]
  }
}

export default level4Course
