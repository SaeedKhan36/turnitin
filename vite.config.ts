import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

/**
 * Server-only packages that must not be pre-bundled: @napi-rs/canvas ships a
 * native .node binary, and tesseract.js loads worker scripts and language data
 * from disk at runtime. Both break if the bundler tries to inline them.
 */
const serverOnly = ["@napi-rs/canvas", "tesseract.js"];

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	optimizeDeps: { exclude: serverOnly },
	ssr: { external: [...serverOnly, "@prisma/client", "pg", "unpdf"] },
	plugins: [
		devtools(),
		nitro({
			rollupConfig: {
				external: [/^@sentry\//, /^@napi-rs\/canvas/, /^tesseract\.js/],
			},
		}),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
