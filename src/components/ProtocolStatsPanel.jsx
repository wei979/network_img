import React, { useState, useEffect, useCallback } from 'react'
import { Layers, Users, ArrowLeftRight, Loader2, AlertTriangle, ChevronRight, ChevronDown, ArrowUp, ArrowDown } from 'lucide-react'

const TABS = [
  { key: 'hierarchy', label: '協議階層', icon: Layers },
  { key: 'endpoints', label: '端點', icon: Users },
  { key: 'conversations', label: '會話', icon: ArrowLeftRight },
]

const formatBytes = (bytes) => {
  if (bytes == null) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// --- Protocol Hierarchy Tree ---

const HierarchyNode = ({ node, depth = 0 }) => {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children && node.children.length > 0

  return (
    <>
      <tr
        className="hover:bg-slate-700/40 transition-colors cursor-pointer"
        onClick={() => hasChildren && setExpanded(prev => !prev)}
      >
        <td className="py-1 pr-2 text-xs text-slate-200 whitespace-nowrap">
          <span style={{ paddingLeft: `${depth * 12}px` }} className="inline-flex items-center gap-1">
            {hasChildren ? (
              expanded
                ? <ChevronDown size={10} className="text-slate-400 flex-shrink-0" />
                : <ChevronRight size={10} className="text-slate-400 flex-shrink-0" />
            ) : (
              <span className="inline-block w-[10px]" />
            )}
            {node.protocol}
          </span>
        </td>
        <td className="py-1 px-2 text-xs text-slate-300 text-right font-mono">
          {node.packets?.toLocaleString() ?? '--'}
        </td>
        <td className="py-1 px-2 text-xs text-slate-300 text-right font-mono">
          {formatBytes(node.bytes)}
        </td>
        <td className="py-1 pl-2 text-xs text-right">
          <span className="text-slate-400">{node.percentage != null ? `${node.percentage.toFixed(1)}%` : '--'}</span>
        </td>
      </tr>
      {expanded && hasChildren && node.children.map((child, i) => (
        <HierarchyNode key={`${child.protocol}-${i}`} node={child} depth={depth + 1} />
      ))}
    </>
  )
}

const HierarchyTab = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-xs text-slate-500 text-center py-4">無協議階層資料</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="py-1.5 pr-2 text-xs font-medium text-slate-400">協議</th>
            <th className="py-1.5 px-2 text-xs font-medium text-slate-400 text-right">封包數</th>
            <th className="py-1.5 px-2 text-xs font-medium text-slate-400 text-right">位元組</th>
            <th className="py-1.5 pl-2 text-xs font-medium text-slate-400 text-right">佔比</th>
          </tr>
        </thead>
        <tbody>
          {data.map((node, i) => (
            <HierarchyNode key={`${node.protocol}-${i}`} node={node} depth={0} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- Sortable Table ---

const useSortableData = (items, defaultKey, defaultDir = 'desc') => {
  const [sortKey, setSortKey] = useState(defaultKey)
  const [sortDir, setSortDir] = useState(defaultDir)

  const sorted = React.useMemo(() => {
    if (!items || items.length === 0) return []
    return [...items].sort((a, b) => {
      const aVal = a[sortKey] ?? 0
      const bVal = b[sortKey] ?? 0
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [items, sortKey, sortDir])

  const handleSort = useCallback((key) => {
    if (key === sortKey) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }, [sortKey])

  return { sorted, sortKey, sortDir, handleSort }
}

const SortHeader = ({ label, colKey, sortKey, sortDir, onSort, align = 'left' }) => {
  const isActive = sortKey === colKey
  return (
    <th
      className={`py-1.5 px-2 text-xs font-medium cursor-pointer select-none transition-colors hover:text-slate-200 ${
        isActive ? 'text-cyan-400' : 'text-slate-400'
      } ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => onSort(colKey)}
    >
      <span className="inline-flex items-center gap-0.5">
        {align === 'right' && isActive && (
          sortDir === 'asc'
            ? <ArrowUp size={10} className="flex-shrink-0" />
            : <ArrowDown size={10} className="flex-shrink-0" />
        )}
        {label}
        {align !== 'right' && isActive && (
          sortDir === 'asc'
            ? <ArrowUp size={10} className="flex-shrink-0" />
            : <ArrowDown size={10} className="flex-shrink-0" />
        )}
      </span>
    </th>
  )
}

// --- Endpoints Tab ---

const EndpointsTab = ({ data, geoInfo }) => {
  const { sorted, sortKey, sortDir, handleSort } = useSortableData(data, 'packets_sent')

  if (!data || data.length === 0) {
    return <p className="text-xs text-slate-500 text-center py-4">無端點資料</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-700">
            <SortHeader label="IP 位址" colKey="ip" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <th className="py-1 px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">國家</th>
            <SortHeader label="傳送" colKey="packets_sent" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
            <SortHeader label="接收" colKey="packets_recv" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
            <SortHeader label="傳送量" colKey="bytes_sent" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
            <SortHeader label="接收量" colKey="bytes_recv" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((ep, i) => {
            const geo = geoInfo?.[ep.ip]
            return (
              <tr key={ep.ip || i} className="hover:bg-slate-700/40 transition-colors">
                <td className="py-1 px-2 text-xs text-slate-200 font-mono whitespace-nowrap">{ep.ip}</td>
                <td className="py-1 px-2 text-[10px] text-slate-400 whitespace-nowrap">{geo?.label || '—'}</td>
                <td className="py-1 px-2 text-xs text-slate-300 text-right font-mono">{ep.packets_sent?.toLocaleString() ?? '--'}</td>
                <td className="py-1 px-2 text-xs text-slate-300 text-right font-mono">{ep.packets_recv?.toLocaleString() ?? '--'}</td>
                <td className="py-1 px-2 text-xs text-slate-400 text-right font-mono">{formatBytes(ep.bytes_sent)}</td>
                <td className="py-1 px-2 text-xs text-slate-400 text-right font-mono">{formatBytes(ep.bytes_recv)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// --- Conversations Tab ---

const ConversationsTab = ({ data }) => {
  const { sorted, sortKey, sortDir, handleSort } = useSortableData(data, 'packets')

  if (!data || data.length === 0) {
    return <p className="text-xs text-slate-500 text-center py-4">無會話資料</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-700">
            <SortHeader label="來源" colKey="src_ip" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="目的" colKey="dst_ip" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="封包數" colKey="packets" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
            <SortHeader label="位元組" colKey="bytes" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((conv, i) => (
            <tr key={`${conv.src_ip}-${conv.dst_ip}-${i}`} className="hover:bg-slate-700/40 transition-colors">
              <td className="py-1 px-2 text-xs text-slate-200 font-mono whitespace-nowrap">{conv.src_ip}</td>
              <td className="py-1 px-2 text-xs text-slate-200 font-mono whitespace-nowrap">{conv.dst_ip}</td>
              <td className="py-1 px-2 text-xs text-slate-300 text-right font-mono">{conv.packets?.toLocaleString() ?? '--'}</td>
              <td className="py-1 px-2 text-xs text-slate-400 text-right font-mono">{formatBytes(conv.bytes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- Main Panel ---

const ProtocolStatsPanel = ({ visible }) => {
  const [activeTab, setActiveTab] = useState('hierarchy')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [geoInfo, setGeoInfo] = useState({})

  useEffect(() => {
    let cancelled = false

    const fetchStats = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/statistics/summary')
        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled) {
              setData(null)
              setLoading(false)
            }
            return
          }
          throw new Error(`HTTP ${res.status}`)
        }
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStats()
    fetch('/api/geo').then(r => r.ok ? r.json() : {}).then(d => { if (!cancelled) setGeoInfo(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!visible) return null

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header with total packets */}
      <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-300">協議統計</span>
        {data?.totalPackets != null && (
          <span className="text-xs text-slate-500 font-mono">
            {data.totalPackets.toLocaleString()} 封包
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-700">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-900/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="p-2 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Loader2 size={20} className="text-slate-400 animate-spin" />
            <p className="text-xs text-slate-500 mt-2">正在載入統計資料...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6">
            <AlertTriangle size={20} className="text-yellow-500" />
            <p className="text-xs text-slate-400 mt-2">無法取得統計資料</p>
            <p className="text-xs text-slate-500 mt-0.5">請確認後端已啟動並已上傳 PCAP 檔案</p>
          </div>
        ) : !data ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Layers size={20} className="text-slate-500" />
            <p className="text-xs text-slate-400 mt-2">尚無統計資料</p>
            <p className="text-xs text-slate-500 mt-0.5">請先上傳 PCAP 檔案進行分析</p>
          </div>
        ) : (
          <>
            {activeTab === 'hierarchy' && <HierarchyTab data={data.protocolHierarchy} />}
            {activeTab === 'endpoints' && <EndpointsTab data={data.endpoints} geoInfo={geoInfo} />}
            {activeTab === 'conversations' && <ConversationsTab data={data.conversations} />}
          </>
        )}
      </div>
    </div>
  )
}

export default ProtocolStatsPanel
