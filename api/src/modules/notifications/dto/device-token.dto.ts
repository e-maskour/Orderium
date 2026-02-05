import { IsString, IsEnum, IsOptional } from 'class-validator';
import { DevicePlatform, AppType } from '../entities/device-token.entity';

export class RegisterDeviceTokenDto {
  @IsString()
  token: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsEnum(AppType)
  appType: AppType;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  browserName?: string;

  @IsOptional()
  @IsString()
  osName?: string;
}

export class UnregisterDeviceTokenDto {
  @IsString()
  token: string;
}
