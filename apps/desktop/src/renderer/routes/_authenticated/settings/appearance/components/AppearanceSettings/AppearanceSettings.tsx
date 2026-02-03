import { Button } from "@superset/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@superset/ui/select";
import { Slider } from "@superset/ui/slider";
import {
	computeFontFamily,
	type MarkdownStyle,
	SYSTEM_THEME_ID,
	useFontStore,
	useMarkdownStyle,
	useSetMarkdownStyle,
	useSetTheme,
	useThemeId,
	useThemeStore,
} from "renderer/stores";
import {
	DEFAULT_EDITOR_FONT_FAMILY,
	DEFAULT_TERMINAL_FONT_FAMILY,
	EDITOR_FONT_OPTIONS,
	MAX_TERMINAL_FONT_SIZE,
	MIN_TERMINAL_FONT_SIZE,
	TERMINAL_FONT_OPTIONS,
} from "shared/constants";
import { builtInThemes } from "shared/themes";
import {
	isItemVisible,
	SETTING_ITEM_ID,
	type SettingItemId,
} from "../../../utils/settings-search";
import { SystemThemeCard } from "./components/SystemThemeCard";
import { ThemeCard } from "./components/ThemeCard";

interface AppearanceSettingsProps {
	visibleItems?: SettingItemId[] | null;
}

export function AppearanceSettings({ visibleItems }: AppearanceSettingsProps) {
	const showTheme = isItemVisible(
		SETTING_ITEM_ID.APPEARANCE_THEME,
		visibleItems,
	);
	const showFonts = isItemVisible(
		SETTING_ITEM_ID.APPEARANCE_FONTS,
		visibleItems,
	);
	const showMarkdown = isItemVisible(
		SETTING_ITEM_ID.APPEARANCE_MARKDOWN,
		visibleItems,
	);
	const showCustomThemes = isItemVisible(
		SETTING_ITEM_ID.APPEARANCE_CUSTOM_THEMES,
		visibleItems,
	);

	const activeThemeId = useThemeId();
	const setTheme = useSetTheme();
	const customThemes = useThemeStore((state) => state.customThemes);
	const markdownStyle = useMarkdownStyle();
	const setMarkdownStyle = useSetMarkdownStyle();

	// Font settings
	const editorFont = useFontStore((state) => state.editorFont);
	const terminalFont = useFontStore((state) => state.terminalFont);
	const terminalFontSize = useFontStore((state) => state.terminalFontSize);
	const setEditorFont = useFontStore((state) => state.setEditorFont);
	const setTerminalFont = useFontStore((state) => state.setTerminalFont);
	const setTerminalFontSize = useFontStore(
		(state) => state.setTerminalFontSize,
	);
	const resetEditorFont = useFontStore((state) => state.resetEditorFont);
	const resetTerminalFont = useFontStore((state) => state.resetTerminalFont);
	const resetTerminalFontSize = useFontStore(
		(state) => state.resetTerminalFontSize,
	);

	// Compute font families for preview
	const editorFontFamily = computeFontFamily(
		editorFont,
		DEFAULT_EDITOR_FONT_FAMILY,
	);
	const terminalFontFamily = computeFontFamily(
		terminalFont,
		DEFAULT_TERMINAL_FONT_FAMILY,
	);

	const allThemes = [...builtInThemes, ...customThemes];

	return (
		<div className="p-6 max-w-4xl w-full">
			<div className="mb-8">
				<h2 className="text-xl font-semibold">Appearance</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Customize how Superset looks on your device
				</p>
			</div>

			<div className="space-y-8">
				{/* Theme Section */}
				{showTheme && (
					<div>
						<h3 className="text-sm font-medium mb-4">Theme</h3>
						<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
							<SystemThemeCard
								isSelected={activeThemeId === SYSTEM_THEME_ID}
								onSelect={() => setTheme(SYSTEM_THEME_ID)}
							/>
							{allThemes.map((theme) => (
								<ThemeCard
									key={theme.id}
									theme={theme}
									isSelected={activeThemeId === theme.id}
									onSelect={() => setTheme(theme.id)}
								/>
							))}
						</div>
					</div>
				)}

				{/* Font Settings Section */}
				{showFonts && (
					<div className={showTheme ? "pt-6 border-t" : ""}>
						<h3 className="text-sm font-medium mb-4">Fonts</h3>

						{/* Editor Font */}
						<div className="mb-6">
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm text-muted-foreground">
									Editor Font
								</span>
								{editorFont && (
									<Button
										variant="ghost"
										size="sm"
										onClick={resetEditorFont}
										className="h-7 text-xs"
									>
										Reset
									</Button>
								)}
							</div>
							<Select
								value={editorFont ?? "default"}
								onValueChange={(value) =>
									setEditorFont(value === "default" ? null : value)
								}
							>
								<SelectTrigger className="w-[200px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent side="top">
									{EDITOR_FONT_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p
								className="text-sm text-muted-foreground mt-2"
								style={{ fontFamily: editorFontFamily }}
							>
								Preview: The quick brown fox jumps over the lazy dog
							</p>
						</div>

						{/* Terminal Font */}
						<div className="mb-6">
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm text-muted-foreground">
									Terminal Font
								</span>
								{terminalFont && (
									<Button
										variant="ghost"
										size="sm"
										onClick={resetTerminalFont}
										className="h-7 text-xs"
									>
										Reset
									</Button>
								)}
							</div>
							<Select
								value={terminalFont ?? "default"}
								onValueChange={(value) =>
									setTerminalFont(value === "default" ? null : value)
								}
							>
								<SelectTrigger className="w-[200px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent side="top">
									{TERMINAL_FONT_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p
								className="text-sm text-muted-foreground mt-2"
								style={{ fontFamily: terminalFontFamily }}
							>
								$ echo "Preview: The quick brown fox jumps over the lazy dog"
							</p>
						</div>

						{/* Terminal Font Size */}
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm text-muted-foreground">
									Terminal Font Size: {terminalFontSize}px
								</span>
								{terminalFontSize !== 14 && (
									<Button
										variant="ghost"
										size="sm"
										onClick={resetTerminalFontSize}
										className="h-7 text-xs"
									>
										Reset
									</Button>
								)}
							</div>
							<Slider
								value={[terminalFontSize]}
								onValueChange={([value]) => setTerminalFontSize(value)}
								min={MIN_TERMINAL_FONT_SIZE}
								max={MAX_TERMINAL_FONT_SIZE}
								step={1}
								className="w-[200px]"
							/>
							<p
								className="text-sm text-muted-foreground mt-2"
								style={{
									fontFamily: terminalFontFamily,
									fontSize: `${terminalFontSize}px`,
								}}
							>
								$ terminal preview at {terminalFontSize}px
							</p>
						</div>
					</div>
				)}

				{showMarkdown && (
					<div className={showTheme || showFonts ? "pt-6 border-t" : ""}>
						<h3 className="text-sm font-medium mb-2">Markdown Style</h3>
						<p className="text-sm text-muted-foreground mb-4">
							Rendering style for markdown files when viewing rendered content
						</p>
						<Select
							value={markdownStyle}
							onValueChange={(value) =>
								setMarkdownStyle(value as MarkdownStyle)
							}
						>
							<SelectTrigger className="w-[200px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="default">Default</SelectItem>
								<SelectItem value="tufte">Tufte</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground mt-2">
							Tufte style uses elegant serif typography inspired by Edward
							Tufte's books
						</p>
					</div>
				)}

				{showCustomThemes && (
					<div
						className={
							showTheme || showFonts || showMarkdown ? "pt-6 border-t" : ""
						}
					>
						<h3 className="text-sm font-medium mb-2">Custom Themes</h3>
						<p className="text-sm text-muted-foreground">
							Custom theme import coming soon. You'll be able to import JSON
							theme files to create your own themes.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
