import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";

export interface EmblemRefusedProps {
	readonly reason: string;
	readonly className?: string | undefined;
}

const LICENCE_REFUSED = "Unavailable for licensing reasons: {reason}";

const REFUSED_ICON_PX = 16;

export function EmblemRefused({ reason, className: cls }: EmblemRefusedProps): ReactElement {
	return (
		<span className={cn("wg-kit-emblem-refused", cls)} title={LICENCE_REFUSED.replace("{reason}", reason)}>
			<Icon name="ban" size={REFUSED_ICON_PX} />
		</span>
	);
}
