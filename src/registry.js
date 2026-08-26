import { h, Fragment } from "preact";
import { useState, useEffect, useMemo, useRef } from "preact/hooks";
import { transform } from "sucrase";
import { widgetarium } from "./api.js";
import { WIDGETS_DIR } from "./paths.js";

const BASE_SCOPE = {
	h,
	Fragment,
	useState,
	useEffect,
	useMemo,
	useRef,
};

function compile(source, filePath) {
	return transform(source, {
		transforms: ["jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
		filePath,
	}).code;
}

function createRequire(scope) {
	const modules = {
		widgetarium: scope.widgetarium,
		preact: { h: scope.h, Fragment: scope.Fragment },
		"preact/hooks": {
			useState: scope.useState,
			useEffect: scope.useEffect,
			useMemo: scope.useMemo,
			useRef: scope.useRef,
		},
	};
	return (name) => {
		const found = modules[name];
		if (!found) throw new Error(`cannot import "${name}" — a widget may only import widgetarium or preact`);
		return found;
	};
}

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
		if (!(await adapter.exists(manifestPath))) return;

		const jsxPath = `${folder}/widget.jsx`;
		const jsPath = `${folder}/widget.js`;
		const isJsx = await adapter.exists(jsxPath);
		const codePath = isJsx ? jsxPath : jsPath;
		if (!isJsx && !(await adapter.exists(jsPath))) return;

		try {
			const manifest = JSON.parse(await adapter.read(manifestPath));
			const raw = await adapter.read(codePath);
			const source = isJsx ? compile(raw, codePath) : raw;

			const scope = { ...BASE_SCOPE, widgetarium };
			const shell = { exports: {} };

			new Function("require", "module", "exports", ...Object.keys(scope), source)(
				createRequire(scope),
				shell,
				shell.exports,
				...Object.values(scope),
			);

			const exported = shell.exports.default ?? shell.exports;
			if (typeof exported !== "function") {
				throw new Error(`${folder}: the file must "export default createWidget(...)"`);
			}

			this.widgets.set(manifest.id, { manifest: { ...exported.meta, ...manifest }, component: exported, folder });
		} catch (failure) {
			console.error(`[widgetarium] failed to load ${folder}`, failure);
			const id = folder.slice(WIDGETS_DIR.length + 1);
			this.widgets.set(id, { manifest: { id, title: id }, error: failure, folder });
		}
	}
}
