import { createElement as h } from "react";
import type { ReactElement } from "react";
import { OverlaysShowcase } from "./overlays-showcase";

export function ClosedOverlays(): ReactElement {
	return <OverlaysShowcase opened="none" />;
}
