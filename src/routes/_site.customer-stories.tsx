import { createFileRoute } from "@tanstack/react-router";
import {
	ClosingCta,
	PageHero,
	Section,
} from "#/components/marketing/sections.tsx";

export const Route = createFileRoute("/_site/customer-stories")({
	component: CustomerStoriesPage,
	head: () => ({ meta: [{ title: "Customer stories — Attest" }] }),
});

/** Illustrative scenarios, labelled as such rather than dressed up as clients. */
const STORIES = [
	{
		org: "A mid-sized university writing programme",
		challenge:
			"Instructors were reviewing similarity percentages with no practical way to tell a quotation from a lifted paragraph.",
		outcome:
			"Per-assignment quotation and reference exclusions cut the noise, and the passage view meant integrity meetings started from specific paragraphs.",
	},
	{
		org: "A secondary school district",
		challenge:
			"Teachers wanted to talk to students about AI use without leaning on a detector that could not support the accusation.",
		outcome:
			"Writing-style statistics are shown with their inputs and an explicit caveat, so the conversation stays about the work rather than about a score.",
	},
	{
		org: "A graduate research office",
		challenge:
			"Every thesis needed screening before submission, and the existing process could not keep pace.",
		outcome:
			"Batch submission and collected reports made full screening feasible without adding review staff.",
	},
	{
		org: "A professional certification body",
		challenge:
			"Exam delivery had to survive unreliable venue networks without compromising the sitting.",
		outcome:
			"Offline-tolerant delivery kept candidates working through connection drops, syncing results afterwards.",
	},
];

function CustomerStoriesPage() {
	return (
		<>
			<PageHero
				eyebrow="Customer stories"
				title="What this looks like in practice."
				body="Attest is a demonstration build, so these are illustrative scenarios rather than named customers — the situations the product is designed around, described honestly."
			/>

			<Section>
				<div className="grid gap-5 md:grid-cols-2">
					{STORIES.map((story) => (
						<article
							key={story.org}
							className="rounded-2xl border border-brand-line bg-card p-6"
						>
							<h2 className="font-display text-xl font-bold text-brand-ink">
								{story.org}
							</h2>
							<div className="mt-4">
								<h3 className="text-xs font-semibold uppercase tracking-wider text-brand">
									The problem
								</h3>
								<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
									{story.challenge}
								</p>
							</div>
							<div className="mt-4">
								<h3 className="text-xs font-semibold uppercase tracking-wider text-brand">
									What changed
								</h3>
								<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
									{story.outcome}
								</p>
							</div>
						</article>
					))}
				</div>
			</Section>

			<ClosingCta
				title="Try it on your own material."
				body="Every claim on this site is checkable in about five minutes with a document you already have."
				cta={{ label: "Open the checker", to: "/app" }}
			/>
		</>
	);
}
