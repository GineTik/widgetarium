import { IValueGateway, z } from "@widgetarium/core/gateway/declared.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import type { ViewCell } from "@widgetarium/core/gateway/refs.js";
import type { HostFields } from "@widgetarium/core/engine/host-context.js";
import type { QueryPorts } from "@widgetarium/core/engine/packs.js";
import { msUntilTomorrow, todayIso } from "@widgetarium/core/today.js";

export class PageParamQuery extends IValueGateway {
	private readonly cell: ViewCell | null;

	constructor(fields: HostFields, ports: QueryPorts) {
		super();
		const key = fields["key"];
		if (typeof key !== "string" || key === "") throw new Error('a page parameter names its key, such as "project"');
		this.cell = ports.page.param(key);
	}

	get(): Promise<unknown> | null {
		return this.cell ? this.cell.get() : null;
	}

	override subscribe(changed: () => void): () => void {
		return this.cell ? this.cell.subscribe(() => changed()) : () => {};
	}
}

export class TodayQuery extends IQuery.output(z.string()) {
	readonly settlesNow = true;

	constructor(_fields: HostFields) {
		super();
	}

	get(): string {
		return todayIso();
	}

	override subscribe(changed: () => void): () => void {
		let timer = setTimeout(function rollOver() {
			changed();
			timer = setTimeout(rollOver, msUntilTomorrow());
		}, msUntilTomorrow());
		return () => clearTimeout(timer);
	}
}
