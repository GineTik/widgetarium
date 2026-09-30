import { createElement as h } from "react";
import type { FormEventHandler, ReactElement } from "react";
import { cn } from "../utils/cn";
import { yamlSpans } from "../utils/yaml";

export interface CodeAreaProps {
	readonly value?: string | undefined;
	readonly onInput?: FormEventHandler<HTMLTextAreaElement> | undefined;
	readonly placeholder?: string | undefined;
	readonly className?: string | undefined;
}

export function CodeArea({ value = "", onInput, placeholder, className: cls }: CodeAreaProps): ReactElement {
	return (
		<div className={cn("wg-kit-md", "wg-kit-code", cls)}>
			<div className="wg-kit-md-page">
				<div className="wg-kit-md-text wg-kit-md-mirror" aria-hidden="true">
					{yamlSpans(value)}
				</div>
				<textarea
					className="wg-kit-md-text wg-kit-md-input"
					spellCheck={false}
					placeholder={placeholder}
					value={value}
					onInput={onInput}
				/>
			</div>
		</div>
	);
}
