import type { LooseProps } from "../types";
import { createElement as h, useEffect, useRef } from "react";
import { cx } from "../utils/cx";
import { markdownSpans } from "../utils/markdown";

export function MarkdownEditor({ value = "", onInput, placeholder, className: cls, focusAtStart = false }: LooseProps) {
	const input = useRef(null);

	// TRADE-OFF: opt-in — an editor that always grabbed the caret would steal it from whatever opened it
	useEffect(() => {
		if (!focusAtStart) return;
		input.current?.focus();
		input.current?.setSelectionRange(0, 0);
	}, [focusAtStart]);

	return (
		<div className={cx("wg-kit-md", cls)}>
			<div className="wg-kit-md-page">
				<div className="wg-kit-md-text wg-kit-md-mirror" aria-hidden="true">
					{markdownSpans(value)}
				</div>
				<textarea
					ref={input}
					className="wg-kit-md-text wg-kit-md-input"
					spellCheck={true}
					placeholder={placeholder}
					value={value}
					onInput={(event) => onInput?.(event.target.value)}
				/>
			</div>
		</div>
	);
}
