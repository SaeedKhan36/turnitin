import { defineConfig } from "vitest/config";

// Deliberately not reusing vite.config.ts: the engine under test is plain
// TypeScript, and loading the Start/Nitro plugins here only adds failure modes.
export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
});
