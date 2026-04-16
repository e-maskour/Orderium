import { Controller, Get, Post, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PDFService } from './pdf.service';
import { PortalRoute } from '../auth/decorators/portal-route.decorator';
import { ApiRes } from '../../common/api-response';
import { PDF } from '../../common/response-codes';

@ApiTags('PDF')
@PortalRoute()
@Controller('pdf')
export class PDFController {
  constructor(private readonly pdfService: PDFService) {}

  /**
   * Generate PDF for invoice
   * @param invoiceId - Invoice ID
   * @param mode - 'preview' (inline) or 'download' (attachment)
   */
  @Get('invoice/:invoiceId')
  @ApiOperation({ summary: 'Generate PDF for invoice' })
  @ApiResponse({ status: 200, description: 'Invoice PDF generated' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiQuery({ name: 'mode', required: false, enum: ['preview', 'download'] })
  @ApiQuery({ name: 'lang', required: false, enum: ['fr', 'ar'] })
  async generateInvoicePDF(
    @Param('invoiceId') invoiceId: string,
    @Query('mode') mode: 'preview' | 'download' = 'download',
    @Query('lang') lang: 'fr' | 'ar' = 'fr',
    @Res() res: Response,
  ) {
    try {
      const { pdfBuffer, fileName } = await this.pdfService.generateDocumentPDF(
        'invoice',
        parseInt(invoiceId),
        lang,
      );

      const disposition = mode === 'preview' ? 'inline' : 'attachment';

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=300',
      });

      res.send(pdfBuffer);
    } catch (error: any) {
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
  @ApiOperation({ summary: 'Generate PDF for quote' })
  @ApiResponse({ status: 200, description: 'Quote PDF generated' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  @ApiQuery({ name: 'mode', required: false, enum: ['preview', 'download'] })
  @ApiQuery({ name: 'lang', required: false, enum: ['fr', 'ar'] })
  async generateQuotePDF(
    @Param('quoteId') quoteId: string,
    @Query('mode') mode: 'preview' | 'download' = 'download',
    @Query('lang') lang: 'fr' | 'ar' = 'fr',
    @Res() res: Response,
  ) {
    try {
      const { pdfBuffer, fileName } = await this.pdfService.generateDocumentPDF(
        'quote',
        parseInt(quoteId),
        lang,
      );

      const disposition = mode === 'preview' ? 'inline' : 'attachment';

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=300',
      });

      res.send(pdfBuffer);
    } catch (error: any) {
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
  @ApiOperation({ summary: 'Generate PDF for delivery note' })
  @ApiResponse({ status: 200, description: 'Delivery note PDF generated' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiQuery({ name: 'mode', required: false, enum: ['preview', 'download'] })
  @ApiQuery({ name: 'lang', required: false, enum: ['fr', 'ar'] })
  async generateDeliveryNotePDF(
    @Param('orderId') orderId: string,
    @Query('mode') mode: 'preview' | 'download' = 'download',
    @Query('lang') lang: 'fr' | 'ar' = 'fr',
    @Res() res: Response,
  ) {
    try {
      const { pdfBuffer, fileName } = await this.pdfService.generateDocumentPDF(
        'delivery-note',
        parseInt(orderId),
        lang,
      );

      const disposition = mode === 'preview' ? 'inline' : 'attachment';

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=300',
      });

      res.send(pdfBuffer);
    } catch (error: any) {
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
  @ApiOperation({ summary: 'Generate receipt PDF' })
  @ApiResponse({ status: 200, description: 'Receipt PDF generated' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiQuery({ name: 'mode', required: false, enum: ['preview', 'download'] })
  @ApiQuery({ name: 'lang', required: false, enum: ['fr', 'ar'] })
  async generateReceipt(
    @Param('orderId') orderId: string,
    @Query('mode') mode: 'preview' | 'download' = 'download',
    @Query('lang') lang: 'fr' | 'ar' = 'fr',
    @Res() res: Response,
  ) {
    try {
      const { pdfBuffer, fileName } = await this.pdfService.generateDocumentPDF(
        'receipt',
        parseInt(orderId),
        lang,
      );

      const disposition = mode === 'preview' ? 'inline' : 'attachment';

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=300',
      });

      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(error.status || 500).json({
        error: 'PDF generation failed',
        message: error.message,
      });
    }
  }

  /**
   * Regenerate PDF for a document: delete old MinIO object, generate new PDF,
   * upload to MinIO and persist the new URL on the entity.
   */
  @Post('regenerate/:type/:id')
  @ApiOperation({ summary: 'Regenerate and re-store PDF for a document' })
  @ApiResponse({ status: 200, description: 'PDF regenerated successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async regeneratePDF(@Param('type') type: string, @Param('id') id: string) {
    const validTypes = ['invoice', 'quote', 'delivery-note'];
    if (!validTypes.includes(type)) {
      return ApiRes(
        { code: 'PDF400_01', status: 400, message: 'Invalid document type' },
        null,
      );
    }
    const newUrl = await this.pdfService.regeneratePDF(
      type as 'invoice' | 'quote' | 'delivery-note',
      parseInt(id),
    );
    return ApiRes(PDF.REGENERATED, { pdfUrl: newUrl });
  }
}
