import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	AspectRatio,
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	Card,
	Separator,
	Shape,
} from "../../index";
import { Named } from "../frame/named";

export function Navigation(): ReactElement {
	return (
		<div className="wg-showcase-stack">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="#">Vault</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbEllipsis />
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="#">Journal</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Weekly review</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<Separator />
			<div className="wg-showcase-row">
				<span>Notes</span>
				<Separator orientation="vertical" />
				<span>Links</span>
				<Separator orientation="vertical" />
				<span>Tags</span>
			</div>
			<Named name="AspectRatio ratio={16 / 9}">
				<AspectRatio ratio={16 / 9}>
					<Card>
						<Shape name="cookie12-sided" seed={3} />
					</Card>
				</AspectRatio>
			</Named>
		</div>
	);
}
