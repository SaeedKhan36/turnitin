import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "#/components/marketing/logo.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { signIn } from "#/lib/auth-client.ts";

export const Route = createFileRoute("/login")({
	component: LoginPage,
	head: () => ({ meta: [{ title: "Log in — Attest" }] }),
});

function LoginPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setPending(true);
		setError(null);
		const { error: signInError } = await signIn.email({ email, password });
		setPending(false);
		if (signInError) {
			setError(signInError.message ?? "Could not sign in.");
			return;
		}
		await navigate({ to: "/app" });
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-brand-soft/40 px-4 py-12">
			<div className="w-full max-w-md">
				<Link to="/" className="mb-8 flex justify-center">
					<Logo />
				</Link>
				<div className="rounded-2xl border border-brand-line bg-card p-8 shadow-sm">
					<h1 className="font-display text-2xl font-bold text-brand-ink">
						Log in
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Welcome back. Your reports are where you left them.
					</p>

					<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								autoComplete="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								autoComplete="current-password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
						{error ? (
							<p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
								{error}
							</p>
						) : null}
						<Button type="submit" className="w-full" disabled={pending}>
							{pending ? "Signing in…" : "Log in"}
						</Button>
					</form>

					<p className="mt-6 text-center text-sm text-muted-foreground">
						No account yet?{" "}
						<Link
							to="/signup"
							className="font-semibold text-brand hover:underline"
						>
							Create one
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
