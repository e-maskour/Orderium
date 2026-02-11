# AI Assistant Quick Start Guide

🚀 **Get your AI Assistant up and running in 5 minutes**

---

## Step 1: Install Ollama

### macOS
```bash
# Download and install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Or use Homebrew
brew install ollama
```

### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Windows
Download from: https://ollama.com/download/windows

---

## Step 2: Start Ollama Service

```bash
# Start the Ollama service (runs on http://localhost:11434)
ollama serve
```

Keep this terminal window open while using the AI assistant.

---

## Step 3: Download AI Model

In a new terminal window:

```bash
# Download the Llama 3.2 model (recommended, ~2GB)
ollama pull llama3.2

# Or alternatively, use a smaller model for faster responses
ollama pull llama3.2:1b

# Or a larger, more capable model
ollama pull llama3.2:latest
```

**Model Recommendations:**
- `llama3.2:1b` - Fast, lightweight (1.3GB) - Good for quick responses
- `llama3.2` - Balanced (2GB) - **Recommended**
- `llama3.2:latest` - Most capable (7GB) - Best accuracy

---

## Step 4: Verify Installation

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Should return JSON with your installed models
```

---

## Step 5: Start Your Backoffice App

```bash
cd backoffice
npm run dev
```

---

## Using the AI Assistant

### Opening the Assistant

1. **Keyboard Shortcut**: Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux)
2. **Click Button**: Click the floating blue button in the bottom-right corner

### Available Commands

The AI assistant can help you with:

- **Get current page info**: "What page am I on?"
- **Analyze selection**: "What is selected on this page?"
- **Get app stats**: "Show me inventory statistics"
- **Search help**: "How do I create a new product?"

### Example Queries

```
"What module am I currently in?"
"Show me the current route"
"Get stats for the inventory module"
"Search help for creating invoices"
```

### Keyboard Shortcuts

- `Cmd+K` / `Ctrl+K` - Toggle AI assistant
- `Cmd+Enter` - Send message
- `ESC` - Close assistant or cancel streaming
- `Cmd+Shift+C` - Clear conversation history

---

## Troubleshooting

### "AI service offline" error

**Problem**: Can't connect to Ollama

**Solutions**:
1. Make sure Ollama is running: `ollama serve`
2. Check if port 11434 is available: `lsof -i :11434`
3. Verify endpoint: `curl http://localhost:11434/api/tags`

### Slow responses

**Problem**: AI takes a long time to respond

**Solutions**:
1. Use a smaller model: `ollama pull llama3.2:1b`
2. Check system resources (RAM, CPU)
3. Reduce temperature in settings (faster but less creative)

### Model not found

**Problem**: "Model not available" error

**Solution**:
```bash
# List installed models
ollama list

# Pull the required model
ollama pull llama3.2
```

---

## Advanced Configuration

### Change Default Model

Edit [useAIAssistant.ts](backoffice/src/hooks/useAIAssistant.ts):

```typescript
// Change this line:
const DEFAULT_MODEL = 'llama3.2';

// To your preferred model:
const DEFAULT_MODEL = 'llama3.2:1b'; // Smaller, faster
```

### Add Custom Tools

1. Create a new file in `backoffice/src/services/tools/`
2. Define your tool using `ToolDefinition` interface
3. Register it in `useAIAssistant.ts`:

```typescript
import { myCustomTool } from '../services/tools/myTools';
toolRegistry.register(myCustomTool);
```

### Adjust Response Style

Edit the system message in [systemMessage.service.ts](backoffice/src/services/systemMessage.service.ts) to change the AI's personality and behavior.

---

## Security Notes

✅ **Safe by default**:
- All data stays local (Ollama runs on your machine)
- No external API calls
- Prompt injection protection enabled
- Tool permissions enforced
- Audit logging for all actions

❌ **Never exposed**:
- API keys
- User passwords
- Authentication tokens
- Personally identifiable information (PII)

---

## Performance Tips

1. **Use GPU acceleration** (if available):
   ```bash
   # Ollama automatically uses GPU if detected
   # Check if GPU is being used in Ollama logs
   ```

2. **Limit message history**:
   - Default: Last 10 messages sent to AI
   - Adjust in `useAIAssistant.ts` if needed

3. **Clear conversation regularly**:
   - Press `Cmd+Shift+C` to clear
   - Reduces context size and improves speed

---

## Next Steps

1. ✅ **Add more tools**: Create custom tools for your specific workflows
2. ✅ **Customize prompts**: Adjust system messages for your domain
3. ✅ **Enable write operations**: Add tools that modify data (with confirmations)
4. ✅ **Integrate with your API**: Connect tools to your backend endpoints

Refer to [AI_ASSISTANT_IMPLEMENTATION_BLUEPRINT.md](../AI_ASSISTANT_IMPLEMENTATION_BLUEPRINT.md) for the complete architecture and advanced features.

---

## Support

- **Ollama Documentation**: https://ollama.com/docs
- **Model Library**: https://ollama.com/library
- **GitHub Issues**: Report bugs and feature requests

Happy building! 🎉
