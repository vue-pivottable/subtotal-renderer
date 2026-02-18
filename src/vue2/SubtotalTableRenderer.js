/**
 * SubtotalTableRenderer for Vue 2
 *
 * Renders a pivot table with subtotals and expand/collapse functionality.
 */

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
 * @param {Set} collapsedKeys - Set of collapsed key strings (JSON stringified)
 * @returns {Array} Row keys with subtotals
 */
function generateRowKeysWithSubtotals(rowKeys, depth, collapsedKeys = new Set()) {
  if (depth <= 1) {
    return rowKeys.map(key => ({ key, isSubtotal: false, level: key.length }))
  }

  const result = []
  const addedSubtotals = new Set()

  for (let i = 0; i < rowKeys.length; i++) {
    const rowKey = rowKeys[i]

    // Check if this row is hidden due to a collapsed parent
    let isHidden = false
    for (let level = 1; level < rowKey.length; level++) {
      const parentKey = rowKey.slice(0, level)
      const parentKeyStr = JSON.stringify(parentKey)
      if (collapsedKeys.has(parentKeyStr)) {
        isHidden = true
        break
      }
    }

    // Add subtotal rows before detail rows when they haven't been added yet
    for (let level = 1; level < rowKey.length; level++) {
      const subtotalKey = rowKey.slice(0, level)
      const subtotalKeyStr = JSON.stringify(subtotalKey)

      if (!addedSubtotals.has(subtotalKeyStr)) {
        addedSubtotals.add(subtotalKeyStr)

        // Check if parent of this subtotal is collapsed
        let subtotalHidden = false
        for (let parentLevel = 1; parentLevel < level; parentLevel++) {
          const parentKey = subtotalKey.slice(0, parentLevel)
          if (collapsedKeys.has(JSON.stringify(parentKey))) {
            subtotalHidden = true
            break
          }
        }

        if (!subtotalHidden) {
          const isCollapsed = collapsedKeys.has(subtotalKeyStr)
          result.push({
            key: subtotalKey,
            isSubtotal: true,
            level: level,
            subtotalLabel: `${subtotalKey[level - 1]} Subtotal`,
            isCollapsed: isCollapsed
          })
        }
      }
    }

    // Add detail row if not hidden
    if (!isHidden) {
      result.push({ key: rowKey, isSubtotal: false, level: rowKey.length })
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

/**
 * Generate column keys with subtotals
 * @param {Array} colKeys - Original column keys
 * @param {number} depth - Number of column attributes
 * @param {Set} collapsedKeys - Set of collapsed key strings (JSON stringified)
 * @returns {Array} Column keys with subtotals
 */
function generateColKeysWithSubtotals(colKeys, depth, collapsedKeys = new Set()) {
  if (depth <= 1) {
    return colKeys.map(key => ({ key, isSubtotal: false, level: key.length }))
  }

  const result = []
  const addedSubtotals = new Set()

  for (let i = 0; i < colKeys.length; i++) {
    const colKey = colKeys[i]

    // Check if this column is hidden due to a collapsed parent
    let isHidden = false
    for (let level = 1; level < colKey.length; level++) {
      const parentKey = colKey.slice(0, level)
      const parentKeyStr = JSON.stringify(parentKey)
      if (collapsedKeys.has(parentKeyStr)) {
        isHidden = true
        break
      }
    }

    // Add subtotal columns before detail columns when they haven't been added yet
    for (let level = 1; level < colKey.length; level++) {
      const subtotalKey = colKey.slice(0, level)
      const subtotalKeyStr = JSON.stringify(subtotalKey)

      if (!addedSubtotals.has(subtotalKeyStr)) {
        addedSubtotals.add(subtotalKeyStr)

        // Check if parent of this subtotal is collapsed
        let subtotalHidden = false
        for (let parentLevel = 1; parentLevel < level; parentLevel++) {
          const parentKey = subtotalKey.slice(0, parentLevel)
          if (collapsedKeys.has(JSON.stringify(parentKey))) {
            subtotalHidden = true
            break
          }
        }

        if (!subtotalHidden) {
          const isCollapsed = collapsedKeys.has(subtotalKeyStr)
          result.push({
            key: subtotalKey,
            isSubtotal: true,
            level: level,
            subtotalLabel: `${subtotalKey[level - 1]} Subtotal`,
            isCollapsed: isCollapsed
          })
        }
      }
    }

    // Add detail column if not hidden
    if (!isHidden) {
      result.push({ key: colKey, isSubtotal: false, level: colKey.length })
    }
  }

  return result
}

/**
 * Calculate span size for subtotal-aware column headers
 */
function colSpanSizeWithSubtotals(colItems, i, j) {
  // For subtotal columns, don't merge horizontally
  if (colItems[i].isSubtotal) {
    return 1
  }

  const arr = colItems.map(item => item.key)

  // Check if this cell should be merged with previous column
  if (i !== 0 && !colItems[i - 1].isSubtotal) {
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

  // Calculate how many columns have the same value (excluding subtotal columns)
  let len = 0
  while (i + len < arr.length) {
    // Stop at subtotal columns
    if (colItems[i + len].isSubtotal) break

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
    data() {
      return {
        collapsedRowKeys: new Set(),
        collapsedColKeys: new Set()
      }
    },
    methods: {
      toggleRowCollapse(keyStr) {
        if (this.collapsedRowKeys.has(keyStr)) {
          this.collapsedRowKeys.delete(keyStr)
        } else {
          this.collapsedRowKeys.add(keyStr)
        }
        this.collapsedRowKeys = new Set(this.collapsedRowKeys)
        this.$forceUpdate()
      },
      toggleColCollapse(keyStr) {
        if (this.collapsedColKeys.has(keyStr)) {
          this.collapsedColKeys.delete(keyStr)
        } else {
          this.collapsedColKeys.add(keyStr)
        }
        this.collapsedColKeys = new Set(this.collapsedColKeys)
        this.$forceUpdate()
      },
      applyLabel(attr, value) {
        if (this.labels && typeof this.labels[attr] === 'function') {
          return this.labels[attr](value)
        }
        return value
      }
    },
    render(h) {
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

      // Generate row keys with subtotals (pass collapsed state)
      const rowKeysWithSubtotals = generateRowKeysWithSubtotals(rowKeys, rowAttrs.length, this.collapsedRowKeys)

      // Generate column keys with subtotals (pass collapsed state)
      const colKeysWithSubtotals = generateColKeysWithSubtotals(colKeys, colAttrs.length, this.collapsedColKeys)

      const subtotalOpts = this.subtotalOptions
      const arrowCollapsed = subtotalOpts.arrowCollapsed || '\u25B6'
      const arrowExpanded = subtotalOpts.arrowExpanded || '\u25BC'

      // Click handler
      const getClickHandler = (value, rowValues, colValues) => {
        if (this.tableOptions && this.tableOptions.clickCallback) {
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
              attrs: {
                colSpan: rowAttrs.length,
                rowSpan: colAttrs.length
              }
            }))
          }

          // Column attribute label
          cells.push(h('th', { class: 'pvtAxisLabel' }, c))

          // Column values with proper colspan (using subtotal-aware keys)
          colKeysWithSubtotals.forEach((colItem, i) => {
            const { key: colKey, isSubtotal, level } = colItem

            // Only render if this is the correct row for this column's level
            if (j < colKey.length) {
              const colSpan = colSpanSizeWithSubtotals(colKeysWithSubtotals, i, j)
              if (colSpan !== -1) {
                const isLastAttrRow = j === colKey.length - 1

                if (isSubtotal && isLastAttrRow) {
                  // Subtotal column header with collapse toggle
                  const keyStr = JSON.stringify(colKey)
                  const isCollapsed = this.collapsedColKeys.has(keyStr)
                  const arrow = isCollapsed ? arrowCollapsed : arrowExpanded
                  const label = `${colKey[j]} Subtotal`

                  cells.push(h('th', {
                    class: 'pvtColLabel pvtColSubtotalLabel',
                    key: `colKey${i}-${j}`,
                    attrs: {
                      colSpan: colSpan,
                      rowSpan: (colAttrs.length - j) + (rowAttrs.length !== 0 ? 1 : 0)
                    },
                    style: {
                      fontWeight: 'bold',
                      backgroundColor: '#f0f0f0'
                    }
                  }, [
                    h('span', {
                      class: 'pvtColCollapseToggle',
                      style: {
                        cursor: 'pointer',
                        marginRight: '4px',
                        userSelect: 'none'
                      },
                      on: {
                        click: (e) => {
                          e.stopPropagation()
                          this.toggleColCollapse(keyStr)
                        }
                      }
                    }, arrow),
                    label
                  ]))
                } else {
                  // Normal column header
                  const label = this.applyLabel(colAttrs[j], colKey[j])
                  const rowSpan = isLastAttrRow && rowAttrs.length !== 0 ? 2 : 1

                  cells.push(h('th', {
                    class: 'pvtColLabel',
                    key: `colKey${i}-${j}`,
                    attrs: {
                      colSpan: colSpan,
                      rowSpan: rowSpan
                    }
                  }, label))
                }
              }
            }
          })

          // Row total header
          if (j === 0 && this.rowTotal) {
            cells.push(h('th', {
              class: 'pvtTotalLabel',
              attrs: {
                rowSpan: colAttrs.length + (rowAttrs.length === 0 ? 0 : 1)
              }
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

          // Add empty cell for alignment with column attribute label cell
          if (colAttrs.length !== 0) {
            cells.push(h('th'))
          }

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
            // Render subtotal row with collapse toggle
            const keyStr = JSON.stringify(rowKey)
            const isCollapsed = this.collapsedRowKeys.has(keyStr)
            const arrow = isCollapsed ? arrowCollapsed : arrowExpanded
            const subtotalText = subtotalLabel || `${rowKey[rowKey.length - 1]} Subtotal`

            cells.push(h('th', {
              class: 'pvtRowLabel pvtSubtotalLabel',
              attrs: {
                colSpan: rowAttrs.length + (colAttrs.length !== 0 ? 1 : 0)
              },
              style: {
                fontWeight: 'bold',
                backgroundColor: '#f0f0f0'
              }
            }, [
              h('span', {
                class: 'pvtCollapseToggle',
                style: {
                  cursor: 'pointer',
                  marginRight: '6px',
                  userSelect: 'none'
                },
                on: {
                  click: (e) => {
                    e.stopPropagation()
                    this.toggleRowCollapse(keyStr)
                  }
                }
              }, arrow),
              subtotalText
            ]))

            // Data cells for subtotal row
            colKeysWithSubtotals.forEach((colItem, j) => {
              const { key: colKey, isSubtotal: isColSubtotal } = colItem
              const aggregator = getAggregator(rowKey, colKey)
              const val = aggregator.value()
              const formattedVal = aggregator.format ? aggregator.format(val) : val
              const clickHandler = getClickHandler(val, rowKey, colKey)

              const isDoubleSubtotal = isColSubtotal // row is already subtotal
              cells.push(h('td', {
                class: isColSubtotal ? 'pvtVal pvtSubtotalVal pvtColSubtotalVal' : 'pvtVal pvtSubtotalVal',
                key: `subtotal-val${i}-${j}`,
                style: {
                  fontWeight: 'bold',
                  backgroundColor: isDoubleSubtotal ? '#e0e0e0' : '#f0f0f0'
                },
                on: clickHandler ? { click: clickHandler } : {}
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
                on: clickHandler ? { click: clickHandler } : {}
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
                const label = this.applyLabel(rowAttrs[j], text)
                cells.push(h('th', {
                  class: 'pvtRowLabel',
                  key: `rowLabel${i}-${j}`,
                  attrs: {
                    rowSpan: rowSpan,
                    colSpan: j === rowAttrs.length - 1 && colAttrs.length !== 0 ? 2 : 1
                  }
                }, label))
              }
            })

            // Data cells
            colKeysWithSubtotals.forEach((colItem, j) => {
              const { key: colKey, isSubtotal: isColSubtotal } = colItem
              const aggregator = getAggregator(rowKey, colKey)
              const val = aggregator.value()
              const formattedVal = aggregator.format ? aggregator.format(val) : val
              const clickHandler = getClickHandler(val, rowKey, colKey)

              cells.push(h('td', {
                class: isColSubtotal ? 'pvtVal pvtColSubtotalVal' : 'pvtVal',
                key: `val${i}-${j}`,
                style: isColSubtotal ? {
                  fontWeight: 'bold',
                  backgroundColor: '#f0f0f0'
                } : undefined,
                on: clickHandler ? { click: clickHandler } : {}
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
                on: clickHandler ? { click: clickHandler } : {}
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
            attrs: {
              colSpan: rowAttrs.length + (colAttrs.length === 0 ? 0 : 1)
            }
          }, this.localeStrings.totals))

          colKeysWithSubtotals.forEach((colItem, i) => {
            const { key: colKey, isSubtotal: isColSubtotal } = colItem
            const totalAggregator = getAggregator([], colKey)
            const totalVal = totalAggregator.value()
            const formattedTotal = totalAggregator.format ? totalAggregator.format(totalVal) : totalVal
            const clickHandler = getClickHandler(totalVal, [], colKey)

            cells.push(h('td', {
              class: isColSubtotal ? 'pvtTotal pvtColSubtotalTotal' : 'pvtTotal',
              key: `colTotal${i}`,
              style: isColSubtotal ? {
                fontWeight: 'bold',
                backgroundColor: '#e0e0e0'
              } : undefined,
              on: clickHandler ? { click: clickHandler } : {}
            }, formattedTotal))
          })

          // Grand total
          if (this.rowTotal) {
            const clickHandler = getClickHandler(grandTotalAggregator.value(), [], [])
            cells.push(h('td', {
              class: 'pvtGrandTotal',
              on: clickHandler ? { click: clickHandler } : {}
            }, grandTotalAggregator.format(grandTotalAggregator.value())))
          }

          bodyRows.push(h('tr', cells))
        }

        return h('tbody', bodyRows)
      }

      return h('table', { class: 'pvtTable' }, [
        renderHeader(),
        renderBody()
      ])
    }
  }
}

// Export renderers
export const SubtotalRenderers = {
  'Subtotal Table': makeSubtotalRenderer({ name: 'vue-subtotal-table' })
}

export default SubtotalRenderers
