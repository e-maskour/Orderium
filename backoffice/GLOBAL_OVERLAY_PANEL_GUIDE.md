# Global Overlay Panel Component

A flexible, global, and reusable Overlay Panel component system for your application. Use it across any page without prop drilling.

## Features

✅ **Global State Management** - One panel instance shared across the entire app
✅ **Multiple Positions** - Top, bottom, left, right, or center positioning
✅ **Flexible Content** - Accept any React component as content
✅ **Customizable Actions** - Configure confirm/cancel buttons and callbacks
✅ **Keyboard Support** - ESC key to close, focus management
✅ **Backdrop Click Handling** - Optionally close when clicking outside
✅ **Smooth Animations** - Configurable slide/fade animations
✅ **Responsive Design** - Works seamlessly on mobile and desktop
✅ **TypeScript Support** - Fully typed for better DX

## Installation

The component is already integrated into your app! Just use it in any component.

## Quick Start

### 1. Basic Usage

```tsx
import { useGlobalOverlayPanel } from '../hooks/useGlobalOverlayPanel';

export function MyComponent() {
  const { show } = useGlobalOverlayPanel();

  const handleOpenPanel = () => {
    show({
      title: 'Panel Title',
      content: <p>Your content here</p>,
      position: 'right',
    });
  };

  return <button onClick={handleOpenPanel}>Open Panel</button>;
}
```

### 2. With Confirmation

```tsx
const { show } = useGlobalOverlayPanel();

show({
  title: 'Confirm Action',
  content: <p>Are you sure?</p>,
  confirmLabel: 'Yes',
  closeLabel: 'No',
  position: 'center',
  onConfirm: async () => {
    await performAction();
    console.log('Done!');
  },
});
```

### 3. With Form Content

```tsx
show({
  title: 'Edit Profile',
  position: 'right',
  width: 450,
  height: '80vh',
  content: (
    <form>
      <input placeholder="Name" />
      <input placeholder="Email" />
    </form>
  ),
  confirmLabel: 'Save',
  onConfirm: async () => {
    // Save form data
  },
});
```

## Configuration API

```tsx
const { show, close, update } = useGlobalOverlayPanel();

// Show the panel
show({
  title?: string;                    // Panel header title
  content: ReactNode;                // Panel content (required)
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  width?: string | number;           // CSS width or pixel value
  height?: string | number;          // CSS height or pixel value
  onClose?: () => void;              // Called when panel closes
  onConfirm?: () => void | Promise;  // Called when confirm button clicked
  confirmLabel?: string;             // Button text (default: 'Confirm')
  closeLabel?: string;               // Button text (default: 'Close')
  showCloseButton?: boolean;         // Show close button (default: true)
  showConfirmButton?: boolean;       // Show confirm button (default: true)
  closeOnBackdropClick?: boolean;    // Close on backdrop click (default: true)
  closeOnEscape?: boolean;           // Close on ESC key (default: true)
  className?: string;                // Custom CSS class
  animationDuration?: number;        // Animation duration in ms (default: 300)
});

// Close the panel
close();

// Update current panel
update({ title: 'New Title' });
```

## Positions

### Right (Default)
```tsx
show({
  position: 'right',
  width: 400, // Recommended for side panels
  content: <YourContent />,
});
```

### Left
```tsx
show({
  position: 'left',
  width: 400,
  content: <YourContent />,
});
```

### Top
```tsx
show({
  position: 'top',
  height: '300px',
  content: <YourContent />,
});
```

### Bottom
```tsx
show({
  position: 'bottom',
  height: '400px',
  content: <YourContent />,
});
```

### Center
```tsx
show({
  position: 'center',
  width: 500,
  height: 'auto',
  content: <YourContent />,
});
```

## Common Patterns

### Pattern 1: Delete Confirmation

```tsx
const { show } = useGlobalOverlayPanel();

const handleDelete = () => {
  show({
    title: 'Delete Confirmation',
    position: 'center',
    width: 400,
    content: (
      <div>
        <p className="text-red-600 font-semibold">Are you sure?</p>
        <p className="text-gray-600 text-sm mt-2">
          This action cannot be undone.
        </p>
      </div>
    ),
    confirmLabel: 'Delete',
    closeLabel: 'Cancel',
    onConfirm: async () => {
      setLoading(true);
      try {
        await deleteItem(itemId);
      } finally {
        setLoading(false);
      }
    },
  });
};
```

### Pattern 2: Form Modal

```tsx
const { show } = useGlobalOverlayPanel();

const handleEditUser = (user) => {
  show({
    title: 'Edit User',
    position: 'right',
    width: 450,
    height: '80vh',
    content: (
      <UserForm 
        initialData={user}
        onClose={close} // Pass close function to form
      />
    ),
    showConfirmButton: false, // Form handles its own submit
  });
};
```

### Pattern 3: Quick Preview

```tsx
const { show } = useGlobalOverlayPanel();

const handlePreview = (item) => {
  show({
    title: `${item.name} - Preview`,
    position: 'right',
    width: 500,
    content: <PreviewComponent item={item} />,
    showCloseButton: true,
    showConfirmButton: false,
    closeOnBackdropClick: true,
    closeOnEscape: true,
  });
};
```

### Pattern 4: Multi-Step Wizard

```tsx
const { show, update } = useGlobalOverlayPanel();
const [step, setStep] = useState(1);

const handleOpenWizard = () => {
  show({
    title: `Setup - Step ${step}`,
    position: 'right',
    width: 500,
    content: <WizardStep step={step} />,
    confirmLabel: step === 3 ? 'Complete' : 'Next',
    onConfirm: () => {
      if (step < 3) {
        setStep(step + 1);
        update({ 
          title: `Setup - Step ${step + 1}`,
          content: <WizardStep step={step + 1} />
        });
      }
    },
  });
};
```

## Styling

Customize the appearance by overriding CSS variables in your CSS file:

```css
/* Override default colors */
:root {
  --overlay-panel-bg: white;
  --overlay-panel-border: 1px solid #e5e7eb;
  --overlay-panel-shadow: -2px 0 12px rgba(0, 0, 0, 0.15);
  --overlay-panel-header-bg: #f9fafb;
  --overlay-panel-button-primary-bg: #3b82f6;
}

/* Or add custom styles */
.overlay-panel {
  border-radius: 12px;
}

.overlay-panel-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}
```

## Accessibility

- ✅ Keyboard navigation (ESC to close)
- ✅ Focus management
- ✅ Backdrop click detection
- ✅ ARIA labels on buttons
- ✅ Semantic HTML structure

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Notes

- The panel uses React Context for state management
- Animations are GPU-accelerated
- No unnecessary re-renders with useCallback optimization
- Lazy render - panel only renders when open

## Migration from Old Modals

If you have existing modals, you can easily migrate to GlobalOverlayPanel:

**Before:**
```tsx
<Modal isOpen={isOpen} onClose={handleClose}>
  <Content />
</Modal>
```

**After:**
```tsx
const { show } = useGlobalOverlayPanel();

// In handler function:
show({
  position: 'right',
  content: <Content />,
  onClose: handleClose,
});
```

## Examples

See `GlobalOverlayPanel.examples.tsx` for 6 complete configuration examples including:
1. Simple panel with confirmation
2. Panel with form content
3. Complex content with multiple sections
4. Position variations
5. Panel with no footer buttons
6. Async operations

## Troubleshooting

### Panel not appearing?
- Make sure `<OverlayPanelProvider>` wraps your app (already done in App.tsx)
- Ensure `<GlobalOverlayPanel />` is rendered (already done in App.tsx)

### Z-index issues?
- The panel has `z-index: 1000` - adjust in `GlobalOverlayPanel.css` if needed

### Content scrolling?
- Use `height` property to constrain the panel height
- Content automatically scrolls if it exceeds available space

### Animations not smooth?
- Adjust `animationDuration` in config
- Check CSS animation definitions

## Best Practices

1. **Close on action completion** - Automatically close after async operations
2. **Show loading states** - Use update() to change button text during loading
3. **Validate form data** - Validate before calling onConfirm
4. **Handle errors gracefully** - Show error messages in panel content
5. **Use appropriate positions** - Side panels for forms, center for confirmations
6. **Keep content focused** - Don't put too much content in one panel
7. **Use callbacks** - Set onClose to refresh parent data when needed

## Files

- `context/OverlayPanelContext.tsx` - Global context and provider
- `components/GlobalOverlayPanel.tsx` - Panel component
- `components/GlobalOverlayPanel.css` - Styling
- `hooks/useGlobalOverlayPanel.ts` - Hook for easy usage
- `components/GlobalOverlayPanel.examples.tsx` - Usage examples

Enjoy! 🎉
