import { ButtonLabel, Icon } from "widgetarium/kit";
import type { Ref } from "react";

type FilterTriggerProps = { triggerRef: Ref<HTMLButtonElement>; count: number; hasRoomForWord: boolean };

export function FilterTrigger({ triggerRef, count, hasRoomForWord }: FilterTriggerProps) {
	return (
		<button
			type="button"
			ref={triggerRef}
			className={`wg-kit-btn is-m is-block ofp-open${count > 0 ? " is-on" : ""}${hasRoomForWord ? "" : " is-tight"}`}
		>
			<Icon name="filter" className="ofp-icon" />
			{hasRoomForWord ? <ButtonLabel>Filter</ButtonLabel> : null}
			{count > 0 ? <span className="wg-kit-count ofp-count">{count}</span> : null}
		</button>
	);
}
