import type { z } from "zod";
import type { Kind } from "./declaration";
import { WIDGET_WORDS, declarationIn } from "./declaration";

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
	"{implementation} extends no gateway interface — extend IQuery.returns, IQuery.returnsAny, ICommand.takes, IValueGateway, IListGateway or ICrudGateway";

const WIDGET_WORD_IN_IMPLEMENTATION =
	"{implementation} extends {word}, the word a widget declares: an implementation extends {fits}";

export function defineGatewayMetadata<C extends Constructed>(
	implementation: C,
	metadata: GatewayMetadataInput<C>,
): GatewayMetadata<C> {
	const declaration = declarationIn(implementation);
	if (!declaration)
		throw new Error(EXTENDS_NO_INTERFACE.replace("{implementation}", implementation.name || "this class"));
	if (declaration.word && WIDGET_WORDS.includes(declaration.word))
		throw new Error(
			WIDGET_WORD_IN_IMPLEMENTATION.replace("{implementation}", implementation.name || "this class")
				.replace("{word}", declaration.word === "sends" ? "ICommand.sends" : "IQuery.expects")
				.replace("{fits}", declaration.word === "sends" ? "ICommand.takes" : "IQuery.returns or IQuery.returnsAny"),
		);
	return { ...metadata, implementation, kind: declaration.kind };
}
