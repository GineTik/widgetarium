import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { cx } from "../utils/cx";

export function Switch({ checked, onChange, label, className: cls }: LooseProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={String(Boolean(checked))}
			aria-label={label}
			className={cx("wg-kit-switch", cls)}
			onClick={() => onChange?.(!checked)}
		/>
	);
}
