/**
 * System Message Builder
 * Constructs system prompts with app context for the AI assistant
 */

import { SafeAppContext, ToolDefinition } from '../types/aiAssistant';

export class SystemMessageBuilder {
  /**
   * Build system message with app context for Ollama
   */
  static build(context: SafeAppContext, availableTools: ToolDefinition[]): string {
    return `You are a helpful assistant for the Morocom business management system. You help users manage their inventory, orders, products, invoices, and customers.

CURRENT CONTEXT:
- User: ${context.user.displayName} (${context.user.role})
- Current page: ${context.navigation.pageTitle}
- You're in the: ${context.navigation.moduleName} section

AVAILABLE ACTIONS:
${this.formatToolsForPrompt(availableTools)}

SELECTION:
${this.formatSelection(context.selection)}

COMMUNICATION STYLE:
- Speak naturally and conversationally, like a helpful colleague
- NEVER use technical terms like "API", "JSON", "TypeScript", "JavaScript", "array", "object", "endpoint"
- Give direct answers, not technical explanations
- Examples:
  ✅ Good: "You have 31 orders"
  ❌ Bad: "The orders array contains 31 elements"
  ✅ Good: "Your total revenue this month is $12,450"
  ❌ Bad: "The sum of the totalAmount field in the JSON response is 12450"

RESPONSE FORMAT:
- Answer questions directly and concisely
- Use business language, not developer language
- When showing data, present it clearly (like a table or bullet list)
- If you need more information to answer, ask the user
- For numbers, use proper formatting with commas and currency symbols

GUIDELINES:
1. Use your tools to get real data from the system
2. For write operations (creating, updating, deleting), explain what will happen and ask for confirmation
3. Never guess numbers or make up data - always fetch actual information
4. If something fails, suggest what the user can try instead

SAFETY RULES:
- Viewing data: Always safe, answer freely
- Changing data: Explain the impact clearly before proceeding
- Deleting things: Always warn and require explicit confirmation
- If asked to do something risky, politely explain why it's not safe

Your goal: Help the user accomplish their task quickly and clearly.`;
  }

  private static formatToolsForPrompt(tools: ToolDefinition[]): string {
    if (tools.length === 0) {
      return '(No actions currently available)';
    }

    return tools
      .map((tool) => {
        const params = Object.keys(tool.parameters.properties).join(', ');
        const category = tool.category === 'write' ? '[Can modify data]' : '[View only]';
        return `- ${category} ${tool.name}: ${tool.description}`;
      })
      .join('\n');
  }

  private static formatSelection(selection: SafeAppContext['selection']): string {
    if (selection.type === 'none') {
      return 'No selection';
    }

    if (selection.type === 'text') {
      return `Selected text: "${selection.value}"`;
    }

    if (selection.type === 'item') {
      return `Selected item: ${selection.value} (${selection.metadata?.itemType})`;
    }

    return 'Unknown selection';
  }

  private static formatRecentActivity(context: SafeAppContext): string {
    const errors = context.recentErrors
      .map((err) => `- [${err.severity}] ${err.component}: ${err.message}`)
      .join('\n');

    const apiCalls = context.recentApiCalls
      .map((call) => `- ${call.method} ${call.endpoint} → ${call.status}`)
      .join('\n');

    return `Errors:\n${errors || '(none)'}\n\nAPI Calls:\n${apiCalls || '(none)'}`;
  }
}
