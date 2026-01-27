import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { env } from "renderer/env.renderer";
import { Markdown } from "tiptap-markdown";
import "./TaskMarkdownRenderer.css";

const LINEAR_IMAGE_HOST = "uploads.linear.app";

/**
 * Checks if a URL is a Linear image upload URL.
 */
function isLinearImageUrl(src: string): boolean {
	try {
		const url = new URL(src);
		return url.host === LINEAR_IMAGE_HOST;
	} catch {
		return false;
	}
}

/**
 * Converts a Linear image URL to our proxy URL.
 */
function getLinearProxyUrl(linearUrl: string): string {
	const proxyUrl = new URL(`${env.NEXT_PUBLIC_API_URL}/api/proxy/linear-image`);
	proxyUrl.searchParams.set("url", linearUrl);
	return proxyUrl.toString();
}

/**
 * Custom Image extension that proxies Linear URLs.
 */
const LinearImage = Image.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			src: {
				default: null,
				parseHTML: (element) => element.getAttribute("src"),
				renderHTML: (attributes) => {
					const src = attributes.src;
					if (!src) return { src: null };
					const proxiedSrc = isLinearImageUrl(src)
						? getLinearProxyUrl(src)
						: src;
					return {
						src: proxiedSrc,
						crossorigin: isLinearImageUrl(src) ? "use-credentials" : undefined,
					};
				},
			},
		};
	},
});

interface TaskMarkdownRendererProps {
	content: string;
	onSave: (markdown: string) => void;
}

export function TaskMarkdownRenderer({
	content,
	onSave,
}: TaskMarkdownRendererProps) {
	const editor = useEditor({
		extensions: [
			StarterKit,
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: "text-primary underline",
				},
			}),
			LinearImage.configure({
				HTMLAttributes: {
					class: "max-w-full h-auto rounded-md my-4",
				},
			}),
			Placeholder.configure({
				placeholder: "Add description...",
			}),
			Markdown.configure({
				html: true,
				transformPastedText: true,
				transformCopiedText: true,
			}),
		],
		content,
		editorProps: {
			attributes: {
				class: "task-markdown-editor focus:outline-none min-h-[100px]",
			},
		},
		onBlur: ({ editor }) => {
			const storage = editor.storage as unknown as Record<
				string,
				{ getMarkdown?: () => string }
			>;
			const markdown = storage.markdown?.getMarkdown?.() ?? "";
			onSave(markdown);
		},
	});

	return <EditorContent editor={editor} className="w-full" />;
}
