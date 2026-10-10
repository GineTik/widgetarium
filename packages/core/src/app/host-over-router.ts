import type { ProjectRouter } from "./project-router.js";
import type { HostOfPathname } from "./widgetarium-app.js";

export function hostOverRouter(hostOf: HostOfPathname, router: ProjectRouter): HostOfPathname {
	return (pathname) => ({ ...hostOf(pathname), navigator: router, pageParamsKey: router.paramsKeyOf(pathname) });
}
