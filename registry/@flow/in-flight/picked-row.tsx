import type { FlightFace, RowSlot } from "./types";

type Drawn = NonNullable<RowSlot>;

type PickProps = {
	Drawn: Drawn;
	face: FlightFace;
	isPicked: boolean;
	onPick: (() => void) | null;
};

export function PickedRow({ Drawn, face, isPicked, onPick }: PickProps) {
	if (!onPick) return <Drawn flight={face} />;
	return (
		<div
			className="flow-inflight-pick"
			role="button"
			tabIndex={0}
			aria-pressed={isPicked}
			onClick={onPick}
			onKeyDown={(event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				onPick();
			}}
		>
			<Drawn flight={face} />
		</div>
	);
}
