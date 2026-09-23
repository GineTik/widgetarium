import { createElement as h } from "react";
import { Spinner } from "../components/spinner";
import { Icon } from "../icons/icon";

const MARK_PX = { l: 20, m: 18, s: 16, xs: 14 };

export function buttonMark(isLoading, isDone, size) {
	const px = MARK_PX[size] ?? MARK_PX.m;
	if (isDone) return <Icon name="tick" size={px} className="wg-kit-btn-mark" />;
	if (isLoading) return <Spinner size={px} className="wg-kit-btn-mark" />;
	return null;
}
