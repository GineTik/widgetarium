import { useSyncExternalStore } from "react";
import type { FetchProgress, OnFetchStep } from "./widget-source.js";

export type InstallJobState = "fetching" | "writing" | "failed";

export interface InstallJob {
	readonly widget: string;
	readonly state: InstallJobState;
	readonly done: number;
	readonly total: number;
	readonly failure: string | null;
}

export interface InstallOutcome {
	readonly ok: boolean;
	readonly failure?: string | null | undefined;
}

export type RunInstall = (onStep: OnFetchStep) => Promise<InstallOutcome | null | undefined>;

export interface InstallJobs {
	jobOf(widget: string): InstallJob | null;
	allJobs(): readonly InstallJob[];
	start(widget: string, run: RunInstall): Promise<InstallOutcome>;
	subscribe(listener: () => void): () => void;
}

const COULD_NOT_FETCH = "could not fetch this widget";
const INSTALL_TRANSITION_LOG = "[widgetarium] install {widget}: {was} → {now}{why}";

export function createInstallJobs(): InstallJobs {
	return new InstallJobStore();
}

export function useInstallJob(widget: string | null | undefined, jobs: InstallJobs = INSTALL_JOBS): InstallJob | null {
	return useSyncExternalStore(jobs.subscribe, () => (widget ? jobs.jobOf(widget) : null));
}

class InstallJobStore implements InstallJobs {
	private readonly jobs = new Map<string, InstallJob>();
	private readonly inFlight = new Map<string, Promise<InstallOutcome>>();
	private readonly listeners = new Set<() => void>();

	readonly jobOf = (widget: string): InstallJob | null => this.jobs.get(widget) ?? null;

	readonly allJobs = (): readonly InstallJob[] => [...this.jobs.values()];

	readonly start = (widget: string, run: RunInstall): Promise<InstallOutcome> => {
		const joined = this.inFlight.get(widget);
		if (joined) return joined;
		this.write(widget, { widget, state: "fetching", done: 0, total: 0, failure: null }, "asked");
		const job = this.settle(widget, run);
		this.inFlight.set(widget, job);
		return job;
	};

	readonly subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	private write(widget: string, next: InstallJob | null, why: string): void {
		const was = this.jobs.get(widget)?.state ?? "idle";
		if (next) this.jobs.set(widget, next);
		else this.jobs.delete(widget);
		console.debug(transitionLine(widget, was, next?.state ?? "idle", why));
		for (const listener of [...this.listeners]) listener();
	}

	private recordStep(widget: string, progress: FetchProgress): void {
		const held = this.jobs.get(widget);
		if (!held || held.state === "failed") return;
		const state = progress.total > 0 ? "writing" : "fetching";
		if (held.state === state && held.done === progress.done && held.total === progress.total) return;
		this.write(widget, { ...held, state, done: progress.done, total: progress.total }, "");
	}

	private fail(widget: string, failure: string): InstallOutcome {
		this.write(widget, createFailedJob(widget, failure), failure);
		return { ok: false, failure };
	}

	private async settle(widget: string, run: RunInstall): Promise<InstallOutcome> {
		try {
			const outcome = await run((progress) => this.recordStep(widget, progress));
			if (!outcome?.ok) return this.fail(widget, outcome?.failure ?? COULD_NOT_FETCH);
			this.write(widget, null, "installed");
			return { ok: true };
		} catch (thrown) {
			console.error(thrown);
			return this.fail(widget, thrown instanceof Error ? thrown.message : String(thrown));
		} finally {
			this.inFlight.delete(widget);
		}
	}
}

function transitionLine(widget: string, was: string, now: string, why: string): string {
	return INSTALL_TRANSITION_LOG.replace("{widget}", widget)
		.replace("{was}", was)
		.replace("{now}", now)
		.replace("{why}", why ? ` (${why})` : "");
}

function createFailedJob(widget: string, failure: string): InstallJob {
	return { widget, state: "failed", done: 0, total: 0, failure };
}

export const INSTALL_JOBS: InstallJobs = createInstallJobs();
