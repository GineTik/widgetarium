declare const h: (type: unknown, props?: unknown, ...children: unknown[]) => any;
declare const Fragment: any;

// TODO: type the kit and the per-scope libs; every import through these is any until then
declare module "widgetarium/kit";
declare module "widgetarium/kit/emojis";
declare module "@habit/lib";
declare module "@task/lib";
declare module "@core/lib";
declare module "@inline/lib";
