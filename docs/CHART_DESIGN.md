# Chart Extension Design Document
## For Knobase-App Tiptap Editor

---

## 1. Overview

Implement a Chart extension for the Tiptap editor that allows users to create, edit, and display interactive charts within documents. This feature should match the functionality in the Knobase repo's ChatMessages component.

---

## 2. User Experience

### 2.1 Inserting Charts

**Method 1: Slash Command**
- User types /chart or /graph
- Shows chart type selector: Bar, Line, Pie, Doughnut, Radar, Area
- Opens chart data input modal

**Method 2: Code Block**
- User creates code block with language chart
- Editor automatically renders it as interactive chart
- Raw JSON data visible in edit mode

**Method 3: Toolbar Button**
- Chart icon in editor toolbar
- Dropdown menu with chart types
- Quick insert with sample data

### 2.2 Editing Charts

**Inline Edit Mode:**
- Click chart to enter edit mode
- Shows data table interface (rows/columns)
- Real-time preview as data changes
- Toggle between chart types

**Raw JSON Mode:**
- Toggle to see/edit raw JSON
- Syntax validation
- Error highlighting

**Visual Properties:**
- Color picker for datasets
- Title input
- Axis labels
- Legend toggle
- Grid lines toggle

### 2.3 Viewing Charts

**Read Mode:**
- Interactive Chart.js rendering
- Hover tooltips show values
- Click legend to toggle datasets
- Responsive sizing

**Collaboration:**
- Real-time updates via Yjs
- Cursor awareness on chart data
- Conflict resolution for data changes

---

## 3. Technical Architecture

### 3.1 File Structure

lib/editor/extensions/
├── chart-extension.ts
├── chart-types.ts

components/editor/blocks/
├── ChartBlock.tsx
├── ChartEditModal.tsx
├── ChartDataTable.tsx
├── ChartTypeSelector.tsx

components/editor/slash-commands/
├── chart-command.ts

### 3.2 Dependencies

chart.js: ^4.4.0
react-chartjs-2: ^5.2.0

### 3.3 Chart Types

- bar: Vertical bars for comparing categories
- line: Connected points for trends over time
- pie: Circular segments for part-to-whole
- doughnut: Pie with hole
- radar: Spider/web for multivariate data
- area: Filled line for cumulative totals

---

## 4. Data Format

{
  "type": "bar",
  "data": {
    "labels": ["Q1", "Q2", "Q3", "Q4"],
    "datasets": [{
      "label": "Revenue",
      "data": [12000, 19000, 15000, 22000],
      "backgroundColor": "rgba(75, 192, 192, 0.6)"
    }]
  }
}

---

## 5. Implementation Phases

**Phase 1: Core Extension**
- ChartExtension node
- Basic ChartBlock component
- Chart.js integration

**Phase 2: Editing Interface**
- ChartEditModal
- Data table editor
- Type selector

**Phase 3: Polish**
- Slash command
- Styling
- Error handling

**Phase 4: Export**
- PDF export (html2canvas)
- DOCX export
- Markdown serialization

---

## 6. Reference

Study from knobase repo:
- packages/components/src/chat/ChartRenderer.tsx
- packages/components/src/chat/ChatMessages.tsx

---

Ready for implementation!
