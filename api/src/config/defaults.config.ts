import { registerAs } from '@nestjs/config';

export default registerAs('defaults', () => ({
  cashRegisterId: parseInt(process.env.DEFAULT_CASH_REGISTER_ID, 10) || 1,
  warehouseId: parseInt(process.env.DEFAULT_WAREHOUSE_ID, 10) || 1,
  documentTypeId: parseInt(process.env.DEFAULT_DOCUMENT_TYPE_ID, 10) || 2,
  paidStatus: parseInt(process.env.DEFAULT_PAID_STATUS, 10) || 2,
}));
