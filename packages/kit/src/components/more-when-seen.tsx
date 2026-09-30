import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useWhenSeen } from "../hooks/use-when-seen";

export interface MoreWhenSeenProps {
	readonly onSeen: () => void;
	readonly className?: string | undefined;
}

export function MoreWhenSeen({ onSeen, className }: MoreWhenSeenProps): ReactElement {
	return <div ref={useWhenSeen(onSeen)} className={className} aria-hidden="true" />;
}
