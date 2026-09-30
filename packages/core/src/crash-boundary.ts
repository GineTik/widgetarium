import type { Component as ReactComponent, ComponentClass, createElement, ReactElement, ReactNode } from "react";
import { isObject } from "./engine/is-object.js";

export interface CrashBoundaryProps {
	readonly children?: ReactNode;
}

interface CrashBoundaryState {
	readonly failure: unknown;
}

export function crashBoundary(
	h: typeof createElement,
	Component: typeof ReactComponent,
): ComponentClass<CrashBoundaryProps, CrashBoundaryState> {
	return class CrashBoundary extends Component<CrashBoundaryProps, CrashBoundaryState> {
		override state: CrashBoundaryState = { failure: null };

		static getDerivedStateFromError(failure: unknown): CrashBoundaryState {
			console.error("Widgetarium: widget crashed", failure);
			return { failure };
		}

		override render(): ReactNode {
			if (!this.state.failure) return this.props.children;
			return crashNotice(h, this.state.failure);
		}
	};
}

function crashNotice(h: typeof createElement, failure: unknown): ReactElement {
	return h("div", { className: "wg-error" }, [
		h("b", { key: "what" }, "Widget crashed"),
		h("code", { key: "why" }, String(reasonOf(failure))),
	]);
}

function reasonOf(failure: unknown): unknown {
	if (!isObject(failure)) return failure;
	return failure["message"] ?? failure;
}
