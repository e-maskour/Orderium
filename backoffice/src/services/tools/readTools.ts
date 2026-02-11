/**
 * Example Read Tools
 * Safe tools that only fetch and analyze data
 */

import { ToolDefinition } from '../../types/aiAssistant';

/**
 * Get current route information
 */
export const getCurrentPageTool: ToolDefinition = {
  name: 'get_current_page',
  description: 'Find out what page or section the user is currently viewing',
  category: 'analyze',

  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },

  permissions: {
    requiresAuth: false,
    requiresConfirmation: false,
    rateLimitPerMinute: 30,
  },

  handler: async (params, context) => {
    return {
      tool_call_id: '',
      content: JSON.stringify({
        route: context.currentRoute,
        module: context.currentRoute.split('/')[1] || 'home',
        pageTitle: document.title,
        timestamp: Date.now(),
      }),
      success: true,
    };
  },
};

/**
 * Analyze current selection
 */
export const analyzeSelectionTool: ToolDefinition = {
  name: 'analyze_selection',
  description: 'Check what text or item the user has selected on the page',
  category: 'analyze',

  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },

  permissions: {
    requiresAuth: false,
    requiresConfirmation: false,
    rateLimitPerMinute: 30,
  },

  handler: async (params, context) => {
    const selection = window.getSelection()?.toString();

    return {
      tool_call_id: '',
      content: JSON.stringify({
        hasSelection: !!selection,
        selectedText: selection?.substring(0, 500),
        selectedElements: context.selectedElements || [],
        timestamp: Date.now(),
      }),
      success: true,
    };
  },
};

// Removed get_app_stats tool - replaced by get_data tool with proper endpoints

/**
 * Search help/documentation
 */
export const searchHelpTool: ToolDefinition = {
  name: 'search_help',
  description: 'Search the help documentation to find instructions or guidance',
  category: 'read',

  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query for help documentation',
      },
    },
    required: ['query'],
  },

  permissions: {
    requiresAuth: false,
    requiresConfirmation: false,
    rateLimitPerMinute: 20,
  },

  handler: async (params, context) => {
    // This would search your documentation
    // For now, return a placeholder
    return {
      tool_call_id: '',
      content: JSON.stringify({
        query: params.query,
        results: [
          {
            title: 'Example Help Article',
            excerpt: 'This is a placeholder for help documentation search.',
            url: '/help/example',
          },
        ],
      }),
      success: true,
    };
  },

  validator: (params) => {
    if (!params.query || params.query.trim().length < 2) {
      return { valid: false, error: 'Query must be at least 2 characters' };
    }
    return { valid: true };
  },
};
