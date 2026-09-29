import type { GatewayEvent, Unsubscribe } from "./contract";

export type Subscribe = (listener: (event: GatewayEvent) => void) => Unsubscribe;

export function combineSubscribes(subscribes: (Subscribe | null)[]): Subscribe {
	return (listener) => {
		const stops = subscribes.filter(Boolean).map((hang) => (hang as Subscribe)(listener));
		return () => {
			for (const stop of stops) stop();
		};
	};
}
