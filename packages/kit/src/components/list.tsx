import { listClass } from "../utils/class-names";
import { render } from "../utils/render";

export function List(props) {
	return render("div", props, listClass(props));
}
