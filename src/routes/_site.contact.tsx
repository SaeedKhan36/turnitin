import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { PageHero, Section } from "#/components/marketing/sections.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";

export const Route = createFileRoute("/_site/contact")({
	component: ContactPage,
	head: () => ({ meta: [{ title: "Contact — Attest" }] }),
});

function ContactPage() {
	const [submitted, setSubmitted] = useState(false);

	return (
		<>
			<PageHero
				eyebrow="Contact"
				title="Tell us what you are trying to check."
				body="The useful conversation is usually about a specific assignment or screening workflow, not a feature list."
			/>

			<Section>
				<div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
					<div className="rounded-2xl border border-brand-line bg-card p-6 sm:p-8">
						{submitted ? (
							<div className="py-10 text-center">
								<ShieldCheck className="mx-auto h-10 w-10 text-brand" />
								<h2 className="mt-4 font-display text-2xl font-bold text-brand-ink">
									Thanks — nothing was actually sent.
								</h2>
								<p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
									This is a demonstration build with no mail transport wired up,
									so the form validates and resets rather than pretending to
									deliver a message.
								</p>
								<Button
									variant="outline"
									className="mt-6"
									onClick={() => setSubmitted(false)}
								>
									Back to the form
								</Button>
							</div>
						) : (
							<form
								className="space-y-5"
								onSubmit={(event) => {
									event.preventDefault();
									setSubmitted(true);
								}}
							>
								<div className="grid gap-5 sm:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="name">Name</Label>
										<Input id="name" name="name" required autoComplete="name" />
									</div>
									<div className="space-y-2">
										<Label htmlFor="email">Work email</Label>
										<Input
											id="email"
											name="email"
											type="email"
											required
											autoComplete="email"
										/>
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="institution">Institution</Label>
									<Input id="institution" name="institution" />
								</div>
								<div className="space-y-2">
									<Label htmlFor="message">What are you trying to check?</Label>
									<Textarea id="message" name="message" rows={5} required />
								</div>
								<Button type="submit" size="lg">
									Send message
								</Button>
							</form>
						)}
					</div>

					<aside className="space-y-6">
						<div className="rounded-2xl border border-brand-line bg-brand-soft/40 p-6">
							<Mail className="h-5 w-5 text-brand" />
							<h2 className="mt-3 font-semibold text-brand-ink">Sales</h2>
							<p className="mt-1 text-sm text-muted-foreground">
								Institutional pricing, pilots, and rollout planning.
							</p>
						</div>
						<div className="rounded-2xl border border-brand-line bg-brand-soft/40 p-6">
							<MessageSquare className="h-5 w-5 text-brand" />
							<h2 className="mt-3 font-semibold text-brand-ink">Support</h2>
							<p className="mt-1 text-sm text-muted-foreground">
								Existing customers, integration questions, and report
								interpretation.
							</p>
						</div>
					</aside>
				</div>
			</Section>
		</>
	);
}
