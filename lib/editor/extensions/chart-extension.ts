import { Node, mergeAttributes, ReactNodeViewRenderer } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    chartBlock: {
      insertChart: (attrs?: Partial<ChartAttributes>) => ReturnType;
    };
  }
}

export interface ChartConfig {
  title?: string;
  xAxis?: { dataKey: string; label?: string };
  yAxis?: { label?: string };
  series: Array<{ dataKey: string; color: string; label?: string }>;
  showLegend?: boolean;
  showGrid?: boolean;
}

export interface ChartAttributes {
  id: string;
  type: "bar" | "line" | "pie" | "radar" | "area";
  data: Array<Record<string, unknown>>;
  config: ChartConfig;
}

function generateChartId() {
  return `chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_DATA = [
  { name: "Q1", value: 400 },
  { name: "Q2", value: 300 },
  { name: "Q3", value: 500 },
  { name: "Q4", value: 280 },
];

const DEFAULT_CONFIG: ChartConfig = {
  title: "",
  xAxis: { dataKey: "name", label: "" },
  yAxis: { label: "" },
  series: [{ dataKey: "value", color: "#4f46e5", label: "Value" }],
  showLegend: true,
  showGrid: true,
};

export const ChartExtension = Node.create({
  name: "chartBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: () => generateChartId(),
      },
      type: { default: "bar" },
      data: { default: DEFAULT_DATA },
      config: { default: DEFAULT_CONFIG },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="chart-block"]',
        getAttrs: (node) => {
          const el = node as HTMLElement;
          const dataStr = el.getAttribute("data-data");
          const configStr = el.getAttribute("data-config");
          return {
            id: el.getAttribute("data-id") || generateChartId(),
            type: el.getAttribute("data-chart-type") || "bar",
            data: dataStr ? JSON.parse(dataStr) : DEFAULT_DATA,
            config: configStr ? JSON.parse(configStr) : DEFAULT_CONFIG,
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "chart-block",
        "data-id": node.attrs.id,
        "data-chart-type": node.attrs.type,
        "data-data": JSON.stringify(node.attrs.data),
        "data-config": JSON.stringify(node.attrs.config),
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(
      // Lazy-loaded in the component file
      require("@/components/editor/blocks/ChartBlock/ChartBlock").ChartBlockView,
    );
  },

  addCommands() {
    return {
      insertChart:
        (attrs?: Partial<ChartAttributes>) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                id: generateChartId(),
                type: attrs?.type ?? "bar",
                data: attrs?.data ?? DEFAULT_DATA,
                config: attrs?.config ?? DEFAULT_CONFIG,
              },
            })
            .run();
        },
    };
  },
});
