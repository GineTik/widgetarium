import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { cx } from "../utils/cx";
import { yamlSpans } from "../utils/yaml";

export function CodeArea({ value = "", onInput, placeholder, className: cls }: LooseProps) {
	return (
		<div className={cx("wg-kit-md", "wg-kit-code", cls)}>
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
