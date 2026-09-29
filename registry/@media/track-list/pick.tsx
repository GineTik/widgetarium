import type { KeyboardEvent, ReactNode } from "react";

const TRACKS = "Tracks";

export function Pick({ isPicked, onPick, children }: { isPicked: boolean; onPick: () => void; children: ReactNode }) {
	return (
		<div
			className="mt-pick"
			data-picked={isPicked ? "" : undefined}
			aria-current={isPicked ? "true" : undefined}
			aria-label={TRACKS}
			tabIndex={0}
			onClick={onPick}
			onKeyDown={(event: KeyboardEvent) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				onPick();
			}}
		>
			{children}
		</div>
	);
}
