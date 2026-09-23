import { plateClass } from "../utils/class-names";
import { render } from "../utils/render";

export function Plate(props) {
	return render("div", props, plateClass(props));
}
