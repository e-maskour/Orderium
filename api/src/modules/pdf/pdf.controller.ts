import {
  Controller,
  Post,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { PDFService } from './pdf.service';
import { OrdersService } from '../orders/orders.service';

@Controller('pdf')
export class PDFController {
  constructor(
    private readonly pdfService: PDFService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post('invoice/:orderId')
  async generateInvoice(
    @Param('orderId') orderId: string,
    @Res() res: Response,
  ) {
    try {
      // Fetch order data with items
      const orderData = await this.ordersService.getOrderById(
        parseInt(orderId),
      );

      if (!orderData) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateInvoicePDF(orderData);

      // Set response headers
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice_${orderData.orderNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({
        error: 'PDF generation failed',
        message: error.message,
      });
    }
  }

  @Post('receipt/:orderId')
  async generateReceipt(
    @Param('orderId') orderId: string,
    @Res() res: Response,
  ) {
    try {
      const orderData = await this.ordersService.getOrderById(
        parseInt(orderId),
      );

      if (!orderData) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }

      const pdfBuffer = await this.pdfService.generateReceiptPDF(orderData);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Receipt_${orderData.orderNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({
        error: 'PDF generation failed',
        message: error.message,
      });
    }
  }
}
