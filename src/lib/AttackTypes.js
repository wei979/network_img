/**
 * AttackTypes.js - 集中管理攻擊類型定義
 *
 * 這個模組提供可擴展的攻擊類型配置，讓前端能夠動態渲染不同類型的攻擊。
 * 添加新的攻擊類型只需在 ATTACK_TYPES 中增加條目即可。
 *
 * Swiss Editorial Dark tokens: colors stored as hex strings for inline styles.
 */

/**
 * 攻擊類型配置
 * @typedef {Object} AttackTypeConfig
 * @property {Object} colors - Hex color values for inline styles
 * @property {string} colors.bg - Background hex color
 * @property {string} colors.text - Text hex color
 * @property {string} colors.border - Border hex color
 * @property {string} iconColor - Icon hex color
 * @property {string} description - 攻擊類型中文描述
 * @property {string} threatLevel - 威脅等級 ('high' | 'medium' | 'low')
 * @property {number} priority - 優先級 (數字越小優先級越高)
 */

export const ATTACK_TYPES = {
  'URG-PSH-FIN Attack': {
    colors: {
      bg: '#a855f720',
      text: '#c084fc',
      border: '#a855f740'
    },
    iconColor: '#c084fc',
    description: '異常旗標組合攻擊 - 同時設置 URG、PSH、FIN 旗標',
    threatLevel: 'high',
    priority: 1
  },

  'SYN Flood': {
    colors: {
      bg: '#e05a3320',
      text: '#e05a33',
      border: '#e05a3340'
    },
    iconColor: '#e05a33',
    description: 'SYN 洪水攻擊 - 大量未完成的 TCP 連線嘗試',
    threatLevel: 'high',
    priority: 2
  },

  'PSH Flood': {
    colors: {
      bg: '#ec489920',
      text: '#f472b6',
      border: '#ec489940'
    },
    iconColor: '#f472b6',
    description: 'PSH 洪水攻擊 - 強制接收端立即處理大量資料',
    threatLevel: 'high',
    priority: 3
  },

  'FIN Flood': {
    colors: {
      bg: '#e05a3320',
      text: '#e05a33',
      border: '#e05a3340'
    },
    iconColor: '#e05a33',
    description: 'FIN 洪水攻擊 - 發送大量 FIN 封包關閉連線',
    threatLevel: 'high',
    priority: 4
  },

  'RST Attack': {
    colors: {
      bg: '#f59e0b20',
      text: '#fbbf24',
      border: '#f59e0b40'
    },
    iconColor: '#fbbf24',
    description: 'RST 重置攻擊 - 強制中斷現有連線',
    threatLevel: 'medium',
    priority: 5
  },

  'ACK Flood': {
    colors: {
      bg: '#f9731620',
      text: '#fb923c',
      border: '#f9731640'
    },
    iconColor: '#fb923c',
    description: 'ACK 洪水攻擊 - 發送大量 ACK 封包消耗資源',
    threatLevel: 'high',
    priority: 6
  },

  'DNS Amplification': {
    colors: {
      bg: '#8b5cf620',
      text: '#8b5cf6',
      border: '#8b5cf640'
    },
    iconColor: '#8b5cf6',
    description: 'DNS 放大攻擊 — 利用開放 DNS 伺服器反射並放大流量',
    threatLevel: 'high',
    priority: 3.5
  },

  'Slowloris': {
    colors: {
      bg: '#f59e0b20',
      text: '#fbbf24',
      border: '#f59e0b40'
    },
    iconColor: '#fbbf24',
    description: 'Slowloris 慢速攻擊 — 維持大量不完整 HTTP 連線耗盡伺服器資源',
    threatLevel: 'high',
    priority: 4.5
  },

  'ARP Spoofing': {
    colors: {
      bg: '#ef444420',
      text: '#ef4444',
      border: '#ef444440'
    },
    iconColor: '#ef4444',
    description: 'ARP 欺騙攻擊 — 偽造 ARP 回應以攔截網路流量',
    threatLevel: 'high',
    priority: 5.5
  },

  'Volumetric Flood': {
    colors: {
      bg: '#f9731620',
      text: '#fb923c',
      border: '#f9731640'
    },
    iconColor: '#fb923c',
    description: '容量型洪泛攻擊 — 單一來源大量封包消耗頻寬',
    threatLevel: 'high',
    priority: 6.5
  },

  'High Volume Attack': {
    colors: {
      bg: '#f9731620',
      text: '#fb923c',
      border: '#f9731640'
    },
    iconColor: '#fb923c',
    description: '高流量攻擊 - 異常大量的網路流量',
    threatLevel: 'medium',
    priority: 7
  },

  'Suspicious Traffic': {
    colors: {
      bg: '#eab30820',
      text: '#fbbf24',
      border: '#eab30840'
    },
    iconColor: '#fbbf24',
    description: '可疑流量 - 異常但不確定為攻擊的流量模式',
    threatLevel: 'medium',
    priority: 8
  },

  'Normal Traffic': {
    colors: {
      bg: '#10b98120',
      text: '#10b981',
      border: '#10b98140'
    },
    iconColor: '#10b981',
    description: '正常流量',
    threatLevel: 'low',
    priority: 9
  }
}

/**
 * 獲取攻擊類型配置
 * @param {string} attackType - 攻擊類型名稱
 * @returns {AttackTypeConfig} 攻擊類型配置
 */
export function getAttackTypeConfig(attackType) {
  return ATTACK_TYPES[attackType] || ATTACK_TYPES['Normal Traffic']
}

/**
 * 獲取攻擊類型的內聯樣式物件
 * @param {string} attackType - 攻擊類型名稱
 * @returns {Object} { background, color, borderColor }
 */
export function getAttackTypeStyle(attackType) {
  const config = getAttackTypeConfig(attackType)
  return {
    background: config.colors.bg,
    color: config.colors.text,
    borderColor: config.colors.border,
  }
}

/**
 * 獲取攻擊類型的 CSS 類別字串 (legacy — returns empty string)
 * Use getAttackTypeStyle() for inline styles instead.
 * @param {string} attackType - 攻擊類型名稱
 * @returns {string} empty string (callers should use getAttackTypeStyle)
 */
export function getAttackTypeClassName(attackType) {
  // Return empty string; callers now use getAttackTypeStyle for inline styles
  return ''
}

/**
 * 獲取攻擊類型的圖標顏色（hex 字串）
 * @param {string} attackType - 攻擊類型名稱
 * @returns {string} hex color string
 */
export function getAttackTypeIconColor(attackType) {
  const config = getAttackTypeConfig(attackType)
  return config.iconColor
}

/**
 * 獲取攻擊類型描述
 * @param {string} attackType - 攻擊類型名稱
 * @returns {string} 攻擊類型描述
 */
export function getAttackTypeDescription(attackType) {
  const config = getAttackTypeConfig(attackType)
  return config.description
}

/**
 * 判斷是否為攻擊流量
 * @param {string} attackType - 攻擊類型名稱
 * @returns {boolean} 是否為攻擊
 */
export function isAttackType(attackType) {
  if (!attackType) return false
  return attackType !== 'Normal Traffic' && attackType !== 'Suspicious Traffic'
}

/**
 * 判斷是否為高威脅攻擊
 * @param {string} attackType - 攻擊類型名稱
 * @returns {boolean} 是否為高威脅
 */
export function isHighThreat(attackType) {
  const config = getAttackTypeConfig(attackType)
  return config.threatLevel === 'high'
}

/**
 * 獲取所有支援的攻擊類型
 * @returns {string[]} 攻擊類型名稱陣列 (按優先級排序)
 */
export function getAllAttackTypes() {
  return Object.entries(ATTACK_TYPES)
    .sort(([, a], [, b]) => a.priority - b.priority)
    .map(([type]) => type)
}

/**
 * 根據威脅等級篩選攻擊類型
 * @param {string} threatLevel - 威脅等級 ('high' | 'medium' | 'low')
 * @returns {string[]} 符合威脅等級的攻擊類型陣列
 */
export function getAttackTypesByThreatLevel(threatLevel) {
  return Object.entries(ATTACK_TYPES)
    .filter(([, config]) => config.threatLevel === threatLevel)
    .map(([type]) => type)
}
