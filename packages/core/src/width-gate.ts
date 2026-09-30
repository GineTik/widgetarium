const SCROLLBAR_SLACK_PX = 20;
const OSCILLATION_MS = 500;
const SETTLE_MS = 120;

type WidthGate = (value: number) => boolean;

interface WidthGateOptions {
	readonly minimum?: number;
	readonly now?: (() => number) | undefined;
}

interface WidthWatcherOptions<Timer> {
	readonly minimum: number;
	readonly onWidth: (width: number) => void;
	readonly schedule: (task: () => void, delayMs: number) => Timer;
	readonly cancel: (timer: Timer) => void;
	readonly now?: () => number;
}

interface WidthWatcher {
	measured(value: number): void;
	stop(): void;
}

export function createWidthGate({ minimum, now = () => Date.now() }: WidthGateOptions = {}): WidthGate {
	let accepted = 0;
	let left = 0;
	let leftAt = 0;

	return (value) => {
		if (minimum === undefined || !(value >= minimum)) return false;
		if (accepted && Math.abs(value - accepted) <= SCROLLBAR_SLACK_PX) return false;

		const at = now();
		if (left && Math.abs(value - left) <= SCROLLBAR_SLACK_PX && at - leftAt < OSCILLATION_MS) return false;

		left = accepted;
		leftAt = at;
		accepted = value;
		return true;
	};
}

export function createWidthWatcher<Timer>({
	minimum,
	onWidth,
	schedule,
	cancel,
	now,
}: WidthWatcherOptions<Timer>): WidthWatcher {
	const accepts = createWidthGate({ minimum, now });
	let pending = 0;
	let timer: Timer | null = null;
	let hasArrived = false;

	return {
		measured(value) {
			if (!hasArrived) {
				hasArrived = true;
				if (accepts(value)) {
					onWidth(value);
					return;
				}
			}

			pending = value;
			if (timer !== null) cancel(timer);
			timer = schedule(() => {
				timer = null;
				if (accepts(pending)) onWidth(pending);
			}, SETTLE_MS);
		},
		stop() {
			if (timer !== null) cancel(timer);
			timer = null;
		},
	};
}
