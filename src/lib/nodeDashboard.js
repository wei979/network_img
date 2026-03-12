/**
 * nodeDashboard.js
 *
 * Pure utility functions for the Node Dashboard sidebar.
 * Extracted from MindMap.jsx for testability.
 */

/**
 * Returns a human-readable depth label for a node.
 *
 * @param {number} depth - Topological depth of the node (0 = center)
 * @param {boolean} isCenter - Whether the node is the designated center node
 * @returns {string} '中心' | '分支' | '葉節點'
 */
export function getDepthLabel(depth, isCenter) {
  if (isCenter || depth === 0) return '中心'
  if (depth === 1) return '分支'
  return '葉節點'
}

/**
 * Computes the set of node IDs that match the search query.
 *
 * @param {Array<{id: string}>} nodes - Array of node objects with at least an `id` property
 * @param {string|null|undefined} query - The search string entered by the user
 * @returns {Set<string>|null} Matched node ID set, or null when the query is blank/absent
 */
export function computeSearchMatchedNodeIds(nodes, query) {
  if (!query || !query.trim()) return null
  const q = query.trim().toLowerCase()
  const matched = new Set()
  nodes.forEach(node => {
    if (node.id.toLowerCase().includes(q)) matched.add(node.id)
  })
  return matched
}

/**
 * Computes the set of connection IDs where src or dst is a matched node.
 *
 * @param {Array<{id: string, src: string, dst: string}>} connections
 * @param {Set<string>|null|undefined} matchedNodeIds - Output from computeSearchMatchedNodeIds
 * @returns {Set<string>|null} Matched connection ID set, or null when matchedNodeIds is absent
 */
export function computeSearchMatchedConnectionIds(connections, matchedNodeIds) {
  if (!matchedNodeIds) return null
  const matched = new Set()
  connections.forEach(conn => {
    if (matchedNodeIds.has(conn.src) || matchedNodeIds.has(conn.dst)) {
      matched.add(conn.id)
    }
  })
  return matched
}
