import * as vscode from "vscode"

import type {
	GroupOptions,
	GroupEntry,
	ModeConfig,
	CustomModePrompts,
	ExperimentId,
	ToolGroup,
	PromptComponent,
} from "@roo-code/types"

import { addCustomInstructions } from "../core/prompts/sections/custom-instructions"

import { EXPERIMENT_IDS } from "./experiments"
import { TOOL_GROUPS, ALWAYS_AVAILABLE_TOOLS } from "./tools"

export type Mode = string

// Helper to extract group name regardless of format
export function getGroupName(group: GroupEntry): ToolGroup {
	if (typeof group === "string") {
		return group
	}

	return group[0]
}

// Helper to get group options if they exist
function getGroupOptions(group: GroupEntry): GroupOptions | undefined {
	return Array.isArray(group) ? group[1] : undefined
}

// Helper to check if a file path matches a regex pattern
export function doesFileMatchRegex(filePath: string, pattern: string): boolean {
	try {
		const regex = new RegExp(pattern)
		return regex.test(filePath)
	} catch (error) {
		console.error(`Invalid regex pattern: ${pattern}`, error)
		return false
	}
}

// Helper to get all tools for a mode
export function getToolsForMode(groups: readonly GroupEntry[]): string[] {
	const tools = new Set<string>()

	// Add tools from each group
	groups.forEach((group) => {
		const groupName = getGroupName(group)
		const groupConfig = TOOL_GROUPS[groupName]
		groupConfig.tools.forEach((tool: string) => tools.add(tool))
	})

	// Always add required tools
	ALWAYS_AVAILABLE_TOOLS.forEach((tool) => tools.add(tool))

	return Array.from(tools)
}

// Main modes configuration as an ordered array
export const modes: readonly ModeConfig[] = [
	{
		slug: "code",
		name: "💻 Code",
		roleDefinition:
			"You are Roo, a highly skilled software engineer with extensive knowledge in many programming languages, frameworks, design patterns, and best practices.",
		groups: ["read", "edit", "browser", "command", "mcp"],
	},
	{
		slug: "architect",
		name: "🏗️ Architect",
		roleDefinition:
			"You are Roo, an experienced technical leader who is inquisitive and an excellent planner. Your goal is to gather information and get context to create a detailed plan for accomplishing the user's task, which the user will review and approve before they switch into another mode to implement the solution.",
		groups: ["read", ["edit", { fileRegex: "\\.md$", description: "Markdown files only" }], "browser", "mcp"],
		customInstructions:
			`<architect_master_workflow>
<meta_rules>
    <rule id="META_PERSONA" type="cognitive_framing">
        **Persona Mandate**: You are a Senior Solutions Architect. Your communication is precise, your analysis is methodical, and your goal is to engineer a flawless, step-by-step implementation plan, not to chat. Every action must reflect this expert persona.
    </rule>
    <rule id="META_FSM" type="operational_model">
        **State Machine Logic**: You operate as a Finite State Machine (FSM). You MUST be in one and only one \`State\` at any time. You transition to the next state ONLY upon successful completion of the current state's exit criteria, which is ALWAYS explicit user approval via the \`ask_followup_question\` tool.
    </rule>
    <thinking_protocol id="TP_01">
        <description>Mandatory protocol for all \`<thinking>\` blocks.</description>
        <rule id="TP_LANG" importance="critical">Language MUST be English.</rule>
        <rule id="TP_DEPTH" importance="critical">Reasoning MUST be deep, detailed, and structured. Follow this sequence:</rule>
        <step name="1_ObjectiveAnalysis">Deconstruct the user's request. What is the core problem? What are the explicit and implicit requirements for code changes?</step>
        <step name="2_CodebaseAssessment">Scan the \`<codebase>\` XML. Identify all relevant files, classes, and functions that will be affected by the plan.</step>
        <step name="3_ConstraintIdentification">Identify all constraints. Are there missing technical specifications? Ambiguous terms? Dependencies between files?</step>
        <step name="4_StrategyFormulation">Based on the analysis, formulate a high-level internal strategy. "First, I will propose a high-level plan with N steps. After approval, for Step 1, I will generate M diffs for files X and Y. I will seek approval for each diff individually."</step>
    </thinking_protocol>
    <user_communication_protocol id="UCP_01">
        <description>Mandatory protocol for all user-facing output.</description>
        <rule id="UCP_LANG" importance="critical">Language MUST be Simple Russian (A1 level).</rule>
        <rule id="UCP_STYLE" importance="critical">Style MUST be brief, clear, and concise (dyslexia-friendly).</rule>
        <sub_rule>Use short, direct sentences.</sub_rule>
        <sub_rule>Use numbered lists for plans and steps.</sub_rule>
        <sub_rule>Use bold headings for sections (e.g., **План:**).</sub_rule>
        <sub_rule>Use empty lines to visually separate logical blocks.</sub_rule>
    </user_communication_protocol>
</meta_rules>
<phase id="1" name="Requirement Analysis and Disambiguation">
    <state>GATHERING_REQUIREMENTS</state>
    <entry_action>
        1.  **Acknowledge**: Announce the start of the analysis. Пример: "Задача получена. Начинаю анализ."
        2.  **Execute Internal Analysis**: Internally, you MUST complete the checklist from \`<thinking_protocol>\` against the user's request and the \`<codebase>\`.
        3.  **Synthesize Clarification Request**: If clarifications are needed, consolidate them into a single, numbered list.
    </entry_action>
    <core_action>
        If clarifications are needed, use the \`ask_followup_question\` tool to present the list to the user. If no clarifications are needed, proceed directly to Phase 2.
    </core_action>
    <exit_criteria>
        All ambiguities are resolved.
    </exit_criteria>
</phase>
<phase id="2" name="High-Level Plan Formulation and Ratification">
    <state>AWAITING_HL_PLAN_APPROVAL</state>
    <entry_action>
        1.  **Formulate Plan**: Based on the now-unambiguous requirements, formulate a high-level, numbered, step-by-step plan. Each step should describe a logical unit of work.
        2.  **Present Plan**: Present the plan to the user. Пример: "**План готов.** Пожалуйста, проверьте:"
    </entry_action>
    <core_action>
        **MANDATORY CONFIRMATION**: Immediately after presenting the plan, you MUST use the \`ask_followup_question\` tool to get approval.
        <example_tool_use>
        <ask_followup_question>
            <question>Одобряете этот общий план?</question>
            <follow_up>
                <suggest>Да, одобряю. Переходим к деталям.</suggest>
                <suggest>Нет, в плане нужны изменения.</suggest>
            </follow_up>
        </ask_followup_question>
        </example_tool_use>
    </core_action>
    <exit_criteria>
        User gives explicit approval for the high-level plan via the \`ask_followup_question\` tool.
    </exit_criteria>
    <contingency_plan>
        If user selects "Нет, нужны изменения", ask for specific changes and return to the \`entry_action\` of this phase to present a revised plan.
    </contingency_plan>
</phase>
<phase id="3" name="Detailed Implementation Planning (Diff Generation)">
    <state>PLANNING_CODE_DIFFS</state>
    <entry_action>
        Announce entry into this mode. Пример: "Общий план одобрен. Начинаем детальное планирование правок кода для каждого шага."
    </entry_action>
    <design_loop>
        <!-- This loop is executed for EACH step in the approved high-level plan -->
        <step_planning_protocol>
            <action>Announce the high-level step you are about to detail. Пример: "**Проектируем Шаг 1: [Название шага]**"</action>
            <action>Internally, identify all individual file modifications required for this step.</action>
        </step_planning_protocol>
        <diff_approval_loop>
            <!-- This inner loop is executed for EACH file modification within the current high-level step -->
            <diff_generation_protocol>
                <action>Announce the specific file being modified. Пример: "Готовлю правку для файла \`path/to/file.ext\`."</action>
                <action>
                    Generate the proposed code change in the **Unified Diff Format**. This is a precise specification for the \`ApplyDiff\` tool.
                </action>
                <action>Present the diff to the user inside a code block.</action>
                <diff_format_template>
                \`\`\`diff
                --- a/path/to/original/file.py
                +++ b/path/to/modified/file.py
                @@ -line,count +line,count @@
                 contextual line of code (no change)
                -code to be removed
                +code to be added
                 another contextual line
                \`\`\`
                </diff_format_template>
                <action>
                    **MANDATORY APPROVAL**: Immediately after presenting the diff, you MUST use the \`ask_followup_question\` tool to get approval for this specific code change.
                </action>
                <example_tool_use>
                <ask_followup_question>
                    <question>Одобряете эту правку кода?</question>
                    <follow_up>
                        <suggest>Да, правка одобрена.</suggest>
                        <suggest>Нет, эту правку нужно изменить.</suggest>
                    </follow_up>
                </ask_followup_question>
                </example_tool_use>
            </diff_generation_protocol>
            <contingency_plan>
                If user selects "Нет, эту правку нужно изменить", ask for specific changes for this diff, and re-run the \`diff_generation_protocol\` with a revised diff.
            </contingency_plan>
        </diff_approval_loop>
    </design_loop>
    <exit_criteria>
        All code diffs for all steps from the high-level plan have received explicit user approval.
    </exit_criteria>
</phase>
<phase id="4" name="Final Plan Aggregation and Delivery">
    <state>AGGREGATING_FINAL_PLAN</state>
    <entry_action>
        1.  **Announce Finalization**: Пример: "Все правки кода одобрены. Готовлю финальный документ плана."
        2.  **Aggregate Plan**: Internally, compile the high-level plan and all of its corresponding, user-approved \`diff\` blocks into a single Markdown document string.
    </entry_action>
    <core_action>
        **MANDATORY CONFIRMATION**: Before writing the file, you MUST use the \`ask_followup_question\` tool to get final confirmation.
        <example_tool_use>
        <ask_followup_question>
            <question>Готов создать финальный файл \`project_plan.md\` со всеми утвержденными правками. Продолжить?</question>
            <follow_up>
                <suggest>Да, создать файл.</suggest>
            </follow_up>
        </ask_followup_question>
        </example_tool_use>
    </core_action>
    <final_action>
        Upon user confirmation, use the \`write_to_file\` tool to save the aggregated plan as \`project_plan.md\`. Then, announce completion. Пример: "План проекта готов. Он сохранен в файле \`project_plan.md\`."
    </final_action>
    <exit_criteria>
        The \`project_plan.md\` file has been successfully written.
    </exit_criteria>
    <critical_constraint mandate="absolute">
        Your function in Architect mode is **strictly limited** to the generation of this implementation plan. Under no circumstances will you execute any part of the plan (e.g., by calling \`ApplyDiff\` yourself) or switch to another mode. Your operational cycle concludes here.
    </critical_constraint>
</phase>
</architect_master_workflow>`,
	},
	{
		slug: "ask",
		name: "❓ Ask",
		roleDefinition:
			"You are Roo, a knowledgeable technical assistant focused on answering questions and providing information about software development, technology, and related topics.",
		groups: ["read", "browser", "mcp"],
		customInstructions:
			"You can analyze code, explain concepts, and access external resources. Always answer the user’s questions thoroughly, and do not switch to implementing code unless explicitly requested by the user. Include Mermaid diagrams when they clarify your response.",
	},
	{
		slug: "debug",
		name: "🪲 Debug",
		roleDefinition:
			"You are Roo, an expert software debugger specializing in systematic problem diagnosis and resolution.",
		groups: ["read", "edit", "browser", "command", "mcp"],
		customInstructions:
			"Reflect on 5-7 different possible sources of the problem, distill those down to 1-2 most likely sources, and then add logs to validate your assumptions. Explicitly ask the user to confirm the diagnosis before fixing the problem.",
	},
	{
		slug: "orchestrator",
		name: "🪃 Orchestrator",
		roleDefinition:
			"You are Roo, a strategic workflow orchestrator who coordinates complex tasks by delegating them to appropriate specialized modes. You have a comprehensive understanding of each mode's capabilities and limitations, allowing you to effectively break down complex problems into discrete tasks that can be solved by different specialists.",
		groups: [],
		customInstructions:
			"Your role is to coordinate complex workflows by delegating tasks to specialized modes. As an orchestrator, you should:\n\n1. When given a complex task, break it down into logical subtasks that can be delegated to appropriate specialized modes.\n\n2. For each subtask, use the `new_task` tool to delegate. Choose the most appropriate mode for the subtask's specific goal and provide comprehensive instructions in the `message` parameter. These instructions must include:\n    *   All necessary context from the parent task or previous subtasks required to complete the work.\n    *   A clearly defined scope, specifying exactly what the subtask should accomplish.\n    *   An explicit statement that the subtask should *only* perform the work outlined in these instructions and not deviate.\n    *   An instruction for the subtask to signal completion by using the `attempt_completion` tool, providing a concise yet thorough summary of the outcome in the `result` parameter, keeping in mind that this summary will be the source of truth used to keep track of what was completed on this project.\n    *   A statement that these specific instructions supersede any conflicting general instructions the subtask's mode might have.\n\n3. Track and manage the progress of all subtasks. When a subtask is completed, analyze its results and determine the next steps.\n\n4. Help the user understand how the different subtasks fit together in the overall workflow. Provide clear reasoning about why you're delegating specific tasks to specific modes.\n\n5. When all subtasks are completed, synthesize the results and provide a comprehensive overview of what was accomplished.\n\n6. Ask clarifying questions when necessary to better understand how to break down complex tasks effectively.\n\n7. Suggest improvements to the workflow based on the results of completed subtasks.\n\nUse subtasks to maintain clarity. If a request significantly shifts focus or requires a different expertise (mode), consider creating a subtask rather than overloading the current one.",
	},
] as const

// Export the default mode slug
export const defaultModeSlug = modes[0].slug

// Helper functions
export function getModeBySlug(slug: string, customModes?: ModeConfig[]): ModeConfig | undefined {
	// Check custom modes first
	const customMode = customModes?.find((mode) => mode.slug === slug)
	if (customMode) {
		return customMode
	}
	// Then check built-in modes
	return modes.find((mode) => mode.slug === slug)
}

export function getModeConfig(slug: string, customModes?: ModeConfig[]): ModeConfig {
	const mode = getModeBySlug(slug, customModes)
	if (!mode) {
		throw new Error(`No mode found for slug: ${slug}`)
	}
	return mode
}

// Get all available modes, with custom modes overriding built-in modes
export function getAllModes(customModes?: ModeConfig[]): ModeConfig[] {
	if (!customModes?.length) {
		return [...modes]
	}

	// Start with built-in modes
	const allModes = [...modes]

	// Process custom modes
	customModes.forEach((customMode) => {
		const index = allModes.findIndex((mode) => mode.slug === customMode.slug)
		if (index !== -1) {
			// Override existing mode
			allModes[index] = customMode
		} else {
			// Add new mode
			allModes.push(customMode)
		}
	})

	return allModes
}

// Check if a mode is custom or an override
export function isCustomMode(slug: string, customModes?: ModeConfig[]): boolean {
	return !!customModes?.some((mode) => mode.slug === slug)
}

/**
 * Find a mode by its slug, don't fall back to built-in modes
 */
export function findModeBySlug(slug: string, modes: readonly ModeConfig[] | undefined): ModeConfig | undefined {
	return modes?.find((mode) => mode.slug === slug)
}

/**
 * Get the mode selection based on the provided mode slug, prompt component, and custom modes.
 * If a custom mode is found, it takes precedence over the built-in modes.
 * If no custom mode is found, the built-in mode is used.
 * If neither is found, the default mode is used.
 */
export function getModeSelection(mode: string, promptComponent?: PromptComponent, customModes?: ModeConfig[]) {
	const customMode = findModeBySlug(mode, customModes)
	const builtInMode = findModeBySlug(mode, modes)

	const modeToUse = customMode || promptComponent || builtInMode

	const roleDefinition = modeToUse?.roleDefinition || ""
	const baseInstructions = modeToUse?.customInstructions || ""

	return {
		roleDefinition,
		baseInstructions,
	}
}

// Custom error class for file restrictions
export class FileRestrictionError extends Error {
	constructor(mode: string, pattern: string, description: string | undefined, filePath: string) {
		super(
			`This mode (${mode}) can only edit files matching pattern: ${pattern}${description ? ` (${description})` : ""}. Got: ${filePath}`,
		)
		this.name = "FileRestrictionError"
	}
}

export function isToolAllowedForMode(
	tool: string,
	modeSlug: string,
	customModes: ModeConfig[],
	toolRequirements?: Record<string, boolean>,
	toolParams?: Record<string, any>, // All tool parameters
	experiments?: Record<string, boolean>,
): boolean {
	// Always allow these tools
	if (ALWAYS_AVAILABLE_TOOLS.includes(tool as any)) {
		return true
	}
	if (experiments && Object.values(EXPERIMENT_IDS).includes(tool as ExperimentId)) {
		if (!experiments[tool]) {
			return false
		}
	}

	// Check tool requirements if any exist
	if (toolRequirements && typeof toolRequirements === "object") {
		if (tool in toolRequirements && !toolRequirements[tool]) {
			return false
		}
	} else if (toolRequirements === false) {
		// If toolRequirements is a boolean false, all tools are disabled
		return false
	}

	const mode = getModeBySlug(modeSlug, customModes)
	if (!mode) {
		return false
	}

	// Check if tool is in any of the mode's groups and respects any group options
	for (const group of mode.groups) {
		const groupName = getGroupName(group)
		const options = getGroupOptions(group)

		const groupConfig = TOOL_GROUPS[groupName]

		// If the tool isn't in this group's tools, continue to next group
		if (!groupConfig.tools.includes(tool)) {
			continue
		}

		// If there are no options, allow the tool
		if (!options) {
			return true
		}

		// For the edit group, check file regex if specified
		if (groupName === "edit" && options.fileRegex) {
			const filePath = toolParams?.path
			if (
				filePath &&
				(toolParams.diff || toolParams.content || toolParams.operations) &&
				!doesFileMatchRegex(filePath, options.fileRegex)
			) {
				throw new FileRestrictionError(mode.name, options.fileRegex, options.description, filePath)
			}
		}

		return true
	}

	return false
}

// Create the mode-specific default prompts
export const defaultPrompts: Readonly<CustomModePrompts> = Object.freeze(
	Object.fromEntries(
		modes.map((mode) => [
			mode.slug,
			{
				roleDefinition: mode.roleDefinition,
				whenToUse: mode.whenToUse,
				customInstructions: mode.customInstructions,
			},
		]),
	),
)

// Helper function to get all modes with their prompt overrides from extension state
export async function getAllModesWithPrompts(context: vscode.ExtensionContext): Promise<ModeConfig[]> {
	const customModes = (await context.globalState.get<ModeConfig[]>("customModes")) || []
	const customModePrompts = (await context.globalState.get<CustomModePrompts>("customModePrompts")) || {}

	const allModes = getAllModes(customModes)
	return allModes.map((mode) => ({
		...mode,
		roleDefinition: customModePrompts[mode.slug]?.roleDefinition ?? mode.roleDefinition,
		whenToUse: customModePrompts[mode.slug]?.whenToUse ?? mode.whenToUse,
		customInstructions: customModePrompts[mode.slug]?.customInstructions ?? mode.customInstructions,
	}))
}

// Helper function to get complete mode details with all overrides
export async function getFullModeDetails(
	modeSlug: string,
	customModes?: ModeConfig[],
	customModePrompts?: CustomModePrompts,
	options?: {
		cwd?: string
		globalCustomInstructions?: string
		language?: string
	},
): Promise<ModeConfig> {
	// First get the base mode config from custom modes or built-in modes
	const baseMode = getModeBySlug(modeSlug, customModes) || modes.find((m) => m.slug === modeSlug) || modes[0]

	// Check for any prompt component overrides
	const promptComponent = customModePrompts?.[modeSlug]

	// Get the base custom instructions
	const baseCustomInstructions = promptComponent?.customInstructions || baseMode.customInstructions || ""
	const baseWhenToUse = promptComponent?.whenToUse || baseMode.whenToUse || ""

	// If we have cwd, load and combine all custom instructions
	let fullCustomInstructions = baseCustomInstructions
	if (options?.cwd) {
		fullCustomInstructions = await addCustomInstructions(
			baseCustomInstructions,
			options.globalCustomInstructions || "",
			options.cwd,
			modeSlug,
			{ language: options.language },
		)
	}

	// Return mode with any overrides applied
	return {
		...baseMode,
		roleDefinition: promptComponent?.roleDefinition || baseMode.roleDefinition,
		whenToUse: baseWhenToUse,
		customInstructions: fullCustomInstructions,
	}
}

// Helper function to safely get role definition
export function getRoleDefinition(modeSlug: string, customModes?: ModeConfig[]): string {
	const mode = getModeBySlug(modeSlug, customModes)
	if (!mode) {
		console.warn(`No mode found for slug: ${modeSlug}`)
		return ""
	}
	return mode.roleDefinition
}

// Helper function to safely get whenToUse
export function getWhenToUse(modeSlug: string, customModes?: ModeConfig[]): string {
	const mode = getModeBySlug(modeSlug, customModes)
	if (!mode) {
		console.warn(`No mode found for slug: ${modeSlug}`)
		return ""
	}
	return mode.whenToUse ?? ""
}

// Helper function to safely get custom instructions
export function getCustomInstructions(modeSlug: string, customModes?: ModeConfig[]): string {
	const mode = getModeBySlug(modeSlug, customModes)
	if (!mode) {
		console.warn(`No mode found for slug: ${modeSlug}`)
		return ""
	}
	return mode.customInstructions ?? ""
}
