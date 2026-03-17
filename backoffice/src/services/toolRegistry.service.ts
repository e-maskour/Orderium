/**
 * Tool Registry
 * Manages tool definitions, permissions, and execution with safety checks
 */

import {
  ToolDefinition,
  ToolCall,
  ToolResult,
  AppContext,
  ToolExecutionLog,
} from '../types/aiAssistant';

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private executionLogs: ToolExecutionLog[] = [];
  private rateLimitTracking: Map<string, number[]> = new Map();
  private readonly MAX_LOGS = 1000;

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    // Register built-in tools here
    // We'll add specific tools in separate files
  }

  /**
   * Register a new tool
   */
  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get tool by name
   */
  getToolByName(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools accessible by user (filtered by permissions)
   */
  getToolsForUser(context: AppContext): ToolDefinition[] {
    return this.getAllTools().filter(tool => {
      const permCheck = this.checkPermissions(tool, context);
      return permCheck.allowed;
    });
  }

  /**
   * Execute a tool with full safety checks
   */
  async execute(
    toolCall: ToolCall,
    context: AppContext
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const tool = this.tools.get(toolCall.function.name);

    if (!tool) {
      return this.createErrorResult(toolCall.id, `Unknown tool: ${toolCall.function.name}`);
    }

    // Parse arguments (handle both string and object)
    let params: any;
    try {
      params = typeof toolCall.function.arguments === 'string'
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch {
      return this.createErrorResult(toolCall.id, 'Invalid JSON arguments');
    }

    // Validate parameters against schema
    if (tool.validator) {
      const validation = tool.validator(params);
      if (!validation.valid) {
        return this.createErrorResult(toolCall.id, validation.error || 'Validation failed');
      }
    }

    // Check permissions
    const permCheck = this.checkPermissions(tool, context);
    if (!permCheck.allowed) {
      return this.createErrorResult(toolCall.id, permCheck.reason!);
    }

    // Rate limiting
    if (!this.checkRateLimit(tool, context)) {
      return this.createErrorResult(toolCall.id, 'Rate limit exceeded');
    }

    // Execute tool
    try {
      const result = await tool.handler(params, context);
      result.tool_call_id = toolCall.id;

      // Log execution
      this.logExecution({
        id: crypto.randomUUID(),
        toolName: tool.name,
        parameters: params,
        result,
        context,
        timestamp: Date.now(),
        durationMs: Date.now() - startTime,
        success: result.success,
      });

      return result;

    } catch (error) {
      const errorResult = this.createErrorResult(
        toolCall.id,
        error instanceof Error ? error.message : 'Unknown error'
      );

      this.logExecution({
        id: crypto.randomUUID(),
        toolName: tool.name,
        parameters: params,
        result: errorResult,
        context,
        timestamp: Date.now(),
        durationMs: Date.now() - startTime,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown',
      });

      return errorResult;
    }
  }

  private checkPermissions(
    tool: ToolDefinition,
    context: AppContext
  ): { allowed: boolean; reason?: string } {
    const { permissions } = tool;

    if (permissions.requiresAuth && !context.userId) {
      return { allowed: false, reason: 'Authentication required' };
    }

    if (permissions.minimumRole) {
      const roleHierarchy = { user: 0, admin: 1, superadmin: 2 };
      const requiredLevel = roleHierarchy[permissions.minimumRole] || 0;
      const userLevel = roleHierarchy[context.userRole as keyof typeof roleHierarchy] || 0;

      if (userLevel < requiredLevel) {
        return { allowed: false, reason: `Requires ${permissions.minimumRole} role` };
      }
    }

    if (permissions.allowedModules) {
      const currentModule = this.extractModuleFromRoute(context.currentRoute);
      if (!permissions.allowedModules.includes(currentModule)) {
        return { allowed: false, reason: `Not allowed in ${currentModule} module` };
      }
    }

    return { allowed: true };
  }

  private checkRateLimit(tool: ToolDefinition, context: AppContext): boolean {
    if (!tool.permissions.rateLimitPerMinute) return true;

    const key = `${context.userId}:${tool.name}`;
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Get recent executions
    const recent = this.rateLimitTracking.get(key) || [];
    const filtered = recent.filter(ts => ts > oneMinuteAgo);

    if (filtered.length >= tool.permissions.rateLimitPerMinute) {
      return false;
    }

    // Track this execution
    filtered.push(now);
    this.rateLimitTracking.set(key, filtered);
    return true;
  }

  private extractModuleFromRoute(route: string): string {
    // Extract module from route like '/inventory/items' → 'inventory'
    const match = route.match(/^\/([^/]+)/);
    return match ? match[1] : 'unknown';
  }

  private createErrorResult(toolCallId: string, error: string): ToolResult {
    return {
      tool_call_id: toolCallId,
      content: JSON.stringify({ error }),
      success: false,
    };
  }

  private logExecution(log: ToolExecutionLog): void {
    this.executionLogs.push(log);

    // Keep last N logs
    if (this.executionLogs.length > this.MAX_LOGS) {
      this.executionLogs.shift();
    }

    // Store in localStorage for persistence
    this.persistToLocalStorage(log).catch(err => {
      console.error('Failed to persist audit log:', err);
    });
  }

  private async persistToLocalStorage(log: ToolExecutionLog): Promise<void> {
    try {
      const stored = localStorage.getItem('ai_assistant_audit_logs');
      const logs = stored ? JSON.parse(stored) : [];

      logs.push({
        ...log,
        timestamp: Date.now(),
      });

      // Keep last 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }

      localStorage.setItem('ai_assistant_audit_logs', JSON.stringify(logs));
    } catch (error) {
      // Silent fail - audit logging shouldn't block execution
      console.warn('Failed to persist audit log to localStorage:', error);
    }
  }

  /**
   * Get execution history (for debugging/auditing)
   */
  getExecutionLogs(filter?: { userId?: string; toolName?: string }): ToolExecutionLog[] {
    let logs = this.executionLogs;

    if (filter?.userId) {
      logs = logs.filter(log => log.context.userId === filter.userId);
    }

    if (filter?.toolName) {
      logs = logs.filter(log => log.toolName === filter.toolName);
    }

    return logs;
  }

  /**
   * Clear rate limit tracking (useful for testing)
   */
  clearRateLimits(): void {
    this.rateLimitTracking.clear();
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();
