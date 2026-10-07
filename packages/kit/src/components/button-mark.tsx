import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "../icons/icon";
import { Spinner } from "./spinner";

const MARK_PX: Readonly<Record<string, number>> = {
	l: 20,
	m: 18,
	s: 16,
	xs: 14,
	lg: 20,
	default: 18,
	sm: 16,
	icon: 18,
	"icon-lg": 20,
	"icon-sm": 16,
};

const MEDIUM_MARK_PX = 18;

export function buttonMark(isLoading: boolean, isDone: boolean, size: unknown): ReactElement | null {
	const px = MARK_PX[String(size)] ?? MEDIUM_MARK_PX;
	if (isDone) return <Icon name="tick" size={px} className="wg-kit-btn-mark" />;
	if (isLoading) return <Spinner size={px} className="wg-kit-btn-mark" />;
	return null;
}
