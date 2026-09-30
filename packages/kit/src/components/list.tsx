import { createElement as h } from "react";
import type { CSSProperties, FunctionComponent, Key, ReactNode } from "react";
import { listClass, rowClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import { createSlotPart } from "./slot";
import type { SlotPartProps } from "./create-slot-part";

export type SlotDrawing = FunctionComponent<Readonly<Record<string, unknown>>> & { readonly isCard?: boolean };

export interface SlotListProps<R> {
	readonly slot?: SlotDrawing | null | undefined;
	readonly rows?: readonly R[] | undefined;
	readonly give: (row: R) => Readonly<Record<string, unknown>>;
	readonly keyOf?: ((row: R) => Key) | undefined;
	readonly className?: string | undefined;
	readonly style?: CSSProperties | undefined;
	readonly children?: ReactNode;
}

export const List: FunctionComponent<SlotPartProps> = createSlotPart("div", listClass, "List");

export const Row: FunctionComponent<SlotPartProps & { readonly pressable?: boolean | undefined }> = createSlotPart(
	"div",
	rowClass,
	"Row",
);

export const RowBadge: FunctionComponent<SlotPartProps> = createSlotPart(
	"span",
	(props) => cn("wg-kit-row-badge", props.className),
	"RowBadge",
);

export const RowLabel: FunctionComponent<SlotPartProps> = createSlotPart(
	"span",
	(props) => cn("wg-kit-row-label", props.className),
	"RowLabel",
);

export const RowValue: FunctionComponent<SlotPartProps> = createSlotPart(
	"span",
	(props) => cn("wg-kit-row-value", props.className),
	"RowValue",
);

export function SlotList<R>({
	slot: Drawn,
	rows = [],
	give,
	keyOf,
	className: cls,
	style,
	children,
}: SlotListProps<R>): ReactNode {
	if (!Drawn) return null;
	return (
		<div className={cn("wg-kit-slot-list", cls)} style={style} data-cards={Drawn.isCard ? "" : undefined}>
			{children ?? rows.map((row, at) => <Drawn key={keyOf ? keyOf(row) : at} {...give(row)} />)}
		</div>
	);
}
