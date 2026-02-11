# Adding Custom Tools to AI Assistant

This guide shows you how to create and register custom tools for the AI assistant.

---

## Tool Structure

Every tool follows this structure:

```typescript
import { ToolDefinition } from '../../types/aiAssistant';

export const myCustomTool: ToolDefinition = {
  // 1. Identity
  name: 'my_tool_name',
  description: 'What this tool does (the AI uses this to decide when to call it)',
  category: 'read', // or 'write' or 'analyze'
  
  // 2. Parameters (JSON Schema)
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'What this parameter is for',
      },
      param2: {
        type: 'number',
        description: 'Another parameter',
      },
    },
    required: ['param1'], // Which params are mandatory
  },
  
  // 3. Permissions & Safety
  permissions: {
    requiresAuth: true,
    minimumRole: 'user', // 'user' | 'admin' | 'superadmin'
    allowedModules: ['inventory'], // Which modules can use this tool
    requiresConfirmation: false, // true for write operations
    rateLimitPerMinute: 30,
  },
  
  // 4. Handler Function
  handler: async (params, context) => {
    // Your logic here
    return {
      tool_call_id: '', // Will be set automatically
      content: JSON.stringify({ result: 'data' }),
      success: true,
    };
  },
  
  // 5. Optional Validator
  validator: (params) => {
    if (!params.param1) {
      return { valid: false, error: 'param1 is required' };
    }
    return { valid: true };
  },
};
```

---

## Example 1: Read Tool (GET Inventory Item)

```typescript
// src/services/tools/inventoryTools.ts

import { ToolDefinition } from '../../types/aiAssistant';

export const getInventoryItemTool: ToolDefinition = {
  name: 'get_inventory_item',
  description: 'Retrieves detailed information about an inventory item by ID',
  category: 'read',

  parameters: {
    type: 'object',
    properties: {
      itemId: {
        type: 'string',
        description: 'The unique identifier of the inventory item',
      },
    },
    required: ['itemId'],
  },

  permissions: {
    requiresAuth: true,
    minimumRole: 'user',
    allowedModules: ['inventory', 'products'],
    requiresConfirmation: false,
    rateLimitPerMinute: 30,
  },

  handler: async (params, context) => {
    try {
      const response = await fetch(`/api/inventory/items/${params.itemId}`, {
        headers: {
          'X-Tool-Execution': 'true',
        },
      });

      if (!response.ok) {
        return {
          tool_call_id: '',
          content: JSON.stringify({ 
            error: `Failed to fetch item: ${response.statusText}` 
          }),
          success: false,
        };
      }

      const item = await response.json();

      return {
        tool_call_id: '',
        content: JSON.stringify({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          category: item.category,
        }),
        success: true,
      };
    } catch (error) {
      return {
        tool_call_id: '',
        content: JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }),
        success: false,
      };
    }
  },

  validator: (params) => {
    if (!params.itemId || typeof params.itemId !== 'string') {
      return { valid: false, error: 'itemId must be a non-empty string' };
    }
    return { valid: true };
  },
};
```

---

## Example 2: Write Tool (Update Inventory with Confirmation)

```typescript
// src/services/tools/inventoryTools.ts

export const updateInventoryQuantityTool: ToolDefinition = {
  name: 'update_inventory_quantity',
  description: 'Updates the quantity of an inventory item (requires user confirmation)',
  category: 'write',

  parameters: {
    type: 'object',
    properties: {
      itemId: {
        type: 'string',
        description: 'Item identifier',
      },
      newQuantity: {
        type: 'number',
        description: 'New quantity value',
      },
      reason: {
        type: 'string',
        description: 'Reason for the update',
      },
    },
    required: ['itemId', 'newQuantity', 'reason'],
  },

  permissions: {
    requiresAuth: true,
    minimumRole: 'admin',
    allowedModules: ['inventory'],
    requiresConfirmation: true, // ← This triggers confirmation dialog
    rateLimitPerMinute: 10,
  },

  handler: async (params, context) => {
    try {
      // Get original value for comparison
      const originalResponse = await fetch(`/api/inventory/items/${params.itemId}`);
      const originalItem = await originalResponse.json();

      // Update the quantity
      const response = await fetch(`/api/inventory/items/${params.itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: params.newQuantity,
          updateReason: params.reason,
          updatedBy: context.userId,
        }),
      });

      if (!response.ok) {
        return {
          tool_call_id: '',
          content: JSON.stringify({ error: 'Update failed' }),
          success: false,
        };
      }

      return {
        tool_call_id: '',
        content: JSON.stringify({
          success: true,
          itemId: params.itemId,
          previousQuantity: originalItem.quantity,
          newQuantity: params.newQuantity,
          message: `Successfully updated ${originalItem.name} from ${originalItem.quantity} to ${params.newQuantity}`,
        }),
        success: true,
      };
    } catch (error) {
      return {
        tool_call_id: '',
        content: JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }),
        success: false,
      };
    }
  },

  validator: (params) => {
    if (typeof params.newQuantity !== 'number' || params.newQuantity < 0) {
      return { valid: false, error: 'newQuantity must be a positive number' };
    }
    if (!params.reason || params.reason.trim().length < 3) {
      return { valid: false, error: 'reason must be at least 3 characters' };
    }
    return { valid: true };
  },

  // Optional: Rollback function for write operations
  rollback: async (params, context) => {
    // Fetch the previous state and restore it
    const historyResponse = await fetch(`/api/inventory/items/${params.itemId}/history`);
    const history = await historyResponse.json();
    const previousState = history[history.length - 2]; // Get state before last update

    await fetch(`/api/inventory/items/${params.itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        quantity: previousState.quantity,
        updateReason: 'AI Assistant Rollback',
      }),
    });
  },
};
```

---

## Example 3: Analysis Tool (No API Calls)

```typescript
// src/services/tools/analysisTools.ts

export const analyzePricesTool: ToolDefinition = {
  name: 'analyze_prices',
  description: 'Analyzes pricing patterns in the current view',
  category: 'analyze',

  parameters: {
    type: 'object',
    properties: {
      compareToAverage: {
        type: 'boolean',
        description: 'Whether to compare to average prices',
      },
    },
    required: [],
  },

  permissions: {
    requiresAuth: true,
    minimumRole: 'user',
    requiresConfirmation: false,
    rateLimitPerMinute: 20,
  },

  handler: async (params, context) => {
    // Read from DOM or application state
    const priceElements = document.querySelectorAll('[data-price]');
    const prices = Array.from(priceElements).map(el => 
      parseFloat(el.getAttribute('data-price') || '0')
    );

    if (prices.length === 0) {
      return {
        tool_call_id: '',
        content: JSON.stringify({ error: 'No prices found in current view' }),
        success: false,
      };
    }

    const analysis = {
      count: prices.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
      average: prices.reduce((a, b) => a + b, 0) / prices.length,
      median: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)],
    };

    return {
      tool_call_id: '',
      content: JSON.stringify(analysis),
      success: true,
    };
  },
};
```

---

## Registering Your Tools

After creating your tools, register them in `src/hooks/useAIAssistant.ts`:

```typescript
// Import your tools
import {
  getInventoryItemTool,
  updateInventoryQuantityTool,
} from '../services/tools/inventoryTools';
import { analyzePricesTool } from '../services/tools/analysisTools';

// Register them (inside the useAIAssistant function or at module level)
toolRegistry.register(getInventoryItemTool);
toolRegistry.register(updateInventoryQuantityTool);
toolRegistry.register(analyzePricesTool);
```

---

## Best Practices

### 1. **Error Handling**
Always wrap handler logic in try-catch:

```typescript
handler: async (params, context) => {
  try {
    // Your logic
  } catch (error) {
    return {
      tool_call_id: '',
      content: JSON.stringify({ error: error.message }),
      success: false,
    };
  }
}
```

### 2. **Clear Descriptions**
The AI uses descriptions to decide when to call your tool:

```typescript
// ❌ Bad
description: 'Gets data'

// ✅ Good
description: 'Retrieves detailed product information including price, stock level, and category by product ID or name'
```

### 3. **Validate Input**
Always validate parameters:

```typescript
validator: (params) => {
  if (!params.id) {
    return { valid: false, error: 'id is required' };
  }
  if (params.quantity < 0) {
    return { valid: false, error: 'quantity must be positive' };
  }
  return { valid: true };
}
```

### 4. **Use Confirmations for Write Operations**
Any tool that modifies data should require confirmation:

```typescript
permissions: {
  requiresConfirmation: true, // ← Shows confirmation dialog
  minimumRole: 'admin',
}
```

### 5. **Return Structured Data**
Return JSON for consistent parsing:

```typescript
return {
  tool_call_id: '',
  content: JSON.stringify({
    success: true,
    data: { ... },
    message: 'Operation completed successfully',
  }),
  success: true,
};
```

### 6. **Rate Limiting**
Set appropriate rate limits:

```typescript
permissions: {
  rateLimitPerMinute: 30, // Read operations
  rateLimitPerMinute: 10, // Write operations
}
```

---

## Testing Your Tools

### 1. **Manual Testing**

Start your app and ask the AI to use your tool:

```
User: "Get information for inventory item ABC123"
AI: [calls get_inventory_item with itemId: "ABC123"]
AI: "Here's the information for item ABC123..."
```

### 2. **Check Logs**

Tool executions are logged to console and audit log:

```typescript
// Check execution logs
console.log(toolRegistry.getExecutionLogs({ toolName: 'get_inventory_item' }));
```

### 3. **Verify Permissions**

Test with different user roles to ensure permissions work:

```typescript
// The tool should reject non-admin users
const context = { userId: 'user123', userRole: 'user', ... };
const result = await toolRegistry.execute(toolCall, context);
// Should return: { success: false, content: '{"error": "Requires admin role"}' }
```

---

## Common Patterns

### Pattern 1: Fetch from API

```typescript
handler: async (params, context) => {
  const response = await fetch(`/api/your-endpoint/${params.id}`);
  const data = await response.json();
  return { tool_call_id: '', content: JSON.stringify(data), success: true };
}
```

### Pattern 2: DOM Interaction

```typescript
handler: async (params, context) => {
  const element = document.querySelector(params.selector);
  const value = element?.textContent;
  return { tool_call_id: '', content: JSON.stringify({ value }), success: true };
}
```

### Pattern 3: Application State

```typescript
handler: async (params, context) => {
  const state = getGlobalApplicationState(); // Your state management
  return { tool_call_id: '', content: JSON.stringify(state), success: true };
}
```

---

## Security Checklist

Before deploying a tool, verify:

- [ ] All inputs are validated
- [ ] SQL injection / XSS vulnerabilities are prevented
- [ ] External URLs are blocked (if applicable)
- [ ] Authentication is enforced (if needed)
- [ ] Rate limiting is configured
- [ ] Write operations require confirmation
- [ ] Rollback mechanism is implemented (for critical operations)
- [ ] No sensitive data is leaked in error messages
- [ ] Audit logging is enabled

---

## Need Help?

Refer to:
- [AI_ASSISTANT_IMPLEMENTATION_BLUEPRINT.md](../AI_ASSISTANT_IMPLEMENTATION_BLUEPRINT.md) - Full architecture
- [AI_ASSISTANT_QUICK_START.md](../AI_ASSISTANT_QUICK_START.md) - Setup guide
- [src/services/tools/readTools.ts](src/services/tools/readTools.ts) - Example tools

Happy tool building! 🛠️
