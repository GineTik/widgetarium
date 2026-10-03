import type { z } from "zod";
import type { TileProp, TileProps } from "../model.js";
import type { AdaptedGateway } from "../gateway/adapted.js";
import type { DeclaredProp } from "../gateway/props.js";
import type { FilterRow, SortRow } from "../gateway/contract.js";
import type { GatewayRefs, ViewCell } from "../gateway/refs.js";
import type { NotesPort, PortsHost } from "./packs.js";

export interface HostFields {
	readonly [field: string]: unknown;
	readonly value?: unknown;
	readonly rows?: unknown;
	readonly path?: unknown;
	readonly field?: unknown;
	readonly ref?: unknown;
	readonly map?: unknown;
	readonly where?: unknown;
	readonly sort?: unknown;
	readonly picked?: unknown;
	readonly fieldFrom?: unknown;
	readonly whenNothingPicked?: unknown;
	readonly date?: unknown;
	readonly window?: unknown;
	readonly compare?: unknown;
	readonly counts?: unknown;
}

export interface HostSource {
	readonly implementation?: unknown;
	readonly fields?: unknown;
}

export interface HostSpec extends DeclaredProp {
	readonly type?: string | undefined;
	readonly where?: readonly FilterRow[] | undefined;
	readonly sort?: readonly SortRow[] | undefined;
	readonly source?: HostSource | undefined;
	readonly aka?: unknown;
}

export type HostGatewayHost = NotesPort & PortsHost;

export interface HostTile {
	readonly id: string;
	readonly props?: TileProps;
}

export type PatchStep = (inFlight: TileProp | null | undefined) => TileProp;

export interface HostGatewayContext {
	readonly name: string;
	readonly spec: HostSpec;
	readonly tile: HostTile;
	readonly refs: GatewayRefs;
	readonly host: HostGatewayHost;
	readonly cellFor: (key: string) => ViewCell;
	readonly propsRef: { readonly current: TileProps };
	readonly patchProp: (name: string, step: PatchStep) => void;
	readonly schema?: z.ZodType | undefined;
}

export type HostGateway = AdaptedGateway;
