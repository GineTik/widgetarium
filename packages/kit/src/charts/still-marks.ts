import { createElement as h } from "react";
import type { ComponentProps, ComponentType, JSXElementConstructor } from "react";
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

type StillMark<Mark extends JSXElementConstructor<never>> = ComponentType<ComponentProps<Mark>>;

export const Area: StillMark<typeof RechartsArea> = withoutLoadMotion(RechartsArea, "Area");
export const Bar: StillMark<typeof RechartsBar> = withoutLoadMotion(RechartsBar, "Bar");
export const Line: StillMark<typeof RechartsLine> = withoutLoadMotion(RechartsLine, "Line");
export const Pie: StillMark<typeof RechartsPie> = withoutLoadMotion(RechartsPie, "Pie");
export const Radar: StillMark<typeof RechartsRadar> = withoutLoadMotion(RechartsRadar, "Radar");
export const RadialBar: StillMark<typeof RechartsRadialBar> = withoutLoadMotion(RechartsRadialBar, "RadialBar");
export const Scatter: StillMark<typeof RechartsScatter> = withoutLoadMotion(RechartsScatter, "Scatter");
export const Funnel: StillMark<typeof RechartsFunnel> = withoutLoadMotion(RechartsFunnel, "Funnel");

function withoutLoadMotion<P extends object>(Mark: ComponentType<P>, name: string) {
	function Still({ isAnimationActive = false, ...props }: P & { isAnimationActive?: boolean }) {
		return h(Mark, { isAnimationActive, ...props } as P);
	}
	Still.displayName = name;
	return Still;
}
