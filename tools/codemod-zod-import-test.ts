import { stillImportsZFromWidgetarium, withZodFromZod } from "./codemod-zod-import.mts";

const REWRITES: readonly (readonly [name: string, source: string, wanted: string])[] = [
	[
		"a CRLF file keeps its line ends",
		'import { createWidget, z } from "widgetarium";\r\nconst a = 1;\r\n',
		'import { createWidget } from "widgetarium";\r\nimport { z } from "zod";\r\nconst a = 1;\r\n',
	],
	[
		"a CRLF file merging into zod loses the whole widgetarium line",
		'import { a } from "zod";\r\nimport { z } from "widgetarium";\r\nconst b = 1;\r\n',
		'import { z, a } from "zod";\r\nconst b = 1;\r\n',
	],
	[
		"the import on the last line, with no line end after it",
		'import { a } from "zod";\nimport { z } from "widgetarium";',
		'import { z, a } from "zod";\n',
	],
	[
		"a multi-line import keeps its shape",
		'import {\n\tcreateWidget,\n\tz,\n} from "widgetarium";\nconst c = 1;\n',
		'import {\n\tcreateWidget,\n} from "widgetarium";\nimport { z } from "zod";\nconst c = 1;\n',
	],
	["an import type moves as a type", 'import type { z } from "widgetarium";\n', 'import type { z } from "zod";\n'],
	[
		"a type specifier moves as a type",
		'import { type z, Card } from "widgetarium";\n',
		'import { Card } from "widgetarium";\nimport type { z } from "zod";\n',
	],
	[
		"a value z merges into an existing import type from zod",
		'import { z } from "widgetarium";\nimport type { ZodType } from "zod";\n',
		'import { z, type ZodType } from "zod";\n',
	],
	[
		"a type z merges into an existing import type from zod",
		'import type { z } from "widgetarium";\nimport type { ZodType } from "zod";\n',
		'import type { z, ZodType } from "zod";\n',
	],
	[
		"a z already imported from zod is not imported twice",
		'import { z, Card } from "widgetarium";\nimport { z } from "zod";\n',
		'import { Card } from "widgetarium";\nimport { z } from "zod";\n',
	],
	[
		"a file importing no z is left alone",
		'import { Card } from "widgetarium";\n',
		'import { Card } from "widgetarium";\n',
	],
];

const LEFTOVERS: readonly (readonly [name: string, source: string, flagged: boolean])[] = [
	["a default beside z is reported", 'import W, { z } from "widgetarium";\n', true],
	["a re-export of z is reported", 'export { z } from "widgetarium";\n', true],
	["z from zod is not reported", 'import { z } from "zod";\nimport { Card } from "widgetarium";\n', false],
];

let failures = 0;

function check(name: string, held: unknown, wanted: unknown): void {
	const same = held === wanted;
	if (!same) failures += 1;
	console.log(
		`${same ? "ok  " : "not ok"} ${name}${same ? "" : `\n      held ${JSON.stringify(held)}\n      want ${JSON.stringify(wanted)}`}`,
	);
}

for (const [name, source, wanted] of REWRITES) check(name, withZodFromZod(source), wanted);
for (const [name, source, flagged] of LEFTOVERS) check(name, stillImportsZFromWidgetarium(source), flagged);
for (const [name, source] of REWRITES)
	check(
		`after the rewrite no z comes from widgetarium: ${name}`,
		stillImportsZFromWidgetarium(withZodFromZod(source)),
		false,
	);

console.log(failures === 0 ? "zod import codemod: every probe passed" : `zod import codemod: ${failures} probes red`);
process.exit(failures === 0 ? 0 : 1);
