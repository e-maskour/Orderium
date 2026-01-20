import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Warehouse } from './entities/warehouse.entity';
import { UnitOfMeasure } from './entities/unit-of-measure.entity';
import { StockQuant } from './entities/stock-quant.entity';
import { StockMovement } from './entities/stock-movement.entity';
import {
  InventoryAdjustment,
  AdjustmentLine,
} from './entities/inventory-adjustment.entity';
import { Product } from '../products/entities/product.entity';

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
  imports: [
    TypeOrmModule.forFeature([
      Warehouse,
      UnitOfMeasure,
      StockQuant,
      StockMovement,
      InventoryAdjustment,
      AdjustmentLine,
      Product,
    ]),
  ],
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
export class InventoryModule {}
