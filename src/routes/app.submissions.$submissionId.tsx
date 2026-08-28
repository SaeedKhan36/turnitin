import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowLeft,
	Download,
	Info,
	Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ScorePill, StatusBadge } from "#/components/app/status-badge.tsx";
import { useTRPC } from "#/integrations/trpc/react.ts";
import {
	buildSegments,
	type HighlightSpan,
	highlightColor,
} from "#/lib/highlight.ts";
import { cn } from "#/lib/utils.ts";

export const Route = createFileRoute("/app/submissions/$submissionId")({
	component: ReportPage,
});

function ReportPage() {
	const { submissionId } = Route.useParams();
	const trpc = useTRPC();
	const [activeSource, setActiveSource] = useState<number | null>(null);

	const { data, isPending, error } = useQuery({
		...trpc.reports.get.queryOptions({ submissionId }),
		// Poll while the pipeline is still working on this document.
		refetchInterval: (query) => {
			const status = query.state.data?.submission.status;
			return status && status !== "READY" && status !== "FAILED" ? 1500 : false;
		},
	});

	const sources = data?.submission.report?.sources ?? [];

	const spans = useMemo<HighlightSpan[]>(
		() =>
			sources.flatMap((source, index) =>
				source.spans.map((span) => ({
					start: span.startChar,
					end: span.endChar,
					sourceIndex: index,
				})),
			),
		[sources],
	);

	const segments = useMemo(
		() => (data?.text ? buildSegments(data.text.length, spans) : []),
		[data?.text, spans],
	);

	if (isPending) {
		return (
			<div className="flex justify-center py-24">
				<Loader2 className="h-6 w-6 animate-spin text-brand" />
			</div>
		);
	}
	if (error) return <p className="text-sm text-destructive">{error.message}</p>;
	if (!data) return null;

	const { submission } = data;
	const report = submission.report;

	return (
		<div className="space-y-6">
			<div>
				{submission.assignment ? (
					<Link
						to="/app/assignments/$assignmentId"
						params={{ assignmentId: submission.assignment.id }}
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-ink"
					>
						<ArrowLeft className="h-4 w-4" />
						{submission.assignment.title}
					</Link>
				) : (
					<Link
						to="/app"
						className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-ink"
					>
						<ArrowLeft className="h-4 w-4" />
						Dashboard
					</Link>
				)}

				<div className="mt-3 flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="font-display text-2xl font-bold text-brand-ink">
							{submission.filename}
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							{submission.student?.name ?? "Reference document"}
							{submission.wordCount ? ` · ${submission.wordCount} words` : ""}
							{submission.pageCount ? ` · ${submission.pageCount} pages` : ""}
							{" · "}
							{new Date(submission.createdAt).toLocaleString()}
						</p>
					</div>
					<div className="flex items-center gap-3">
						<StatusBadge status={submission.status} />
						<a
							href={`/api/files/${submission.id}`}
							className="inline-flex items-center gap-1.5 rounded-md border border-brand-line px-3 py-2 text-sm font-medium transition hover:border-brand"
						>
							<Download className="h-4 w-4" />
							Original
						</a>
					</div>
				</div>
			</div>

			{submission.status === "FAILED" ? (
				<div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
					<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
					<div>
						<p className="font-semibold text-destructive">
							This document could not be processed
						</p>
						<p className="mt-1 text-sm text-muted-foreground">
							{submission.error ?? "No further detail was recorded."}
						</p>
					</div>
				</div>
			) : null}

			{submission.status !== "READY" && submission.status !== "FAILED" ? (
				<div className="rounded-xl border border-brand-line bg-card p-8 text-center">
					<Loader2 className="mx-auto h-6 w-6 animate-spin text-brand" />
					<p className="mt-3 font-medium text-brand-ink">
						Working through the pipeline…
					</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Reading the document, fingerprinting it, then comparing it against
						the corpus. This page updates itself.
					</p>
				</div>
			) : null}

			{report ? (
				<>
					<div className="grid gap-4 sm:grid-cols-3">
						<SummaryCard label="Similarity">
							<div className="flex items-baseline gap-2">
								<span className="font-display text-4xl font-bold text-brand-ink tabular-nums">
									{Math.round(report.similarityScore * 100)}%
								</span>
								<span className="text-sm text-muted-foreground">
									of words matched
								</span>
							</div>
							<p className="mt-2 text-xs text-muted-foreground">
								{report.matchedChars.toLocaleString()} of{" "}
								{report.totalChars.toLocaleString()} characters covered by at
								least one match.
							</p>
						</SummaryCard>

						<SummaryCard label="Matching sources">
							<span className="font-display text-4xl font-bold text-brand-ink tabular-nums">
								{sources.length}
							</span>
							<p className="mt-2 text-xs text-muted-foreground">
								Documents in this instance sharing at least one passage.
							</p>
						</SummaryCard>

						<SummaryCard label="Writing-style signal">
							<div className="flex items-baseline gap-2">
								<span className="font-display text-4xl font-bold text-brand-ink tabular-nums">
									{report.aiScore === null || report.aiScore === undefined
										? "—"
										: `${Math.round(report.aiScore * 100)}`}
								</span>
								<span className="text-sm text-muted-foreground">
									uniformity ({report.aiConfidence ?? "unknown"} confidence)
								</span>
							</div>
							<p className="mt-2 text-xs text-muted-foreground">
								A style statistic, not a detector. It cannot tell you who or
								what wrote this, and must never be used on its own as evidence.
							</p>
						</SummaryCard>
					</div>

					<div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
						<div className="rounded-2xl border border-brand-line bg-card p-6">
							<div className="mb-4 flex items-center justify-between">
								<h2 className="font-display text-lg font-bold text-brand-ink">
									Submitted text
								</h2>
								{activeSource !== null ? (
									<button
										type="button"
										onClick={() => setActiveSource(null)}
										className="text-xs font-medium text-brand hover:underline"
									>
										Show all sources
									</button>
								) : null}
							</div>
							{data.text ? (
								<div className="max-h-[36rem] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-foreground/90">
									{segments.map((segment) => {
										const chunk = data.text?.slice(segment.start, segment.end);
										if (!chunk) return null;
										if (segment.sources.length === 0) {
											return <span key={segment.start}>{chunk}</span>;
										}
										const primary = segment.sources[0];
										const dimmed =
											activeSource !== null &&
											!segment.sources.includes(activeSource);
										return (
											// Presentational: <mark> is the correct element for
											// highlighted prose and is the only one that wraps
											// ragged-right like body text. Filtering by source is
											// driven from the Sources list, which is keyboard
											// accessible, rather than from the highlights.
											<mark
												key={segment.start}
												className="hl"
												data-dimmed={dimmed}
												style={{ backgroundColor: highlightColor(primary) }}
												title={
													segment.sources.length > 1
														? `Matched by ${segment.sources.length} sources`
														: "Matched passage"
												}
											>
												{chunk}
											</mark>
										);
									})}
								</div>
							) : (
								<p className="text-sm text-muted-foreground">
									No extracted text is available for this document.
								</p>
							)}
						</div>

						<aside className="space-y-3">
							<h2 className="font-display text-lg font-bold text-brand-ink">
								Sources
							</h2>
							{sources.length === 0 ? (
								<div className="rounded-xl border border-brand-line bg-card p-5">
									<Info className="h-5 w-5 text-brand/60" />
									<p className="mt-2 text-sm font-medium text-brand-ink">
										No matching passages
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										Nothing in this instance's corpus shares a passage with this
										document at the assignment's minimum match length.
									</p>
								</div>
							) : (
								sources.map((source, index) => {
									const matched = source.matchedSubmission;
									const isActive = activeSource === index;
									return (
										<button
											key={source.id}
											type="button"
											onClick={() => setActiveSource(isActive ? null : index)}
											className={cn(
												"w-full rounded-xl border p-4 text-left transition",
												isActive
													? "border-brand bg-brand-soft"
													: "border-brand-line bg-card hover:border-brand/50",
											)}
										>
											<div className="flex items-start gap-3">
												<span
													className="mt-1 h-3 w-3 shrink-0 rounded-full"
													style={{ backgroundColor: highlightColor(index) }}
												/>
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-semibold text-brand-ink">
														{matched.sourceLabel ?? matched.filename}
													</p>
													<p className="mt-0.5 text-xs text-muted-foreground">
														{matched.isReference
															? "Reference document"
															: matched.student?.name
																? `Submitted by ${matched.student.name}`
																: "Submitted document"}
													</p>
													<p className="mt-0.5 text-xs text-muted-foreground">
														{source.spans.length} passage
														{source.spans.length === 1 ? "" : "s"}
													</p>
												</div>
												<ScorePill score={source.score} />
											</div>
										</button>
									);
								})
							)}

							<p className="rounded-xl border border-brand-line bg-brand-soft/40 p-4 text-xs leading-relaxed text-muted-foreground">
								Matching covers documents submitted to this instance and any
								reference material added to it. There is no web crawl or
								publisher database behind these results, so an unmatched
								document is not evidence of originality.
							</p>
						</aside>
					</div>
				</>
			) : null}
		</div>
	);
}

function SummaryCard({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-2xl border border-brand-line bg-card p-5">
			<p className="text-xs font-semibold uppercase tracking-wider text-brand">
				{label}
			</p>
			<div className="mt-2">{children}</div>
		</div>
	);
}
