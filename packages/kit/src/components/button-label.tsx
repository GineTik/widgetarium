import { cx } from "../utils/cx";
import { render } from "../utils/render";

export function ButtonLabel(props) {
	return render("span", props, cx("wg-kit-btn-label", props.className));
}
