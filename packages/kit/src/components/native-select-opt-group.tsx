import { createElement as h } from "react";
import type { OptgroupHTMLAttributes, ReactElement } from "react";

export function NativeSelectOptGroup(props: OptgroupHTMLAttributes<HTMLOptGroupElement>): ReactElement {
	return <optgroup data-slot="native-select-optgroup" {...props} />;
}
