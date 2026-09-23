import type { LooseProps } from "../types";
import { sidebarClass } from "../utils/class-names";
import { render } from "../utils/render";

export function Sidebar({ as = "div", ...props }: LooseProps) {
	return render(as, props, sidebarClass(props));
}
