import type { z } from "zod";
import type { Kind } from "./declaration";
import { declarationIn } from "./declaration";

type Constructed = new (fields: never, host?: never) => object;

type FieldsOf<C extends Constructed> = ConstructorParameters<C>[0];

export interface GatewayMetadata<C extends Constructed = Constructed> {
	readonly implementation: C;
	readonly id: string;
	readonly title: string;
	readonly description?: string;
	readonly fields: z.ZodType;
	readonly kind: Kind;
}

export interface GatewayMetadataInput<C extends Constructed> {
	readonly id: string;
	readonly title: string;
	readonly description?: string;
	readonly fields: z.ZodType<FieldsOf<C>>;
}

const EXTENDS_NO_INTERFACE =
	"{implementation} extends no gateway interface — extend IValueGateway, IListGateway or ICrudGateway, with or without .of()";

export function defineGatewayMetadata<C extends Constructed>(
	implementation: C,
	metadata: GatewayMetadataInput<C>,
): GatewayMetadata<C> {
	const declaration = declarationIn(implementation);
	if (!declaration)
		throw new Error(EXTENDS_NO_INTERFACE.replace("{implementation}", implementation.name || "this class"));
	return { ...metadata, implementation, kind: declaration.kind };
}
