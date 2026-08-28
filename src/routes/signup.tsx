import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Users } from "lucide-react";
import { useState } from "react";
import { Logo } from "#/components/marketing/logo.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { type AppRole, signUp } from "#/lib/auth-client.ts";
import { cn } from "#/lib/utils.ts";

export const Route = createFileRoute("/signup")({
	component: SignupPage,
	head: () => ({ meta: [{ title: "Create an account — Attest" }] }),
});

const ROLES: Array<{
	value: AppRole;
	label: string;
	detail: string;
	icon: typeof Users;
}> = [
	{
		value: "INSTRUCTOR",
		label: "Instructor",
		detail:
			"Create classes and assignments, and see reports for every submission.",
		icon: Users,
	},
	{
		value: "STUDENT",
		label: "Student",
		detail: "Join a class with a code, submit work, and read your own reports.",
		icon: GraduationCap,
	},
];

function SignupPage() {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState<AppRole>("INSTRUCTOR");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setPending(true);
		setError(null);
		const { error: signUpError } = await signUp.email({
			name,
			email,
			password,
			role,
		});
		setPending(false);
		if (signUpError) {
			setError(signUpError.message ?? "Could not create the account.");
			return;
		}
		await navigate({ to: "/app" });
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-brand-soft/40 px-4 py-12">
			<div className="w-full max-w-lg">
				<Link to="/" className="mb-8 flex justify-center">
					<Logo />
				</Link>
				<div className="rounded-2xl border border-brand-line bg-card p-8 shadow-sm">
					<h1 className="font-display text-2xl font-bold text-brand-ink">
						Create an account
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Roles are self-selected in this build. A real deployment would issue
						instructor accounts through the institution.
					</p>

					<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
						<fieldset className="space-y-2">
							<legend className="text-sm font-medium">I am a…</legend>
							<div className="grid gap-3 sm:grid-cols-2">
								{ROLES.map((option) => {
									const Icon = option.icon;
									const selected = role === option.value;
									return (
										<button
											key={option.value}
											type="button"
											aria-pressed={selected}
											onClick={() => setRole(option.value)}
											className={cn(
												"rounded-xl border p-4 text-left transition",
												selected
													? "border-brand bg-brand-soft"
													: "border-brand-line hover:border-brand/50",
											)}
										>
											<Icon className="h-5 w-5 text-brand" />
											<span className="mt-2 block text-sm font-semibold text-brand-ink">
												{option.label}
											</span>
											<span className="mt-1 block text-xs text-muted-foreground">
												{option.detail}
											</span>
										</button>
									);
								})}
							</div>
						</fieldset>

						<div className="space-y-2">
							<Label htmlFor="name">Full name</Label>
							<Input
								id="name"
								required
								autoComplete="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								required
								autoComplete="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								required
								minLength={8}
								autoComplete="new-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
							<p className="text-xs text-muted-foreground">
								At least 8 characters.
							</p>
						</div>
						{error ? (
							<p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
								{error}
							</p>
						) : null}
						<Button type="submit" className="w-full" disabled={pending}>
							{pending ? "Creating account…" : "Create account"}
						</Button>
					</form>

					<p className="mt-6 text-center text-sm text-muted-foreground">
						Already have an account?{" "}
						<Link
							to="/login"
							className="font-semibold text-brand hover:underline"
						>
							Log in
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
