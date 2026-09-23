import ADD_YOUR_OWN_WIDGET from "../../../docs/catalogue/add-your-own-widget.md";
import PUBLISH_YOUR_WIDGET from "../../../docs/catalogue/publish-your-widget.md";

// TODO: replace with the address registries are sent to, before the first public release
const REGISTRY_INBOX = "[YOUR EMAIL]";

const REGISTRY_SUBJECT = "Widgetarium registry";

const REGISTRY_LETTER = `Repository: https://github.com/
Pack I would like: @you
Licence: MIT, in LICENSE.md
What these widgets do:
`;

function mailto(to, subject, body) {
	return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const DOC_PAGES = [
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

export function docPage(id) {
	return DOC_PAGES.find((page) => page.id === id) ?? null;
}

export function pageAfter(id) {
	const at = DOC_PAGES.findIndex((page) => page.id === id);
	return at === -1 || at + 1 >= DOC_PAGES.length ? null : DOC_PAGES[at + 1];
}

export function pagesMatching(keyword) {
	const asked = keyword.trim().toLowerCase();
	if (!asked) return DOC_PAGES;
	return DOC_PAGES.filter((page) => `${page.title}\n${page.body}`.toLowerCase().includes(asked));
}
