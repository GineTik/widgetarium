import { h } from "preact";
import { useState, useEffect, useMemo, useRef } from "preact/hooks";
import { WIDGETS_DIR } from "./paths.js";

const FACTORY_ARGUMENTS = ["h", "useState", "useEffect", "useMemo", "useRef"];

export class WidgetRegistry {
	constructor(app) {
		this.app = app;
		this.widgets = new Map();
	}

	list() {
		return [...this.widgets.values()];
	}

	get(id) {
		return this.widgets.get(id) ?? null;
	}

	async load() {
		this.widgets.clear();
		const adapter = this.app.vault.adapter;
		if (!(await adapter.exists(WIDGETS_DIR))) return this.widgets;

		for (const scope of (await adapter.list(WIDGETS_DIR)).folders) {
			for (const folder of (await adapter.list(scope)).folders) {
				await this.loadOne(adapter, folder);
			}
		}
		return this.widgets;
	}

	async loadOne(adapter, folder) {
		const manifestPath = `${folder}/manifest.json`;
		const codePath = `${folder}/widget.js`;
		if (!(await adapter.exists(manifestPath)) || !(await adapter.exists(codePath))) return;

		try {
			const manifest = JSON.parse(await adapter.read(manifestPath));
			const source = await adapter.read(codePath);
			const factory = new Function(...FACTORY_ARGUMENTS, `${source}\nreturn widget;`);
			const component = factory(h, useState, useEffect, useMemo, useRef);
			this.widgets.set(manifest.id, { manifest, component, folder });
		} catch (failure) {
			console.error(`[widgetarium] не вдалося завантажити ${folder}`, failure);
			this.widgets.set(folder, { manifest: { id: folder, title: folder }, error: failure, folder });
		}
	}
}
