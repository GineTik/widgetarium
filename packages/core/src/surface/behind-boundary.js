import { createElement as h, Component } from "react";
import { crashBoundary } from "../crash-boundary.js";

const Boundary = crashBoundary(h, Component);

export function behindBoundary(widget, child) {
	return h(Boundary, { key: widget }, child);
}
