import { cx } from "../utils/cx";
import { render } from "../utils/render";

function rowPart(baseClass, name) {
	function Part(props) {
		return render("span", props, cx(baseClass, props.className));
	}
	Part.displayName = name;
	return Part;
}

export const RowBadge = rowPart("wg-kit-row-badge", "RowBadge");

export const RowLabel = rowPart("wg-kit-row-label", "RowLabel");

export const RowValue = rowPart("wg-kit-row-value", "RowValue");
