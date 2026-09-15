export const THEMES = {
	light: `--background-primary:#ffffff;--background-secondary:#f6f6f6;--background-modifier-border:#e4e4e4;
		--background-modifier-hover:rgba(0,0,0,0.05);--text-normal:#222222;--text-muted:#707070;--text-faint:#a0a0a0;
		--text-on-accent:#ffffff;--text-error:#c0392b;--text-success:#1f8a4c;--interactive-accent:#6d4ee0;`,
	dark: `--background-primary:#1e1e1e;--background-secondary:#161616;--background-modifier-border:#333333;
		--background-modifier-hover:rgba(255,255,255,0.07);--text-normal:#dadada;--text-muted:#999999;--text-faint:#6b6b6b;
		--text-on-accent:#ffffff;--text-error:#e06c5f;--text-success:#4ec97f;--interactive-accent:#8b6cef;`,
};

export function fontsOf(reading) {
	return `--font-interface: ${reading};
	--font-text: ${reading};
	--font-monospace: "SF Mono", Menlo, Consolas, monospace;`;
}

export const HOST_FONTS = fontsOf(`"Helvetica Neue", Helvetica, Arial, sans-serif`);
