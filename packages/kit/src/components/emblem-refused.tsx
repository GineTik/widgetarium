import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { Icon } from "../icons/icon";
import { cx } from "../utils/cx";

const LICENCE_REFUSED = "Unavailable for licensing reasons: {reason}";

export function EmblemRefused({ reason, className: cls }: LooseProps) {
	return (
		<span className={cx("wg-kit-emblem-refused", cls)} title={LICENCE_REFUSED.replace("{reason}", reason)}>
			<Icon name="ban" size={16} />
		</span>
	);
}
