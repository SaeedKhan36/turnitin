import {
	createFileRoute,
	Link,
	Outlet,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { Loader2, LogOut } from "lucide-react";
import { useEffect } from "react";
import { Logo } from "#/components/marketing/logo.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu.tsx";
import { signOut, useSession } from "#/lib/auth-client.ts";

export const Route = createFileRoute("/app")({
	component: AppLayout,
	head: () => ({ meta: [{ title: "Attest" }] }),
});

function AppLayout() {
	const navigate = useNavigate();
	const { data: session, isPending } = useSession();
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	// The server enforces access on every tRPC call; this is the UI half of the
	// guard, so signed-out visitors land on the login page instead of an error.
	useEffect(() => {
		if (!isPending && !session) {
			void navigate({ to: "/login" });
		}
	}, [isPending, session, navigate]);

	if (isPending || !session) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Loader2 className="h-6 w-6 animate-spin text-brand" />
			</div>
		);
	}

	const role = (session.user as { role?: string }).role ?? "STUDENT";

	return (
		<div className="flex min-h-screen flex-col bg-brand-soft/25">
			<header className="border-b border-brand-line bg-background">
				<div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
					<Link to="/app">
						<Logo />
					</Link>
					<nav className="hidden items-center gap-1 sm:flex">
						<Link
							to="/app"
							className={`rounded-md px-3 py-2 text-sm font-medium transition hover:bg-brand-soft ${
								pathname === "/app"
									? "bg-brand-soft text-brand-ink"
									: "text-foreground/70"
							}`}
						>
							Dashboard
						</Link>
						<Link
							to="/"
							className="rounded-md px-3 py-2 text-sm font-medium text-foreground/70 transition hover:bg-brand-soft"
						>
							Marketing site
						</Link>
					</nav>

					<div className="ml-auto flex items-center gap-3">
						<span className="hidden rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand sm:inline">
							{role === "INSTRUCTOR" ? "Instructor" : "Student"}
						</span>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="sm">
									{session.user.name || session.user.email}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuLabel className="font-normal">
									<span className="block text-sm font-medium">
										{session.user.name}
									</span>
									<span className="block text-xs text-muted-foreground">
										{session.user.email}
									</span>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={async () => {
										await signOut();
										await navigate({ to: "/login" });
									}}
								>
									<LogOut className="mr-2 h-4 w-4" />
									Sign out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</header>

			<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
				<Outlet />
			</main>
		</div>
	);
}
