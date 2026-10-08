import type { MouseEvent, ReactNode } from "react";
import { TOAST_DURATION_MS, TOAST_EXIT_MS } from "../constants/overlays";
import { prefersReducedMotion } from "./reduced-motion";
import { ToastClock } from "./toast-clock";

export type ToastType = "default" | "success" | "error" | "warning" | "info" | "loading";

export type ToastId = string | number;

export interface ToastButton {
	readonly label: ReactNode;
	readonly onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

export interface ToastOptions {
	readonly id?: ToastId | undefined;
	readonly description?: ReactNode;
	readonly duration?: number | undefined;
	readonly action?: ToastButton | undefined;
	readonly cancel?: ToastButton | undefined;
	readonly icon?: ReactNode;
	readonly closeButton?: boolean | undefined;
	readonly className?: string | undefined;
	readonly onDismiss?: ((toast: ToastRecord) => void) | undefined;
	readonly onAutoClose?: ((toast: ToastRecord) => void) | undefined;
}

export interface ToastRecord extends ToastOptions {
	readonly id: ToastId;
	readonly title: ReactNode;
	readonly type: ToastType;
	readonly isLeaving: boolean;
}

class ToastQueue {
	private records: readonly ToastRecord[] = [];
	private readonly listeners = new Set<() => void>();
	private readonly clock = new ToastClock((id) => this.expire(id));
	private made = 0;
	private defaultDurationMs = TOAST_DURATION_MS;
	private toasters = 0;

	constructor() {
		this.clock.pause();
	}

	readonly read = (): readonly ToastRecord[] => this.records;

	readonly subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	show(title: ReactNode, type: ToastType, options: ToastOptions): ToastId {
		this.made += 1;
		const id = options.id ?? this.made;
		const record: ToastRecord = { ...options, id, title, type, isLeaving: false };
		const held = this.records.some((toast) => toast.id === id);
		this.records = held ? this.records.map((toast) => (toast.id === id ? record : toast)) : [record, ...this.records];
		this.clock.start(id, this.lifetimeOf(record));
		this.emit();
		return id;
	}

	dismiss(id?: ToastId): void {
		const leaving = this.records.filter((toast) => !toast.isLeaving && (id === undefined || toast.id === id));
		for (const toast of leaving) toast.onDismiss?.(toast);
		this.leave(leaving);
	}

	attachToaster(): () => void {
		this.toasters += 1;
		if (this.toasters === 1) this.clock.resume();
		return () => {
			this.toasters -= 1;
			if (this.toasters === 0) this.clock.pause();
		};
	}

	pause(): void {
		this.clock.pause();
	}

	resume(): void {
		this.clock.resume();
	}

	setDefaultDuration(durationMs: number): () => void {
		const was = this.defaultDurationMs;
		this.defaultDurationMs = durationMs;
		return () => {
			this.defaultDurationMs = was;
		};
	}

	private expire(id: ToastId): void {
		const leaving = this.records.filter((toast) => !toast.isLeaving && toast.id === id);
		for (const toast of leaving) toast.onAutoClose?.(toast);
		this.leave(leaving);
	}

	private lifetimeOf(record: ToastRecord): number {
		if (record.duration !== undefined) return record.duration;
		return record.type === "loading" ? Infinity : this.defaultDurationMs;
	}

	private leave(leaving: readonly ToastRecord[]): void {
		if (leaving.length === 0) return;
		const gone = new Set(leaving.map((toast) => toast.id));
		for (const id of gone) this.clock.stop(id);
		this.records = this.records.map((toast) => (gone.has(toast.id) ? { ...toast, isLeaving: true } : toast));
		this.emit();
		setTimeout(() => this.remove(gone), prefersReducedMotion() ? 0 : TOAST_EXIT_MS);
	}

	private remove(gone: ReadonlySet<ToastId>): void {
		this.records = this.records.filter((toast) => !(gone.has(toast.id) && toast.isLeaving));
		this.emit();
	}

	private emit(): void {
		for (const listener of this.listeners) listener();
	}
}

export const TOAST_QUEUE: ToastQueue = new ToastQueue();
