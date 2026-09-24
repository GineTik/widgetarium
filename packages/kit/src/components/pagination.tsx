import { createElement as h } from "react";
import { PAGE_OF_SHOWN, PAGE_OF_SPOKEN, PAGINATION_VARIANT_WORD } from "../constants/pagination";
import { useControllableState } from "../hooks/use-controllable-state";
import { Icon } from "../icons/icon";
import type { LooseProps } from "../types";
import { buttonClass, iconButtonClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { paginationItems } from "../utils/pagination";
import { wornWord } from "../utils/surface";
import { Slot, slotted } from "./slot";

const STEP_ICON_PX = 16;

const PAGE_LOOK = iconButtonClass({ variant: "ghost", size: "s" });

const STEP_LOOK = buttonClass({ variant: "ghost", size: "s" });

const PREVIOUS_PAGE = "Go to the previous page";
const NEXT_PAGE = "Go to the next page";

export function Pagination({ children, ...props }: LooseProps) {
	if (children !== undefined && children !== null) return <PaginationRoot {...props} children={children} />;
	return <PaginationPreset {...props} />;
}

export const PaginationContent = slotted(
	"ul",
	(props) => cn("wg-kit-pagination-content", props.className),
	"PaginationContent",
);

export const PaginationItem = slotted("li", (props) => cn("wg-kit-pagination-item", props.className), "PaginationItem");

export function PaginationLink(props: LooseProps) {
	return <PaginationButton {...props} look={PAGE_LOOK} />;
}

export function PaginationPrevious({ label = "Previous", className: cls, ...props }: LooseProps) {
	return (
		<PaginationButton
			aria-label={PREVIOUS_PAGE}
			{...props}
			look={STEP_LOOK}
			className={cn("wg-kit-pagination-step", cls)}
		>
			<Icon name="chevron-left" size={STEP_ICON_PX} />
			<span className="wg-kit-pagination-step-label">{label}</span>
		</PaginationButton>
	);
}

export function PaginationNext({ label = "Next", className: cls, ...props }: LooseProps) {
	return (
		<PaginationButton aria-label={NEXT_PAGE} {...props} look={STEP_LOOK} className={cn("wg-kit-pagination-step", cls)}>
			<span className="wg-kit-pagination-step-label">{label}</span>
			<Icon name="chevron-right" size={STEP_ICON_PX} />
		</PaginationButton>
	);
}

export function PaginationEllipsis({ className: cls, ...props }: LooseProps) {
	return (
		<span aria-hidden="true" {...domPropsOf(props)} className={cn("wg-kit-pagination-ellipsis", cls)}>
			<Icon name="ellipsis" size={STEP_ICON_PX} />
		</span>
	);
}

function PaginationRoot({ className: cls, children, ...props }: LooseProps) {
	return (
		<nav aria-label="Pages" {...domPropsOf(props)} className={cn("wg-kit-pagination", cls)}>
			{children}
		</nav>
	);
}

function PaginationPreset({ page, defaultPage = 1, onPageChange, count = 0, siblings, variant, ...props }: LooseProps) {
	const [asked, setPage] = useControllableState({ prop: page, defaultProp: defaultPage, onChange: onPageChange });
	if (count <= 1) return null;
	const current = Math.min(Math.max(asked, 1), count);
	return (
		<PaginationRoot {...props} data-variant={wornWord(variant, PAGINATION_VARIANT_WORD)}>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious disabled={current === 1} onClick={() => setPage(current - 1)} />
				</PaginationItem>
				<PageLinks current={current} count={count} siblings={siblings} onPage={setPage} />
				<PageOf current={current} count={count} />
				<PaginationItem>
					<PaginationNext disabled={current === count} onClick={() => setPage(current + 1)} />
				</PaginationItem>
			</PaginationContent>
		</PaginationRoot>
	);
}

function PageLinks({ current, count, siblings, onPage }: LooseProps) {
	return paginationItems(current, count, siblings).map((entry) =>
		entry.kind === "gap" ? (
			<PaginationItem key={`gap-${entry.key}`} data-part="page">
				<PaginationEllipsis />
			</PaginationItem>
		) : (
			<PaginationItem key={entry.page} data-part="page">
				<PaginationLink isActive={entry.page === current} onClick={() => onPage(entry.page)}>
					{entry.page}
				</PaginationLink>
			</PaginationItem>
		),
	);
}

function PageOf({ current, count }: LooseProps) {
	const said = (sentence: string) => sentence.replace("{page}", String(current)).replace("{count}", String(count));
	return (
		<li className="wg-kit-pagination-item wg-kit-pagination-status" role="status" aria-label={said(PAGE_OF_SPOKEN)}>
			{said(PAGE_OF_SHOWN)}
		</li>
	);
}

function PaginationButton({ look, isActive = false, asChild = false, className: cls, children, ...props }: LooseProps) {
	const Comp = asChild ? Slot : "button";
	return (
		<Comp
			type={asChild ? undefined : "button"}
			aria-current={isActive ? "page" : undefined}
			data-active={isActive ? "" : undefined}
			{...domPropsOf(props)}
			className={cn(look, "wg-kit-pagination-link", cls)}
		>
			{children}
		</Comp>
	);
}
