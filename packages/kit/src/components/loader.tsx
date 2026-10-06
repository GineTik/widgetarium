import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCycled } from "../hooks/use-cycled";
import { Shape } from "../shapes/shape";
import type { ShapeName } from "../shapes/shape-names";
import { cn } from "../utils/cn";

export interface LoaderProps {
	readonly label?: string | undefined;
	readonly size?: number | undefined;
	readonly className?: string | undefined;
}

const LOADER_SHAPES: readonly ShapeName[] = ["circle", "flower", "heart", "soft-burst", "gem", "pill"];
const MORPH_EVERY_MS = 650;
const LOADER_SIZE_PX = 22;

export function Loader({ label = "Loading", size = LOADER_SIZE_PX, className: cls }: LoaderProps): ReactElement {
	const name = useCycled(LOADER_SHAPES, MORPH_EVERY_MS);
	return (
		<span className={cn("wg-kit-loader", cls)} role="status" aria-live="polite">
			<Shape name={name} size={size} tones={["purple", "pink"]} />
			{label ? <span className="wg-kit-loader-label">{label}</span> : null}
		</span>
	);
}
