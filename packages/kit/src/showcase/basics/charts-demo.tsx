import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	Line,
	LineChart,
	Pie,
	PieChart,
	XAxis,
} from "../../charts/index";
import { Grid } from "../../index";
import { Cell } from "../frame/cell";
import { AREAS, AREA_CONFIG, CHART_MARGIN, MONTHS, SERIES } from "../showcase-data";

export function ChartsDemo(): ReactElement {
	return (
		<Grid min={320}>
			<Cell name="AreaChart">
				<ChartContainer config={SERIES}>
					<AreaChart data={MONTHS} margin={CHART_MARGIN} accessibilityLayer>
						<CartesianGrid vertical={false} />
						{axisAcross()}
						<ChartTooltip content={<ChartTooltipContent indicator="line" />} />
						<ChartLegend content={<ChartLegendContent />} />
						{areaOf("links")}
						{areaOf("notes")}
					</AreaChart>
				</ChartContainer>
			</Cell>
			<Cell name="BarChart">
				<ChartContainer config={SERIES}>
					<BarChart data={MONTHS} margin={CHART_MARGIN} accessibilityLayer>
						<CartesianGrid vertical={false} />
						{axisAcross()}
						<ChartTooltip content={<ChartTooltipContent />} />
						<ChartLegend content={<ChartLegendContent />} />
						<Bar dataKey="notes" fill="var(--color-notes)" radius={4} />
						<Bar dataKey="links" fill="var(--color-links)" radius={4} />
					</BarChart>
				</ChartContainer>
			</Cell>
			<Cell name="LineChart">
				<ChartContainer config={SERIES}>
					<LineChart data={MONTHS} margin={CHART_MARGIN} accessibilityLayer>
						<CartesianGrid vertical={false} />
						{axisAcross()}
						<ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
						<Line dataKey="notes" type="monotone" stroke="var(--color-notes)" strokeWidth={2} dot={false} />
						<Line dataKey="links" type="monotone" stroke="var(--color-links)" strokeWidth={2} dot={false} />
					</LineChart>
				</ChartContainer>
			</Cell>
			<Cell name="PieChart">
				<ChartContainer config={AREA_CONFIG}>
					<PieChart>
						<ChartTooltip content={<ChartTooltipContent hideLabel nameKey="area" />} />
						<Pie data={AREAS} dataKey="hours" nameKey="area" innerRadius="55%" strokeWidth={4} />
						<ChartLegend content={<ChartLegendContent nameKey="area" />} />
					</PieChart>
				</ChartContainer>
			</Cell>
		</Grid>
	);
}

function axisAcross(): ReactElement {
	return <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />;
}

function areaOf(series: string): ReactElement {
	return (
		<Area
			dataKey={series}
			type="monotone"
			stroke={`var(--color-${series})`}
			fill={`var(--color-${series})`}
			fillOpacity={0.18}
			strokeWidth={2}
		/>
	);
}
