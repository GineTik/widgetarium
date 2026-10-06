import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Contained } from "@widgetarium/core/catalogue-contained.js";
import type { Drawing, StatePicture } from "./design-canvas-shapes.js";

export interface StateDrawingProps extends Pick<Drawing, "registry"> {
	readonly picture: StatePicture;
}

const NOT_BUILT = "{widget} is not built yet";
const FAILED = "{widget} failed to draw this state: {why}";

export function StateDrawing({ picture, registry }: StateDrawingProps): ReactElement {
	const component = registry.get(picture.widget)?.component;
	if (!component) return refused(NOT_BUILT.replace("{widget}", picture.widget));
	const instead = (failure: unknown): ReactElement =>
		refused(
			FAILED.replace("{widget}", picture.widget).replace(
				"{why}",
				failure instanceof Error ? failure.message : String(failure),
			),
		);
	return h(Contained, { instead }, h("div", { className: "wg-design-drawn" }, h(component, picture.props)));
}

function refused(said: string): ReactElement {
	return h("p", { className: "wg-ai-spec-refused" }, said);
}
