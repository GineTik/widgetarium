import type { HTMLAttributes } from "react";

export type OverlayScrimPartProps = HTMLAttributes<HTMLDivElement>;

// TRADE-OFF: draws nothing — the content lays its own scrim, a second would double the shade
export function OverlayScrimPart(_props: OverlayScrimPartProps): null {
	return null;
}
