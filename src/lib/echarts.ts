// ECharts registado só com o que o painel usa (gráficos de linha, barras, rosca, dispersão e mapa de calor), como a Cloudflare faz no Kumo.
import * as echarts from "echarts/core";
import { BarChart, HeatmapChart, LineChart, MapChart, PieChart, ScatterChart } from "echarts/charts";
import { AriaComponent, BrushComponent, DataZoomComponent, DatasetComponent, ToolboxComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TitleComponent, TooltipComponent, TransformComponent, VisualMapComponent } from "echarts/components";
import { LabelLayout, UniversalTransition } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([BrushComponent, DataZoomComponent, ToolboxComponent, BarChart, LineChart, MapChart, PieChart, ScatterChart, HeatmapChart, AriaComponent, DatasetComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TitleComponent, TooltipComponent, TransformComponent, VisualMapComponent, LabelLayout, UniversalTransition, CanvasRenderer]);

export { echarts };
