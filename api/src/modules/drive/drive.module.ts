import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriveNode } from './entities/drive-node.entity';
import { DriveVersion } from './entities/drive-version.entity';
import { DriveShare } from './entities/drive-share.entity';
import { DriveActivity } from './entities/drive-activity.entity';
import { DriveTag } from './entities/drive-tag.entity';
import { DriveNodeTag } from './entities/drive-node-tag.entity';
import { DriveController } from './drive.controller';
import { DriveService } from './drive.service';
import { DriveStorageService } from './drive-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DriveNode,
      DriveVersion,
      DriveShare,
      DriveActivity,
      DriveTag,
      DriveNodeTag,
    ]),
  ],
  controllers: [DriveController],
  providers: [DriveService, DriveStorageService],
  exports: [DriveService],
})
export class DriveModule {}
