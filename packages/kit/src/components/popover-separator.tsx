import { createElement as h } from "react";
import { cx } from "../utils/cx";

export function PopoverSeparator(props) {
	return <div {...props} role="separator" className={cx("wg-kit-pop-sep", props.className)} />;
}
