import { useEffect, useState } from "react";
import type { FieldReport } from "../gateway/fields.js";
import type { FolderHost } from "../gateway/obsidian.js";
import { isObject } from "../engine/is-object.js";

export type VaultFields = Readonly<Record<string, readonly FieldReport[]>>;

export interface DescribingHost {
	readonly slot?: FolderHost["slot"];
}

export function useVaultFields(host: DescribingHost | null | undefined, paths: readonly string[]): VaultFields {
	const [held, setHeld] = useState<VaultFields>({});
	const wanted = JSON.stringify(paths);
	useEffect(() => {
		let alive = true;
		const asked = pathsIn(JSON.parse(wanted));
		Promise.all(asked.map((path) => host?.slot?.({ kind: "folder", path })?.describe?.() ?? []))
			.then((found) => {
				if (alive) setHeld(Object.fromEntries(asked.map((path, at) => [path, fieldReportsIn(found[at])])));
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, [wanted, host]);
	return held;
}

function pathsIn(held: unknown): string[] {
	return Array.isArray(held) ? held.filter((path): path is string => typeof path === "string") : [];
}

function fieldReportsIn(held: unknown): FieldReport[] {
	return Array.isArray(held) ? held.filter(isFieldReport) : [];
}

function isFieldReport(held: unknown): held is FieldReport {
	return isObject(held) && typeof held["prop"] === "string" && Array.isArray(held["values"]);
}
