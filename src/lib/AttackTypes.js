/**
 * AttackTypes.js - 集中管理攻擊類型定義
 *
 * 這個模組提供可擴展的攻擊類型配置，讓前端能夠動態渲染不同類型的攻擊。
 * 添加新的攻擊類型只需在 ATTACK_TYPES 中增加條目即可。
 */

/**
 * 攻擊類型配置
 * @typedef {Object} AttackTypeConfig
 * @property {Object} colors - Tailwind CSS 顏色類別
 * @property {string} colors.bg - 背景色類別 (e.g., 'bg-red-500/20')
 * @property {string} colors.text - 文字色類別 (e.g., 'text-red-400')
 * @property {string} colors.border - 邊框色類別 (e.g., 'border-red-500/30')
 * @property {string} iconColor - 圖標顏色類別
 * @property {string} description - 攻擊類型中文描述
 * @property {string} threatLevel - 威脅等級 ('high' | 'medium' | 'low')
 * @property {number} priority - 優先級 (數字越小優先級越高)
 */

export const ATTACK_TYPES = {
  'URG-PSH-FIN Attack': {
    colors: {
      bg: 'bg-fuchsia-500/20',
      text: 'text-fuchsia-400',
      border: 'border-fuchsia-500/30'
    },
    iconColor: 'text-fuchsia-400',
    description: '異常旗標組合攻擊 - 同時設置 URG、PSH、FIN 旗標',
    threatLevel: 'high',
    priority: 1
  },

  'SYN Flood': {
    colors: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/30'
    },
    iconColor: 'text-red-400',
    description: 'SYN 洪水攻擊 - 大量未完成的 TCP 連線嘗試',
    threatLevel: 'high',
    priority: 2
  },

  'PSH Flood': {
    colors: {
      bg: 'bg-pink-500/20',
      text: 'text-pink-400',
      border: 'border-pink-500/30'
    },
    iconColor: 'text-pink-400',
    description: 'PSH 洪水攻擊 - 強制接收端立即處理大量資料',
    threatLevel: 'high',
    priority: 3
  },

  'FIN Flood': {
    colors: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/30'
    },
    iconColor: 'text-red-400',
    description: 'FIN 洪水攻擊 - 發送大量 FIN 封包關閉連線',
    threatLevel: 'high',
    priority: 4
  },

  'RST Attack': {
    colors: {
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      border: 'border-amber-500/30'
    },
    iconColor: 'text-amber-400',
    description: 'RST 重置攻擊 - 強制中斷現有連線',
    threatLevel: 'medium',
    priority: 5
  },

  'ACK Flood': {
    colors: {
      bg: 'bg-orange-500/20',
      text: 'text-orange-400',
      border: 'border-orange-500/30'
    },
    iconColor: 'text-orange-400',
    description: 'ACK 洪水攻擊 - 發送大量 ACK 封包消耗資源',
    threatLevel: 'high',
    priority: 6
  },

  'High Volume Attack': {
    colors: {
      bg: 'bg-orange-500/20',
      text: 'text-orange-400',
      border: 'border-orange-500/30'
    },
    iconColor: 'text-orange-400',
    description: '高流量攻擊 - 異常大量的網路流量',
    threatLevel: 'medium',
    priority: 7
  },

  'Suspicious Traffic': {
    colors: {
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30'
    },
    iconColor: 'text-yellow-400',
    description: '可疑流量 - 異常但不確定為攻擊的流量模式',
    threatLevel: 'medium',
    priority: 8
  },

  'Normal Traffic': {
    colors: {
      bg: 'bg-green-500/20',
      text: 'text-green-400',
      border: 'border-green-500/30'
    },
    iconColor: 'text-emerald-400',
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
 * 獲取攻擊類型的 CSS 類別字串
 * @param {string} attackType - 攻擊類型名稱
 * @returns {string} 合併的 CSS 類別字串
 */
export function getAttackTypeClassName(attackType) {
  const config = getAttackTypeConfig(attackType)
  return `${config.colors.bg} ${config.colors.text} ${config.colors.border}`
}

/**
 * 獲取攻擊類型的圖標顏色
 * @param {string} attackType - 攻擊類型名稱
 * @returns {string} 圖標顏色類別
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
