import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PDFService } from './pdf.service';

@Controller('pdf')
export class PDFController {
  constructor(private readonly pdfService: PDFService) {}

  /**
   * Generate PDF for invoice
   * @param invoiceId - Invoice ID
   * @param mode - 'preview' (inline) or 'download' (attachment)
   */
  @Get('invoice/:invoiceId')
  async generateInvoicePDF(
    @Param('invoiceId') invoiceId: string,
    @Query('mode') mode: 'preview' | 'download' = 'download',
    @Res() res: Response,
  ) {
    try {
      const { pdfBuffer, fileName } = await this.pdfService.generateDocumentPDF(
        'invoice',
        parseInt(invoiceId),
      );

      const disposition = mode === 'preview' ? 'inline' : 'attachment';

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      res.send(pdfBuffer);
    } catch (error) {
      res.status(error.status || 500).json({
        error: 'PDF generation failed',
        message: error.message,
      });
    }
  }

  /**
   * Generate PDF for quote
   * @param quoteId - Quote ID
   * @param mode - 'preview' (inline) or 'download' (attachment)
   */
  @Get('quote/:quoteId')
  async generateQuotePDF(
    @Param('quoteId') quoteId: string,
    @Query('mode') mode: 'preview' | 'download' = 'download',
    @Res() res: Response,
  ) {
    try {
      const { pdfBuffer, fileName } = await this.pdfService.generateDocumentPDF(
        'quote',
        parseInt(quoteId),
      );

      const disposition = mode === 'preview' ? 'inline' : 'attachment';

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      res.send(pdfBuffer);
    } catch (error) {
      res.status(error.status || 500).json({
        error: 'PDF generation failed',
        message: error.message,
      });
    }
  }

  /**
   * Generate PDF for delivery note (bon de livraison)
   * @param orderId - Order ID
   * @param mode - 'preview' (inline) or 'download' (attachment)
   */
  @Get('delivery-note/:orderId')
  async generateDeliveryNotePDF(
    @Param('orderId') orderId: string,
    @Query('mode') mode: 'preview' | 'download' = 'download',
    @Res() res: Response,
  ) {
    try {
      const { pdfBuffer, fileName } = await this.pdfService.generateDocumentPDF(
        'delivery-note',
        parseInt(orderId),
      );

      const disposition = mode === 'preview' ? 'inline' : 'attachment';

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      res.send(pdfBuffer);
    } catch (error) {
      res.status(error.status || 500).json({
        error: 'PDF generation failed',
        message: error.message,
      });
    }
  }

  /**
   * Generate receipt (80mm thermal) for order
   * @param orderId - Order ID
   */
  @Get('receipt/:orderId')
  async generateReceipt(
    @Param('orderId') orderId: string,
    @Query('mode') mode: 'preview' | 'download' = 'download',
    @Res() res: Response,
  ) {
    try {
      const { pdfBuffer, fileName } = await this.pdfService.generateDocumentPDF(
        'receipt',
        parseInt(orderId),
      );

      const disposition = mode === 'preview' ? 'inline' : 'attachment';

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      res.send(pdfBuffer);
    } catch (error) {
      res.status(error.status || 500).json({
        error: 'PDF generation failed',
        message: error.message,
      });
    }
  }
}
