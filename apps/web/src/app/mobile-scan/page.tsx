"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useCallback, useRef, useState } from "react";

type ScanState = "idle" | "processing" | "validating" | "success" | "error";

export default function ScanPage() {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [scanState, setScanState] = useState<ScanState>("idle");
	const [error, setError] = useState<string | null>(null);
	const [pairedWorkspace, setPairedWorkspace] = useState<string | null>(null);

	const processQRCode = useCallback(async (pairingToken: string) => {
		setScanState("validating");

		try {
			const response = await fetch("/api/mobile-pair", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ pairingToken }),
			});

			const data = await response.json();

			if (!response.ok) {
				setScanState("error");
				setError(data.error || "Failed to validate pairing token");
				return;
			}

			setScanState("success");
			setPairedWorkspace(data.workspaceName ?? "your workspace");
		} catch (err) {
			console.error("[scan] Validation error:", err);
			setScanState("error");
			setError("Network error. Please try again.");
		}
	}, []);

	const handleImageSelect = useCallback(
		async (file: File) => {
			setScanState("processing");
			setError(null);

			try {
				const html5QrCode = new Html5Qrcode("qr-reader-hidden");
				const result = await html5QrCode.scanFile(file, true);

				// Parse the QR code data
				let pairingToken: string | null = null;

				try {
					const url = new URL(result);
					if (
						(url.protocol === "superset:" || url.protocol === "superset-dev:") &&
						url.host === "pair"
					) {
						pairingToken = url.searchParams.get("token");
					}
				} catch {
					// Check if it's a raw UUID token
					if (
						/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
							result,
						)
					) {
						pairingToken = result;
					}
				}

				if (pairingToken) {
					processQRCode(pairingToken);
				} else {
					setScanState("error");
					setError("No valid QR code found in image");
				}
			} catch (err) {
				console.error("[scan] QR decode error:", err);
				setScanState("error");
				setError("Could not read QR code from image. Try again with a clearer photo.");
			}
		},
		[processQRCode],
	);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			handleImageSelect(file);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		const file = e.dataTransfer.files?.[0];
		if (file && file.type.startsWith("image/")) {
			handleImageSelect(file);
		}
	};

	const reset = () => {
		setScanState("idle");
		setError(null);
		setPairedWorkspace(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="mb-2 text-2xl font-medium text-white">Scan QR Code</h1>
				<p className="text-sm text-white/50">
					Take a photo of the QR code on your desktop or upload an image.
				</p>
			</div>

			{/* Hidden element for html5-qrcode */}
			<div id="qr-reader-hidden" className="hidden" />

			{scanState === "idle" && (
				<div
					className="flex flex-col gap-4"
					onDragOver={(e) => e.preventDefault()}
					onDrop={handleDrop}
				>
					{/* Camera capture button - primary action on mobile */}
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 p-8 transition-colors active:bg-white/10"
					>
						<CameraIcon className="h-12 w-12 text-white/50" />
						<span className="text-lg font-medium text-white">
							Take Photo of QR Code
						</span>
						<span className="text-sm text-white/40">
							or tap to choose from gallery
						</span>
					</button>

					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						capture="environment"
						onChange={handleFileChange}
						className="hidden"
					/>

					{/* Drop zone hint for desktop */}
					<p className="text-center text-xs text-white/30">
						You can also drag and drop an image here
					</p>
				</div>
			)}

			{scanState === "processing" && (
				<div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/5 p-12">
					<div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
					<span className="text-white/70">Reading QR code...</span>
				</div>
			)}

			{scanState === "validating" && (
				<div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/5 p-12">
					<div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
					<span className="text-white/70">Connecting...</span>
				</div>
			)}

			{scanState === "success" && (
				<div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-green-500/10 p-12 text-center">
					<CheckIcon className="h-16 w-16 text-green-500" />
					<span className="text-xl font-medium text-white">Connected!</span>
					{pairedWorkspace && (
						<span className="text-white/70">Paired to {pairedWorkspace}</span>
					)}
					<p className="mt-2 text-sm text-white/50">
						You can now use voice commands from your desktop app.
					</p>
				</div>
			)}

			{scanState === "error" && (
				<div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-red-500/10 p-12 text-center">
					<XIcon className="h-16 w-16 text-red-500" />
					<span className="text-lg font-medium text-white">
						{error || "Something went wrong"}
					</span>
					<button
						onClick={reset}
						className="mt-2 rounded-lg bg-white px-6 py-2 text-sm font-medium text-black"
					>
						Try Again
					</button>
				</div>
			)}

			{/* Manual entry fallback */}
			{scanState === "idle" && (
				<ManualTokenEntry
					onSubmit={processQRCode}
					disabled={scanState !== "idle"}
				/>
			)}
		</div>
	);
}

function ManualTokenEntry({
	onSubmit,
	disabled,
}: {
	onSubmit: (token: string) => void;
	disabled: boolean;
}) {
	const [token, setToken] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (token.trim()) {
			onSubmit(token.trim());
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-3">
			<label className="text-sm text-white/70">
				Or enter pairing code manually:
			</label>
			<div className="flex gap-2">
				<input
					type="text"
					value={token}
					onChange={(e) => setToken(e.target.value)}
					placeholder="Paste pairing token"
					disabled={disabled}
					className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none disabled:opacity-50"
				/>
				<button
					type="submit"
					disabled={disabled || !token.trim()}
					className="rounded-lg bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-50"
				>
					Connect
				</button>
			</div>
		</form>
	);
}

function CameraIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
			<circle cx="12" cy="13" r="3" />
		</svg>
	);
}

function CheckIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M20 6 9 17l-5-5" />
		</svg>
	);
}

function XIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M18 6 6 18" />
			<path d="m6 6 12 12" />
		</svg>
	);
}
