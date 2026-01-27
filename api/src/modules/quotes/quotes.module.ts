import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { Quote, QuoteItem } from './entities/quote.entity';
import { Product } from '../products/entities/product.entity';
import { ConfigurationsModule } from '../configurations/configurations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quote, QuoteItem, Product]),
    ConfigurationsModule,
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
