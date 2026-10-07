import { cloneElement } from "react";
import type { ReactElement, ReactNode } from "react";

export interface RenderedAsk {
	readonly children?: ReactNode;
}

export type RenderProp = ReactElement | ((ask: RenderedAsk) => ReactElement);

export function renderedElement(render: RenderProp, children: ReactNode): ReactElement {
	if (typeof render === "function") return render({ children });
	return cloneElement(render, undefined, children);
}

export function renderedChildren(render: ReactElement | undefined, children: ReactNode): ReactNode {
	return render ? cloneElement(render, undefined, children) : children;
}
