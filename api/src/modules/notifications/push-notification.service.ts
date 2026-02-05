import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import {
  DeviceToken,
  DevicePlatform,
  AppType,
} from './entities/device-token.entity';
import { RegisterDeviceTokenDto } from './dto/device-token.dto';
import { Portal } from '../portal/entities/portal.entity';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  clickAction?: string;
}

export interface SendNotificationOptions {
  userIds?: number[];
  appTypes?: AppType[];
  platforms?: DevicePlatform[];
  excludeUserIds?: number[];
}

@Injectable()
export class PushNotificationService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationService.name);
  private firebaseApp: admin.app.App | null = null;

  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    @InjectRepository(Portal)
    private readonly portalRepository: Repository<Portal>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeFirebase();
  }

  private async initializeFirebase() {
    try {
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>(
        'FIREBASE_CLIENT_EMAIL',
      );
      const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn(
          'Firebase credentials not configured. Push notifications will be disabled.',
        );
        return;
      }

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Handle escaped newlines in private key
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });

      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK:', error);
    }
  }

  /**
   * Register a device token for push notifications
   */
  async registerDeviceToken(
    userId: number,
    dto: RegisterDeviceTokenDto,
  ): Promise<DeviceToken> {
    // Check if token already exists
    let deviceToken = await this.deviceTokenRepository.findOne({
      where: { token: dto.token },
    });

    if (deviceToken) {
      // Update existing token (may have been assigned to different user)
      deviceToken.userId = userId;
      deviceToken.platform = dto.platform;
      deviceToken.appType = dto.appType;
      deviceToken.deviceName = dto.deviceName || null;
      deviceToken.browserName = dto.browserName || null;
      deviceToken.osName = dto.osName || null;
      deviceToken.isActive = true;
      deviceToken.lastUsedAt = new Date();
    } else {
      // Create new token
      deviceToken = this.deviceTokenRepository.create({
        userId,
        token: dto.token,
        platform: dto.platform,
        appType: dto.appType,
        deviceName: dto.deviceName || null,
        browserName: dto.browserName || null,
        osName: dto.osName || null,
        isActive: true,
        lastUsedAt: new Date(),
      });
    }

    return this.deviceTokenRepository.save(deviceToken);
  }

  /**
   * Unregister a device token
   */
  async unregisterDeviceToken(token: string): Promise<void> {
    await this.deviceTokenRepository.update({ token }, { isActive: false });
  }

  /**
   * Remove invalid/expired tokens
   */
  async removeInvalidTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;

    await this.deviceTokenRepository.delete({
      token: In(tokens),
    });

    this.logger.log(`Removed ${tokens.length} invalid device tokens`);
  }

  /**
   * Get device tokens based on options
   */
  async getDeviceTokens(
    options: SendNotificationOptions,
  ): Promise<DeviceToken[]> {
    const queryBuilder = this.deviceTokenRepository
      .createQueryBuilder('dt')
      .where('dt.isActive = :isActive', { isActive: true });

    if (options.userIds && options.userIds.length > 0) {
      queryBuilder.andWhere('dt.userId IN (:...userIds)', {
        userIds: options.userIds,
      });
    }

    if (options.excludeUserIds && options.excludeUserIds.length > 0) {
      queryBuilder.andWhere('dt.userId NOT IN (:...excludeUserIds)', {
        excludeUserIds: options.excludeUserIds,
      });
    }

    if (options.appTypes && options.appTypes.length > 0) {
      queryBuilder.andWhere('dt.appType IN (:...appTypes)', {
        appTypes: options.appTypes,
      });
    }

    if (options.platforms && options.platforms.length > 0) {
      queryBuilder.andWhere('dt.platform IN (:...platforms)', {
        platforms: options.platforms,
      });
    }

    return queryBuilder.getMany();
  }

  /**
   * Get all admin user IDs
   */
  async getAdminUserIds(): Promise<number[]> {
    const admins = await this.portalRepository.find({
      where: { isAdmin: true, isActive: true },
      select: ['id'],
    });
    return admins.map((a) => a.id);
  }

  /**
   * Get user ID by customer ID
   */
  async getUserIdByCustomerId(customerId: number): Promise<number | null> {
    const portal = await this.portalRepository.findOne({
      where: { customerId, isActive: true },
    });
    return portal?.id || null;
  }

  /**
   * Get user ID by delivery person ID
   */
  async getUserIdByDeliveryId(deliveryId: number): Promise<number | null> {
    const portal = await this.portalRepository.findOne({
      where: { deliveryId, isActive: true },
    });
    return portal?.id || null;
  }

  /**
   * Send push notification to specific tokens
   */
  async sendToTokens(
    tokens: string[],
    payload: PushNotificationPayload,
    options?: { dataOnlyWeb?: boolean },
  ): Promise<{
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
  }> {
    if (!this.firebaseApp) {
      this.logger.warn('Firebase not initialized. Skipping push notification.');
      return {
        successCount: 0,
        failureCount: tokens.length,
        invalidTokens: [],
      };
    }

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    const message: admin.messaging.MulticastMessage = options?.dataOnlyWeb
      ? {
          tokens,
          data: {
            ...(payload.data || {}),
            title: payload.title,
            body: payload.body,
            clickAction: payload.clickAction || '/',
          },
          webpush: {
            fcmOptions: {
              link: payload.clickAction || '/',
            },
          },
        }
      : {
          tokens,
          notification: {
            title: payload.title,
            body: payload.body,
            ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
          },
          data: payload.data || {},
          webpush: {
            notification: {
              title: payload.title,
              body: payload.body,
              icon: '/Eo_circle_deep-orange_white_letter-o.svg',
              badge: '/Eo_circle_deep-orange_white_letter-o.svg',
              ...(payload.imageUrl && { image: payload.imageUrl }),
            },
            fcmOptions: {
              link: payload.clickAction || '/',
            },
          },
          android: {
            notification: {
              title: payload.title,
              body: payload.body,
              icon: 'notification_icon',
              color: '#FF6B00',
              channelId: 'orderium_notifications',
              clickAction: payload.clickAction || 'OPEN_APP',
              ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
            },
            priority: 'high',
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: payload.title,
                  body: payload.body,
                },
                badge: 1,
                sound: 'default',
              },
            },
            fcmOptions: {
              ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
            },
          },
        };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);

      const invalidTokens: string[] = [];

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          // Token is invalid or expired
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
          this.logger.warn(
            `FCM send failed for token ${idx}: ${resp.error?.message}`,
          );
        }
      });

      // Clean up invalid tokens asynchronously
      if (invalidTokens.length > 0) {
        this.removeInvalidTokens(invalidTokens).catch((err) => {
          this.logger.error('Failed to remove invalid tokens:', err);
        });
      }

      this.logger.log(
        `Push notification sent: ${response.successCount} success, ${response.failureCount} failures`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      this.logger.error('Failed to send push notification:', error);
      return {
        successCount: 0,
        failureCount: tokens.length,
        invalidTokens: [],
      };
    }
  }

  /**
   * Send push notification based on options
   */
  async send(
    payload: PushNotificationPayload,
    options: SendNotificationOptions,
  ): Promise<{ successCount: number; failureCount: number }> {
    const deviceTokens = await this.getDeviceTokens(options);

    if (deviceTokens.length === 0) {
      this.logger.debug('No device tokens found for notification');
      return { successCount: 0, failureCount: 0 };
    }

    const tokens = deviceTokens.map((dt) => dt.token);
    const isBackofficeOnly =
      options.appTypes?.length === 1 && options.appTypes[0] === AppType.BACKOFFICE;
    const result = await this.sendToTokens(tokens, payload, {
      dataOnlyWeb: isBackofficeOnly,
    });

    return {
      successCount: result.successCount,
      failureCount: result.failureCount,
    };
  }

  /**
   * Send notification to all admins (backoffice)
   */
  async sendToAdmins(payload: PushNotificationPayload): Promise<void> {
    const adminIds = await this.getAdminUserIds();

    if (adminIds.length === 0) {
      this.logger.warn('No admin users found');
      return;
    }

    await this.send(payload, {
      userIds: adminIds,
      appTypes: [AppType.BACKOFFICE],
    });
  }

  /**
   * Send notification to a specific customer
   */
  async sendToCustomer(
    customerId: number,
    payload: PushNotificationPayload,
  ): Promise<void> {
    const userId = await this.getUserIdByCustomerId(customerId);

    if (!userId) {
      this.logger.debug(`No portal user found for customer ${customerId}`);
      return;
    }

    await this.send(payload, {
      userIds: [userId],
      appTypes: [AppType.CLIENT],
    });
  }

  /**
   * Send notification to a specific delivery person
   */
  async sendToDeliveryPerson(
    deliveryId: number,
    payload: PushNotificationPayload,
  ): Promise<void> {
    const userId = await this.getUserIdByDeliveryId(deliveryId);

    if (!userId) {
      this.logger.debug(
        `No portal user found for delivery person ${deliveryId}`,
      );
      return;
    }

    await this.send(payload, {
      userIds: [userId],
      appTypes: [AppType.DELIVERY],
    });
  }

  /**
   * Get user's registered devices
   */
  async getUserDevices(userId: number): Promise<DeviceToken[]> {
    return this.deviceTokenRepository.find({
      where: { userId, isActive: true },
      order: { lastUsedAt: 'DESC' },
    });
  }

  /**
   * Update token last used timestamp
   */
  async updateLastUsed(token: string): Promise<void> {
    await this.deviceTokenRepository.update(
      { token },
      { lastUsedAt: new Date() },
    );
  }
}
