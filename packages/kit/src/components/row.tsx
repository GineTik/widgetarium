import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { SlotPartProps } from "./create-slot-part";
import { Item } from "./item";

export type RowProps = SlotPartProps & { readonly pressable?: boolean | undefined };

export function Row(props: RowProps): ReactElement {
	return <Item data-slot="row" {...props} />;
}
