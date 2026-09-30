import ADD_YOUR_OWN_WIDGET from "../../../docs/catalogue/add-your-own-widget.md";
import PUBLISH_YOUR_WIDGET from "../../../docs/catalogue/publish-your-widget.md";

export interface DocAction {
	readonly label: string;
	readonly icon: string;
	readonly href: string;
}

export interface DocPage {
	readonly id: string;
	readonly title: string;
	readonly icon: string;
	readonly body: string;
	readonly action?: DocAction;
}

// TODO: replace with the address registries are sent to, before the first public release
const REGISTRY_INBOX = "[YOUR EMAIL]";

const REGISTRY_SUBJECT = "Widgetarium registry";

const REGISTRY_LETTER = `Repository: https://github.com/
Pack I would like: @you
Licence: MIT, in LICENSE.md
What these widgets do:
`;

export const DOC_PAGES: readonly DocPage[] = [
	{
		id: "add-your-own-widget",
		title: "Add your own widget",
		icon: "plus",
		body: ADD_YOUR_OWN_WIDGET,
	},
	{
		id: "publish-your-widget",
		title: "Publish your widget",
		icon: "link",
		body: PUBLISH_YOUR_WIDGET,
		action: {
			label: "Email your repository",
			icon: "chat",
			href: mailto(REGISTRY_INBOX, REGISTRY_SUBJECT, REGISTRY_LETTER),
		},
	},
];

export function docPage(id: string | null | undefined): DocPage | null {
	return DOC_PAGES.find((page) => page.id === id) ?? null;
}

export function pageAfter(id: string): DocPage | null {
	const at = DOC_PAGES.findIndex((page) => page.id === id);
	if (at === -1) return null;
	return DOC_PAGES[at + 1] ?? null;
}

export function pagesMatching(keyword: string): readonly DocPage[] {
	const asked = keyword.trim().toLowerCase();
	if (!asked) return DOC_PAGES;
	return DOC_PAGES.filter((page) => `${page.title}\n${page.body}`.toLowerCase().includes(asked));
}

function mailto(to: string, subject: string, body: string): string {
	return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
