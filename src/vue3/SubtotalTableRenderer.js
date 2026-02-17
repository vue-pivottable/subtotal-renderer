/**
 * SubtotalTableRenderer for Vue 3
 *
 * Renders a pivot table with subtotals and expand/collapse functionality.
 */

import { h, reactive } from 'vue'
import {
  createSubtotalAggregatorGetter
} from '../core/SubtotalPivotData.js'

function redColorScaleGenerator(values) {
  const min = Math.min.apply(Math, values)
  const max = Math.max.apply(Math, values)
  return x => {
    const nonRed = 255 - Math.round(255 * (x - min) / (max - min))
    return { backgroundColor: `rgb(255,${nonRed},${nonRed})` }
  }
}

// Store PivotData class reference
let _PivotData = null

/**
 * Create SubtotalRenderers with injected PivotData class
 * @param {Class} PivotData - The PivotData class from vue-pivottable
 * @returns {Object} SubtotalRenderers object
 */
export function createSubtotalRenderers(PivotData) {
  _PivotData = PivotData
  return {
    'Subtotal Table': makeSubtotalRenderer({ name: 'vue-subtotal-table' })
  }
}

/**
 * Generate row keys with subtotals inserted after each group
 * @param {Array} rowKeys - Original row keys
 * @param {number} depth - Number of row attributes
 * @returns {Array} Row keys with subtotals
 */
function generateRowKeysWithSubtotals(rowKeys, depth) {
  if (depth <= 1) {
    return rowKeys.map(key => ({ key, isSubtotal: false, level: key.length }))
  }

  const result = []
  let lastKeys = []

  for (let i = 0; i < rowKeys.length; i++) {
    const rowKey = rowKeys[i]
    const nextRowKey = rowKeys[i + 1]

    // Add the detail row
    result.push({ key: rowKey, isSubtotal: false, level: rowKey.length })

    // Check if we need to add subtotals after this row
    // We add subtotals when the next row differs at a certain level
    for (let level = depth - 1; level >= 1; level--) {
      const currentPrefix = rowKey.slice(0, level)
      const nextPrefix = nextRowKey ? nextRowKey.slice(0, level) : null

      // Check if this level changes in the next row
      const levelChanges = !nextPrefix || JSON.stringify(currentPrefix) !== JSON.stringify(nextPrefix)

      if (levelChanges) {
        // Add subtotal for this level
        result.push({
          key: currentPrefix,
          isSubtotal: true,
          level: level,
          subtotalLabel: `${currentPrefix[level - 1]} Subtotal`
        })
      }
    }
  }

  return result
}

/**
 * Calculate span size for merged cells (for subtotal-aware keys)
 */
function spanSize(rowItems, i, j) {
  const arr = rowItems.map(item => item.key)

  // For subtotal rows, don't merge
  if (rowItems[i].isSubtotal) {
    return 1
  }

  // Check if this cell should be merged with previous row
  if (i !== 0 && !rowItems[i - 1].isSubtotal) {
    let asPrevious = true
    for (let x = 0; x <= j; x++) {
      if (arr[i - 1][x] !== arr[i][x]) {
        asPrevious = false
        break
      }
    }
    if (asPrevious) {
      return -1 // Don't render, merged with above
    }
  }

  // Calculate how many rows have the same value (excluding subtotal rows)
  let len = 0
  while (i + len < arr.length) {
    // Stop at subtotal rows
    if (rowItems[i + len].isSubtotal) break

    let same = true
    for (let x = 0; x <= j; x++) {
      if (arr[i][x] !== arr[i + len][x]) {
        same = false
        break
      }
    }
    if (!same) break
    len++
  }
  return len
}

/**
 * Calculate span size for column headers
 */
function colSpanSize(arr, i, j) {
  if (i !== 0) {
    let asPrevious = true
    for (let x = 0; x <= j; x++) {
      if (arr[i - 1][x] !== arr[i][x]) {
        asPrevious = false
        break
      }
    }
    if (asPrevious) {
      return -1
    }
  }

  let len = 0
  while (i + len < arr.length) {
    let same = true
    for (let x = 0; x <= j; x++) {
      if (arr[i][x] !== arr[i + len][x]) {
        same = false
        break
      }
    }
    if (!same) break
    len++
  }
  return len
}

function makeSubtotalRenderer(opts = {}) {
  return {
    name: opts.name || 'vue-subtotal-table',
    props: {
      data: {
        type: [Array, Object, Function],
        required: true
      },
      aggregators: Object,
      aggregatorName: {
        type: String,
        default: 'Count'
      },
      cols: {
        type: Array,
        default: () => []
      },
      rows: {
        type: Array,
        default: () => []
      },
      vals: {
        type: Array,
        default: () => []
      },
      valueFilter: {
        type: Object,
        default: () => ({})
      },
      sorters: {
        type: [Function, Object],
        default: () => ({})
      },
      derivedAttributes: {
        type: [Function, Object],
        default: () => ({})
      },
      rowOrder: {
        type: String,
        default: 'key_a_to_z'
      },
      colOrder: {
        type: String,
        default: 'key_a_to_z'
      },
      tableColorScaleGenerator: {
        type: Function,
        default: redColorScaleGenerator
      },
      tableOptions: {
        type: Object,
        default: () => ({})
      },
      localeStrings: {
        type: Object,
        default: () => ({
          totals: 'Totals'
        })
      },
      rowTotal: {
        type: Boolean,
        default: true
      },
      colTotal: {
        type: Boolean,
        default: true
      },
      labels: {
        type: Object,
        default: () => ({})
      },
      // Subtotal specific props
      subtotalOptions: {
        type: Object,
        default: () => ({
          colSubtotalDisplay: {
            displayOnTop: false,
            enabled: true,
            hideOnExpand: false
          },
          rowSubtotalDisplay: {
            displayOnTop: false,
            enabled: true,
            hideOnExpand: false
          },
          arrowCollapsed: '\u25B6',
          arrowExpanded: '\u25BC'
        })
      }
    },
    setup(props) {
      const state = reactive({
        collapsedRowKeys: new Set(),
        collapsedColKeys: new Set()
      })

      const toggleRowCollapse = (keyStr) => {
        if (state.collapsedRowKeys.has(keyStr)) {
          state.collapsedRowKeys.delete(keyStr)
        } else {
          state.collapsedRowKeys.add(keyStr)
        }
        state.collapsedRowKeys = new Set(state.collapsedRowKeys)
      }

      const toggleColCollapse = (keyStr) => {
        if (state.collapsedColKeys.has(keyStr)) {
          state.collapsedColKeys.delete(keyStr)
        } else {
          state.collapsedColKeys.add(keyStr)
        }
        state.collapsedColKeys = new Set(state.collapsedColKeys)
      }

      const applyLabel = (attr, value) => {
        if (props.labels && typeof props.labels[attr] === 'function') {
          return props.labels[attr](value)
        }
        return value
      }

      return { state, toggleRowCollapse, toggleColCollapse, applyLabel }
    },
    render() {
      const { state, toggleRowCollapse, toggleColCollapse, applyLabel } = this

      // Use injected PivotData class
      if (!_PivotData) {
        console.error('PivotData not initialized. Please use createSubtotalRenderers(PivotData) first.')
        return h('div', 'Error: PivotData not initialized. Use createSubtotalRenderers(PivotData).')
      }

      let pivotData
      try {
        pivotData = new _PivotData(this.$props)
      } catch (error) {
        console.error(error)
        return h('span', 'Error rendering pivot table')
      }

      const colAttrs = pivotData.props.cols
      const rowAttrs = pivotData.props.rows
      const rowKeys = pivotData.getRowKeys()
      const colKeys = pivotData.getColKeys()
      const grandTotalAggregator = pivotData.getAggregator([], [])

      // Create subtotal-aware aggregator getter
      const getAggregator = createSubtotalAggregatorGetter(pivotData)

      // Generate row keys with subtotals
      const rowKeysWithSubtotals = generateRowKeysWithSubtotals(rowKeys, rowAttrs.length)

      const subtotalOpts = this.subtotalOptions
      const arrowCollapsed = subtotalOpts.arrowCollapsed || '\u25B6'
      const arrowExpanded = subtotalOpts.arrowExpanded || '\u25BC'

      // Click handler
      const getClickHandler = (value, rowValues, colValues) => {
        if (this.tableOptions?.clickCallback) {
          const filters = {}
          colAttrs.forEach((attr, i) => {
            if (colValues[i] !== undefined && colValues[i] !== null) {
              filters[attr] = colValues[i]
            }
          })
          rowAttrs.forEach((attr, i) => {
            if (rowValues[i] !== undefined && rowValues[i] !== null) {
              filters[attr] = rowValues[i]
            }
          })
          return e => this.tableOptions.clickCallback(e, value, filters, pivotData)
        }
        return null
      }

      // Render table header
      const renderHeader = () => {
        const headerRows = []

        // Column attribute headers
        colAttrs.forEach((c, j) => {
          const cells = []

          // Empty cell for row headers
          if (j === 0 && rowAttrs.length !== 0) {
            cells.push(h('th', {
              colSpan: rowAttrs.length,
              rowSpan: colAttrs.length,
              style: {
                backgroundColor: '#f5f5f5'
              }
            }))
          }

          // Column attribute label
          cells.push(h('th', { class: 'pvtAxisLabel' }, c))

          // Column values with proper colspan
          colKeys.forEach((colKey, i) => {
            const colSpan = colSpanSize(colKeys, i, j)
            if (colSpan !== -1) {
              const label = applyLabel(colAttrs[j], colKey[j])
              cells.push(h('th', {
                class: 'pvtColLabel',
                key: `colKey${i}-${j}`,
                colSpan: colSpan,
                rowSpan: j === colAttrs.length - 1 && rowAttrs.length !== 0 ? 2 : 1
              }, label))
            }
          })

          // Row total header
          if (j === 0 && this.rowTotal) {
            cells.push(h('th', {
              class: 'pvtTotalLabel',
              rowSpan: colAttrs.length + (rowAttrs.length === 0 ? 0 : 1)
            }, this.localeStrings.totals))
          }

          headerRows.push(h('tr', { key: `colAttr${j}` }, cells))
        })

        // Row attribute labels row
        if (rowAttrs.length !== 0) {
          const cells = rowAttrs.map((r, i) => h('th', {
            class: 'pvtAxisLabel',
            key: `rowAttr${i}`
          }, r))

          if (colAttrs.length === 0 && this.rowTotal) {
            cells.push(h('th', { class: 'pvtTotalLabel' }, this.localeStrings.totals))
          }

          headerRows.push(h('tr', cells))
        }

        return h('thead', headerRows)
      }

      // Render table body with subtotals
      const renderBody = () => {
        const bodyRows = []

        rowKeysWithSubtotals.forEach((rowItem, i) => {
          const { key: rowKey, isSubtotal, level, subtotalLabel } = rowItem
          const cells = []

          if (isSubtotal) {
            // Render subtotal row
            const subtotalText = subtotalLabel || `${rowKey[rowKey.length - 1]} Subtotal`

            cells.push(h('th', {
              class: 'pvtRowLabel pvtSubtotalLabel',
              colSpan: rowAttrs.length + (colAttrs.length !== 0 ? 1 : 0),
              style: {
                fontWeight: 'bold',
                backgroundColor: '#f0f0f0'
              }
            }, subtotalText))

            // Data cells for subtotal
            colKeys.forEach((colKey, j) => {
              const aggregator = getAggregator(rowKey, colKey)
              const val = aggregator.value()
              const formattedVal = aggregator.format ? aggregator.format(val) : val
              const clickHandler = getClickHandler(val, rowKey, colKey)

              cells.push(h('td', {
                class: 'pvtVal pvtSubtotalVal',
                key: `subtotal-val${i}-${j}`,
                style: {
                  fontWeight: 'bold',
                  backgroundColor: '#f0f0f0'
                },
                onClick: clickHandler || undefined
              }, formattedVal))
            })

            // Row total for subtotal
            if (this.rowTotal) {
              const totalAggregator = getAggregator(rowKey, [])
              const totalVal = totalAggregator.value()
              const formattedTotal = totalAggregator.format ? totalAggregator.format(totalVal) : totalVal
              const clickHandler = getClickHandler(totalVal, rowKey, [])

              cells.push(h('td', {
                class: 'pvtTotal pvtSubtotalTotal',
                style: {
                  fontWeight: 'bold',
                  backgroundColor: '#e0e0e0'
                },
                onClick: clickHandler || undefined
              }, formattedTotal))
            }

            bodyRows.push(h('tr', {
              key: `subtotal-row${i}`,
              class: 'pvtSubtotalRow'
            }, cells))
          } else {
            // Render normal row
            rowKey.forEach((text, j) => {
              const rowSpan = spanSize(rowKeysWithSubtotals, i, j)
              if (rowSpan !== -1) {
                const label = applyLabel(rowAttrs[j], text)
                cells.push(h('th', {
                  class: 'pvtRowLabel',
                  key: `rowLabel${i}-${j}`,
                  rowSpan: rowSpan,
                  colSpan: j === rowAttrs.length - 1 && colAttrs.length !== 0 ? 2 : 1
                }, label))
              }
            })

            // Data cells
            colKeys.forEach((colKey, j) => {
              const aggregator = getAggregator(rowKey, colKey)
              const val = aggregator.value()
              const formattedVal = aggregator.format ? aggregator.format(val) : val
              const clickHandler = getClickHandler(val, rowKey, colKey)

              cells.push(h('td', {
                class: 'pvtVal',
                key: `val${i}-${j}`,
                onClick: clickHandler || undefined
              }, formattedVal))
            })

            // Row total cell
            if (this.rowTotal) {
              const totalAggregator = getAggregator(rowKey, [])
              const totalVal = totalAggregator.value()
              const formattedTotal = totalAggregator.format ? totalAggregator.format(totalVal) : totalVal
              const clickHandler = getClickHandler(totalVal, rowKey, [])

              cells.push(h('td', {
                class: 'pvtTotal',
                onClick: clickHandler || undefined
              }, formattedTotal))
            }

            bodyRows.push(h('tr', { key: `row${i}` }, cells))
          }
        })

        // Column totals row
        if (this.colTotal) {
          const cells = []

          cells.push(h('th', {
            class: 'pvtTotalLabel',
            colSpan: rowAttrs.length + (colAttrs.length === 0 ? 0 : 1)
          }, this.localeStrings.totals))

          colKeys.forEach((colKey, i) => {
            const totalAggregator = getAggregator([], colKey)
            const totalVal = totalAggregator.value()
            const formattedTotal = totalAggregator.format ? totalAggregator.format(totalVal) : totalVal
            const clickHandler = getClickHandler(totalVal, [], colKey)

            cells.push(h('td', {
              class: 'pvtTotal',
              key: `colTotal${i}`,
              onClick: clickHandler || undefined
            }, formattedTotal))
          })

          // Grand total
          if (this.rowTotal) {
            const clickHandler = getClickHandler(grandTotalAggregator.value(), [], [])
            cells.push(h('td', {
              class: 'pvtGrandTotal',
              onClick: clickHandler || undefined
            }, grandTotalAggregator.format(grandTotalAggregator.value())))
          }

          bodyRows.push(h('tr', cells))
        }

        return h('tbody', bodyRows)
      }

      return h('table', { class: ['pvtTable', 'pvtSubtotalTable'] }, [
        renderHeader(),
        renderBody()
      ])
    }
  }
}

// Export renderers (legacy - requires createSubtotalRenderers to be called first)
export const SubtotalRenderers = {
  'Subtotal Table': makeSubtotalRenderer({ name: 'vue-subtotal-table' })
}

export default SubtotalRenderers
