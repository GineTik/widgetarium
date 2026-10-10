import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Loader } from "@widgetarium/kit";
import { useSnapshotsWaiting } from "./design-snapshots.js";

const PREPARING = "Preparing pictures · {count}";

export function PicturesProgress(): ReactElement | null {
	const waiting = useSnapshotsWaiting();
	if (waiting === 0) return null;
	return h(Loader, { label: PREPARING.replace("{count}", String(waiting)) });
}
