/**
 * Type definitions for @vue-pivottable/subtotal-renderer
 */

import { Component } from 'vue'

// ============================================================================
// Subtotal Options
// ============================================================================

export interface SubtotalDisplayOptions {
  /** Display subtotals on top of the group (default: false) */
  displayOnTop?: boolean
  /** Enable subtotals (default: true) */
  enabled?: boolean
  /** Hide subtotals when group is expanded (default: false) */
  hideOnExpand?: boolean
}

export interface SubtotalOptions {
  /** Column subtotal display options */
  colSubtotalDisplay?: SubtotalDisplayOptions
  /** Row subtotal display options */
  rowSubtotalDisplay?: SubtotalDisplayOptions
  /** Arrow character for collapsed state (default: '▶') */
  arrowCollapsed?: string
  /** Arrow character for expanded state (default: '▼') */
  arrowExpanded?: string
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Generate all possible subtotal key combinations for a given key
 * @param key - The full key array
 * @returns Array of partial keys for subtotals
 */
export function getSubtotalKeys(key: string[]): string[][]

/**
 * Check if a key represents a subtotal row/column
 * @param key - The key to check
 * @param maxDepth - Maximum depth (number of attributes)
 */
export function isSubtotalKey(key: string[], maxDepth: number): boolean

/**
 * Row/Column key with subtotal information
 */
export interface SubtotalKeyInfo {
  key: string[]
  isSubtotal: boolean
  level: number
  isCollapsed: boolean
}

/**
 * Generate row keys with subtotals inserted
 * @param rowKeys - Original row keys from PivotData
 * @param rowAttrsCount - Number of row attributes
 * @param collapsedKeys - Set of collapsed key strings
 */
export function generateRowKeysWithSubtotals(
  rowKeys: string[][],
  rowAttrsCount: number,
  collapsedKeys?: Set<string>
): SubtotalKeyInfo[]

/**
 * Generate column keys with subtotals inserted
 * @param colKeys - Original column keys from PivotData
 * @param colAttrsCount - Number of column attributes
 * @param collapsedKeys - Set of collapsed key strings
 */
export function generateColKeysWithSubtotals(
  colKeys: string[][],
  colAttrsCount: number,
  collapsedKeys?: Set<string>
): SubtotalKeyInfo[]

/**
 * Create a subtotal-aware aggregator getter
 * @param pivotData - The PivotData instance
 */
export function createSubtotalAggregatorGetter(pivotData: any): (
  rowKey: string[],
  colKey: string[]
) => { value: () => any; format: (val: any) => string }

// ============================================================================
// Renderer Props
// ============================================================================

export interface SubtotalRendererProps {
  data: any[] | object | Function
  aggregators?: Record<string, Function>
  aggregatorName?: string
  cols?: string[]
  rows?: string[]
  vals?: string[]
  valueFilter?: Record<string, Record<string, boolean>>
  sorters?: Function | Record<string, Function>
  derivedAttributes?: Function | Record<string, Function>
  rowOrder?: 'key_a_to_z' | 'value_a_to_z' | 'value_z_to_a'
  colOrder?: 'key_a_to_z' | 'value_a_to_z' | 'value_z_to_a'
  tableColorScaleGenerator?: (values: number[]) => (value: number) => { backgroundColor: string }
  tableOptions?: {
    clickCallback?: (
      event: MouseEvent,
      value: any,
      filters: Record<string, any>,
      pivotData: any
    ) => void
  }
  localeStrings?: {
    totals?: string
  }
  rowTotal?: boolean
  colTotal?: boolean
  labels?: Record<string, (value: any) => string>
  subtotalOptions?: SubtotalOptions
}

// ============================================================================
// Renderers
// ============================================================================

export interface SubtotalRendererComponent extends Component {
  name: string
  props: SubtotalRendererProps
}

export interface SubtotalRenderersType {
  'Subtotal Table': SubtotalRendererComponent
}

export const SubtotalRenderers: SubtotalRenderersType

export default SubtotalRenderers
