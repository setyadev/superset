import {
	DEFAULT_EDITOR_FONT_FAMILY,
	DEFAULT_FONT_SETTINGS,
	DEFAULT_TERMINAL_FONT_FAMILY,
	MAX_TERMINAL_FONT_SIZE,
	MIN_TERMINAL_FONT_SIZE,
} from "shared/constants";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { trpcFontStorage } from "../../lib/trpc-storage";

interface FontState {
	editorFont: string | null;
	terminalFont: string | null;
	terminalFontSize: number;

	setEditorFont: (font: string | null) => void;
	setTerminalFont: (font: string | null) => void;
	setTerminalFontSize: (size: number) => void;
	resetEditorFont: () => void;
	resetTerminalFont: () => void;
	resetTerminalFontSize: () => void;
}

/**
 * Sanitize font name to prevent CSS injection.
 * Removes quotes and backslashes that could break font-family strings.
 */
function sanitizeFontName(font: string): string {
	return font.replace(/["\\]/g, "");
}

/**
 * Compute the full font-family CSS value for a custom font.
 * Returns the default family if no custom font is set.
 */
export function computeFontFamily(
	customFont: string | null,
	defaultFamily: string,
): string {
	if (customFont) {
		const sanitized = sanitizeFontName(customFont);
		return `"${sanitized}", ${defaultFamily}`;
	}
	return defaultFamily;
}

export const useFontStore = create<FontState>()(
	devtools(
		persist(
			(set) => ({
				editorFont: DEFAULT_FONT_SETTINGS.editorFont,
				terminalFont: DEFAULT_FONT_SETTINGS.terminalFont,
				terminalFontSize: DEFAULT_FONT_SETTINGS.terminalFontSize,

				setEditorFont: (font: string | null) => {
					set({ editorFont: font ? sanitizeFontName(font) : null });
				},

				setTerminalFont: (font: string | null) => {
					set({ terminalFont: font ? sanitizeFontName(font) : null });
				},

				setTerminalFontSize: (size: number) => {
					const clampedSize = Math.max(
						MIN_TERMINAL_FONT_SIZE,
						Math.min(MAX_TERMINAL_FONT_SIZE, Math.round(size)),
					);
					set({ terminalFontSize: clampedSize });
				},

				resetEditorFont: () => {
					set({ editorFont: DEFAULT_FONT_SETTINGS.editorFont });
				},

				resetTerminalFont: () => {
					set({ terminalFont: DEFAULT_FONT_SETTINGS.terminalFont });
				},

				resetTerminalFontSize: () => {
					set({ terminalFontSize: DEFAULT_FONT_SETTINGS.terminalFontSize });
				},
			}),
			{
				name: "font-storage",
				storage: trpcFontStorage,
				partialize: (state) => ({
					editorFont: state.editorFont,
					terminalFont: state.terminalFont,
					terminalFontSize: state.terminalFontSize,
				}),
			},
		),
		{ name: "FontStore" },
	),
);

// Reactive hooks for font family values
export const useEditorFontFamily = () =>
	useFontStore((state) =>
		computeFontFamily(state.editorFont, DEFAULT_EDITOR_FONT_FAMILY),
	);

export const useTerminalFontFamily = () =>
	useFontStore((state) =>
		computeFontFamily(state.terminalFont, DEFAULT_TERMINAL_FONT_FAMILY),
	);

export const useTerminalFontSize = () =>
	useFontStore((state) => state.terminalFontSize);

// Action hooks
export const useSetEditorFont = () =>
	useFontStore((state) => state.setEditorFont);
export const useSetTerminalFont = () =>
	useFontStore((state) => state.setTerminalFont);
export const useSetTerminalFontSize = () =>
	useFontStore((state) => state.setTerminalFontSize);
export const useResetEditorFont = () =>
	useFontStore((state) => state.resetEditorFont);
export const useResetTerminalFont = () =>
	useFontStore((state) => state.resetTerminalFont);
export const useResetTerminalFontSize = () =>
	useFontStore((state) => state.resetTerminalFontSize);
