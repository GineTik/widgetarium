import { h, Fragment } from "preact";
import { createWidget, WidgetRoot } from "widgetarium";
import { Field, IconButton } from "widgetarium/kit";

const CSS = `
.orbi-page-header {
	box-sizing: border-box;
	padding: var(--size-4-4, 16px);
	gap: var(--size-4-6, 24px);
	font: var(--orbi-body-sm);
	color: var(--orbi-neutral-800);
}
.orbi-page-header *,
.orbi-page-header *::before,
.orbi-page-header *::after { box-sizing: border-box; }
.orbi-page-header svg { display: block; flex: 0 0 auto; }

.orbi-page-header .oh-top {
	display: flex;
	align-items: center;
	gap: var(--size-4-4, 16px);
	min-width: 0;
}

.orbi-page-header .oh-title {
	flex: 0 1 auto;
	min-width: 0;
	font: var(--orbi-title-md);
	color: var(--orbi-neutral-800);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

/* CONTEXT: the reference capsule — fill, 999px, 42px tall, 0 16px, gap 8px */
.orbi-page-header .oh-search { flex: 1 1 auto; min-width: 0; }

.orbi-page-header .oh-user { flex: 0 0 auto; display: flex; align-items: center; gap: var(--size-4-3, 12px); }
.orbi-page-header .oh-user-avatar { position: relative; flex: 0 0 auto; }

.orbi-page-header .oh-avatar {
	display: grid;
	place-content: center;
	width: 40px;
	height: 40px;
	border-radius: var(--orbi-radius-full);
	background: var(--orbi-primary-50);
	color: var(--orbi-primary-500);
	font: var(--orbi-label-xs);
}

.orbi-page-header .oh-online-dot {
	position: absolute;
	top: 0;
	right: 0;
	width: 10px;
	height: 10px;
	border-radius: var(--orbi-radius-full);
	background: var(--orbi-primary-500);
	box-shadow: 0 0 0 2px var(--orbi-canvas);
}

.orbi-page-header .oh-user-text { display: flex; flex-direction: column; min-width: 0; }

.orbi-page-header .oh-user-name {
	font: var(--orbi-label-sm);
	color: var(--orbi-neutral-800);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.orbi-page-header .oh-user-role {
	font: var(--orbi-body-2xs);
	color: var(--orbi-neutral-500);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.orbi-page-header .oh-tools { flex: 0 0 auto; display: flex; align-items: center; gap: var(--size-4-2, 8px); }

.orbi-page-header .oh-breadcrumb {
	display: flex;
	align-items: center;
	gap: var(--size-4-3, 12px);
	min-width: 0;
	overflow: hidden;
}

.orbi-page-header .oh-crumb {
	flex: 0 0 auto;
	font: var(--orbi-body-xs);
	color: var(--orbi-neutral-700);
	white-space: nowrap;
}

.orbi-page-header .oh-crumb.is-last { font: var(--orbi-label-xs); color: var(--orbi-neutral-800); }

.orbi-page-header .oh-crumb-arrow {
	display: grid;
	place-content: center;
	flex: 0 0 auto;
	color: var(--orbi-neutral-500);
}

/* TRADE-OFF: the person drops before the search does — the reference keeps the field at
   every width and gives it the whole row on mobile */
@container widget (width < 720px) {
	.orbi-page-header .oh-user { display: none; }
}

@container widget (width < 420px) {
	.orbi-page-header .oh-title { display: none; }
	.orbi-page-header .oh-breadcrumb { display: none; }
}
`;

function Icon({ size, viewBox, strokeWidth, children }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox={viewBox}
			fill="none"
			stroke="currentColor"
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			{children}
		</svg>
	);
}

// CONTEXT: the reference's own magnifier, on its 20 grid at 16px
function SearchIcon() {
	return (
		<Icon size={16} viewBox="0 0 20 20" strokeWidth="1.8">
			<circle cx="9" cy="9" r="5.4" />
			<path d="M13 13l3.5 3.5" />
		</Icon>
	);
}

function ChevronRightIcon() {
	return (
		<Icon size={16} viewBox="0 0 20 20" strokeWidth="1.8">
			<path d="M8 5l5 5-5 5" />
		</Icon>
	);
}

function BellIcon() {
	return (
		<Icon size={20} viewBox="0 0 24 24" strokeWidth="1.8">
			<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
			<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
		</Icon>
	);
}

function GearIcon() {
	return (
		<Icon size={20} viewBox="0 0 24 24" strokeWidth="1.8">
			<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
			<circle cx="12" cy="12" r="3" />
		</Icon>
	);
}

function toList(value) {
	if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
	return String(value ?? "")
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
}

function initialOf(name) {
	return String(name ?? "").trim().slice(0, 1).toUpperCase();
}

function Search({ context }) {
	return (
		<Field
			class="oh-search"
			icon={<SearchIcon />}
			placeholder="Search"
			value={context?.get("search") ?? ""}
			onInput={(event) => context?.set("search", event.target.value)}
		/>
	);
}

function User({ name, role }) {
	return (
		<span class="oh-user">
			<span class="oh-user-avatar">
				<span class="oh-avatar">{initialOf(name)}</span>
				<span class="oh-online-dot" />
			</span>
			<span class="oh-user-text">
				<span class="oh-user-name">{name}</span>
				<span class="oh-user-role">{role}</span>
			</span>
		</span>
	);
}

function Breadcrumb({ steps }) {
	return (
		<nav class="oh-breadcrumb">
			{steps.map((step, index) => (
				<Fragment key={step}>
					<span class={`oh-crumb${index === steps.length - 1 ? " is-last" : ""}`}>{step}</span>
					{index === steps.length - 1 ? null : (
						<span class="oh-crumb-arrow">
							<ChevronRightIcon />
						</span>
					)}
				</Fragment>
			))}
		</nav>
	);
}

export default createWidget(function OrbiTaskPageHeader({ settings, context }) {
	return (
		// TRADE-OFF: defaultRounded "none" because the board's own radius token is 30px and the design asks 16px
		<WidgetRoot
			className="orbi orbi-page-header"
			defaultRounded="none"
			defaultBackgroundType="fill"
			background="var(--orbi-neutral-0)"
		>
			<style>{CSS}</style>
			<div class="oh-top">
				<span class="oh-title">{settings.title}</span>
				<Search context={context} />
				<User name={settings.userName} role={settings.userRole} />
				<span class="oh-tools">
					<IconButton label="Notifications">
						<BellIcon />
					</IconButton>
					<IconButton label="Settings">
						<GearIcon />
					</IconButton>
				</span>
			</div>
			<Breadcrumb steps={toList(settings.breadcrumb)} />
		</WidgetRoot>
	);
});
