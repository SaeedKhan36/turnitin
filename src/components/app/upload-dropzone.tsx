import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FileUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "#/lib/utils.ts";

const ACCEPT = ".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp";

/**
 * Posts to the Hono upload endpoint rather than going through tRPC — multipart
 * bodies are the one thing the typed RPC layer is a bad fit for.
 */
export function UploadDropzone({ assignmentId }: { assignmentId?: string }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function upload(file: File) {
		setUploading(true);
		setError(null);

		const body = new FormData();
		body.append("file", file);
		if (assignmentId) body.append("assignmentId", assignmentId);

		try {
			const response = await fetch("/api/files", { method: "POST", body });
			const payload = (await response.json()) as {
				submissionId?: string;
				error?: string;
			};
			if (!response.ok || !payload.submissionId) {
				setError(payload.error ?? "Upload failed.");
				return;
			}
			await queryClient.invalidateQueries();
			await navigate({
				to: "/app/submissions/$submissionId",
				params: { submissionId: payload.submissionId },
			});
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Upload failed.");
		} finally {
			setUploading(false);
		}
	}

	return (
		<div>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: drop target wraps a real file input for keyboard use */}
			<div
				onDragOver={(event) => {
					event.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={(event) => {
					event.preventDefault();
					setDragging(false);
					const file = event.dataTransfer.files?.[0];
					if (file) void upload(file);
				}}
				className={cn(
					"rounded-2xl border-2 border-dashed p-10 text-center transition",
					dragging ? "border-brand bg-brand-soft" : "border-brand-line bg-card",
				)}
			>
				{uploading ? (
					<Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" />
				) : (
					<FileUp className="mx-auto h-8 w-8 text-brand/60" />
				)}
				<p className="mt-3 font-medium text-brand-ink">
					{uploading ? "Uploading…" : "Drop a document here"}
				</p>
				<p className="mt-1 text-sm text-muted-foreground">
					PDF, DOCX, TXT, MD, or an image. Scanned pages are read with OCR.
				</p>
				<button
					type="button"
					className="mt-4 rounded-md border border-brand-line bg-background px-4 py-2 text-sm font-medium transition hover:border-brand disabled:opacity-50"
					disabled={uploading}
					onClick={() => inputRef.current?.click()}
				>
					Choose a file
				</button>
				<input
					ref={inputRef}
					type="file"
					accept={ACCEPT}
					className="sr-only"
					onChange={(event) => {
						const file = event.target.files?.[0];
						if (file) void upload(file);
						event.target.value = "";
					}}
				/>
			</div>
			{error ? (
				<p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{error}
				</p>
			) : null}
		</div>
	);
}
