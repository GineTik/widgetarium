import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { BadgeColor } from "../constants/tones";
import { Shape } from "../shapes/shape";

export function HeroArt({ tones }: { readonly tones?: readonly BadgeColor[] | undefined }): ReactElement {
	return (
		<span className="wg-kit-hero-art" aria-hidden="true">
			<Shape name="cookie9-sided" tones={tones} size={220} className="is-big" />
			<Shape name="circle" tones={tones?.slice().reverse()} size={72} className="is-small" />
			<Shape name="sunny" tones={tones} size={48} className="is-tiny" />
		</span>
	);
}
