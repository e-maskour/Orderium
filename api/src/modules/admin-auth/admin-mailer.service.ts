import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

/**
 * Sends super-admin sign-in codes over SMTP.
 *
 * Config: SMTP_HOST, SMTP_PORT (587), SMTP_SECURE ("true" for 465),
 * SMTP_USER, SMTP_PASS, SMTP_FROM.
 *
 * Without SMTP_HOST, outside production the code is written to the API log so
 * local development works; in production the request fails instead.
 */
@Injectable()
export class AdminMailerService {
  private readonly logger = new Logger(AdminMailerService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) return null;
    const user = this.config.get<string>('SMTP_USER');
    this.transporter = createTransport({
      host,
      port: Number(this.config.get('SMTP_PORT') ?? 587),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: user
        ? { user, pass: this.config.get<string>('SMTP_PASS') ?? '' }
        : undefined,
    });
    return this.transporter;
  }

  async sendLoginCode(to: string, code: string, ttlMinutes: number) {
    const transporter = this.getTransporter();
    if (!transporter) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new ServiceUnavailableException(
          'Email delivery is not configured (SMTP_HOST missing)',
        );
      }
      this.logger.warn(
        `[DEV — SMTP not configured] Admin sign-in code for ${to}: ${code}`,
      );
      return;
    }

    const from =
      this.config.get<string>('SMTP_FROM') ??
      this.config.get<string>('SMTP_USER') ??
      'no-reply@localhost';

    try {
      await transporter.sendMail({
        from,
        to,
        subject: `Your Marnova admin sign-in code: ${code}`,
        text:
          `Your Marnova admin portal sign-in code is ${code}.\n\n` +
          `It expires in ${ttlMinutes} minutes. If you did not try to sign in, ` +
          `change your password immediately.`,
        html:
          `<p>Your Marnova admin portal sign-in code is:</p>` +
          `<p style="font-size:28px;font-weight:700;letter-spacing:6px;font-family:monospace">${code}</p>` +
          `<p>It expires in ${ttlMinutes} minutes. If you did not try to sign in, ` +
          `change your password immediately.</p>`,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send admin sign-in code: ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'Could not send the sign-in email. Try again or use another method.',
      );
    }
  }
}
