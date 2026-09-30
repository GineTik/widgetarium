import { Fragment, createElement as h, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";
import { useScrollReach } from "../hooks/use-scroll-reach";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { Field } from "./field";
import { POPOVER_ITEM } from "./popover-context";

export interface PopoverSearchProps {
	readonly placeholder?: string | undefined;
	readonly hint?: ReactNode;
	readonly children?: ReactNode | ((needle: string) => ReactNode);
	readonly className?: string | undefined;
}

const EDGE_ICON_PX = 12;

export function PopoverSearch({ placeholder, hint, children, className: cls }: PopoverSearchProps): ReactElement {
	const [keyword, setKeyword] = useState("");
	const needle = keyword.trim().toLowerCase();
	const listRef = useRef<HTMLDivElement>(null);
	const { reach, measureReach } = useScrollReach(listRef);

	const takeFirst = (event: KeyboardEvent): void => {
		if (event.key !== "Enter") return;
		const first = listRef.current?.querySelector<HTMLElement>(POPOVER_ITEM);
		if (!first) return;
		event.preventDefault();
		first.click();
		setKeyword("");
	};

	return (
		<>
			<div className={cn("wg-kit-pop-search", cls)}>
				<Field
					block={true}
					size="s"
					className="wg-kit-pop-search-field"
					icon={<Icon name="search" />}
					placeholder={placeholder}
					value={keyword}
					onValueChange={setKeyword}
					onKeyDown={takeFirst}
				/>
				{hint ? <span className="wg-kit-pop-search-hint">{hint}</span> : null}
			</div>
			<div className="wg-kit-pop-scroll">
				<div className="wg-kit-pop-list" ref={listRef} onScroll={measureReach}>
					{typeof children === "function" ? children(needle) : children}
				</div>
				{reach.up ? (
					<span className="wg-kit-pop-edge is-up">
						<Icon name="chevron" size={EDGE_ICON_PX} />
					</span>
				) : null}
				{reach.down ? (
					<span className="wg-kit-pop-edge is-down">
						<Icon name="chevron" size={EDGE_ICON_PX} />
					</span>
				) : null}
			</div>
		</>
	);
}
