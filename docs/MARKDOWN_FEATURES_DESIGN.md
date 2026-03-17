# Comprehensive Markdown Features Design
## For Knobase-App Tiptap Editor

---

## Executive Summary

Enhance the Tiptap editor with advanced markdown features matching the Knobase repo's ChatMessages component. All features must support real-time collaboration via Yjs without compromising performance.

**Key Decisions:**
- Chart Library: **Recharts** (React-friendly, better performance than Chart.js)
- Math: **KaTeX** (faster than MathJax)
- Diagrams: **Mermaid** (native Tiptap support available)
- Export: Charts render as **images** in PDF/DOCX
- Collaboration: **Optimistic Yjs updates** with debouncing

---

## 1. Feature Inventory

### 1.1 Charts (Priority 1 - Your Request)
**Library:** Recharts (react-recharts)

**Supported Types:**
- BarChart (vertical/horizontal)
- LineChart (with area fill option)
- PieChart
- RadarChart
- ComposedChart (mixed types)

**User Experience:**
- Slash command: `/chart`
- Toolbar dropdown with type icons
- **Popup modal** for data editing (not inline)
- Modal shows:
  - Data table (rows/columns) with add/remove
  - Chart type selector
  - Color pickers per dataset
  - Title, axis labels, legend toggle
  - Live preview in modal

**Data Format:**
```json
{
  "type": "bar",
  "data": [
    { "name": "Q1", "revenue": 12000, "expenses": 8000 },
    { "name": "Q2", "revenue": 19000, "expenses": 12000 }
  ],
  "config": {
    "title": "Quarterly Report",
    "xAxis": { "dataKey": "name", "label": "Quarter" },
    "yAxis": { "label": "Amount ($)" },
    "series": [
      { "dataKey": "revenue", "color": "#4f46e5", "label": "Revenue" },
      { "dataKey": "expenses", "color": "#ef4444", "label": "Expenses" }
    ],
    "showLegend": true,
    "showGrid": true
  }
}
```

**Collaboration Strategy:**
- Data changes sync via Yjs (JSON.stringify)
- **Debounce chart re-renders** (300ms) to prevent jank
- Show "editing" indicator when another user has modal open
- Optimistic updates: render immediately, sync in background

**Export:**
- PDF/DOCX: Use html2canvas to capture chart → PNG → embed
- HTML: Full Recharts interactive
- Markdown: ```chart code block with JSON

---

### 1.2 Tables (Priority 2)
**Features:**
- Sortable columns (click header)
- Resizable columns
- Add/remove rows
- Add/remove columns
- Header row styling
- Copy/paste from Excel/Sheets

**User Experience:**
- Slash: `/table`
- Toolbar button
- Inline editing (click cell to edit)
- Context menu: insert row/col, delete, sort

**Collaboration:**
- Cell-level Yjs awareness (show colored cursor per user)
- Row/column operations sync as transactions
- Conflict resolution: last-write-wins for cells

---

### 1.3 Math Equations (Priority 3)
**Library:** KaTeX (faster than MathJax)

**Support:**
- Inline: `$...$` or `\(...\)`
- Block: `$$...$$` or `\[...\]`

**User Experience:**
- Auto-render while typing
- Math toolbar for common symbols
- Preview on hover

**Collaboration:**
- LaTeX source synced via Yjs
- Re-render on source change

---

### 1.4 Code Blocks (Priority 4 - Enhancement)
**Enhance existing code blocks with:**
- Syntax highlighting (Prism.js or Shiki)
- Language selector dropdown
- Copy button
- Line numbers (toggle)
- **Diff highlighting** for collaboration

**Collaboration:**
- Show colored highlights for lines edited by other users
- Line-level cursors

---

### 1.5 Mermaid Diagrams (Priority 5)
**Native Tiptap extension available:** `tiptap-extension-mermaid`

**Support:**
- Flowcharts
- Sequence diagrams
- Gantt charts
- Class diagrams
- State diagrams
- ER diagrams

**User Experience:**
- Code block with language `mermaid`
- Live preview
- Diagram type auto-detection

**Collaboration:**
- Mermaid source synced via Yjs
- Re-render on change (debounced)

---

### 1.6 Link Previews (Priority 6)
**Features:**
- YouTube embeds
- URL unfurling (title, description, image)
- GitHub repo cards
- Figma file embeds

**Implementation:**
- Auto-detect URLs on paste
- Fetch metadata server-side (to avoid CORS)
- Cache metadata

---

## 2. Architecture

### 2.1 File Structure
```
lib/editor/extensions/
├── chart-extension.ts              # Recharts integration
├── table-extension.ts              # Enhanced tables
├── math-extension.ts               # KaTeX integration
├── mermaid-extension.ts            # Mermaid diagrams
├── code-block-enhanced.ts          # Enhanced code blocks
├── link-preview-extension.ts       # URL unfurling
└── index.ts                        # Export all

components/editor/blocks/
├── ChartBlock/
│   ├── ChartBlock.tsx              # Recharts renderer
│   ├── ChartEditModal.tsx          # Data editing modal
│   ├── ChartDataTable.tsx          # Table-based data editor
│   └── ChartTypeSelector.tsx       # Type picker
├── TableBlock/
│   ├── TableBlock.tsx              # Sortable/resizable table
│   └── TableCell.tsx               # Editable cell
├── MathBlock/
│   ├── MathBlock.tsx               # KaTeX renderer
│   └── MathInline.tsx              # Inline math
├── MermaidBlock/
│   └── MermaidBlock.tsx            # Mermaid renderer
├── CodeBlock/
│   └── EnhancedCodeBlock.tsx       # Prism + copy + line nums
└── LinkPreview/
    ├── LinkPreviewBlock.tsx        # Generic preview
    ├── YouTubeEmbed.tsx            # YouTube specific
    └── GitHubCard.tsx              # GitHub specific

components/editor/modals/
├── ChartEditModal.tsx              # Chart data editor
└── TableConfigModal.tsx            # Table properties

lib/editor/export/
├── html2canvas-utils.ts            # Chart → image conversion
├── pdf-exporter.ts                 # PDF generation
├── docx-exporter.ts                # DOCX generation
└── markdown-serializer.ts          # Markdown export
```

### 2.2 Collaboration Architecture

**Yjs Document Structure:**
```
YDoc
├── content (Y.XmlFragment)        # Tiptap content
├── charts (Y.Map)                 # Chart data by ID
│   └── chart-{id}: { json }
├── tables (Y.Map)                 # Table configs
└── awareness (Y.Awareness)        # User cursors/selections
```

**Performance Optimizations:**
1. **Debounced Re-renders:**
   - Charts: 300ms debounce on data change
   - Mermaid: 500ms debounce
   - Math: 100ms debounce (KaTeX is fast)

2. **Lazy Loading:**
   - Load Recharts only when chart first appears
   - Load KaTeX only when math first appears
   - Load Mermaid only when diagram first appears

3. **Virtual Scrolling:**
   - For large tables (>50 rows)
   - For documents with many blocks

4. **Server-Side Rendering:**
   - Pre-render charts as SVG for export
   - Cache rendered outputs

---

## 3. Implementation Details

### 3.1 Chart Extension (Recharts)

```typescript
// lib/editor/extensions/chart-extension.ts
import { Node, ReactNodeViewRenderer } from '@tiptap/react'
import { ChartBlock } from '@/components/editor/blocks/ChartBlock/ChartBlock'

export interface ChartAttributes {
  id: string                    // Unique ID for Yjs tracking
  type: 'bar' | 'line' | 'pie' | 'radar'
  data: Array<Record<string, any>>
  config: ChartConfig
}

export const ChartExtension = Node.create<ChartAttributes>({
  name: 'chart',
  group: 'block',
  
  // Parse from markdown code blocks
  parseHTML() {
    return [
      {
        tag: 'pre[data-language="chart"]',
        getAttrs: (node) => {
          const code = node.textContent
          try {
            const parsed = JSON.parse(code)
            return { ...parsed, id: generateId() }
          } catch {
            return null
          }
        },
      },
    ]
  },
  
  // Render as div with data attributes
  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-type': 'chart', ...HTMLAttributes }]
  },
  
  // React component for rendering
  addNodeView() {
    return ReactNodeViewRenderer(ChartBlock)
  },
  
  // Sync chart data via Yjs
  addStorage() {
    return {
      ydoc: null as Y.Doc | null,
      chartsMap: null as Y.Map<any> | null,
    }
  },
})
```

### 3.2 Chart Block Component

```typescript
// components/editor/blocks/ChartBlock/ChartBlock.tsx
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useYjs } from '@/lib/collaboration/useYjs'
import { ChartEditModal } from './ChartEditModal'

interface ChartBlockProps {
  node: { attrs: ChartAttributes }
  editor: Editor
  getPos: () => number
  updateAttributes: (attrs: Partial<ChartAttributes>) => void
}

export function ChartBlock({ node, editor, updateAttributes }: ChartBlockProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { ydoc } = useYjs()
  
  // Get chart data from Yjs if available, else from node attrs
  const chartData = useMemo(() => {
    if (!ydoc) return node.attrs.data
    const chartsMap = ydoc.getMap('charts')
    return chartsMap.get(node.attrs.id)?.data || node.attrs.data
  }, [ydoc, node.attrs.id, node.attrs.data])
  
  // Debounced update to Yjs
  const debouncedUpdate = useDebouncedCallback((newData) => {
    if (!ydoc) return
    const chartsMap = ydoc.getMap('charts')
    chartsMap.set(node.attrs.id, { data: newData, updatedAt: Date.now() })
  }, 300)
  
  const handleDataChange = (newData) => {
    debouncedUpdate(newData)
    updateAttributes({ data: newData })
  }
  
  // Render Recharts based on type
  const renderChart = () => {
    switch (node.attrs.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={node.attrs.config.xAxis.dataKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {node.attrs.config.series.map((s) => (
                <Bar key={s.dataKey} dataKey={s.dataKey} fill={s.color} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )
      // ... other chart types
    }
  }
  
  return (
    <div className="chart-block" onClick={() => setIsModalOpen(true)}>
      {renderChart()}
      <ChartEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={chartData}
        config={node.attrs.config}
        onChange={handleDataChange}
      />
    </div>
  )
}
```

### 3.3 Chart Edit Modal

```typescript
// components/editor/blocks/ChartBlock/ChartEditModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from './ChartDataTable'
import { ChartPreview } from './ChartPreview'

interface ChartEditModalProps {
  isOpen: boolean
  onClose: () => void
  data: any[]
  config: ChartConfig
  onChange: (data: any[], config: ChartConfig) => void
}

export function ChartEditModal({ isOpen, onClose, data, config, onChange }: ChartEditModalProps) {
  const [localData, setLocalData] = useState(data)
  const [localConfig, setLocalConfig] = useState(config)
  
  // Track if another user is editing
  const [isCollaborating, setIsCollaborating] = useState(false)
  
  useEffect(() => {
    // Subscribe to Yjs awareness for this chart
    // Show "User X is editing" if someone else has modal open
  }, [])
  
  const handleSave = () => {
    onChange(localData, localConfig)
    onClose()
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Chart</DialogTitle>
          {isCollaborating && (
            <span className="text-sm text-yellow-600">
              ⚠️ Another user is editing this chart
            </span>
          )}
        </DialogHeader>
        
        <Tabs defaultValue="data">
          <TabsList>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="data">
            <DataTable
              data={localData}
              onChange={setLocalData}
              columns={extractColumns(localData)}
            />
          </TabsContent>
          
          <TabsContent value="config">
            <ChartConfigForm
              config={localConfig}
              onChange={setLocalConfig}
            />
          </TabsContent>
          
          <TabsContent value="preview">
            <ChartPreview
              data={localData}
              config={localConfig}
            />
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 4. Export Implementation

### 4.1 Chart to Image

```typescript
// lib/editor/export/html2canvas-utils.ts
import html2canvas from 'html2canvas'

export async function renderChartToImage(
  chartElement: HTMLElement
): Promise<string> {
  const canvas = await html2canvas(chartElement, {
    scale: 2, // Retina quality
    useCORS: true,
    backgroundColor: '#ffffff',
  })
  return canvas.toDataURL('image/png')
}
```

### 4.2 PDF Export

```typescript
// lib/editor/export/pdf-exporter.ts
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export async function exportToPDF(
  editor: Editor,
  filename: string
): Promise<void> {
  const doc = new jsPDF()
  const content = editor.getHTML()
  
  // Find all chart blocks
  const chartBlocks = document.querySelectorAll('[data-type="chart"]')
  
  // Convert each chart to image
  for (const block of chartBlocks) {
    const imgData = await renderChartToImage(block as HTMLElement)
    // Replace chart with image in cloned content
  }
  
  // Render HTML to PDF
  await doc.html(content, { callback: (doc) => doc.save(filename) })
}
```

### 4.3 DOCX Export

```typescript
// lib/editor/export/docx-exporter.ts
import { Document, Packer, Paragraph, ImageRun } from 'docx'

export async function exportToDOCX(
  editor: Editor
): Promise<Blob> {
  const children: Paragraph[] = []
  
  // Iterate through editor content
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'chart') {
      // Render chart to image
      const imgData = await renderChartToImage(element)
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: imgData,
              transformation: { width: 500, height: 300 },
            }),
          ],
        })
      )
    }
    // ... handle other node types
  })
  
  const doc = new Document({ sections: [{ children }] })
  return Packer.toBlob(doc)
}
```

---

## 5. Performance Guidelines

### 5.1 Chart Performance
- **Max datasets:** 10 per chart
- **Max data points:** 100 per dataset
- **Debounce re-renders:** 300ms
- **Use ResponsiveContainer:** Always for auto-sizing
- **Disable animations:** When exporting or >50 data points

### 5.2 Table Performance
- **Virtual scrolling:** For >50 rows
- **Pagination:** Option for >100 rows
- **Debounced sorting:** 150ms

### 5.3 Collaboration Performance
- **Transaction batching:** Batch Yjs updates every 100ms
- **Awareness throttling:** Limit cursor updates to 10/sec
- **Lazy Yjs sync:** Only sync visible blocks

---

## 6. Dependencies

```json
{
  "dependencies": {
    "recharts": "^2.10.0",
    "katex": "^0.16.9",
    "react-katex": "^3.0.0",
    "mermaid": "^10.6.0",
    "tiptap-extension-mermaid": "^1.0.0",
    "prismjs": "^1.29.0",
    "react-prism": "^4.3.0",
    "html2canvas": "^1.4.1",
    "jspdf": "^2.5.1",
    "docx": "^8.5.0",
    "yjs": "^13.6.0",
    "y-websocket": "^1.5.0"
  }
}
```

---

## 7. Testing Checklist

### 7.1 Charts
- [ ] All 4 chart types render correctly
- [ ] Data updates reflect immediately (optimistic)
- [ ] Yjs syncs chart data across users
- [ ] Modal shows "editing" indicator when another user has it open
- [ ] Export to PDF includes charts as images
- [ ] Export to DOCX includes charts as images
- [ ] Mobile responsive (touch-friendly modal)

### 7.2 Performance
- [ ] Document with 10 charts loads in <2s
- [ ] Typing doesn't lag with charts visible
- [ ] Yjs sync doesn't block UI
- [ ] Export doesn't freeze browser

### 7.3 Collaboration
- [ ] Multiple users can edit same chart (last-write-wins)
- [ ] Cursor positions visible in real-time
- [ ] No data loss on concurrent edits
- [ ] Reconnect after offline syncs correctly

---

## 8. Implementation Order

**Week 1: Core Infrastructure**
- [ ] Set up export utilities (html2canvas, jsPDF, docx)
- [ ] Create base extension architecture
- [ ] Implement Yjs optimization layer

**Week 2: Charts (Priority)**
- [ ] ChartExtension with Recharts
- [ ] ChartEditModal
- [ ] Chart data table editor
- [ ] Yjs integration for charts

**Week 3: Tables & Math**
- [ ] Enhanced table extension
- [ ] KaTeX math extension

**Week 4: Diagrams & Polish**
- [ ] Mermaid extension
- [ ] Export functionality
- [ ] Performance optimization

---

**Ready for implementation!**
