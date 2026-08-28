import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Plus, Users } from "lucide-react";
import { useState } from "react";
import { ScorePill, StatusBadge } from "#/components/app/status-badge.tsx";
import { Button } from "#/components/ui/button.tsx";
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
import { useSession } from "#/lib/auth-client.ts";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function Dashboard() {
	const { data: session } = useSession();
	const role =
		(session?.user as { role?: string } | undefined)?.role ?? "STUDENT";
	const isInstructor = role === "INSTRUCTOR";

	return (
		<div className="space-y-8">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="font-display text-3xl font-bold text-brand-ink">
						{isInstructor ? "Your classes" : "Your work"}
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{isInstructor
							? "Create a class, set an assignment, and share the join code with students."
							: "Join a class with the code your instructor gave you, then submit your work."}
					</p>
				</div>
				{isInstructor ? <CreateClassDialog /> : <JoinClassDialog />}
			</div>

			<ClassList isInstructor={isInstructor} />
			{isInstructor ? null : <MySubmissions />}
		</div>
	);
}

function ClassList({ isInstructor }: { isInstructor: boolean }) {
	const trpc = useTRPC();
	const { data, isPending } = useQuery(trpc.classes.list.queryOptions());

	if (isPending) return <SkeletonRows />;
	if (!data || data.length === 0) {
		return (
			<EmptyState
				icon={BookOpen}
				title={isInstructor ? "No classes yet" : "You have not joined a class"}
				body={
					isInstructor
						? "Create your first class to get a join code you can share."
						: "Ask your instructor for the six-character join code."
				}
			/>
		);
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{data.map((klass) => (
				<Link
					key={klass.id}
					to="/app/classes/$classId"
					params={{ classId: klass.id }}
					className="rounded-2xl border border-brand-line bg-card p-5 transition hover:border-brand hover:shadow-md"
				>
					<h2 className="font-display text-lg font-bold text-brand-ink">
						{klass.title}
					</h2>
					{klass.description ? (
						<p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
							{klass.description}
						</p>
					) : null}
					<div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
						<span className="inline-flex items-center gap-1">
							<Users className="h-3.5 w-3.5" />
							{klass._count.enrollments} enrolled
						</span>
						<span className="inline-flex items-center gap-1">
							<BookOpen className="h-3.5 w-3.5" />
							{klass._count.assignments} assignments
						</span>
					</div>
					{isInstructor ? (
						<p className="mt-3 font-mono text-xs tracking-widest text-brand">
							{klass.joinCode}
						</p>
					) : null}
				</Link>
			))}
		</div>
	);
}

function MySubmissions() {
	const trpc = useTRPC();
	const { data } = useQuery(trpc.submissions.mine.queryOptions());
	if (!data || data.length === 0) return null;

	return (
		<section>
			<h2 className="font-display text-xl font-bold text-brand-ink">
				Recent submissions
			</h2>
			<div className="mt-4 divide-y divide-brand-line overflow-hidden rounded-2xl border border-brand-line bg-card">
				{data.map((submission) => (
					<Link
						key={submission.id}
						to="/app/submissions/$submissionId"
						params={{ submissionId: submission.id }}
						className="flex flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-brand-soft/50"
					>
						<div className="min-w-0 flex-1">
							<p className="truncate font-medium text-brand-ink">
								{submission.filename}
							</p>
							<p className="text-xs text-muted-foreground">
								{submission.assignment
									? `${submission.assignment.class.title} · ${submission.assignment.title}`
									: "Unassigned"}
							</p>
						</div>
						<StatusBadge status={submission.status} />
						<ScorePill score={submission.report?.similarityScore} />
					</Link>
				))}
			</div>
		</section>
	);
}

function CreateClassDialog() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");

	const create = useMutation(
		trpc.classes.create.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.classes.list.queryKey(),
				});
				setOpen(false);
				setTitle("");
				setDescription("");
			},
		}),
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>
					<Plus className="mr-1.5 h-4 w-4" />
					New class
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create a class</DialogTitle>
					<DialogDescription>
						Students join with the code generated here.
					</DialogDescription>
				</DialogHeader>
				<form
					id="create-class"
					className="space-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						create.mutate({ title, description: description || undefined });
					}}
				>
					<div className="space-y-2">
						<Label htmlFor="class-title">Title</Label>
						<Input
							id="class-title"
							required
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Academic Writing 201"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="class-description">Description</Label>
						<Textarea
							id="class-description"
							rows={3}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>
					{create.error ? (
						<p className="text-sm text-destructive">{create.error.message}</p>
					) : null}
				</form>
				<DialogFooter>
					<Button type="submit" form="create-class" disabled={create.isPending}>
						{create.isPending ? "Creating…" : "Create class"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function JoinClassDialog() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [joinCode, setJoinCode] = useState("");

	const join = useMutation(
		trpc.classes.join.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.classes.list.queryKey(),
				});
				setOpen(false);
				setJoinCode("");
			},
		}),
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>
					<Plus className="mr-1.5 h-4 w-4" />
					Join a class
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Join a class</DialogTitle>
					<DialogDescription>
						Enter the six-character code from your instructor.
					</DialogDescription>
				</DialogHeader>
				<form
					id="join-class"
					className="space-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						join.mutate({ joinCode });
					}}
				>
					<div className="space-y-2">
						<Label htmlFor="join-code">Join code</Label>
						<Input
							id="join-code"
							required
							value={joinCode}
							onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
							className="font-mono tracking-[0.3em] uppercase"
							maxLength={8}
							placeholder="ABC123"
						/>
					</div>
					{join.error ? (
						<p className="text-sm text-destructive">{join.error.message}</p>
					) : null}
				</form>
				<DialogFooter>
					<Button type="submit" form="join-class" disabled={join.isPending}>
						{join.isPending ? "Joining…" : "Join class"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function EmptyState({
	icon: Icon,
	title,
	body,
}: {
	icon: typeof BookOpen;
	title: string;
	body: string;
}) {
	return (
		<div className="rounded-2xl border border-dashed border-brand-line bg-card/50 px-6 py-16 text-center">
			<Icon className="mx-auto h-8 w-8 text-brand/50" />
			<h2 className="mt-3 font-semibold text-brand-ink">{title}</h2>
			<p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
				{body}
			</p>
		</div>
	);
}

export function SkeletonRows() {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{[0, 1, 2].map((index) => (
				<div
					key={index}
					className="h-36 animate-pulse rounded-2xl border border-brand-line bg-card"
				/>
			))}
		</div>
	);
}
