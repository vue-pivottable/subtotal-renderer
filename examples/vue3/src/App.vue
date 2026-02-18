<template>
  <div class="container">
    <h1>Subtotal Renderer - Vue 3 Example</h1>
    <p>Hierarchical pivot table with subtotals for each level</p>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Subtotal Table -->
    <div class="pivot-container" v-if="activeTab === 'subtotal'">
      <h2>Subtotal Table</h2>
      <p class="description">Shows subtotals for each hierarchy level (Category, Subcategory)</p>
      <VuePivottable
        :data="data"
        :rows="['Category', 'Subcategory', 'Product']"
        :cols="['Region', 'City']"
        :vals="['Sales']"
        aggregatorName="Sum"
        :renderers="SubtotalRenderers"
        rendererName="Subtotal Table"
        :tableOptions="tableOptions"
      />
    </div>

    <!-- Subtotal Table UI -->
    <div class="pivot-container" v-if="activeTab === 'subtotal-ui'">
      <h2>Subtotal Table with UI</h2>
      <p class="description">Interactive pivot table with drag-and-drop configuration</p>
      <VuePivottableUi
        :data="data"
        :rows="['Category', 'Subcategory']"
        :cols="['Region']"
        :vals="['Sales']"
        aggregatorName="Sum"
        :renderers="SubtotalRenderers"
        rendererName="Subtotal Table"
        :tableOptions="tableOptions"
      />
    </div>

    <!-- Simple Example -->
    <div class="pivot-container" v-if="activeTab === 'simple'">
      <h2>Simple Subtotal (2-Level)</h2>
      <p class="description">Subtotals with 2-level row hierarchy</p>
      <VuePivottable
        :data="data"
        :rows="['Category', 'Subcategory']"
        :cols="['Region']"
        :vals="['Sales']"
        aggregatorName="Sum"
        :renderers="SubtotalRenderers"
        rendererName="Subtotal Table"
      />
    </div>

    <!-- Row Only -->
    <div class="pivot-container" v-if="activeTab === 'row-only'">
      <h2>Row Subtotals Only</h2>
      <p class="description">Hierarchical rows without column grouping</p>
      <VuePivottable
        :data="data"
        :rows="['Category', 'Subcategory', 'Product']"
        :cols="[]"
        :vals="['Sales']"
        aggregatorName="Sum"
        :renderers="SubtotalRenderers"
        rendererName="Subtotal Table"
      />
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { VuePivottable, VuePivottableUi, PivotUtilities } from 'vue-pivottable'
import { createSubtotalRenderers } from '@vue-pivottable/subtotal-renderer'
import 'vue-pivottable/dist/vue-pivottable.css'

// Create SubtotalRenderers with PivotData from vue-pivottable
const SubtotalRenderers = createSubtotalRenderers(PivotUtilities.PivotData)

const activeTab = ref('subtotal')

const tabs = [
  { id: 'subtotal', label: 'Subtotal Table' },
  { id: 'subtotal-ui', label: 'With UI' },
  { id: 'simple', label: 'Simple (2-Level)' },
  { id: 'row-only', label: 'Row Only' }
]

// Sample hierarchical data
const data = [
  // Electronics - Computers
  { Category: 'Electronics', Subcategory: 'Computers', Product: 'Laptop', Region: 'North', City: 'Seoul', Sales: 1500 },
  { Category: 'Electronics', Subcategory: 'Computers', Product: 'Desktop', Region: 'North', City: 'Seoul', Sales: 1200 },
  { Category: 'Electronics', Subcategory: 'Computers', Product: 'Laptop', Region: 'North', City: 'Busan', Sales: 800 },
  { Category: 'Electronics', Subcategory: 'Computers', Product: 'Desktop', Region: 'North', City: 'Busan', Sales: 600 },
  { Category: 'Electronics', Subcategory: 'Computers', Product: 'Laptop', Region: 'South', City: 'Daegu', Sales: 950 },
  { Category: 'Electronics', Subcategory: 'Computers', Product: 'Desktop', Region: 'South', City: 'Daegu', Sales: 700 },
  // Electronics - Phones
  { Category: 'Electronics', Subcategory: 'Phones', Product: 'iPhone', Region: 'North', City: 'Seoul', Sales: 2000 },
  { Category: 'Electronics', Subcategory: 'Phones', Product: 'Galaxy', Region: 'North', City: 'Seoul', Sales: 1800 },
  { Category: 'Electronics', Subcategory: 'Phones', Product: 'iPhone', Region: 'North', City: 'Busan', Sales: 1200 },
  { Category: 'Electronics', Subcategory: 'Phones', Product: 'Galaxy', Region: 'North', City: 'Busan', Sales: 1100 },
  { Category: 'Electronics', Subcategory: 'Phones', Product: 'iPhone', Region: 'South', City: 'Daegu', Sales: 900 },
  { Category: 'Electronics', Subcategory: 'Phones', Product: 'Galaxy', Region: 'South', City: 'Daegu', Sales: 850 },
  // Clothing - Tops
  { Category: 'Clothing', Subcategory: 'Tops', Product: 'T-Shirt', Region: 'North', City: 'Seoul', Sales: 300 },
  { Category: 'Clothing', Subcategory: 'Tops', Product: 'Blouse', Region: 'North', City: 'Seoul', Sales: 450 },
  { Category: 'Clothing', Subcategory: 'Tops', Product: 'T-Shirt', Region: 'North', City: 'Busan', Sales: 250 },
  { Category: 'Clothing', Subcategory: 'Tops', Product: 'Blouse', Region: 'North', City: 'Busan', Sales: 380 },
  { Category: 'Clothing', Subcategory: 'Tops', Product: 'T-Shirt', Region: 'South', City: 'Daegu', Sales: 200 },
  { Category: 'Clothing', Subcategory: 'Tops', Product: 'Blouse', Region: 'South', City: 'Daegu', Sales: 320 },
  // Clothing - Bottoms
  { Category: 'Clothing', Subcategory: 'Bottoms', Product: 'Jeans', Region: 'North', City: 'Seoul', Sales: 500 },
  { Category: 'Clothing', Subcategory: 'Bottoms', Product: 'Skirt', Region: 'North', City: 'Seoul', Sales: 400 },
  { Category: 'Clothing', Subcategory: 'Bottoms', Product: 'Jeans', Region: 'North', City: 'Busan', Sales: 420 },
  { Category: 'Clothing', Subcategory: 'Bottoms', Product: 'Skirt', Region: 'North', City: 'Busan', Sales: 350 },
  { Category: 'Clothing', Subcategory: 'Bottoms', Product: 'Jeans', Region: 'South', City: 'Daegu', Sales: 380 },
  { Category: 'Clothing', Subcategory: 'Bottoms', Product: 'Skirt', Region: 'South', City: 'Daegu', Sales: 290 },
]

const tableOptions = {
  clickCallback: (e, value, filters, pivotData) => {
    console.log('Cell clicked:', { value, filters })
    alert(`Clicked cell: ${value}\nFilters: ${JSON.stringify(filters, null, 2)}`)
  }
}
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #fff;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h1 {
  color: #1a1a2e;
  margin-bottom: 8px;
  font-size: 1.8em;
}

h2 {
  color: #333;
  margin-bottom: 8px;
  font-size: 1.2em;
}

h3 {
  color: #555;
  margin-bottom: 10px;
  font-size: 1em;
}

p {
  color: #666;
  margin-bottom: 20px;
}

.description {
  font-size: 0.9em;
  color: #888;
  margin-bottom: 15px;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tabs button {
  padding: 12px 24px;
  border: 1px solid #ddd;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  color: #555;
}

.tabs button:hover {
  background: #f0f0f0;
  border-color: #ccc;
}

.tabs button.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.pivot-container {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin-bottom: 20px;
  overflow-x: auto;
}

/* Responsive */
@media (max-width: 768px) {
  h1 {
    font-size: 1.4em;
  }

  .tabs button {
    padding: 10px 16px;
    font-size: 13px;
  }

  .pivot-container {
    padding: 15px;
  }
}
</style>
