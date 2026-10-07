import type { ReactNode } from "react";
import { TOAST_QUEUE } from "./toast-queue";
import type { ToastId, ToastOptions, ToastRecord, ToastType } from "./toast-queue";

export type ShowToast = (title: ReactNode, options?: ToastOptions) => ToastId;

export type Settled<T> = ReactNode | ((value: T) => ReactNode);

export interface PromiseMessages<T> {
	readonly loading: ReactNode;
	readonly success: Settled<T>;
	readonly error: Settled<unknown>;
	readonly description?: ReactNode;
	readonly finally?: (() => void) | undefined;
}

export interface ToastApi extends ShowToast {
	readonly message: ShowToast;
	readonly success: ShowToast;
	readonly error: ShowToast;
	readonly warning: ShowToast;
	readonly info: ShowToast;
	readonly loading: ShowToast;
	readonly promise: <T>(promise: Promise<T> | (() => Promise<T>), messages: PromiseMessages<T>) => ToastId;
	readonly dismiss: (id?: ToastId) => void;
	readonly getToasts: () => readonly ToastRecord[];
}

export const toast: ToastApi = Object.assign(showAs("default"), {
	message: showAs("default"),
	success: showAs("success"),
	error: showAs("error"),
	warning: showAs("warning"),
	info: showAs("info"),
	loading: showAs("loading"),
	promise: promiseToast,
	dismiss: (id?: ToastId) => TOAST_QUEUE.dismiss(id),
	getToasts: () => TOAST_QUEUE.read(),
});

function showAs(type: ToastType): ShowToast {
	return (title, options = {}) => TOAST_QUEUE.show(title, type, options);
}

function promiseToast<T>(promise: Promise<T> | (() => Promise<T>), messages: PromiseMessages<T>): ToastId {
	const shared = { description: messages.description };
	const id = TOAST_QUEUE.show(messages.loading, "loading", shared);
	const running = typeof promise === "function" ? promise() : promise;
	running
		.then(
			(value) => TOAST_QUEUE.show(settledText(messages.success, value), "success", { ...shared, id }),
			(error: unknown) => TOAST_QUEUE.show(settledText(messages.error, error), "error", { ...shared, id }),
		)
		.finally(() => messages.finally?.());
	return id;
}

function settledText<T>(message: Settled<T>, value: T): ReactNode {
	return typeof message === "function" ? message(value) : message;
}
