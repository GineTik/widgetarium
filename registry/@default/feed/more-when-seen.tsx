import { useWhenSeen } from "./use-when-seen";

export function MoreWhenSeen({ onSeen }: { onSeen: () => void }) {
	return <div ref={useWhenSeen(onSeen)} className="wg-feed-more" aria-hidden="true" />;
}
