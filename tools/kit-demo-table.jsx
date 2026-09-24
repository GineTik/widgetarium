import { createElement as h, useState } from "react";
import {
	Badge,
	DataTable,
	Grid,
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	cn,
	paginationItems,
} from "../packages/kit/src/index";
import { CAPTION, COLUMNS, INVOICES, NARROW_CAPTION, ROWS_PER_PAGE, spokenAmount } from "./kit-demo-data.js";
import { Cell, Named } from "./kit-demo-frame.jsx";

const INVOICE_COLUMNS = [
	{ key: "id", label: "Invoice", sortable: false, render: (row) => <span className="demo-code">{row.id}</span> },
	{ key: "client", label: "Client" },
	{
		key: "status",
		label: "Status",
		render: (row) => (
			<Badge tone={row.status.tone} size="s">
				{row.status.label}
			</Badge>
		),
	},
	{ key: "issued", label: "Issued", type: "date" },
	{ key: "due", label: "Due", type: "date" },
	{ key: "owner", label: "Owner" },
	{ key: "project", label: "Project" },
	{ key: "amount", label: "Amount", type: "number", render: (row) => spokenAmount(row.amount) },
];

export function TableWithPages() {
	const [page, setPage] = useState(1);
	const [longPage, setLongPage] = useState(10);
	const count = Math.ceil(INVOICES.length / ROWS_PER_PAGE);
	return (
		<div className="demo-stack">
			<Named name="DataTable · sort by a head, select a row">
				<InvoiceDataTable />
			</Named>
			<TableStates />
			<Named name="count={20} · a gap on each side">
				<Pagination page={longPage} count={20} onPageChange={setLongPage} />
			</Named>
			<Named name='variant="compact"'>
				<Pagination page={longPage} count={20} onPageChange={setLongPage} variant="compact" />
			</Named>
			<Named name="Parts, for a pagination the ready one cannot draw">
				<HandBuiltPages page={page} count={count} onPage={setPage} />
			</Named>
			<div className="demo-narrow demo-stack">
				<Named name="Table parts, for a table DataTable cannot draw">
					<InvoiceTable rows={INVOICES.slice(0, 3)} caption={NARROW_CAPTION} />
				</Named>
				<Named name="The same full pagination, turned compact by the narrow region">
					<Pagination page={page} count={count} onPageChange={setPage} />
				</Named>
			</div>
		</div>
	);
}

function InvoiceDataTable() {
	const [page, setPage] = useState(1);
	const [sort, setSort] = useState({ key: "amount", direction: "desc" });
	const [picked, setPicked] = useState(INVOICES[2].id);
	const count = Math.ceil(INVOICES.length / ROWS_PER_PAGE);
	return (
		<DataTable
			rows={sortedInvoices(sort).slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)}
			columns={INVOICE_COLUMNS}
			rowKey={(row) => row.id}
			sort={sort}
			onSortChange={setSort}
			selected={picked}
			onSelect={setPicked}
			caption={CAPTION.replace("{count}", String(INVOICES.length)).replace("{per}", String(ROWS_PER_PAGE))}
			page={page}
			count={count}
			onPageChange={setPage}
		/>
	);
}

function TableStates() {
	return (
		<Grid min={320}>
			<Cell name="isLoading">
				<DataTable rows={[]} columns={INVOICE_COLUMNS.slice(1, 3)} isLoading />
			</Cell>
			<Cell name="no rows">
				<DataTable rows={[]} columns={INVOICE_COLUMNS.slice(1, 3)} empty="No invoices in this folder yet." />
			</Cell>
			<Cell name="failure">
				<DataTable rows={[]} columns={INVOICE_COLUMNS.slice(1, 3)} failure="Finance/Invoices is gone." />
			</Cell>
		</Grid>
	);
}

function InvoiceTable({ rows, caption }) {
	return (
		<Table>
			<TableCaption>{caption}</TableCaption>
			<TableHeader>
				<TableRow>
					{COLUMNS.map((column) => (
						<TableHead key={column} className={cn(column === "Amount" && "demo-end")}>
							{column}
						</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				<InvoiceRows rows={rows} />
			</TableBody>
		</Table>
	);
}

function InvoiceRows({ rows }) {
	return rows.map((row) => (
		<TableRow key={row.id} data-state={row.status.label === "Overdue" ? "selected" : undefined}>
			<TableCell className="demo-code">{row.id}</TableCell>
			<TableCell>{row.client}</TableCell>
			<TableCell>
				<Badge tone={row.status.tone} size="s">
					{row.status.label}
				</Badge>
			</TableCell>
			<TableCell>{row.issued}</TableCell>
			<TableCell>{row.due}</TableCell>
			<TableCell>{row.owner}</TableCell>
			<TableCell>{row.project}</TableCell>
			<TableCell className="demo-end">{spokenAmount(row.amount)}</TableCell>
		</TableRow>
	));
}

function HandBuiltPages({ page, count, onPage }) {
	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious disabled={page === 1} onClick={() => onPage(page - 1)} />
				</PaginationItem>
				{paginationItems(page, count, 0).map((entry) =>
					entry.kind === "gap" ? (
						<PaginationItem key={`gap-${entry.key}`}>
							<PaginationEllipsis />
						</PaginationItem>
					) : (
						<PaginationItem key={entry.page}>
							<PaginationLink isActive={entry.page === page} onClick={() => onPage(entry.page)}>
								{entry.page}
							</PaginationLink>
						</PaginationItem>
					),
				)}
				<PaginationItem>
					<PaginationNext disabled={page === count} onClick={() => onPage(page + 1)} />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}

function sortedInvoices(sort) {
	if (!sort) return INVOICES;
	const valueOf = (row) => (sort.key === "status" ? row.status.label : row[sort.key]);
	const ordered = [...INVOICES].sort((left, right) =>
		String(valueOf(left)).localeCompare(String(valueOf(right)), "en", { numeric: true }),
	);
	return sort.direction === "desc" ? ordered.reverse() : ordered;
}
