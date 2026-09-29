export const STYLE = `
.wgc-code {
	position: relative;
	overflow: hidden;
}

/* CONTEXT: 46px = the menu's own 8px inset, its 32px box and the row's gap */
.wgc-bar {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 6px;
	padding: 8px 46px 0 14px;
}

/* CONTEXT: the kit's own step is 32, and the icons beside this one are painted at it */
.wgc-lang.wg-kit-btn.is-s {
	height: 32px;
	padding: 0 10px 0 14px;
	font-family: var(--font-monospace);
	font-weight: var(--font-medium, 500);
}

/* CONTEXT: Obsidian's markdown post-processor puts its own copy button in every code block */
.wgc-body .copy-code-button,
.wgc-body pre > button {
	display: none;
}

/* CONTEXT: the kit's chevron points along the row; a menu opens downward */
.wgc-caret {
	margin-left: 2px;
	transform: rotate(90deg);
}

.wgc-plus {
	margin-right: 6px;
}

.wgc-needle {
	margin-left: 6px;
	font-family: var(--font-monospace);
	color: var(--wg-kit-text-muted);
}

.wgc-body {
	padding: 0 14px 4px;
}

/* CONTEXT: the host sits inside .markdown-rendered, whose pre rule pads 12px 16px and floors 38px */
.wgc-body pre {
	margin: 0;
	padding: 0;
	min-height: 0;
	border-radius: var(--wg-kit-item, 14px);
	background: transparent;
}

.wgc-plain {
	margin: 0;
	padding: 0 14px 12px;
	overflow-x: auto;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-small, 13px);
	line-height: 1.5;
	white-space: pre;
	color: var(--wg-kit-text);
}

.wgc-more {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 6px 14px 12px;
}

.wgc-left {
	color: var(--wg-kit-text-muted);
	font-size: var(--font-ui-smaller, 12px);
}

.wgc-code.is-failed {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.wgc-what {
	font-weight: 600;
	color: var(--wg-kit-text);
}

.wgc-why {
	color: var(--wg-kit-text-muted);
	font-size: var(--font-ui-small, 13px);
	overflow-wrap: anywhere;
}
`;
