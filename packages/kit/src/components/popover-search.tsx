import type { LooseProps } from "../types";
import { Fragment, createElement as h, useCallback, useLayoutEffect, useRef, useState } from "react";
import { Field } from "./field";
import { Icon } from "../icons/icon";
import { cx } from "../utils/cx";

export function PopoverSearch({ placeholder, hint, children, className: cls }: LooseProps) {
	const [keyword, setKeyword] = useState("");
	const needle = keyword.trim().toLowerCase();
	const listRef = useRef(null);

	// CONTEXT: the list is capped in the stylesheet, so what is out of sight is measured, never counted
	const [reach, setReach] = useState({ up: false, down: false });
	const measureReach = useCallback(() => {
		const list = listRef.current;
		if (!list) return;
		const up = list.scrollTop > 1;
		const down = list.scrollTop + list.clientHeight < list.scrollHeight - 1;
		setReach((was) => (was.up === up && was.down === down ? was : { up, down }));
	}, []);
	// CONTEXT: a needle takes rows away, so the edges are re-measured after every render, not once
	useLayoutEffect(measureReach);

	// CONTEXT: whatever the caller drew first is what Enter means — the kit does not know the list
	const takeFirst = (event) => {
		if (event.key !== "Enter") return;
		const first = listRef.current?.querySelector(".wg-kit-pop-item:not([disabled])");
		if (!first) return;
		event.preventDefault();
		first.click();
		setKeyword("");
	};

	return (
		<>
			<div className={cx("wg-kit-pop-search", cls)}>
				<Field
					block={true}
					size="s"
					className="wg-kit-pop-search-field"
					icon={<Icon name="search" />}
					placeholder={placeholder}
					value={keyword}
					onInput={(event) => setKeyword(event.target.value)}
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
						<Icon name="chevron" size={12} />
					</span>
				) : null}
				{reach.down ? (
					<span className="wg-kit-pop-edge is-down">
						<Icon name="chevron" size={12} />
					</span>
				) : null}
			</div>
		</>
	);
}
