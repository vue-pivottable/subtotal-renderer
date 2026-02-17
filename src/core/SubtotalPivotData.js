/**
 * SubtotalPivotData
 *
 * Extends the concept of PivotData to support hierarchical subtotals.
 * This class generates subtotal rows/columns for each level of the hierarchy.
 */

/**
 * Generate all possible subtotal key combinations for a given key
 * e.g., ['A', 'B', 'C'] -> [['A'], ['A', 'B'], ['A', 'B', 'C']]
 * @param {Array} key - The full key array
 * @returns {Array} Array of partial keys for subtotals
 */
export function getSubtotalKeys(key) {
  const result = []
  for (let i = 1; i <= key.length; i++) {
    result.push(key.slice(0, i))
  }
  return result
}

/**
 * Check if a key represents a subtotal row/column
 * A subtotal key has fewer elements than the maximum depth
 * @param {Array} key - The key to check
 * @param {number} maxDepth - Maximum depth (number of attributes)
 * @returns {boolean}
 */
export function isSubtotalKey(key, maxDepth) {
  return key.length < maxDepth
}

/**
 * Generate row keys with subtotals inserted
 * @param {Array} rowKeys - Original row keys from PivotData
 * @param {number} rowAttrsCount - Number of row attributes
 * @param {Set} collapsedKeys - Set of collapsed key strings
 * @returns {Array} Row keys with subtotals
 */
export function generateRowKeysWithSubtotals(rowKeys, rowAttrsCount, collapsedKeys = new Set()) {
  if (rowAttrsCount <= 1) {
    return rowKeys
  }

  const result = []
  const addedSubtotals = new Set()

  for (const rowKey of rowKeys) {
    // Add subtotal rows before each group change
    for (let level = 1; level < rowKey.length; level++) {
      const subtotalKey = rowKey.slice(0, level)
      const subtotalKeyStr = JSON.stringify(subtotalKey)

      if (!addedSubtotals.has(subtotalKeyStr)) {
        addedSubtotals.add(subtotalKeyStr)

        // Check if this subtotal level is collapsed
        const isCollapsed = collapsedKeys.has(subtotalKeyStr)

        // Add subtotal marker
        result.push({
          key: subtotalKey,
          isSubtotal: true,
          level: level,
          isCollapsed: isCollapsed
        })
      }
    }

    // Check if any parent is collapsed
    let isHidden = false
    for (let level = 1; level < rowKey.length; level++) {
      const parentKey = rowKey.slice(0, level)
      if (collapsedKeys.has(JSON.stringify(parentKey))) {
        isHidden = true
        break
      }
    }

    if (!isHidden) {
      result.push({
        key: rowKey,
        isSubtotal: false,
        level: rowKey.length,
        isCollapsed: false
      })
    }
  }

  return result
}

/**
 * Generate column keys with subtotals inserted
 * @param {Array} colKeys - Original column keys from PivotData
 * @param {number} colAttrsCount - Number of column attributes
 * @param {Set} collapsedKeys - Set of collapsed key strings
 * @returns {Array} Column keys with subtotals
 */
export function generateColKeysWithSubtotals(colKeys, colAttrsCount, collapsedKeys = new Set()) {
  if (colAttrsCount <= 1) {
    return colKeys
  }

  const result = []
  const addedSubtotals = new Set()

  // Group columns by their parent keys
  const grouped = new Map()

  for (const colKey of colKeys) {
    for (let level = 1; level <= colKey.length; level++) {
      const partialKey = colKey.slice(0, level)
      const keyStr = JSON.stringify(partialKey)

      if (!grouped.has(keyStr)) {
        grouped.set(keyStr, {
          key: partialKey,
          isSubtotal: level < colKey.length,
          level: level
        })
      }
    }
  }

  // Sort and add to result
  const sortedKeys = Array.from(grouped.values()).sort((a, b) => {
    // First sort by the key values
    for (let i = 0; i < Math.min(a.key.length, b.key.length); i++) {
      if (a.key[i] < b.key[i]) return -1
      if (a.key[i] > b.key[i]) return 1
    }
    // Then by level (subtotals after details)
    return a.key.length - b.key.length
  })

  for (const item of sortedKeys) {
    const keyStr = JSON.stringify(item.key)
    const isCollapsed = collapsedKeys.has(keyStr)

    // Check if parent is collapsed
    let isHidden = false
    for (let level = 1; level < item.key.length; level++) {
      const parentKey = item.key.slice(0, level)
      if (collapsedKeys.has(JSON.stringify(parentKey))) {
        isHidden = true
        break
      }
    }

    if (!isHidden) {
      result.push({
        key: item.key,
        isSubtotal: item.isSubtotal,
        level: item.level,
        isCollapsed: isCollapsed
      })
    }
  }

  return result
}

/**
 * Create a subtotal-aware aggregator getter
 * @param {Object} pivotData - The PivotData instance
 * @returns {Function} Function to get aggregator for any key (including partial keys for subtotals)
 */
export function createSubtotalAggregatorGetter(pivotData) {
  // Cache for subtotal aggregators
  const subtotalCache = new Map()

  return function getAggregator(rowKey, colKey) {
    // If both keys are full keys, use the original aggregator
    const isFullRowKey = rowKey.length === pivotData.props.rows.length
    const isFullColKey = colKey.length === pivotData.props.cols.length

    if (isFullRowKey && isFullColKey) {
      return pivotData.getAggregator(rowKey, colKey)
    }

    // For subtotal keys, we need to sum up all matching cells
    const cacheKey = JSON.stringify({ row: rowKey, col: colKey })
    if (subtotalCache.has(cacheKey)) {
      return subtotalCache.get(cacheKey)
    }

    // Find all matching row keys
    const matchingRowKeys = pivotData.getRowKeys().filter(rk => {
      if (rowKey.length === 0) return true
      for (let i = 0; i < rowKey.length; i++) {
        if (rk[i] !== rowKey[i]) return false
      }
      return true
    })

    // Find all matching col keys
    const matchingColKeys = pivotData.getColKeys().filter(ck => {
      if (colKey.length === 0) return true
      for (let i = 0; i < colKey.length; i++) {
        if (ck[i] !== colKey[i]) return false
      }
      return true
    })

    // Sum up all values
    let totalValue = 0
    let count = 0

    for (const rk of matchingRowKeys) {
      for (const ck of matchingColKeys) {
        const agg = pivotData.getAggregator(rk, ck)
        const val = agg.value()
        if (val !== null && val !== undefined && !isNaN(val)) {
          totalValue += val
          count++
        }
      }
    }

    // Create a mock aggregator
    const subtotalAgg = {
      value: () => count > 0 ? totalValue : null,
      format: pivotData.getAggregator([], []).format || (v => v)
    }

    subtotalCache.set(cacheKey, subtotalAgg)
    return subtotalAgg
  }
}

export default {
  getSubtotalKeys,
  isSubtotalKey,
  generateRowKeysWithSubtotals,
  generateColKeysWithSubtotals,
  createSubtotalAggregatorGetter
}
