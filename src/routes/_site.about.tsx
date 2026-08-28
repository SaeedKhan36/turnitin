import { createFileRoute } from "@tanstack/react-router";
import {
	ClosingCta,
	Eyebrow,
	PageHero,
	Section,
} from "#/components/marketing/sections.tsx";

export const Route = createFileRoute("/_site/about")({
	component: AboutPage,
	head: () => ({ meta: [{ title: "About — Attest" }] }),
});

const POSITIONS = [
	{
		title: "A percentage is not a finding",
		body: "A similarity score summarises a report; it does not replace one. Attest is built so that the passage and its source are always one click from the number, because a score on its own cannot tell you whether a match is a quotation, a citation, a coincidence, or copying.",
	},
	{
		title: "We will not claim to detect AI writing",
		body: "Attest computes writing-style statistics — how much sentence length varies, how wide the vocabulary is, how heavily transitions are used — and shows them with their inputs visible. It does not output a verdict, because the research does not support one. Published detectors have repeatedly misfired on non-native English writers and on heavily edited drafts, and a tool that produces a confident-sounding number invites exactly the misuse it should prevent.",
	},
	{
		title: "Your corpus stays yours",
		body: "Documents submitted to your instance are matched against your instance. Attest does not pool student work across institutions, and there is no web crawl or licensed publisher index behind the matching — so the reports are honest about their coverage rather than implying more of it.",
	},
	{
		title: "Students should see their own reports",
		body: "An integrity process that a student cannot inspect is a process they cannot answer. Students see the same report their instructor sees for their own work.",
	},
];

function AboutPage() {
	return (
		<>
			<PageHero
				eyebrow="About"
				title="Evidence first, scores second."
				body="Attest is an academic-integrity platform built around a simple constraint: every flag should come with the text that caused it."
			/>

			<Section>
				<Eyebrow>What we believe</Eyebrow>
				<div className="mt-8 grid gap-8 md:grid-cols-2">
					{POSITIONS.map((position) => (
						<div
							key={position.title}
							className="rounded-2xl border border-brand-line bg-card p-6"
						>
							<h2 className="font-display text-xl font-bold text-brand-ink">
								{position.title}
							</h2>
							<p className="mt-3 text-sm leading-relaxed text-muted-foreground">
								{position.body}
							</p>
						</div>
					))}
				</div>
			</Section>

			<Section className="border-t border-brand-line bg-brand-soft/30">
				<Eyebrow>How the matching works</Eyebrow>
				<div className="mt-6 max-w-3xl space-y-4 text-foreground/90">
					<p>
						Every document is broken into overlapping five-word sequences, each
						hashed to a number. A technique called winnowing keeps a
						deterministic subset of those hashes, which becomes the document's
						fingerprint. The subset is chosen so that any shared passage above a
						minimum length is guaranteed to produce at least one shared hash.
					</p>
					<p>
						When new work arrives, its fingerprints are looked up against the
						index to find candidate documents. Each candidate is then compared
						properly: shared hashes are grown outward word by word into the
						longest genuinely identical passages, which is also what removes
						false candidates thrown up by hash collisions.
					</p>
					<p>
						The surviving passages are filtered by your assignment settings —
						minimum match length, quoted material, trailing reference lists —
						and what remains is the report. The headline percentage is simply
						the share of the document's words covered by at least one surviving
						match.
					</p>
				</div>
			</Section>

			<ClosingCta
				title="Look at a report before you believe the number."
				body="Upload two documents that share a paragraph and check that the highlighting agrees with you."
				cta={{ label: "Open the checker", to: "/app" }}
			/>
		</>
	);
}
