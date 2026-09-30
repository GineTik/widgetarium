import { createElement as h, Component } from "react";
import type { ReactElement, ReactNode } from "react";
import { crashBoundary } from "../crash-boundary.js";

const Boundary = crashBoundary(h, Component);

export function behindBoundary(widget: string, child: ReactNode): ReactElement {
	return h(Boundary, { key: widget }, child);
}
