import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Copy, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { Checkbox } from "#/components/ui/checkbox.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { useTRPC } from "#/integrations/trpc/react.ts";
import { EmptyState, SkeletonRows } from "#/routes/app.index.tsx";

export const Route = createFileRoute("/app/classes/$classId")({
	component: ClassPage,
});

function ClassPage() {
	const { classId } = Route.useParams();
	const trpc = useTRPC();
	const { data, isPending, error } = useQuery(
		trpc.classes.get.queryOptions({ id: classId }),
	);

	if (isPending) return <SkeletonRows />;
	if (error) {
		return <p className="text-sm text-destructive">{error.message}</p>;
	}
	if (!data) return null;

	return (
		<div className="space-y-8">
			<div>
				<Link
					to="/app"
					className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-ink"
				>
					<ArrowLeft className="h-4 w-4" />
					Dashboard
				</Link>
				<div className="mt-3 flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="font-display text-3xl font-bold text-brand-ink">
							{data.title}
						</h1>
						{data.description ? (
							<p className="mt-1 max-w-2xl text-muted-foreground">
								{data.description}
							</p>
						) : null}
						<p className="mt-2 text-sm text-muted-foreground">
							Taught by {data.instructor.name}
						</p>
					</div>
					{data.isInstructor ? (
						<div className="flex items-center gap-3">
							<JoinCode code={data.joinCode} />
							<CreateAssignmentDialog classId={data.id} />
						</div>
					) : null}
				</div>
			</div>

			<section>
				<h2 className="font-display text-xl font-bold text-brand-ink">
					Assignments
				</h2>
				{data.assignments.length === 0 ? (
					<div className="mt-4">
						<EmptyState
							icon={BookOpen}
							title="No assignments yet"
							body={
								data.isInstructor
									? "Create an assignment so students have somewhere to submit."
									: "Your instructor has not set an assignment yet."
							}
						/>
					</div>
				) : (
					<div className="mt-4 divide-y divide-brand-line overflow-hidden rounded-2xl border border-brand-line bg-card">
						{data.assignments.map((assignment) => (
							<Link
								key={assignment.id}
								to="/app/assignments/$assignmentId"
								params={{ assignmentId: assignment.id }}
								className="flex items-center gap-4 px-5 py-4 transition hover:bg-brand-soft/50"
							>
								<div className="min-w-0 flex-1">
									<p className="font-medium text-brand-ink">
										{assignment.title}
									</p>
									{assignment.instructions ? (
										<p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
											{assignment.instructions}
										</p>
									) : null}
								</div>
								<span className="text-sm text-muted-foreground">
									{assignment._count.submissions} submissions
								</span>
							</Link>
						))}
					</div>
				)}
			</section>

			{data.isInstructor ? (
				<section>
					<h2 className="font-display text-xl font-bold text-brand-ink">
						Enrolled students ({data.enrollments.length})
					</h2>
					{data.enrollments.length === 0 ? (
						<p className="mt-3 text-sm text-muted-foreground">
							Share the join code above to enrol students.
						</p>
					) : (
						<ul className="mt-4 divide-y divide-brand-line overflow-hidden rounded-2xl border border-brand-line bg-card">
							{data.enrollments.map((enrollment) => (
								<li key={enrollment.id} className="px-5 py-3">
									<p className="text-sm font-medium text-brand-ink">
										{enrollment.user.name}
									</p>
									<p className="text-xs text-muted-foreground">
										{enrollment.user.email}
									</p>
								</li>
							))}
						</ul>
					)}
				</section>
			) : null}
		</div>
	);
}

function JoinCode({ code }: { code: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			onClick={async () => {
				await navigator.clipboard.writeText(code);
				setCopied(true);
				setTimeout(() => setCopied(false), 1500);
			}}
			className="inline-flex items-center gap-2 rounded-lg border border-brand-line bg-card px-3 py-2 transition hover:border-brand"
		>
			<span className="font-mono text-sm tracking-[0.25em] text-brand-ink">
				{code}
			</span>
			<Copy className="h-3.5 w-3.5 text-muted-foreground" />
			<span className="text-xs text-muted-foreground">
				{copied ? "Copied" : "Join code"}
			</span>
		</button>
	);
}

function CreateAssignmentDialog({ classId }: { classId: string }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [instructions, setInstructions] = useState("");
	const [excludeQuotes, setExcludeQuotes] = useState(true);
	const [excludeBibliography, setExcludeBibliography] = useState(true);
	const [minMatchWords, setMinMatchWords] = useState(8);

	const create = useMutation(
		trpc.assignments.create.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.classes.get.queryKey({ id: classId }),
				});
				setOpen(false);
				setTitle("");
				setInstructions("");
			},
		}),
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>
					<Plus className="mr-1.5 h-4 w-4" />
					New assignment
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create an assignment</DialogTitle>
					<DialogDescription>
						These settings decide what counts as a match in the report.
					</DialogDescription>
				</DialogHeader>
				<form
					id="create-assignment"
					className="space-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						create.mutate({
							classId,
							title,
							instructions: instructions || undefined,
							excludeQuotes,
							excludeBibliography,
							minMatchWords,
						});
					}}
				>
					<div className="space-y-2">
						<Label htmlFor="assignment-title">Title</Label>
						<Input
							id="assignment-title"
							required
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Essay 1: Sources and evidence"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="assignment-instructions">Instructions</Label>
						<Textarea
							id="assignment-instructions"
							rows={3}
							value={instructions}
							onChange={(e) => setInstructions(e.target.value)}
						/>
					</div>

					<div className="space-y-3 rounded-lg border border-brand-line p-4">
						<p className="text-sm font-semibold text-brand-ink">
							Report settings
						</p>
						<div className="flex items-center gap-2">
							<Checkbox
								id="exclude-quotes"
								checked={excludeQuotes}
								onCheckedChange={(value) => setExcludeQuotes(value === true)}
							/>
							<Label htmlFor="exclude-quotes" className="text-sm font-normal">
								Exclude quoted material
							</Label>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox
								id="exclude-bibliography"
								checked={excludeBibliography}
								onCheckedChange={(value) =>
									setExcludeBibliography(value === true)
								}
							/>
							<Label
								htmlFor="exclude-bibliography"
								className="text-sm font-normal"
							>
								Exclude the reference list
							</Label>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="min-words" className="text-sm font-normal">
								Minimum match length: {minMatchWords} words
							</Label>
							<input
								id="min-words"
								type="range"
								min={4}
								max={30}
								value={minMatchWords}
								onChange={(e) => setMinMatchWords(Number(e.target.value))}
								className="w-full accent-[var(--brand)]"
							/>
							<p className="text-xs text-muted-foreground">
								Shorter finds more, but flags common phrasing. Eight words is a
								reasonable default for essay work.
							</p>
						</div>
					</div>

					{create.error ? (
						<p className="text-sm text-destructive">{create.error.message}</p>
					) : null}
				</form>
				<DialogFooter>
					<Button
						type="submit"
						form="create-assignment"
						disabled={create.isPending}
					>
						{create.isPending ? "Creating…" : "Create assignment"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
