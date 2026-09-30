import { createElement as h } from "react";
import type { ComponentType, JSXElementConstructor, ReactElement } from "react";
import {
	Area as RechartsArea,
	Bar as RechartsBar,
	Funnel as RechartsFunnel,
	Line as RechartsLine,
	Pie as RechartsPie,
	Radar as RechartsRadar,
	RadialBar as RechartsRadialBar,
	Scatter as RechartsScatter,
} from "recharts";

type PropsOf<Mark> = Mark extends JSXElementConstructor<infer P> ? P : never;

type StillMark<Mark> = ComponentType<PropsOf<Mark>>;

interface LoadMotion {
	readonly isAnimationActive?: unknown;
}

export const Area: StillMark<typeof RechartsArea> = withoutLoadMotion(RechartsArea, "Area");
export const Bar: StillMark<typeof RechartsBar> = withoutLoadMotion(RechartsBar, "Bar");
export const Line: StillMark<typeof RechartsLine> = withoutLoadMotion(RechartsLine, "Line");
export const Pie: StillMark<typeof RechartsPie> = withoutLoadMotion(RechartsPie, "Pie");
export const Radar: StillMark<typeof RechartsRadar> = withoutLoadMotion(RechartsRadar, "Radar");
export const RadialBar: StillMark<typeof RechartsRadialBar> = withoutLoadMotion(RechartsRadialBar, "RadialBar");
export const Scatter: StillMark<typeof RechartsScatter> = withoutLoadMotion(RechartsScatter, "Scatter");
export const Funnel: StillMark<typeof RechartsFunnel> = withoutLoadMotion(RechartsFunnel, "Funnel");

function withoutLoadMotion<P extends LoadMotion>(Mark: ComponentType<P>, name: string): ComponentType<P> {
	function Still(props: P): ReactElement {
		return h(Mark, { ...props, isAnimationActive: props.isAnimationActive ?? false });
	}
	Still.displayName = name;
	return Still;
}
