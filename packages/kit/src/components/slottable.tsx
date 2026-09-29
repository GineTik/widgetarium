import { createElement as h, Fragment } from "react";
import type { ReactNode } from "react";

export function Slottable({ children }: { children?: ReactNode }) {
	return <>{children}</>;
}
