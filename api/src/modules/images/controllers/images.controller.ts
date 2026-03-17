import {
  Controller,
  Post,
  Delete,
  Get,
  UploadedFile,
  UseInterceptors,
  Query,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { ImageService } from '../services/image.service';
import { ImageResponseDto } from '../dto/image.dto';
import { ApiRes } from '../../../common/api-response';
import { IMG } from '../../../common/response-codes';

@ApiTags('Images')
@Controller('images')
export class ImagesController {
  constructor(private readonly imageService: ImageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Upload an image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    type: ImageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.imageService.uploadImage(
      file,
      folder || 'general',
    );

    return ApiRes(IMG.UPLOADED, { ...result, uploadedAt: new Date() });
  }

  @Delete('delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an image by public ID' })
  @ApiResponse({ status: 200, description: 'Image deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid public ID' })
  async deleteImage(@Query('publicId') publicId?: string) {
    if (!publicId) {
      throw new BadRequestException('publicId query parameter is required');
    }

    await this.imageService.deleteImage(publicId);

    return ApiRes(IMG.DELETED, null);
  }

  @Get('optimize')
  @ApiOperation({ summary: 'Get optimized image URL' })
  @ApiQuery({ name: 'url', description: 'Original image URL' })
  @ApiQuery({ name: 'width', description: 'Image width', required: false })
  @ApiQuery({ name: 'height', description: 'Image height', required: false })
  @ApiQuery({
    name: 'crop',
    description: 'Crop mode: fill, fit, scale',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Optimized image URL',
    schema: {
      properties: {
        url: { type: 'string' },
      },
    },
  })
  getOptimizedUrl(
    @Query('url') url?: string,
    @Query('width') width?: string,
    @Query('height') height?: string,
    @Query('crop') crop?: string,
  ) {
    if (!url) {
      throw new BadRequestException('url query parameter is required');
    }

    const optimizedUrl = this.imageService.transformUrl(url, {
      width: width ? parseInt(width, 10) : undefined,
      height: height ? parseInt(height, 10) : undefined,
      crop: (crop as any) || undefined,
    });

    return ApiRes(IMG.OPTIMIZED, { url: optimizedUrl });
  }

  @Get('thumbnail')
  @ApiOperation({ summary: 'Get thumbnail URL' })
  @ApiQuery({ name: 'url', description: 'Original image URL' })
  @ApiQuery({ name: 'size', description: 'Thumbnail size', required: false })
  @ApiResponse({
    status: 200,
    description: 'Thumbnail URL',
    schema: {
      properties: {
        url: { type: 'string' },
      },
    },
  })
  getThumbnailUrl(@Query('url') url?: string, @Query('size') size?: string) {
    if (!url) {
      throw new BadRequestException('url query parameter is required');
    }

    const thumbnailSize = size ? parseInt(size, 10) : 300;
    const thumbnailUrl = this.imageService.getThumbnailUrl(url, thumbnailSize);

    return ApiRes(IMG.THUMBNAIL, { url: thumbnailUrl });
  }

  @Get('provider')
  @ApiOperation({ summary: 'Get storage provider information' })
  @ApiResponse({
    status: 200,
    description: 'Provider information',
    schema: {
      properties: {
        provider: { type: 'string' },
        name: { type: 'string' },
        configured: { type: 'boolean' },
      },
    },
  })
  getProviderInfo() {
    const providerInfo = this.imageService.getProviderInfo();

    return ApiRes(IMG.PROVIDER_INFO, providerInfo);
  }
}
