import { DocumentItem } from './services/documents.service';
import { formatAmount } from '@orderium/ui';

export class DocumentListItem implements DocumentItem {
    id: number;
    number: string;
    date: string;
    dueDate?: string;
    validationDate?: string | null;
    partnerName: string;
    subtotal: number;
    tax: number;
    total: number;
    paidAmount: number;
    remainingAmount: number;
    status: string;
    isValidated: boolean;
    itemsCount: number;

    constructor(data: DocumentItem) {
        this.id = data.id;
        this.number = data.number;
        this.date = data.date;
        this.dueDate = data.dueDate;
        this.validationDate = data.validationDate;
        this.partnerName = data.partnerName;
        this.subtotal = data.subtotal;
        this.tax = data.tax;
        this.total = data.total;
        this.paidAmount = data.paidAmount;
        this.remainingAmount = data.remainingAmount;
        this.status = data.status;
        this.isValidated = data.isValidated;
        this.itemsCount = data.itemsCount;
    }

    get isUnpaid(): boolean {
        return this.status === 'unpaid';
    }

    get formattedSubtotal(): string {
        return formatAmount(this.subtotal, 2);
    }

    get formattedTax(): string {
        return formatAmount(this.tax, 2);
    }

    get formattedDate(): string {
        return new Date(this.date).toLocaleDateString();
    }

    get formattedDueDate(): string {
        if (!this.dueDate) return '—';
        return new Date(this.dueDate).toLocaleDateString();
    }

    get isPaid(): boolean {
        return this.status === 'paid';
    }

    get isPartial(): boolean {
        return this.status === 'partial';
    }

    get isDraft(): boolean {
        return this.status === 'draft';
    }

    get isOverdue(): boolean {
        if (!this.dueDate || this.isPaid) return false;
        return new Date(this.dueDate) < new Date();
    }

    get formattedTotal(): string {
        return formatAmount(this.total, 2);
    }

    get formattedRemaining(): string {
        return formatAmount(this.remainingAmount, 2);
    }

    get paymentProgress(): number {
        if (this.total === 0) return 100;
        return Math.min(100, (this.paidAmount / this.total) * 100);
    }

    get displayStatus(): string {
        const map: Record<string, string> = {
            draft: 'Draft',
            unpaid: 'Unpaid',
            partial: 'Partial',
            paid: 'Paid',
            open: 'Open',
            signed: 'Signed',
            closed: 'Closed',
            delivered: 'Delivered',
            invoiced: 'Invoiced',
            validated: 'Validated',
            in_progress: 'In Progress',
            cancelled: 'Cancelled',
        };
        return map[this.status] ?? this.status;
    }

    static fromApiResponse(data: any): DocumentListItem {
        return new DocumentListItem({
            id: data.id,
            number: data.number ?? data.documentNumber ?? '',
            date: data.date,
            dueDate: data.dueDate,
            validationDate: data.validationDate,
            partnerName: data.partnerName ?? '',
            subtotal: parseFloat(data.subtotal) || 0,
            tax: parseFloat(data.tax) || 0,
            total: parseFloat(data.total) || 0,
            paidAmount: parseFloat(data.paidAmount) || 0,
            remainingAmount: parseFloat(data.remainingAmount) || 0,
            status: data.status ?? 'draft',
            isValidated: data.isValidated ?? false,
            itemsCount: data.itemsCount ?? 0,
        });
    }

    toJSON() {
        return {
            id: this.id,
            number: this.number,
            date: this.date,
            dueDate: this.dueDate,
            validationDate: this.validationDate,
            partnerName: this.partnerName,
            subtotal: this.subtotal,
            tax: this.tax,
            total: this.total,
            paidAmount: this.paidAmount,
            remainingAmount: this.remainingAmount,
            status: this.status,
            isValidated: this.isValidated,
            itemsCount: this.itemsCount,
        };
    }
}
