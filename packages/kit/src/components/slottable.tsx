import { createElement as h, Fragment } from "react";
import type { ReactElement, ReactNode } from "react";

export interface SlottableProps {
	readonly children?: ReactNode;
}

export function Slottable({ children }: SlottableProps): ReactElement {
	return <>{children}</>;
}
