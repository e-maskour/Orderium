/**
 * Collapses an order's technical state (status + delivery status + money owed)
 * into one plain-language "stage" that the order detail page can explain in a
 * single sentence.
 */
export type OrderStage =
  | 'draft'
  | 'ready'
  | 'delivering'
  | 'deliveredUnpaid'
  | 'done'
  | 'invoiced'
  | 'cancelled';

export type StageTone = 'info' | 'warn' | 'ok' | 'bad';

/** Delivery statuses meaning a delivery person is already handling the order. */
const DELIVERY_ACTIVE = ['assigned', 'confirmed', 'picked_up', 'to_delivery', 'in_delivery'];

export function getOrderStage(
  status: string,
  deliveryStatus: string | null | undefined,
  remainingAmount: number,
): OrderStage {
  if (status === 'cancelled' || status === 'canceled') return 'cancelled';
  if (status === 'invoiced') return 'invoiced';
  if (status === 'delivered') return remainingAmount > 0 ? 'deliveredUnpaid' : 'done';
  if (status === 'draft') return 'draft';
  if (status === 'confirmed' || status === 'picked_up') return 'delivering';
  if (deliveryStatus && DELIVERY_ACTIVE.includes(deliveryStatus)) return 'delivering';
  return 'ready';
}

/**
 * Index of the current step in the 4-step tracker
 * (Brouillon → Validée → En livraison → Livrée). 4 means every step is done;
 * -1 means the tracker is not shown (cancelled).
 */
export function getStageStep(stage: OrderStage): number {
  switch (stage) {
    case 'draft':
      return 0;
    case 'ready':
      return 1;
    case 'delivering':
      return 2;
    case 'cancelled':
      return -1;
    default:
      return 4;
  }
}

export function getStageTone(stage: OrderStage, remainingAmount: number): StageTone {
  switch (stage) {
    case 'cancelled':
      return 'bad';
    case 'done':
    case 'invoiced':
      return 'ok';
    case 'deliveredUnpaid':
      return 'warn';
    case 'ready':
    case 'delivering':
      return remainingAmount > 0 ? 'warn' : 'info';
    default:
      return 'info';
  }
}

/** Turns a stored phone number into the digits wa.me expects (Moroccan 06… → 2126…). */
export function toWhatsAppNumber(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return `212${digits.slice(1)}`;
  return digits;
}
