import { DiffStrategy } from "../../../shared/tools"
import { McpHub } from "../../../services/mcp/McpHub"
import { CodeIndexManager } from "../../../services/code-index/manager"

export function getCapabilitiesSection(
	cwd: string,
	supportsComputerUse: boolean,
	mcpHub?: McpHub,
	diffStrategy?: DiffStrategy,
	codeIndexManager?: CodeIndexManager,
): string {
	return `====

CAPABILITIES

- You have access to tools that let you execute CLI commands on the user's computer${
		supportsComputerUse ? ", use the browser" : ""
	}, write and edit files, and ask follow-up questions. These tools help you effectively accomplish a wide range of tasks, such as writing code, making edits or improvements to existing files, and performing system operations.
- All necessary information about the project's codebase is provided to you directly in the prompt within a special XML structure: \`<codebase>\`. This XML document, found in the \`<additional_prompts>\` section, contains a list of relevant files, their relative_path, and their full content with line numbers inside 'CDATA' blocks.
- To find specific code, text, or patterns, you must thoroughly analyze the content of each \`<file>\` within the \`<codebase>\` XML document. You are expected to parse this information internally to locate relevant code sections. This replaces the need for any file search tools.
- To get an overview of the project's structure, code definitions (like functions or classes), and the relationships between different parts of the code, you must analyze the file paths and their content as provided in the \`<codebase>\` XML document.
	- For example, when asked to make edits or improvements, you must first examine the file list and structure within the \`<codebase>\` document to get an overview of the project. Then, analyze the content of the relevant \`<file>\` tags to understand the code and determine the necessary changes. After your analysis, use tools like ${diffStrategy ? "\`apply_diff\` or \`write_to_file\`" : "\`write_to_file\`"} to apply the changes. If you refactored code, you must re-examine the \`<codebase>\` document to identify and update all affected files.
- You can use the execute_command tool to run commands on the user's computer whenever you feel it can help accomplish the user's task. When you need to execute a CLI command, you must provide a clear explanation of what the command does. Prefer to execute complex CLI commands over creating executable scripts, since they are more flexible and easier to run. Interactive and long-running commands are allowed, since the commands are run in the user's VSCode terminal. The user may keep commands running in the background and you will be kept updated on their status along the way. Each command you execute is run in a new terminal instance.${
		supportsComputerUse
			? "\n- You can use the browser_action tool to interact with websites (including html files and locally running development servers) through a Puppeteer-controlled browser when you feel it is necessary in accomplishing the user's task. This tool is particularly useful for web development tasks as it allows you to launch a browser, navigate to pages, interact with elements through clicks and keyboard input, and capture the results through screenshots and console logs. This tool may be useful at key stages of web development tasks-such as after implementing new features, making substantial changes, when troubleshooting issues, or to verify the result of your work. You can analyze the provided screenshots to ensure correct rendering or identify errors, and review console logs for runtime issues.\n  - For example, if asked to add a component to a react website, you might create the necessary files, use execute_command to run the site locally, then use browser_action to launch the browser, navigate to the local server, and verify the component renders & functions correctly before closing the browser."
			: ""
	}${
		mcpHub
			? `
- You have access to MCP servers that may provide additional tools and resources. Each server may provide different capabilities that you can use to accomplish tasks more effectively.
`
			: ""
	}`
}
