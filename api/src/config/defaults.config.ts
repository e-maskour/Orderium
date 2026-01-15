import { registerAs } from '@nestjs/config';

export default registerAs('defaults', () => ({
  warehouseId: parseInt(process.env.DEFAULT_WAREHOUSE_ID || '1', 10),
  documentTypeId: parseInt(process.env.DEFAULT_DOCUMENT_TYPE_ID || '2', 10),
  paidStatus: parseInt(process.env.DEFAULT_PAID_STATUS || '2', 10),
}));
