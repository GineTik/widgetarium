import { useEffect, useMemo, useRef, useState } from "preact/hooks";

const AUTHOR_RANK = { settings: 0, widget: 1, link: 2, manifest: 3 };

function rankOf(row) {
	return AUTHOR_RANK[String(row.by ?? "widget").split(":")[0]] ?? 9;
}

function seedRows(seed, persisted, author) {
	const claimed = new Set(persisted.map((row) => row.prop));
	return [...seed.filter((row) => !claimed.has(row.prop)).map((row) => ({ ...row, by: author })), ...persisted];
}

function mergeFilters(seed, persisted) {
	return seedRows(seed ?? [], persisted ?? [], "manifest");
}

function mergeSort(seed, persisted) {
	const merged = seedRows(seed ?? [], persisted ?? [], "manifest");
	return [...merged].sort((first, second) => rankOf(first) - rankOf(second));
}

function lockedProps(rows, author) {
	return new Set(rows.filter((row) => row.fixed && row.by !== author).map((row) => row.prop));
}

function replaceAuthored(rows, author, next) {
	return [...rows.filter((row) => row.by !== author), ...next.map((row) => ({ ...row, by: author }))];
}

function applyWindow(rows, window) {
	const offset = Math.max(0, window.offset ?? 0);
	const limit = window.limit ?? 0;
	return limit > 0 ? rows.slice(offset, offset + limit) : rows.slice(offset);
}

export function useSource({ host, name, config, manifest, patchConfig, author = "widget" }) {
	const binding = { kind: "folder", path: config?.path || manifest?.path || "" };
	const slot = useMemo(() => host.slot(binding), [host, binding.path]);

	const filterRows = mergeFilters(manifest?.filters, config?.filters);
	const sortRows = mergeSort(manifest?.sort, config?.sort);
	const filterKey = JSON.stringify(filterRows);
	const sortKey = JSON.stringify(sortRows);

	const [window, setWindow] = useState({ offset: 0, limit: manifest?.window?.limit ?? 0 });
	const [state, setState] = useState({ rows: [], total: null, isLoading: true });

	const latest = useRef(0);
	const configRef = useRef(config);
	configRef.current = config;

	useEffect(() => {
		const ticket = ++latest.current;
		let alive = true;

		const load = () =>
			slot.list({ where: filterRows, sort: sortRows }).then((result) => {
				if (!alive || ticket !== latest.current) return;
				setState({ rows: result.rows, total: result.total, isLoading: false });
			});

		load();
		const stop = slot.canSubscribe ? slot.subscribe(load) : null;
		return () => {
			alive = false;
			stop?.();
		};
	}, [slot, filterKey, sortKey]);

	const filters = useMemo(() => {
		const locked = lockedProps(filterRows, author);
		return {
			list: filterRows,
			canFilterBy: (prop) => !locked.has(prop),
			update: (next) => {
				const incoming = Array.isArray(next) ? next : [next];
				const appliedFilters = incoming.filter((row) => !locked.has(row.prop));
				const rejectedFilters = incoming
					.filter((row) => locked.has(row.prop))
					.map((row) => ({ prop: row.prop, reason: "fixed", by: "settings" }));
				patchConfig(name, {
					filters: replaceAuthored(configRef.current?.filters ?? [], author, appliedFilters),
				});
				return { appliedFilters, rejectedFilters };
			},
		};
	}, [filterKey, name, author]);

	const sort = useMemo(() => {
		const locked = lockedProps(sortRows, author);
		return {
			list: sortRows,
			canSortBy: (prop) => !locked.has(prop),
			update: (next) => {
				const incoming = Array.isArray(next) ? next : [next];
				const appliedSort = incoming.filter((row) => !locked.has(row.prop));
				const rejectedSort = incoming
					.filter((row) => locked.has(row.prop))
					.map((row) => ({ prop: row.prop, reason: "fixed", by: "settings" }));
				patchConfig(name, {
					sort: replaceAuthored(configRef.current?.sort ?? [], author, appliedSort),
				});
				return { appliedSort, rejectedSort };
			},
		};
	}, [sortKey, name, author]);

	const windowApi = useMemo(
		() => ({
			list: window,
			update: (patch) => setWindow((current) => ({ ...current, ...patch })),
		}),
		[window.offset, window.limit],
	);

	const data = useMemo(
		() => ({
			rows: applyWindow(state.rows, window),
			total: state.total,
			isLoading: state.isLoading,
		}),
		[state, window.offset, window.limit],
	);

	return useMemo(
		() => ({
			name,
			binding,
			data,
			filters,
			sort,
			window: windowApi,
			canCreate: slot.canCreate,
			canUpdate: slot.canUpdate,
			canRemove: slot.canRemove,
			create: (draft) => (slot.canCreate ? slot.create(draft) : Promise.reject(new Error("read-only"))),
			describe: () => slot.describe(),
			openRecord: (ref) => host.ui.openNote(ref.path),
			update: (ref, patch) => (slot.canUpdate ? slot.update(ref, patch) : Promise.resolve(null)),
		}),
		[data, filters, sort, windowApi, slot],
	);
}
