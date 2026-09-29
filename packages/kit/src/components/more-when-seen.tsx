import { createElement as h } from "react";
import { useWhenSeen } from "../hooks/use-when-seen";

export function MoreWhenSeen({ onSeen, className }: { onSeen: () => void; className?: string }) {
	return <div ref={useWhenSeen(onSeen)} className={className} aria-hidden="true" />;
}
