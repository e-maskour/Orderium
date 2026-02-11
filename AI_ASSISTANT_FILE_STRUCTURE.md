# AI Assistant - File Structure

Complete overview of all AI Assistant files and their locations.

---

## 📁 Directory Structure

```
Orderium/
│
├── AI_ASSISTANT_IMPLEMENTATION_BLUEPRINT.md    # Complete architecture (600+ lines)
├── AI_ASSISTANT_QUICK_START.md                 # 5-minute setup guide
├── AI_ASSISTANT_COMPLETE.md                    # Implementation summary
│
└── backoffice/
    ├── AI_ASSISTANT_TOOLS_GUIDE.md             # Developer guide for adding tools
    │
    └── src/
        ├── App.tsx                              # ✏️ MODIFIED: Added AI assistant
        │
        ├── types/
        │   └── aiAssistant.ts                   # 🆕 All TypeScript definitions
        │
        ├── services/
        │   ├── ollama.service.ts                # 🆕 Streaming chat service
        │   ├── toolRegistry.service.ts          # 🆕 Tool execution & permissions
        │   ├── safetyFilters.service.ts         # 🆕 Security filters
        │   ├── appContext.service.ts            # 🆕 Safe context extraction
        │   ├── systemMessage.service.ts         # 🆕 System prompt builder
        │   │
        │   └── tools/
        │       └── readTools.ts                 # 🆕 4 example read-only tools
        │
        ├── hooks/
        │   └── useAIAssistant.ts                # 🆕 Main orchestration hook
        │
        └── components/
            └── AIAssistant/
                ├── index.ts                     # 🆕 Component exports
                ├── AIAssistantOverlay.tsx       # 🆕 Main overlay container
                ├── AIAssistantButton.tsx        # 🆕 Floating button
                ├── MessageThread.tsx            # 🆕 Message list
                ├── MessageBubble.tsx            # 🆕 Individual message
                └── InputArea.tsx                # 🆕 Text input area
```

---

## 📊 File Sizes & Line Counts

| File | Lines | Purpose |
|------|-------|---------|
| `types/aiAssistant.ts` | ~300 | Complete type system |
| `ollama.service.ts` | ~200 | Streaming chat with retry |
| `toolRegistry.service.ts` | ~250 | Tool execution engine |
| `safetyFilters.service.ts` | ~100 | Security filters |
| `appContext.service.ts` | ~150 | Context sanitization |
| `systemMessage.service.ts` | ~80 | Prompt construction |
| `tools/readTools.ts` | ~200 | Example tools |
| `useAIAssistant.ts` | ~200 | Main hook |
| `AIAssistantOverlay.tsx` | ~150 | UI container |
| `MessageThread.tsx` | ~50 | Message list |
| `MessageBubble.tsx` | ~100 | Message rendering |
| `InputArea.tsx` | ~100 | Input component |
| `AIAssistantButton.tsx` | ~30 | Floating button |
| **TOTAL** | **~2000** | **Core implementation** |

---

## 🔄 Data Flow

```
1. User Input (InputArea.tsx)
        ↓
2. Hook (useAIAssistant.ts)
        ↓
3. Safety Check (safetyFilters.service.ts)
        ↓
4. Context Building (appContext.service.ts)
        ↓
5. System Message (systemMessage.service.ts)
        ↓
6. Ollama Stream (ollama.service.ts)
        ↓
7. Tool Detection → ToolRegistry (toolRegistry.service.ts)
        ↓
8. Tool Execution → API/DOM/State
        ↓
9. Response Streaming → MessageBubble.tsx
        ↓
10. Display in MessageThread.tsx
```

---

## 🎯 Key Exports

### Types (`types/aiAssistant.ts`)
```typescript
export interface OllamaChatMessage { ... }
export interface ToolDefinition { ... }
export interface AppContext { ... }
export interface AssistantMessage { ... }
// + 15 more interfaces
```

### Services
```typescript
// ollama.service.ts
export const ollamaService: OllamaService

// toolRegistry.service.ts
export const toolRegistry: ToolRegistry

// safetyFilters.service.ts
export class SafetyFilters { ... }

// appContext.service.ts
export class AppContextProvider { ... }

// systemMessage.service.ts
export class SystemMessageBuilder { ... }
```

### Tools (`tools/readTools.ts`)
```typescript
export const getCurrentPageTool: ToolDefinition
export const analyzeSelectionTool: ToolDefinition
export const getAppStatsTool: ToolDefinition
export const searchHelpTool: ToolDefinition
```

### Components (`components/AIAssistant/`)
```typescript
export { AIAssistantOverlay } from './AIAssistantOverlay'
export { AIAssistantButton } from './AIAssistantButton'
export { MessageThread } from './MessageThread'
export { MessageBubble } from './MessageBubble'
export { InputArea } from './InputArea'
```

### Hook (`hooks/useAIAssistant.ts`)
```typescript
export function useAIAssistant(): {
  messages: AssistantMessage[]
  isStreaming: boolean
  error: Error | null
  sendMessage: (content: string) => void
  cancelStream: () => void
  clearConversation: () => void
}
```

---

## 🔗 Import Paths

When adding new features, use these imports:

```typescript
// Types
import { 
  ToolDefinition, 
  AppContext, 
  ToolResult 
} from '../types/aiAssistant'

// Services
import { ollamaService } from '../services/ollama.service'
import { toolRegistry } from '../services/toolRegistry.service'
import { SafetyFilters } from '../services/safetyFilters.service'
import { AppContextProvider } from '../services/appContext.service'
import { SystemMessageBuilder } from '../services/systemMessage.service'

// Tools
import { 
  getCurrentPageTool,
  analyzeSelectionTool 
} from '../services/tools/readTools'

// Components
import { 
  AIAssistantOverlay,
  AIAssistantButton 
} from '../components/AIAssistant'

// Hook
import { useAIAssistant } from '../hooks/useAIAssistant'
```

---

## 🛠️ Where to Add Features

### Want to add a new tool?
1. Create file: `src/services/tools/yourTools.ts`
2. Register in: `src/hooks/useAIAssistant.ts`

### Want to modify UI?
- Edit: `src/components/AIAssistant/*.tsx`

### Want to change permissions?
- Edit: `src/services/toolRegistry.service.ts`

### Want new safety rules?
- Edit: `src/services/safetyFilters.service.ts`

### Want different system prompt?
- Edit: `src/services/systemMessage.service.ts`

### Want to add context?
- Edit: `src/services/appContext.service.ts`

---

## 📦 Dependencies Added

None! All built with existing dependencies:
- React (already installed)
- React Router (already installed)
- Lucide React (already installed for icons)
- TypeScript (already installed)

**External requirement**: Ollama running locally (separate install)

---

## 🚀 Quick Navigation

| Want to... | Go to... |
|-----------|----------|
| Understand architecture | `AI_ASSISTANT_IMPLEMENTATION_BLUEPRINT.md` |
| Set up Ollama | `AI_ASSISTANT_QUICK_START.md` |
| Add a custom tool | `backoffice/AI_ASSISTANT_TOOLS_GUIDE.md` |
| See implementation summary | `AI_ASSISTANT_COMPLETE.md` |
| Modify UI | `backoffice/src/components/AIAssistant/` |
| Add new tool | `backoffice/src/services/tools/` |
| Change permissions | `backoffice/src/services/toolRegistry.service.ts` |
| Add security rules | `backoffice/src/services/safetyFilters.service.ts` |

---

Enjoy exploring the AI Assistant! 🎉
