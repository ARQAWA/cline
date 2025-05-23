import {getShell} from "@utils/shell"
import os from "os"
import osName from "os-name"
import {McpHub} from "@services/mcp/McpHub"
import {BrowserSettings} from "@shared/BrowserSettings"
import * as fs from 'fs';
import * as path from 'path';

export const SYSTEM_PROMPT = async (
    cwd: string,
    supportsBrowserUse: boolean,
    mcpHub: McpHub,
    browserSettings: BrowserSettings,
	isClaude4ModelFamily: boolean = false,
): Promise<string> => {

    const DIR = path.join(cwd.toPosix(), '.ass', 'system_parts')
    const MAIN_SYSTEM_PROMPT_TEMPLATE = fs.readFileSync(path.join(DIR, 'system.txt'), 'utf8');
    const BROWSER_TOOL_DEFINITION_XML = fs.readFileSync(path.join(DIR, 'browser_tool.txt'), 'utf8');
    const BROWSER_CAPABILITIES_SUMMARY_EXTENSION_XML = fs.readFileSync(path.join(DIR, 'browser_capabilities.txt'), 'utf8');
    const BROWSER_USAGE_NOTES_XML = fs.readFileSync(path.join(DIR, 'browser_usage.txt'), 'utf8');
    const BROWSER_CBR_RULE_XML = fs.readFileSync(path.join(DIR, 'browser_cbr_rule.txt'), 'utf8');
    const BROWSER_ITERATIVE_CONFIRMATION_EXTENSION_XML = fs.readFileSync(path.join(DIR, 'browser_iterative_confirmation.txt'), 'utf8');
    const CODEBASE_XML = fs.readFileSync(path.join(cwd.toPosix(), 'codebase.xml'), 'utf8');

    let prompt = MAIN_SYSTEM_PROMPT_TEMPLATE;

    // Replace general placeholders
    prompt = prompt.replace(/__CWD_POSIX__/g, escapeXml(cwd.toPosix()));
    prompt = prompt.replace(/__OS_NAME__/g, escapeXml(osName()));
    prompt = prompt.replace(/__SHELL_NAME__/g, escapeXml(getShell()));
    prompt = prompt.replace(/__HOME_DIR_POSIX__/g, escapeXml(os.homedir().toPosix()));

    // MCP Servers
    const mcpServersListXml = generateMcpServersListXml(mcpHub);
    prompt = prompt.replace('__MCP_SERVERS_LIST_XML_PLACEHOLDER__', mcpServersListXml);

    // Browser features
    if (supportsBrowserUse) {
        let browserToolDef = BROWSER_TOOL_DEFINITION_XML;
        browserToolDef = browserToolDef.replace(/__BROWSER_VIEWPORT_WIDTH__/g, browserSettings.viewport.width.toString());
        browserToolDef = browserToolDef.replace(/__BROWSER_VIEWPORT_HEIGHT__/g, browserSettings.viewport.height.toString());
        prompt = prompt.replace('__BROWSER_TOOL_DEFINITION_PLACEHOLDER__', browserToolDef);

        prompt = prompt.replace('__BROWSER_CAPABILITIES_SUMMARY_EXTENSION_PLACEHOLDER__', BROWSER_CAPABILITIES_SUMMARY_EXTENSION_XML);
        prompt = prompt.replace('__BROWSER_USAGE_NOTES_PLACEHOLDER__', BROWSER_USAGE_NOTES_XML);
        prompt = prompt.replace('__BROWSER_CBR_RULE_PLACEHOLDER__', BROWSER_CBR_RULE_XML);
        prompt = prompt.replace('__BROWSER_ITERATIVE_CONFIRMATION_EXTENSION_PLACEHOLDER__', BROWSER_ITERATIVE_CONFIRMATION_EXTENSION_XML);
    } else {
        prompt = prompt.replace('__BROWSER_TOOL_DEFINITION_PLACEHOLDER__', '');
        prompt = prompt.replace('__BROWSER_CAPABILITIES_SUMMARY_EXTENSION_PLACEHOLDER__', '');
        prompt = prompt.replace('__BROWSER_USAGE_NOTES_PLACEHOLDER__', '');
        prompt = prompt.replace('__BROWSER_CBR_RULE_PLACEHOLDER__', '');
        prompt = prompt.replace('__BROWSER_ITERATIVE_CONFIRMATION_EXTENSION_PLACEHOLDER__', '');
    }

    return `${prompt}\n${CODEBASE_XML}`;
};

export function addUserInstructions(
    _settingsCustomInstructions?: string,
    _globalClineRulesFileInstructions?: string,
    _localClineRulesFileInstructions?: string,
    _localCursorRulesFileInstructions?: string,
    _localCursorRulesDirInstructions?: string,
    _localWindsurfRulesFileInstructions?: string,
    _clineIgnoreInstructions?: string,
    _preferredLanguageInstructions?: string,
) {
    return ""
}

function escapeXml(unsafe: string | undefined): string {
    if (typeof unsafe !== 'string') {
        return '';
    }
    return unsafe.replace(/[<>&'"\\]/g, (match) => {
        switch (match) {
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case "&":
                return "&amp;";
            case "'":
                return "&apos;";
            case '"':
                return "&quot;";
            // Note: Backslash is not typically escaped in XML content,
            // but if it's intended for specific downstream processing, it can be kept.
            // For standard XML, it's not necessary.
            // case "\\":
            //     return "&#92;";
            default:
                return match;
        }
    });
}

function generateMcpServersListXml(mcpHub: McpHub): string {
    const servers = mcpHub.getServers().filter((server) => server.status === "connected");
    if (servers.length === 0) {
        return "    <no_mcp_servers_connected_message>No MCP servers currently connected</no_mcp_servers_connected_message>";
    }

    return servers.map((server) => {
        const config = JSON.parse(server.config);
        const commandLine = `${config.command}${config.args && Array.isArray(config.args) ? ` ${config.args.join(" ")}` : ""}`;

        const toolsXml = server.tools
            ?.map((tool) => {
                const schemaStr = tool.inputSchema
                    ? `    <input_schema><![CDATA[\n${JSON.stringify(tool.inputSchema, null, 2)}\n    ]]></input_schema>`
                    : "";
                return `
        <tool name="${escapeXml(tool.name)}">
            <description>${escapeXml(tool.description)}</description>
${schemaStr}
        </tool>`;
            })
            .join("\n") || "";

        const templatesXml = server.resourceTemplates
            ?.map((template) => `
        <resource_template uri_template="${escapeXml(template.uriTemplate)}" name="${escapeXml(template.name)}">
            <description>${escapeXml(template.description)}</description>
        </resource_template>`)
            .join("\n") || "";

        const resourcesXml = server.resources
            ?.map((resource) => `
        <direct_resource uri="${escapeXml(resource.uri)}" name="${escapeXml(resource.name)}">
            <description>${escapeXml(resource.description)}</description>
        </direct_resource>`)
            .join("\n") || "";
You accomplish a given task iteratively, breaking it down into clear steps and working through them methodically.

1. Analyze the user's task and set clear, achievable goals to accomplish it. Prioritize these goals in a logical order.
2. Work through these goals sequentially, utilizing available tools one at a time as necessary. Each goal should correspond to a distinct step in your problem-solving process. You will be informed on the work completed and what's remaining as you go.
3. Remember, you have extensive capabilities with access to a wide range of tools that can be used in powerful and clever ways as necessary to accomplish each goal. Before calling a tool, do some analysis within <thinking></thinking> tags. First, analyze the file structure provided in environment_details to gain context and insights for proceeding effectively. Then, think about which of the provided tools is the most relevant tool to accomplish the user's task. Next, go through each of the required parameters of the relevant tool and determine if the user has directly provided or given enough information to infer a value. When deciding if the parameter can be inferred, carefully consider all the context to see if it supports a specific value. If all of the required parameters are present or can be reasonably inferred, close the thinking tag and proceed with the tool use. BUT, if one of the values for a required parameter is missing, DO NOT invoke the tool (not even with fillers for the missing params) and instead, ask the user to provide the missing parameters using the ask_followup_question tool. DO NOT ask for more information on optional parameters if it is not provided.
4. Once you've completed the user's task, you must use the attempt_completion tool to present the result of the task to the user. You may also provide a CLI command to showcase the result of your task; this can be particularly useful for web development tasks, where you can run e.g. \`open index.html\` to show the website you've built.
5. The user may provide feedback, which you can use to make improvements and try again. But DO NOT continue in pointless back and forth conversations, i.e. don't end your responses with questions or offers for further assistance.`
	}
}

export function addUserInstructions(
	settingsCustomInstructions?: string,
	globalClineRulesFileInstructions?: string,
	localClineRulesFileInstructions?: string,
	localCursorRulesFileInstructions?: string,
	localCursorRulesDirInstructions?: string,
	localWindsurfRulesFileInstructions?: string,
	clineIgnoreInstructions?: string,
	preferredLanguageInstructions?: string,
) {
	let customInstructions = ""
	if (preferredLanguageInstructions) {
		customInstructions += preferredLanguageInstructions + "\n\n"
	}
	if (settingsCustomInstructions) {
		customInstructions += settingsCustomInstructions + "\n\n"
	}
	if (globalClineRulesFileInstructions) {
		customInstructions += globalClineRulesFileInstructions + "\n\n"
	}
	if (localClineRulesFileInstructions) {
		customInstructions += localClineRulesFileInstructions + "\n\n"
	}
	if (localCursorRulesFileInstructions) {
		customInstructions += localCursorRulesFileInstructions + "\n\n"
	}
	if (localCursorRulesDirInstructions) {
		customInstructions += localCursorRulesDirInstructions + "\n\n"
	}
	if (localWindsurfRulesFileInstructions) {
		customInstructions += localWindsurfRulesFileInstructions + "\n\n"
	}
	if (clineIgnoreInstructions) {
		customInstructions += clineIgnoreInstructions
	}

        return `
    <mcp_server name="${escapeXml(server.name)}" command_line_invocation="${escapeXml(commandLine)}">
        ${toolsXml ? `<available_tools>${toolsXml}\n    </available_tools>` : ""}
        ${templatesXml ? `<resource_templates>${templatesXml}\n    </resource_templates>` : ""}
        ${resourcesXml ? `<direct_resources>${resourcesXml}\n    </direct_resources>` : ""}
    </mcp_server>`;
    }).join("\n");
}
