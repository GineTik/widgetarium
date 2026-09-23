import { createElement as h, useEffect, useRef } from "react";
import type { LooseProps } from "../types";
import { fieldClass } from "../utils/class-names";
import { cx } from "../utils/cx";
import { markdownSpans } from "../utils/markdown";
import { yamlSpans } from "../utils/yaml";

export function Field({ icon, value, onInput, placeholder, type = "text", ...rest }: LooseProps) {
	return (
		<label className={fieldClass(rest)}>
			{icon}
			<input
				{...withoutFieldLook(rest)}
				className="wg-kit-field-input"
				type={type}
				value={value}
				placeholder={placeholder}
				onInput={onInput}
			/>
		</label>
	);
}

const FIELD_LOOK = ["size", "block", "className"];

function withoutFieldLook(props) {
	const behaviour = { ...props };
	for (const name of FIELD_LOOK) delete behaviour[name];
	return behaviour;
}

export function TextArea({ value, onInput, placeholder, ...rest }: LooseProps) {
	return (
		<label className={cx(fieldClass(rest), "is-area")}>
			<textarea
				{...withoutFieldLook(rest)}
				className="wg-kit-field-area"
				rows={4}
				value={value}
				placeholder={placeholder}
				onInput={onInput}
			/>
		</label>
	);
}

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
