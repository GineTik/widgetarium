import { createElement as h } from "react";
import type { ReactElement } from "react";
import { LayoutItem } from "../../index";
import { Named } from "./named";
import type { NamedProps } from "./named";

export function Cell(props: NamedProps): ReactElement {
	return (
		<LayoutItem>
			<Named {...props} />
		</LayoutItem>
	);
}
