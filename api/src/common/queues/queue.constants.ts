/** Queue names — used for @Processor() and BullModule.registerQueue() */
export enum QueueName {
    PDF_GENERATION = 'pdf-generation',
    NOTIFICATIONS = 'notifications',
    BULK_OPERATIONS = 'bulk-operations',
}

/** Job names inside the PDF generation queue */
export enum PdfJobName {
    GENERATE_AND_UPLOAD = 'generate-and-upload',
}

/** Job names inside the notifications queue */
export enum NotificationJobName {
    SEND = 'send-notification',
}

/** Job names inside the bulk-operations queue */
export enum BulkJobName {
    XLSX_EXPORT = 'xlsx-export',
}

/** Entity types supported by the async XLSX export */
export type BulkExportEntity = 'orders' | 'invoices' | 'products';
