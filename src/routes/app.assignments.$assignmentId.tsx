import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";
import { ScorePill, StatusBadge } from "#/components/app/status-badge.tsx";
import { UploadDropzone } from "#/components/app/upload-dropzone.tsx";
import { useTRPC } from "#/integrations/trpc/react.ts";
import { EmptyState, SkeletonRows } from "#/routes/app.index.tsx";

export const Route = createFileRoute("/app/assignments/$assignmentId")({
	component: AssignmentPage,
});

function AssignmentPage() {
	const { assignmentId } = Route.useParams();
	const trpc = useTRPC();
	const { data, isPending, error } = useQuery({
		...trpc.assignments.get.queryOptions({ id: assignmentId }),
		// Keep the table live while submissions move through the pipeline.
		refetchInterval: (query) =>
			query.state.data?.submissions.some(
				(s) => s.status !== "READY" && s.status !== "FAILED",
			)
				? 2000
				: false,
	});

	if (isPending) return <SkeletonRows />;
	if (error) return <p className="text-sm text-destructive">{error.message}</p>;
	if (!data) return null;

	return (
		<div className="space-y-8">
			<div>
				<Link
					to="/app/classes/$classId"
					params={{ classId: data.class.id }}
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-ink"
				>
					<ArrowLeft className="h-4 w-4" />
					{data.class.title}
				</Link>
				<h1 className="mt-3 font-display text-3xl font-bold text-brand-ink">
					{data.title}
				</h1>
				{data.instructions ? (
					<p className="mt-2 max-w-2xl text-muted-foreground">
						{data.instructions}
					</p>
				) : null}
				<p className="mt-3 text-xs text-muted-foreground">
					Matching settings: minimum {data.minMatchWords} words
					{data.excludeQuotes ? " · quotations excluded" : ""}
					{data.excludeBibliography ? " · reference list excluded" : ""}
				</p>
			</div>

			<section>
				<h2 className="font-display text-xl font-bold text-brand-ink">
					{data.isInstructor
						? "Submit on behalf of a student"
						: "Submit your work"}
				</h2>
				<div className="mt-4">
					<UploadDropzone assignmentId={data.id} />
				</div>
			</section>

			<section>
				<h2 className="font-display text-xl font-bold text-brand-ink">
					{data.isInstructor ? "Submissions" : "Your submissions"}
				</h2>
				{data.submissions.length === 0 ? (
					<div className="mt-4">
						<EmptyState
							icon={FileText}
							title="Nothing submitted yet"
							body="Uploaded documents appear here as soon as they are queued."
						/>
					</div>
				) : (
					<div className="mt-4 overflow-hidden rounded-2xl border border-brand-line bg-card">
						<table className="w-full text-sm">
							<thead className="border-b border-brand-line bg-brand-soft/40 text-left">
								<tr>
									<th className="px-5 py-3 font-semibold text-brand-ink">
										Document
									</th>
									{data.isInstructor ? (
										<th className="px-5 py-3 font-semibold text-brand-ink">
											Student
										</th>
									) : null}
									<th className="px-5 py-3 font-semibold text-brand-ink">
										Status
									</th>
									<th className="px-5 py-3 text-right font-semibold text-brand-ink">
										Similarity
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-brand-line">
								{data.submissions.map((submission) => (
									<tr key={submission.id} className="hover:bg-brand-soft/40">
										<td className="px-5 py-3">
											<Link
												to="/app/submissions/$submissionId"
												params={{ submissionId: submission.id }}
												className="font-medium text-brand hover:underline"
											>
												{submission.filename}
											</Link>
											<span className="block text-xs text-muted-foreground">
												{new Date(submission.createdAt).toLocaleString()}
											</span>
										</td>
										{data.isInstructor ? (
											<td className="px-5 py-3">
												{submission.student?.name ?? "—"}
											</td>
										) : null}
										<td className="px-5 py-3">
											<StatusBadge status={submission.status} />
										</td>
										<td className="px-5 py-3 text-right">
											<ScorePill score={submission.report?.similarityScore} />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>
		</div>
	);
}
