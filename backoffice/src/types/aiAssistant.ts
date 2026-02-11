/**
 * AI Assistant Type Definitions
 * Core types for Ollama-powered AI assistant with tool calling capabilities
 */

// ============ Ollama Message Types ============

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
}

export interface ToolCall {
  id: string;
  type?: 'function';
  function: {
    index?: number;
    name: string;
    arguments: string | Record<string, any>; // JSON string or object
  };
}

export interface ToolResult {
  tool_call_id: string;
  content: string; // JSON string or plain text
  success: boolean;
}

export interface StreamChunk {
  model: string;
  created_at: string;
  message: {
    role: 'assistant';
    content: string;
    tool_calls?: ToolCall[];
  };
  done: boolean;
}

export interface ChatStreamOptions {
  messages: OllamaChatMessage[];
  model?: string;
  temperature?: number;
  tools?: any[]; // Tool definitions in Ollama format
  signal?: AbortSignal;
  onChunk: (text: string) => void;
  onToolCall?: (toolCall: ToolCall) => Promise<ToolResult>;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

// ============ Tool Definition Types ============

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'read' | 'write' | 'analyze';
  
  // JSON schema for parameters
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  
  // Permissions and safety
  permissions: {
    requiresAuth: boolean;
    minimumRole?: 'user' | 'admin' | 'superadmin';
    allowedModules?: string[]; // e.g., ['inventory', 'orders']
    requiresConfirmation: boolean; // For write operations
    rateLimitPerMinute?: number;
  };
  
  // Execution
  handler: (params: any, context: AppContext) => Promise<ToolResult>;
  
  // Validation
  validator?: (params: any) => { valid: boolean; error?: string };
  
  // Rollback (for write operations)
  rollback?: (params: any, context: AppContext) => Promise<void>;
}

export interface AppContext {
  userId: string;
  userRole: string;
  currentRoute: string;
  selectedElements?: string[];
  sessionId: string;
  timestamp: number;
  sessionToken?: string;
}

export interface ToolExecutionLog {
  id: string;
  toolName: string;
  parameters: any;
  result: ToolResult;
  context: AppContext;
  timestamp: number;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
}

// ============ Permission Types ============

export interface PermissionPolicy {
  rolePermissions: {
    user: {
      allowedCategories: Array<'read' | 'analyze'>;
      deniedTools: string[];
    };
    admin: {
      allowedCategories: Array<'read' | 'write' | 'analyze'>;
      deniedTools: string[];
    };
    superadmin: {
      allowedCategories: Array<'read' | 'write' | 'analyze'>;
      deniedTools: string[];
    };
  };

  confirmationRequired: {
    categories: Array<'write'>;
    specificTools: string[];
    threshold?: {
      maxRecordsAffected: number;
      maxMonetaryValue: number;
    };
  };

  explanationRequired: {
    categories: Array<'write'>;
    mustInclude: string[];
  };

  globalRateLimits: {
    perUser: { requestsPerMinute: number; requestsPerHour: number };
    perTool: { executionsPerMinute: number };
  };
}

export interface ConfirmationRequest {
  id: string;
  toolCall: ToolCall;
  tool: ToolDefinition;
  params: any;
  context: AppContext;
  impact: ImpactAnalysis;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected' | 'timeout';
  resolvedAt?: number;
  userNote?: string;
}

export interface ImpactAnalysis {
  description: string;
  recordsAffected: number;
  dataModified: string[]; // Table/collection names
  rollbackAvailable: boolean;
  estimatedRisk: 'low' | 'medium' | 'high';
  affectedUsers?: string[];
  monetaryImpact?: number;
}

// ============ App Context Types ============

export interface SafeAppContext {
  user: {
    id: string;
    role: string;
    displayName: string;
    permissions: string[];
  };
  
  navigation: {
    currentRoute: string;
    moduleName: string;
    pageTitle: string;
    breadcrumbs: string[];
  };
  
  selection: {
    type: 'text' | 'item' | 'record' | 'none';
    value?: string;
    metadata?: Record<string, any>;
  };
  
  recentErrors: {
    timestamp: number;
    message: string;
    component: string;
    severity: 'error' | 'warning';
  }[];
  
  recentApiCalls: {
    endpoint: string;
    method: string;
    status: number;
    timestamp: number;
    responseSummary?: string;
  }[];
  
  appState: {
    theme: 'light' | 'dark';
    language: string;
    activeFilters?: Record<string, any>;
    activePage?: number;
  };
}

// ============ Audit Types ============

export interface AuditEvent {
  id: string;
  type: 'tool_execution' | 'confirmation' | 'user_message' | 'agent_response' | 'error';
  timestamp: number;
  userId: string;
  sessionId: string;
  
  data: {
    toolName?: string;
    parameters?: any;
    result?: any;
    confirmationDecision?: 'approved' | 'rejected';
    errorMessage?: string;
    messageContent?: string;
  };
  
  context: {
    route: string;
    userAgent: string;
    ipAddress: string;
  };
  
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flagged: boolean;
  flagReason?: string;
}

// ============ UI State Types ============

export type PanelState = 'closed' | 'minimized' | 'open' | 'expanded';

export type MessageStatus = 
  | 'pending' 
  | 'streaming' 
  | 'complete' 
  | 'error' 
  | 'tool-pending' 
  | 'tool-complete' 
  | 'awaiting-confirmation';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  status: MessageStatus;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  error?: string;
}

export interface AssistantPreferences {
  panelState: PanelState;
  position: { x: number; y: number };
  size: { width: number; height: number };
  model: string;
  temperature: number;
}

// ============ Constants ============

export const OLLAMA_BASE_URL = 'http://localhost:11434';
export const DEFAULT_MODEL = 'llama3.2';
export const REQUEST_TIMEOUT = 30000; // 30 seconds
export const MAX_RETRIES = 2;
export const MAX_MESSAGE_HISTORY = 50;
