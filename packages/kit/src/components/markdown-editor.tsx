import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useCaretAtStart } from "../hooks/use-caret-at-start";
import { cn } from "../utils/cn";
import { markdownSpans } from "../utils/markdown";

export interface MarkdownEditorProps {
	readonly value?: string | undefined;
	readonly onInput?: ((value: string) => void) | undefined;
	readonly placeholder?: string | undefined;
	readonly className?: string | undefined;
	readonly focusAtStart?: boolean;
}

export function MarkdownEditor({
	value = "",
	onInput,
	placeholder,
	className: cls,
	focusAtStart = false,
}: MarkdownEditorProps): ReactElement {
	const input = useCaretAtStart(focusAtStart);
	return (
		<div className={cn("wg-kit-md", cls)}>
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
					onInput={(event) => onInput?.(event.currentTarget.value)}
				/>
			</div>
		</div>
	);
}
