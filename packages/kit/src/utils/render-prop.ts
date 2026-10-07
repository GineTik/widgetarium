import { cloneElement } from "react";
import type { ReactElement, ReactNode } from "react";

export function renderedChildren(render: ReactElement | undefined, children: ReactNode): ReactNode {
	return render ? cloneElement(render, undefined, children) : children;
}
