import { useGlobalOverlayPanel } from '../hooks/useGlobalOverlayPanel';

/**
 * USAGE EXAMPLES FOR GLOBAL OVERLAY PANEL
 * 
 * The GlobalOverlayPanel is now available globally across all pages.
 * Use the `useGlobalOverlayPanel` hook in any component to trigger the panel.
 */

// ============================================================================
// EXAMPLE 1: Simple Panel with Confirmation
// ============================================================================

export function Example1_SimplePanel() {
  const { show } = useGlobalOverlayPanel();

  const handleShowPanel = () => {
    show({
      title: 'Product Details',
      position: 'right',
      width: 400,
      content: (
        <div>
          <p>Product Name: iPhone 15</p>
          <p>Price: $999</p>
          <p>In Stock: Yes</p>
        </div>
      ),
      confirmLabel: 'Add to Cart',
      closeLabel: 'Cancel',
      onConfirm: async () => {
        console.log('Product added to cart!');
        // Add your logic here
      },
    });
  };

  return <button onClick={handleShowPanel}>Show Product Details</button>;
}

// ============================================================================
// EXAMPLE 2: Panel with Form Content
// ============================================================================

export function Example2_FormPanel() {
  const { show } = useGlobalOverlayPanel();

  const handleShowFormPanel = () => {
    show({
      title: 'Edit Customer Information',
      position: 'right',
      width: 450,
      height: '80vh',
      content: (
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              defaultValue="John Doe"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              defaultValue="john@example.com"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              defaultValue="+1234567890"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        </form>
      ),
      confirmLabel: 'Save Changes',
      closeLabel: 'Discard',
      onConfirm: async () => {
        console.log('Customer updated!');
      },
    });
  };

  return <button onClick={handleShowFormPanel}>Edit Customer</button>;
}

// ============================================================================
// EXAMPLE 3: Panel with Complex Content
// ============================================================================

export function Example3_ComplexPanel() {
  const { show } = useGlobalOverlayPanel();

  const handleShowOrderDetails = () => {
    show({
      title: 'Order #ORD-12345',
      position: 'right',
      width: 500,
      height: '90vh',
      content: (
        <div className="space-y-4">
          <section>
            <h3 className="font-semibold mb-2">Order Details</h3>
            <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
              <div className="flex justify-between">
                <span>Order Date:</span>
                <span className="font-medium">Feb 3, 2026</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium text-green-600">Shipped</span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-medium">$1,250.00</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-semibold mb-2">Items</h3>
            <div className="space-y-2">
              {[1, 2, 3].map((item) => (
                <div key={item} className="border rounded p-2 flex justify-between">
                  <div>
                    <p className="font-medium">Product {item}</p>
                    <p className="text-sm text-gray-600">Qty: 2</p>
                  </div>
                  <p className="font-medium">$250.00</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold mb-2">Shipping Address</h3>
            <p className="text-sm text-gray-600">
              123 Main St<br />
              New York, NY 10001
            </p>
          </section>
        </div>
      ),
      confirmLabel: 'Print Invoice',
      closeLabel: 'Close',
      onConfirm: async () => {
        console.log('Printing invoice...');
      },
    });
  };

  return <button onClick={handleShowOrderDetails}>View Order Details</button>;
}

// ============================================================================
// EXAMPLE 4: Panel with Different Positions
// ============================================================================

export function Example4_PositionVariations() {
  const { show } = useGlobalOverlayPanel();

  const positions = ['top', 'bottom', 'left', 'right', 'center'] as const;

  const handleShowAtPosition = (position: typeof positions[number]) => {
    show({
      title: `Panel at ${position}`,
      position,
      width: position === 'top' || position === 'bottom' ? '100%' : 400,
      height: position === 'left' || position === 'right' ? '100%' : 'auto',
      content: <p>This panel is positioned at the {position}.</p>,
      closeLabel: 'Close',
    });
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {positions.map((pos) => (
        <button key={pos} onClick={() => handleShowAtPosition(pos)}>
          Show at {pos}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Panel with No Footer Buttons
// ============================================================================

export function Example5_NoFooterPanel() {
  const { show, close } = useGlobalOverlayPanel();

  const handleShowPanel = () => {
    show({
      title: 'Quick Preview',
      position: 'right',
      width: 350,
      content: (
        <div>
          <p>This panel has no footer buttons.</p>
          <p>Close it by clicking the X button or clicking outside.</p>
          <p>You can also press ESC to close.</p>
        </div>
      ),
      showCloseButton: false,
      showConfirmButton: false,
      closeOnBackdropClick: true,
      closeOnEscape: true,
    });
  };

  return <button onClick={handleShowPanel}>Show Preview</button>;
}

// ============================================================================
// EXAMPLE 6: Async Operations in Panel
// ============================================================================

export function Example6_AsyncPanel() {
  const { show } = useGlobalOverlayPanel();

  const handleShowAsyncPanel = () => {
    show({
      title: 'Delete Confirmation',
      position: 'center',
      width: 400,
      content: (
        <div>
          <p>Are you sure you want to delete this item?</p>
          <p className="text-red-600 text-sm mt-2">This action cannot be undone.</p>
        </div>
      ),
      confirmLabel: 'Delete',
      closeLabel: 'Cancel',
      onConfirm: async () => {
        console.log('Deleting...');
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log('Item deleted successfully!');
      },
    });
  };

  return <button onClick={handleShowAsyncPanel}>Delete Item</button>;
}

// ============================================================================
// HOOK API REFERENCE
// ============================================================================

/**
 * const { show, close, update } = useGlobalOverlayPanel();
 * 
 * show(config: OverlayPanelConfig): string
 *   - Opens the overlay panel with the provided configuration
 *   - Returns the panel ID
 * 
 * close(): void
 *   - Closes the currently open panel
 * 
 * update(config: Partial<OverlayPanelConfig>): void
 *   - Updates the current panel configuration
 *   - Useful for dynamically changing content or buttons
 * 
 * Configuration Options:
 * {
 *   title?: string;                    // Panel title
 *   content: ReactNode;                // Panel content (required)
 *   position?: 'top' | 'bottom' | 'left' | 'right' | 'center'; // Default: 'right'
 *   width?: string | number;           // Default: 400
 *   height?: string | number;          // Panel height
 *   onClose?: () => void;              // Callback when panel closes
 *   onConfirm?: () => void | Promise;  // Callback for confirm button
 *   confirmLabel?: string;             // Custom confirm button text. Default: 'Confirm'
 *   closeLabel?: string;               // Custom close button text. Default: 'Close'
 *   showCloseButton?: boolean;         // Default: true
 *   showConfirmButton?: boolean;       // Default: true
 *   closeOnBackdropClick?: boolean;    // Default: true
 *   closeOnEscape?: boolean;           // Default: true
 *   animationDuration?: number;        // In ms. Default: 300
 * }
 */
