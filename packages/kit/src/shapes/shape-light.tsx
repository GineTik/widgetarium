import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { ShapeLightSpot } from "../utils/shape-morph";

export function ShapeLight({ id, light }: { readonly id: string; readonly light: ShapeLightSpot }): ReactElement {
	return (
		<defs>
			<radialGradient
				id={`${id}-body`}
				gradientUnits="userSpaceOnUse"
				cx={light.bodyX}
				cy={light.bodyY}
				r={light.bodyRadius}
			>
				<stop offset="0" className="is-lit" />
				<stop offset="0.55" className="is-body" />
				<stop offset="1" className="is-shade" />
			</radialGradient>
			<radialGradient id={`${id}-bounce`} gradientUnits="userSpaceOnUse" cx="0.72" cy="0.92" r="0.42">
				<stop offset="0" className="is-bounce" />
				<stop offset="1" className="is-clear" />
			</radialGradient>
			<radialGradient
				id={`${id}-shine`}
				gradientUnits="userSpaceOnUse"
				cx={light.shineX}
				cy={light.shineY}
				r={light.shineRadius}
			>
				<stop offset="0" className="is-shine" />
				<stop offset="0.35" className="is-glow" />
				<stop offset="1" className="is-clear" />
			</radialGradient>
		</defs>
	);
}
