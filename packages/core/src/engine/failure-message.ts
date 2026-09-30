import { isObject } from "./is-object.js";

export function failureMessage(failure: unknown): string {
	const message = isObject(failure) ? failure["message"] : undefined;
	return String(message ?? failure);
}
