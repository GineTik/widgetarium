import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle,
} from "../../index";

export function DocsNavigation({ isOpen }: { readonly isOpen: boolean }): ReactElement {
	return (
		<NavigationMenu defaultValue={isOpen ? "start" : ""}>
			<NavigationMenuList>
				<NavigationMenuItem value="start">
					<NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
					<NavigationMenuContent>
						<div className="wg-showcase-nav-grid">
							<NavigationMenuLink href="#intro">
								<strong>Introduction</strong>
								<span className="wg-showcase-note">What a widget is, and where it lives.</span>
							</NavigationMenuLink>
							<NavigationMenuLink href="#install">
								<strong>Installation</strong>
								<span className="wg-showcase-note">Put the plugin into a vault.</span>
							</NavigationMenuLink>
							<NavigationMenuLink href="#kit">
								<strong>The kit</strong>
								<span className="wg-showcase-note">Every component, in shadcn's names.</span>
							</NavigationMenuLink>
						</div>
					</NavigationMenuContent>
				</NavigationMenuItem>
				<NavigationMenuItem value="docs">
					<NavigationMenuLink href="#docs" className={navigationMenuTriggerStyle()}>
						Docs
					</NavigationMenuLink>
				</NavigationMenuItem>
			</NavigationMenuList>
		</NavigationMenu>
	);
}
