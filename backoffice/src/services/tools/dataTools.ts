/**
 * Data Tools - Smart tools for fetching, filtering, grouping, and analyzing data
 */

import { ToolDefinition } from '../../types/aiAssistant';
import endpoints from '../apiEndpoints.json';
import { apiClient } from '../../common';

/**
 * Get data from any endpoint with optional filtering
 */
export const getDataTool: ToolDefinition = {
  name: 'get_data',
  description: 'Get information from the system (orders, products, invoices, partners, inventory, statistics). Can filter by date, status, customer, etc.',
  category: 'read',

  parameters: {
    type: 'object',
    properties: {
      module: {
        type: 'string',
        description: 'Data module to query',
        enum: ['orders', 'products', 'partners', 'invoices', 'quotes', 'statistics', 'inventory', 'payments', 'notifications'],
      },
      action: {
        type: 'string',
        description: 'Specific action/endpoint',
        enum: ['list', 'stats', 'analytics', 'dashboard', 'filter', 'findAll'],
      },
      filters: {
        type: 'object',
        description: 'Optional filters (startDate, endDate, status, customerId, etc.)',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          status: { type: 'string' },
          customerId: { type: 'number' },
          supplierId: { type: 'number' },
          deliveryStatus: { type: 'string' },
          direction: { type: 'string', enum: ['vente', 'achat'] },
        },
      },
      pagination: {
        type: 'object',
        description: 'Pagination options',
        properties: {
          page: { type: 'number' },
          pageSize: { type: 'number' },
          limit: { type: 'number' },
        },
      },
    },
    required: ['module'],
  },

  permissions: {
    requiresAuth: true,
    minimumRole: 'user',
    requiresConfirmation: false,
    rateLimitPerMinute: 30,
  },

  handler: async (params, context) => {
    try {
      const { module, action = 'findAll', filters = {}, pagination = {} } = params;

      // Build endpoint path
      let endpoint = '';
      let method = 'GET';
      let body: any = null;

      // Map module/action to actual endpoint
      switch (module) {
        case 'orders':
          if (action === 'stats' || action === 'analytics') {
            endpoint = `/orders/analytics/${filters.direction || 'vente'}`;
          } else if (action === 'filter') {
            endpoint = '/orders/filter';
            method = 'POST';
            body = { ...filters, ...pagination };
          } else {
            endpoint = '/orders';
          }
          break;

        case 'products':
          if (action === 'filter') {
            endpoint = '/products/filter';
            method = 'POST';
            body = { ...filters, ...pagination };
          } else {
            endpoint = '/products';
          }
          break;

        case 'partners':
          if (action === 'dashboard') {
            endpoint = filters.supplierId
              ? '/partners/dashboard/suppliers'
              : '/partners/dashboard/customers';
          } else {
            endpoint = '/partners';
          }
          break;

        case 'invoices':
          if (action === 'analytics') {
            endpoint = `/invoices/analytics/${filters.direction || 'vente'}`;
          } else {
            endpoint = '/invoices/list';
            method = 'POST';
            body = { ...filters, ...pagination };
          }
          break;

        case 'quotes':
          if (action === 'analytics') {
            endpoint = `/quotes/analytics/${filters.direction || 'vente'}`;
          } else {
            endpoint = '/quotes/list';
            method = 'POST';
            body = { ...filters, ...pagination };
          }
          break;

        case 'statistics':
          if (action === 'orders') {
            endpoint = '/statistics/orders';
          } else if (action === 'daily') {
            endpoint = '/statistics/daily';
          } else {
            endpoint = '/statistics';
          }
          break;

        case 'inventory':
          endpoint = '/inventory/stock';
          if (action === 'low') {
            endpoint = '/inventory/stock/low';
          }
          break;

        default:
          return {
            tool_call_id: '',
            content: JSON.stringify({ error: `Unknown module: ${module}` }),
            success: false,
          };
      }

      // Add query parameters for GET requests
      const queryParams = new URLSearchParams();
      if (method === 'GET' && Object.keys(filters).length > 0) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }
      if (method === 'GET' && Object.keys(pagination).length > 0) {
        Object.entries(pagination).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
      }

      const queryString = queryParams.toString();
      const fullUrl = `/api${endpoint}${queryString ? `?${queryString}` : ''}`;

      // Execute API call with auth and the custom tool-execution marker
      const toolConfig = { headers: { 'X-Tool-Execution': 'true' } };
      const data = method === 'GET'
        ? await apiClient.get<any>(fullUrl, toolConfig)
        : await apiClient.post<any>(fullUrl, body, toolConfig);

      return {
        tool_call_id: '',
        content: JSON.stringify(data),
        success: true,
      };
    } catch (error) {
      return {
        tool_call_id: '',
        content: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        success: false,
      };
    }
  },

  validator: (params) => {
    if (!params.module) {
      return { valid: false, error: 'Module is required' };
    }

    const validModules = ['orders', 'products', 'partners', 'invoices', 'quotes', 'statistics', 'inventory', 'payments', 'notifications'];
    if (!validModules.includes(params.module)) {
      return { valid: false, error: `Invalid module. Must be one of: ${validModules.join(', ')}` };
    }

    return { valid: true };
  },
};

/**
 * Aggregate and analyze data across multiple time periods or categories
 */
export const aggregateDataTool: ToolDefinition = {
  name: 'aggregate_data',
  description: 'Calculate totals, averages, counts, or group data by category (e.g., count orders by status, sum revenue by month, etc.)',
  category: 'analyze',

  parameters: {
    type: 'object',
    properties: {
      module: {
        type: 'string',
        description: 'Data module to aggregate',
        enum: ['orders', 'invoices', 'products', 'partners'],
      },
      operation: {
        type: 'string',
        description: 'Aggregation operation',
        enum: ['count', 'sum', 'average', 'min', 'max', 'group_by'],
      },
      field: {
        type: 'string',
        description: 'Field to aggregate (totalAmount, quantity, etc.)',
      },
      groupBy: {
        type: 'string',
        description: 'Field to group by (status, customerId, productId, month, etc.)',
      },
      filters: {
        type: 'object',
        description: 'Filters to apply before aggregation',
      },
    },
    required: ['module', 'operation'],
  },

  permissions: {
    requiresAuth: true,
    minimumRole: 'user',
    requiresConfirmation: false,
    rateLimitPerMinute: 20,
  },

  handler: async (params, context) => {
    try {
      // First fetch the raw data
      const dataResponse = await getDataTool.handler(
        { module: params.module, filters: params.filters },
        context
      );

      if (!dataResponse.success) {
        return dataResponse;
      }

      const responseData = JSON.parse(dataResponse.content);
      const items = responseData.data || [];

      // Perform aggregation based on operation
      let result: any = {};

      switch (params.operation) {
        case 'count':
          result = { count: items.length };
          break;

        case 'sum':
          if (!params.field) {
            return {
              tool_call_id: '',
              content: JSON.stringify({ error: 'Field is required for sum operation' }),
              success: false,
            };
          }
          result = {
            sum: items.reduce((acc: number, item: any) => acc + (parseFloat(item[params.field]) || 0), 0),
          };
          break;

        case 'average': {
          if (!params.field) {
            return {
              tool_call_id: '',
              content: JSON.stringify({ error: 'Field is required for average operation' }),
              success: false,
            };
          }
          const sum = items.reduce((acc: number, item: any) => acc + (parseFloat(item[params.field]) || 0), 0);
          result = { average: items.length > 0 ? sum / items.length : 0 };
          break;
        }

        case 'group_by': {
          if (!params.groupBy) {
            return {
              tool_call_id: '',
              content: JSON.stringify({ error: 'groupBy field is required' }),
              success: false,
            };
          }
          const groups: Record<string, any[]> = {};
          items.forEach((item: any) => {
            const key = item[params.groupBy] || 'null';
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
          });
          result = {
            groups: Object.entries(groups).map(([key, values]) => ({
              [params.groupBy]: key,
              count: values.length,
              items: values.length <= 5 ? values : values.slice(0, 5), // Limit items
            })),
          };
          break;
        }

        default:
          return {
            tool_call_id: '',
            content: JSON.stringify({ error: `Unknown operation: ${params.operation}` }),
            success: false,
          };
      }

      return {
        tool_call_id: '',
        content: JSON.stringify(result),
        success: true,
      };
    } catch (error) {
      return {
        tool_call_id: '',
        content: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        success: false,
      };
    }
  },
};
