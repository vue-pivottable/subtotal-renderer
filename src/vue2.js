/**
 * @vue-pivottable/subtotal-renderer - Vue 2 entry point
 *
 * @example
 * import { SubtotalRenderers } from '@vue-pivottable/subtotal-renderer/vue2'
 *
 * <VuePivottable
 *   :data="data"
 *   :renderers="SubtotalRenderers"
 *   rendererName="Subtotal Table"
 * />
 */

export { SubtotalRenderers, createSubtotalRenderers, default } from './vue2/SubtotalTableRenderer.js'
export * from './core/index.js'
