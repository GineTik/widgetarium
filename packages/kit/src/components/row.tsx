import { rowClass } from "../utils/class-names";
import { render } from "../utils/render";

export function Row(props) {
	return render("div", props, rowClass(props));
}
