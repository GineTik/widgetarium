import { createElement as h, createContext } from "react";
import { useContext } from "react";

// TWO contexts, because they answer different questions.
//
// Override — what the BOARD says this widget should look like, when it says anything. A
// WidgetRoot consumes it and then clears it, so a widget nested inside another one (a card
// in a slot) is never handed the outer widget's answer. Leaking it made every card in the
// kanban transparent and square: the board is drawn with no surface, and the cards inside it
// inherited that instead of their own.
//
// Appearance — what this widget ACTUALLY got, for its own descendants to read through the
// hooks. Nested WidgetRoots overwrite it for their own subtree, which is correct: inside a
// card, the card's answer is the true one.
const Override = createContext(null);
const Appearance = createContext(null);

export const ROUNDED = ["base", "full", "none"];
export const BACKGROUND = ["fill", "shadow", "none"];

// Read what this widget got, which is not always what it asked for. Used to adapt layout —
// most often padding, which only earns its keep when there is a surface to sit inside.
export function useWidgetRounded() {
	return useContext(Appearance)?.rounded ?? "base";
}

export function useBackgroundType() {
	return useContext(Appearance)?.background ?? "fill";
}

// Every widget starts here. The root is the one element that decides how the widget sits on
// the board, so those decisions cannot be forgotten or contradicted.
export function WidgetRoot({
	defaultRounded = "base",
	defaultBackgroundType = "fill",
	background,
	className,
	children,
	...rest
}) {
	const told = useContext(Override);
	const rounded = told?.rounded ?? defaultRounded;
	const backgroundType = told?.background ?? defaultBackgroundType;

	return h(
		Override.Provider,
		{ value: null },
		h(
			Appearance.Provider,
			{ value: { rounded, background: backgroundType } },
			h(
				"div",
				{
					...rest,
					className: `wg-widget-root${className ? ` ${className}` : ""}`,
					"data-rounded": rounded,
					"data-fill": backgroundType,
					style: background ? { ...(rest.style ?? {}), "--wg-surface-fill": background } : rest.style,
				},
				children,
			),
		),
	);
}

// The board's word, for the one widget it is aimed at. Nothing sets it yet — there is no
// settings UI — but the seam is where it belongs, so turning it on is one place.
export function AppearanceOverride({ value, children }) {
	return h(Override.Provider, { value }, children);
}
