import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { dataAttributesOf } from "../utils/data-attributes";
import type { DataAttributes } from "../utils/data-attributes";
import { PageHead } from "./page-head";

interface PageCommon extends DataAttributes {
	readonly action?: ReactNode;
	readonly back?: ReactNode;
	readonly className?: string | undefined;
	readonly children?: ReactNode;
}

interface HomePage extends PageCommon {
	readonly kind: "home";
	readonly title: string;
	readonly hero: ReactNode;
	readonly side?: ReactNode;
}

interface IndexPage extends PageCommon {
	readonly kind: "index";
	readonly title: string;
	readonly count?: ReactNode;
	readonly wide?: boolean | undefined;
	readonly hero?: never;
}

interface RecordPage extends PageCommon {
	readonly kind: "record";
	readonly hero: ReactNode;
	readonly side?: ReactNode;
	readonly title?: never;
}

interface DashboardPage extends PageCommon {
	readonly kind: "dashboard";
	readonly title: string;
	readonly hero?: ReactNode;
}

interface FormPage extends PageCommon {
	readonly kind: "form";
	readonly title: string;
	readonly hero?: never;
}

export type PageProps = HomePage | IndexPage | RecordPage | DashboardPage | FormPage;

export type PageKind = PageProps["kind"];

export function Page(props: PageProps): ReactElement {
	const side = "side" in props ? props.side : undefined;
	const isWide = props.kind === "index" && props.wide === true;
	return (
		<div
			{...dataAttributesOf(props)}
			data-name={props["data-name"] ?? props.title ?? "Page"}
			className={cn(
				"wg-kit-page",
				`is-${props.kind}`,
				isWide && "is-wide",
				Boolean(side) && "has-side",
				props.className,
			)}
			data-wg-page={props.kind}
		>
			<PageHead
				title={props.title}
				count={props.kind === "index" ? props.count : undefined}
				action={props.action}
				back={props.back}
			/>
			{props.hero ? <div className="wg-kit-page-hero">{props.hero}</div> : null}
			<div className="wg-kit-page-body">
				<div className="wg-kit-page-main">{props.children}</div>
				{side ? <aside className="wg-kit-page-side">{side}</aside> : null}
			</div>
		</div>
	);
}
