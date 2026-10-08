import { createElement as h, useEffect } from "react";
import type { ReactElement } from "react";
import { Button, toast } from "../../index";

export const SHOT_TOASTS_MS = Infinity;

export function ToastButtons({ isShot }: { readonly isShot: boolean }): ReactElement {
	useShotToasts(isShot);
	return (
		<Button
			variant="outline"
			onClick={() =>
				toast("Event created", {
					description: "Sunday, December 3 at 9:00",
					action: { label: "Undo", onClick: () => undefined },
				})
			}
		>
			Toast
		</Button>
	);
}

export function useShotToasts(isShot: boolean): void {
	useEffect(() => {
		if (!isShot) return;
		toast.error("Sync failed", { description: "The vault was busy.", duration: SHOT_TOASTS_MS });
		toast.success("Note saved", { duration: SHOT_TOASTS_MS });
		toast("Event created", {
			description: "Sunday, December 3 at 9:00",
			action: { label: "Undo", onClick: () => undefined },
			duration: SHOT_TOASTS_MS,
		});
	}, [isShot]);
}
