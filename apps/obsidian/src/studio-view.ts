import { FileView } from "obsidian";
import type { Menu, TFile, WorkspaceLeaf } from "obsidian";
import { render } from "@widgetarium/core/engine/render.js";
import { shieldFromEditor } from "@widgetarium/core/editor-shield.js";
import { drawStudio, studioNoteOfFile } from "./studio-drawing.js";
import type { StudioPlace } from "./studio-drawing.js";
import { isSameStudioNote, studioParamsKeyOf } from "./studio-note.js";
import type { StudioNote } from "./studio-note.js";
import { createStudioRouting } from "./studio-routing.js";
import type { StudioRouting } from "./studio-routing.js";

export const STUDIO_VIEW_TYPE = "widgetarium-studio";

const OPEN_AS_MARKDOWN = "Open as Markdown";
const MARKDOWN_ICON = "file-text";
const STUDIO_ICON = "layout-dashboard";
const NOTE_EXTENSION = "md";
const UNNAMED_APP = "App";

export class StudioView extends FileView {
	private node: HTMLElement | null = null;
	private stopDrawing: (() => void) | null = null;
	private shownNote: StudioNote | null = null;
	private readonly leafKey = crypto.randomUUID();
	private readonly routing: StudioRouting = createStudioRouting((pathname) =>
		studioParamsKeyOf(this.file?.path ?? "", this.leafKey, pathname),
	);

	constructor(
		leaf: WorkspaceLeaf,
		private readonly place: StudioPlace,
	) {
		super(leaf);
		this.navigation = true;
	}

	getViewType(): string {
		return STUDIO_VIEW_TYPE;
	}

	override getDisplayText(): string {
		return this.file?.basename ?? UNNAMED_APP;
	}

	override getIcon(): string {
		return STUDIO_ICON;
	}

	override canAcceptExtension(extension: string): boolean {
		return extension === NOTE_EXTENSION;
	}

	override async onOpen(): Promise<void> {
		this.contentEl.addClass("wg-studio-view");
		this.node = this.contentEl.createDiv({ cls: "wg-studio-mount" });
		shieldFromEditor(this.node);
		this.registerEvent(
			this.place.app.metadataCache.on("changed", (file) => {
				if (file === this.file) this.onNoteChanged(file);
			}),
		);
	}

	override async onLoadFile(file: TFile): Promise<void> {
		this.redraw(file);
	}

	override async onUnloadFile(): Promise<void> {
		this.stop();
	}

	override async onClose(): Promise<void> {
		this.stop();
	}

	override onPaneMenu(menu: Menu, source: string): void {
		const file = this.file;
		if (file)
			menu.addItem((item) =>
				item
					.setTitle(OPEN_AS_MARKDOWN)
					.setIcon(MARKDOWN_ICON)
					.onClick(() => void this.place.openAsMarkdown(this.leaf, file)),
			);
		super.onPaneMenu(menu, source);
	}

	onNoteChanged(file: TFile): void {
		const now = studioNoteOfFile(this.place.app, file);
		if (now === null) {
			void this.place.showAsMarkdown(this.leaf, file);
			return;
		}
		if (!isSameStudioNote(this.shownNote, now)) this.redraw(file);
	}

	private redraw(file: TFile): void {
		this.stop();
		const node = this.node;
		if (!node) return;
		this.shownNote = studioNoteOfFile(this.place.app, file);
		const shown = { file, note: this.shownNote, node, leaf: this.leaf, frame: this.containerEl };
		this.stopDrawing = drawStudio(this.place, shown, this.routing);
	}

	private stop(): void {
		this.stopDrawing?.();
		this.stopDrawing = null;
		this.shownNote = null;
		if (this.node) render(null, this.node);
	}
}
