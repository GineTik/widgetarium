// CONTEXT: types are erased before anything runs, so a slot pick is checked against DATA the
// manifest carries: what the parent declares it hands down, and what the child declares it needs.

const FITS = 0;
const UNDECLARED = 1;
const SHORT = 2;

function missingFrom(accepts, gives) {
	const missing = [];
	for (const [prop, needed] of Object.entries(accepts)) {
		const handed = gives[prop];
		if (!Array.isArray(handed)) {
			missing.push(prop);
			continue;
		}
		for (const field of needed?.required ?? []) {
			if (!handed.includes(field)) missing.push(field);
		}
	}
	return missing;
}

// TRADE-OFF: RANK, never filter. `gives` is what the parent DECLARES, and the object it builds at
// runtime drifts from that on the next edit of either file — so a hard filter turns normal drift
// into "my widget vanished and nothing said why", which is the worst failure a picker has.
export function reactClash(parent, child) {
	if (!parent || !child || parent.instance === child.instance) return null;
	return `This widget draws with React ${parent.version} and that one with React ${child.version}. A slot draws inside its parent, so both must be one React.`;
}

export function slotFit(manifest, gives, clash = null) {
	if (clash) return { order: SHORT, lacks: clash };
	// CONTEXT: silence on either side is not a misfit — most widgets declare nothing yet, and a
	// list that called them all misfits would teach the reader to ignore the divider
	if (!gives || Object.keys(gives).length === 0) return { order: UNDECLARED, lacks: null };
	const accepts = manifest?.accepts ?? {};
	if (Object.keys(accepts).length === 0) return { order: UNDECLARED, lacks: null };

	const missing = missingFrom(accepts, gives);
	if (missing.length === 0) return { order: FITS, lacks: null };
	return { order: SHORT, lacks: `Needs ${missing.join(", ")}` };
}
