import { createWidget, WidgetRoot, EditableTabs, toTabList } from "widgetarium";
import { useEffect } from "react";

const GONE_FOR_GOOD = "The tab goes for good. Notes filed under it keep the property they carry.";

const DEFAULT_KEY = "board";

function join(list) {
	return (list ?? []).join(", ");
}

export default createWidget(function EditableTabsWidget({ settings, context, configure, data, actions, host }) {
	const key = String(settings.selectionKey ?? "").trim() || DEFAULT_KEY;
	const tabs = toTabList(settings.tabs);
	const archived = toTabList(settings.archived);
	const selected = context?.get(key) ?? settings.activeTab ?? tabs[0];

	// NAMES, AND NOTHING ELSE. Whoever needs what a name MEANS fetches the record itself; the
	// strip only says which names there are, so that a reader can hold one record per name.
	// CONTEXT: a joined string, not the array — a fresh array every render notifies forever
	useEffect(() => {
		context?.set(`${key}s`, tabs.join(", "));
	}, [key, tabs.join(", ")]);

	// CONTEXT: a tab is only a name — the note property is what files a row under it
	const refile = async (was, name) => {
		const held = (data?.tasks?.rows ?? []).filter((row) => row.props?.[key] === was);
		if (held.length === 0 || !actions?.tasks?.canUpdate) return;
		for (const row of held) await actions.tasks.update({ path: row.path }, { props: { [key]: name } });
	};

	const apply = (step) => {
		if (step.verb === "select") return context?.set(key, step.selected);
		if (step.verb === "restore") return configure?.({ tabs: join(step.tabs), archived: join(step.archived) });
		if (step.verb === "delete") return configure?.({ archived: join(step.archived) });

		configure?.({ tabs: join(step.tabs), activeTab: step.selected, archived: join(step.archived) });
		context?.set(key, step.selected);
		if (step.verb === "rename") refile(step.was, step.name);
	};

	return (
		<WidgetRoot defaultRounded="none" defaultBackgroundType="none">
			<EditableTabs
				tabs={tabs}
				archived={archived}
				selected={selected}
				onChange={apply}
				onRefuse={(said) => host?.ui?.notify(said)}
				deleteWarning={GONE_FOR_GOOD}
			/>
		</WidgetRoot>
	);
});
