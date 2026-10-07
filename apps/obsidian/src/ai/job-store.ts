import { SPEC_FOLDER } from "@widgetarium/core/app-spec.js";
import {
	jobAsksFolderOf,
	jobLogPathOf,
	jobPathOf,
	jobText,
	jobsFolderOf,
	readJob,
	readJobAsk,
} from "@widgetarium/core/app-jobs.js";
import type { Job, JobAsk } from "@widgetarium/core/app-jobs.js";

export interface JobAdapter {
	exists(path: string): Promise<boolean>;
	list(path: string): Promise<{ files: string[]; folders: string[] }>;
	read(path: string): Promise<string>;
	write(path: string, data: string): Promise<void>;
	append(path: string, data: string): Promise<void>;
	remove(path: string): Promise<void>;
	mkdir(path: string): Promise<void>;
}

export interface JobFiles {
	apps(): Promise<string[]>;
	jobsOf(app: string): Promise<Job[]>;
	asksOf(app: string): Promise<JobAsk[]>;
	save(job: Job): Promise<void>;
	log(job: Job, lines: readonly string[]): Promise<void>;
}

const JSON_FILE = ".json";

export function createJobFiles(adapter: JobAdapter): JobFiles {
	return {
		apps: () => appsIn(adapter),
		jobsOf: (app) => jobsIn(adapter, app),
		asksOf: (app) => asksTaken(adapter, app),
		async save(job) {
			await ensureFolder(adapter, jobsFolderOf(job.app));
			await adapter.write(jobPathOf(job.app, job.id), jobText(job));
		},
		async log(job, lines) {
			if (lines.length === 0) return;
			await ensureFolder(adapter, jobsFolderOf(job.app));
			await adapter.append(jobLogPathOf(job.app, job.id), `${lines.join("\n")}\n`);
		},
	};
}

async function appsIn(adapter: JobAdapter): Promise<string[]> {
	if (!(await adapter.exists(SPEC_FOLDER))) return [];
	const { folders } = await adapter.list(SPEC_FOLDER);
	const apps = await Promise.all(
		folders.map(async (folder) => {
			const app = folder.slice(folder.lastIndexOf("/") + 1);
			return (await adapter.exists(jobsFolderOf(app))) ? [app] : [];
		}),
	);
	return apps.flat();
}

async function jobsIn(adapter: JobAdapter, app: string): Promise<Job[]> {
	const { files } = await adapter.list(jobsFolderOf(app));
	const read = await Promise.all(
		files
			.filter((path) => path.endsWith(JSON_FILE))
			.map((path) =>
				adapter
					.read(path)
					.then(readJob)
					.catch(() => null),
			),
	);
	return read.flatMap((one) => (one?.job ? [one.job] : []));
}

async function asksTaken(adapter: JobAdapter, app: string): Promise<JobAsk[]> {
	const folder = jobAsksFolderOf(app);
	if (!(await adapter.exists(folder))) return [];
	const { files } = await adapter.list(folder);
	const asks: JobAsk[] = [];
	for (const path of files.filter((one) => one.endsWith(JSON_FILE)).sort()) {
		const ask = readJobAsk(await adapter.read(path).catch(() => ""));
		await adapter.remove(path).catch(() => undefined);
		if (ask) asks.push(ask);
	}
	return asks;
}

async function ensureFolder(adapter: JobAdapter, folder: string): Promise<void> {
	if (!(await adapter.exists(folder))) await adapter.mkdir(folder);
}
