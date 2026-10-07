import { createElement as h, useMemo, useRef, useState } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { ScrollAreaContext } from "./scroll-area-context";
import { ScrollThumbBar } from "./scroll-thumb-bar";

export { ScrollBar } from "./scroll-bar";
export type { ScrollBarProps } from "./scroll-bar";

export type ScrollAreaType = "hover" | "always";

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
	readonly type?: ScrollAreaType | undefined;
	readonly fade?: boolean | undefined;
}

export function ScrollArea({
	type = "hover",
	fade = false,
	className,
	children,
	...rest
}: ScrollAreaProps): ReactElement {
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const [acrossWanted, setAcrossWanted] = useState(0);
	const area = useMemo(
		() => ({ wantAcross: (isWanted: boolean) => setAcrossWanted((held) => held + (isWanted ? 1 : -1)) }),
		[],
	);
	const isAcross = acrossWanted > 0;
	return (
		<ScrollAreaContext.Provider value={area}>
			<div data-slot="scroll-area" data-type={type} {...rest} className={cn("wg-kit-scroll-area", className)}>
				<div
					ref={viewportRef}
					data-slot="scroll-area-viewport"
					data-scroll-across={isAcross ? "" : undefined}
					className={cn("wg-kit-scroll-viewport", fade && (isAcross ? "wg-kit-scroll-fade-x" : "wg-kit-scroll-fade"))}
				>
					<div className="wg-kit-scroll-content">{children}</div>
				</div>
				<ScrollThumbBar axis="vertical" viewportRef={viewportRef} />
				{isAcross ? <ScrollThumbBar axis="horizontal" viewportRef={viewportRef} /> : null}
			</div>
		</ScrollAreaContext.Provider>
	);
}
