export type Shown = { property: string; heading: string };

export type Drawn =
	| { kind: "blank" }
	| { kind: "text"; text: string }
	| { kind: "emoji"; name: string; text: string }
	| { kind: "icon"; name: string; text: string };
