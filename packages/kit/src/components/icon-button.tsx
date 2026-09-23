import { buttonMark } from "../utils/button-mark";
import { iconButtonClass } from "../utils/class-names";
import { cx } from "../utils/cx";
import { render } from "../utils/render";

export function IconButton(props) {
	const { label, isLoading = false, isDone = false, children, ...rest } = props;
	const mark = buttonMark(isLoading, isDone, props.size);
	const held = {
		type: "button",
		"aria-label": label,
		...rest,
		disabled: rest.disabled || isLoading,
		"aria-busy": isLoading ? "true" : undefined,
		children: mark ?? children,
	};
	return render("button", held, cx(iconButtonClass(props), isLoading && "is-loading", isDone && "is-done"));
}
