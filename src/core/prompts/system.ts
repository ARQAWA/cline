import {getShell} from "@utils/shell"
import os from "os"
import osName from "os-name"
import {McpHub} from "@services/mcp/McpHub"
import {BrowserSettings} from "@shared/BrowserSettings"
import * as fs from 'fs';
import * as path from 'path';
import { execa } from "@packages/execa";

export const SYSTEM_PROMPT = async (
    cwd: string,
    supportsBrowserUse: boolean,
    mcpHub: McpHub,
    browserSettings: BrowserSettings,
	_isClaude4ModelFamily: boolean = false,
): Promise<string> => {

    await execa("python3", [".ass/codegen.py"], { cwd });
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

        return `
    <mcp_server name="${escapeXml(server.name)}" command_line_invocation="${escapeXml(commandLine)}">
        ${toolsXml ? `<available_tools>${toolsXml}\n    </available_tools>` : ""}
        ${templatesXml ? `<resource_templates>${templatesXml}\n    </resource_templates>` : ""}
        ${resourcesXml ? `<direct_resources>${resourcesXml}\n    </direct_resources>` : ""}
    </mcp_server>`;
    }).join("\n");
}
