import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { DirectionContext } from "./direction-context";
import type { Direction } from "./direction-context";

export interface DirectionProviderProps {
	readonly direction?: Direction | undefined;
	readonly dir?: Direction | undefined;
	readonly children?: ReactNode;
}

export function DirectionProvider({ direction, dir, children }: DirectionProviderProps): ReactElement {
	return <DirectionContext.Provider value={direction ?? dir ?? "ltr"}>{children}</DirectionContext.Provider>;
}
