import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module';

// Services
import { WarehouseService } from './warehouse.service';
import { UnitOfMeasureService } from './unit-of-measure.service';
import { StockService } from './stock.service';
import { InventoryAdjustmentService } from './inventory-adjustment.service';

// Controllers
import { WarehouseController } from './warehouse.controller';
import { UnitOfMeasureController } from './unit-of-measure.controller';
import { StockController } from './stock.controller';
import { StockMovementController } from './stock-movement.controller';
import { InventoryAdjustmentController } from './inventory-adjustment.controller';

@Module({
  imports: [TenantModule],
  controllers: [
    WarehouseController,
    UnitOfMeasureController,
    StockController,
    StockMovementController,
    InventoryAdjustmentController,
  ],
  providers: [
    WarehouseService,
    UnitOfMeasureService,
    StockService,
    InventoryAdjustmentService,
  ],
  exports: [
    WarehouseService,
    UnitOfMeasureService,
    StockService,
    InventoryAdjustmentService,
  ],
})
export class InventoryModule { }
