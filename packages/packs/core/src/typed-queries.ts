import { refOf } from "@widgetarium/core/gateway/refs.js";
import { EngineBackedRows, EngineBackedValue } from "@widgetarium/core/engine/engine-backed.js";
import type { HostFields, HostGateway, ImplementationContext } from "@widgetarium/core/engine/engine-backed.js";
import { createTypedGateway } from "./typed-gateway.js";

export class TypedValueQuery extends EngineBackedValue {
	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		return createTypedGateway({ ...context, config: fields });
	}
}

export class TypedRowsQuery extends EngineBackedRows {
	static override build(fields: HostFields, context: ImplementationContext): HostGateway {
		return createTypedGateway({ ...context, config: fields });
	}
}

export class ScreenStateQuery extends EngineBackedValue {
	static override build(_fields: HostFields, context: ImplementationContext): HostGateway {
		return context.cellFor(refOf(context.tile.id, context.name));
	}
}
