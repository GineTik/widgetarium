// THE CONSOLE IS PART OF THE HOST, and it is the one part that differs by build. Logging works
// wherever there is a console; running a command needs a machine under the app, which a phone
// and a browser tab do not have. `can` is what a widget asks — never the host type.
const NO_COMMAND_LINE = "no command line in this build";

export function createConsole(type, requireModule, workingDirectory) {
	const canRun = type === "obsidian-desktop" && Boolean(requireModule);

	return {
		can: { log: true, run: canRun },

		log(...parts) {
			console.log("[widgetarium]", ...parts);
			return true;
		},

		// TRADE-OFF: one result shape whether it ran or not — a caller that reads `output`
		// without reading `ok` gets an empty string, never a thrown error it did not expect
		async run(command) {
			if (!canRun) return { ok: false, output: "", failure: NO_COMMAND_LINE };
			const child = requireModule("child_process");
			if (!child?.exec) return { ok: false, output: "", failure: NO_COMMAND_LINE };

			return new Promise((resolve) => {
				child.exec(String(command ?? ""), { cwd: workingDirectory }, (failure, out, err) =>
					resolve({
						ok: !failure,
						output: `${String(out ?? "")}${String(err ?? "")}`,
						failure: failure ? String(failure.message ?? failure) : null,
					}),
				);
			});
		},
	};
}

export function refusingConsole(why) {
	return {
		can: { log: false, run: false },
		log: () => false,
		run: async () => ({ ok: false, output: "", failure: why }),
	};
}
