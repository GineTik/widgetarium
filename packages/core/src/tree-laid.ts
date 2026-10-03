import type { AskLeaf, Axis, BoxDirection, CollapseKind, NodePath, SurfaceSide, SurfaceWord } from "./tree-nodes.js";
import type { Plate } from "./tree-spacing.js";
import type { Limits, WornSize } from "./tree-sizes.js";
import type { ScreenSide } from "./tree-columns.js";
import type { RegionSurface } from "./tree-collapse.js";

export interface Edges {
	readonly top: number | null;
	readonly bottom: number | null;
	readonly left: number | null;
	readonly right: number | null;
}

export interface LayAsk {
	readonly ask: AskLeaf;
	readonly path?: NodePath;
	readonly edges?: Edges;
	readonly plates?: number;
	readonly underSurface?: SurfaceWord;
	readonly level?: number;
	readonly regionRole?: string | null;
	readonly regionPx?: number;
	readonly viewportPx?: number;
	readonly opened?: string;
	readonly across?: number | null;
	readonly childAcross?: number | null;
}

export interface LayPlace extends LayAsk {
	readonly path: NodePath;
	readonly edges: Edges;
	readonly plates: number;
	readonly underSurface: SurfaceWord;
	readonly level: number;
}

export interface RegionAsk {
	readonly ask: AskLeaf;
	readonly isFloating?: boolean;
	readonly viewportPx?: number;
}

export interface SurfaceFields {
	readonly surface?: SurfaceWord;
	readonly side?: SurfaceSide;
}

export interface LaidLeaf extends SurfaceFields, Partial<Plate>, Limits, WornSize {
	readonly kind: "leaf";
	readonly id: string;
	readonly path: NodePath;
	readonly level: number;
	readonly plates: number;
	readonly underSurface: SurfaceWord;
	readonly width: number;
	readonly grow: number;
	readonly ratio: number;
	readonly across: number | null;
}

export interface LaidBox extends SurfaceFields, Partial<Plate> {
	readonly kind: "box";
	readonly dir: BoxDirection;
	readonly path: NodePath;
	readonly width: number;
	readonly gap: number;
	readonly measure?: number;
	readonly isAlwaysToggled?: boolean;
	readonly openKey?: string;
	readonly label?: string | null;
	readonly hasTrigger?: boolean;
	readonly isStacked: boolean;
	readonly hasCollapsed?: boolean;
	readonly id?: string | undefined;
	readonly strip?: boolean;
	readonly slot?: string;
	readonly of: readonly LaidChild[];
}

export interface LaidCollapsed {
	readonly kind: "collapsed";
	readonly path: NodePath;
	readonly into: CollapseKind;
	readonly side: ScreenSide | SurfaceSide;
	readonly openKey: string;
	readonly hasTrigger: boolean;
	readonly name: string | null;
	readonly isFolded: boolean;
	readonly node: LaidNode;
}

export type LaidNode = LaidLeaf | LaidBox | LaidCollapsed;

export interface SizedCell {
	readonly width: number;
	readonly grow: number;
	readonly basisPx?: number;
}

export interface Placement {
	readonly width?: number;
	readonly grow?: number;
	readonly basisPx?: number;
	readonly basis?: "auto";
	readonly dividerAxis?: Axis;
	readonly dividerBefore?: number | null;
	readonly dividerAfter?: number | null;
	readonly dividerHalf?: number;
	readonly gapAfter?: number;
	readonly name?: string | null;
	readonly hidden?: boolean;
}

export type LaidChild = LaidNode & Placement;

export interface Divider extends Placement {
	readonly side?: SurfaceSide;
	readonly gapAfter: number;
}

export interface LaidRegion {
	readonly worn: RegionSurface;
	readonly plate: Plate | null;
	readonly node: LaidNode;
}
