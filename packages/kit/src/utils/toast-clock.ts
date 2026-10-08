import type { ToastId } from "./toast-queue";

interface Lifetime {
	readonly remainingMs: number;
	readonly startedAt: number;
	readonly timer: ReturnType<typeof setTimeout> | null;
}

export class ToastClock {
	private readonly lifetimes = new Map<ToastId, Lifetime>();
	private readonly onEnd: (id: ToastId) => void;
	private pausers = 0;

	constructor(onEnd: (id: ToastId) => void) {
		this.onEnd = onEnd;
	}

	start(id: ToastId, lifetimeMs: number): void {
		this.stop(id);
		if (!Number.isFinite(lifetimeMs)) return;
		this.lifetimes.set(id, this.armLifetime(id, lifetimeMs));
	}

	stop(id: ToastId): void {
		const lifetime = this.lifetimes.get(id);
		if (lifetime?.timer) clearTimeout(lifetime.timer);
		this.lifetimes.delete(id);
	}

	pause(): void {
		this.pausers += 1;
		if (this.pausers > 1) return;
		for (const [id, lifetime] of this.lifetimes) this.lifetimes.set(id, holdLifetime(lifetime));
	}

	resume(): void {
		if (this.pausers === 0) return;
		this.pausers -= 1;
		if (this.pausers > 0) return;
		for (const [id, lifetime] of this.lifetimes) this.lifetimes.set(id, this.armLifetime(id, lifetime.remainingMs));
	}

	private armLifetime(id: ToastId, remainingMs: number): Lifetime {
		if (this.pausers > 0) return { remainingMs, startedAt: Date.now(), timer: null };
		const timer = setTimeout(() => {
			this.lifetimes.delete(id);
			this.onEnd(id);
		}, remainingMs);
		return { remainingMs, startedAt: Date.now(), timer };
	}
}

function holdLifetime(lifetime: Lifetime): Lifetime {
	if (!lifetime.timer) return lifetime;
	clearTimeout(lifetime.timer);
	const remainingMs = Math.max(0, lifetime.remainingMs - (Date.now() - lifetime.startedAt));
	return { remainingMs, startedAt: Date.now(), timer: null };
}
