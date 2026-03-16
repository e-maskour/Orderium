import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitOfMeasure } from './entities/unit-of-measure.entity';
import {
  CreateUnitOfMeasureDto,
  UpdateUnitOfMeasureDto,
} from './dto/unit-of-measure.dto';

@Injectable()
export class UnitOfMeasureService {
  constructor(
    @InjectRepository(UnitOfMeasure)
    private readonly uomRepository: Repository<UnitOfMeasure>,
  ) {}

  async create(createDto: CreateUnitOfMeasureDto): Promise<UnitOfMeasure> {
    // Check if code already exists
    const existing = await this.uomRepository.findOne({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new BadRequestException(
        `Unit of measure with code '${createDto.code}' already exists`,
      );
    }

    // If this is set as base unit, unset other base units in the same category
    if (createDto.isBaseUnit) {
      await this.uomRepository.update(
        { category: createDto.category, isBaseUnit: true },
        { isBaseUnit: false },
      );
    }

    // Validate base unit if provided
    if (createDto.baseUnitId) {
      const baseUnit = await this.uomRepository.findOne({
        where: { id: createDto.baseUnitId },
      });
      if (!baseUnit) {
        throw new NotFoundException(
          `Base unit with ID ${createDto.baseUnitId} not found`,
        );
      }
      if (baseUnit.category !== createDto.category) {
        throw new BadRequestException('Base unit must be in the same category');
      }
    }

    const uom = this.uomRepository.create(createDto);
    return this.uomRepository.save(uom);
  }

  async findAll(category?: string): Promise<UnitOfMeasure[]> {
    const query = this.uomRepository
      .createQueryBuilder('uom')
      .leftJoinAndSelect('uom.baseUnit', 'baseUnit')
      .where('uom.isActive = :isActive', { isActive: true });

    if (category) {
      query.andWhere('uom.category = :category', { category });
    }

    query.orderBy('uom.category', 'ASC').addOrderBy('uom.name', 'ASC');

    return query.getMany();
  }

  async findOne(id: number): Promise<UnitOfMeasure> {
    const uom = await this.uomRepository.findOne({
      where: { id },
      relations: ['baseUnit'],
    });

    if (!uom) {
      throw new NotFoundException(`Unit of measure with ID ${id} not found`);
    }

    return uom;
  }

  async update(
    id: number,
    updateDto: UpdateUnitOfMeasureDto,
  ): Promise<UnitOfMeasure> {
    const uom = await this.findOne(id);

    // Check if code is being changed and already exists
    if (updateDto.code && updateDto.code !== uom.code) {
      const existing = await this.uomRepository.findOne({
        where: { code: updateDto.code },
      });
      if (existing) {
        throw new BadRequestException(
          `Unit of measure with code '${updateDto.code}' already exists`,
        );
      }
    }

    // If this is set as base unit, unset other base units in the same category
    if (updateDto.isBaseUnit && !uom.isBaseUnit) {
      const category = updateDto.category || uom.category;
      await this.uomRepository.update(
        { category, isBaseUnit: true },
        { isBaseUnit: false },
      );
    }

    Object.assign(uom, updateDto);
    return this.uomRepository.save(uom);
  }

  async remove(id: number): Promise<void> {
    const uom = await this.findOne(id);

    // Check if UoM is being used
    // This would require checking stock_quants and stock_movements tables
    // For now, soft delete
    uom.isActive = false;
    await this.uomRepository.save(uom);
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    const result = await this.uomRepository
      .createQueryBuilder('uom')
      .select('DISTINCT uom.category', 'category')
      .where('uom.isActive = :isActive', { isActive: true })
      .orderBy('uom.category', 'ASC')
      .getRawMany<{ category: string }>();

    return result.map((r) => r.category);
  }

  /**
   * Convert quantity between units in the same category
   */
  async convertQuantity(
    quantity: number,
    fromUomId: number,
    toUomId: number,
  ): Promise<number> {
    const fromUom = await this.findOne(fromUomId);
    const toUom = await this.findOne(toUomId);

    if (fromUom.category !== toUom.category) {
      throw new BadRequestException(
        'Cannot convert between different categories',
      );
    }

    // Convert to base unit first, then to target unit
    const baseQuantity = quantity * fromUom.ratio;
    const targetQuantity = baseQuantity / toUom.ratio;

    // Apply rounding if specified
    if (toUom.roundingPrecision) {
      const precision = parseFloat(toUom.roundingPrecision);
      return Math.round(targetQuantity / precision) * precision;
    }

    return targetQuantity;
  }
}
