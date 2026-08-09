import { EntityManager, In } from 'typeorm';
import { NotificationTemplate } from '../../modules/notifications/entities/notification-template.entity';
import { DEFAULT_NOTIFICATION_TEMPLATES } from '../../modules/notifications/notification-templates.defaults';
import { SeederDefinition } from './seeder.types';

const TEMPLATE_KEYS = DEFAULT_NOTIFICATION_TEMPLATES.map((t) => t.key);

export const notificationTemplatesSeeder: SeederDefinition = {
  key: 'notification-templates',
  name: 'Notification templates',
  description:
    'Installs the default push/notification copy. New templates added to the ' +
    'defaults show up as missing until this is re-run.',

  async check(m: EntityManager) {
    const present = await m
      .getRepository(NotificationTemplate)
      .countBy({ key: In(TEMPLATE_KEYS) });
    const missing = TEMPLATE_KEYS.length - present;
    return {
      missing,
      detail: missing
        ? `${missing} of ${TEMPLATE_KEYS.length} templates missing`
        : `All ${TEMPLATE_KEYS.length} templates present`,
    };
  },

  async run(m: EntityManager) {
    const repo = m.getRepository(NotificationTemplate);
    const existing = await repo.find({
      where: { key: In(TEMPLATE_KEYS) },
      select: { key: true },
    });
    const have = new Set(existing.map((t) => t.key));

    let created = 0;
    for (const tpl of DEFAULT_NOTIFICATION_TEMPLATES) {
      if (have.has(tpl.key)) continue;
      await repo.save(
        repo.create({
          key: tpl.key,
          category: tpl.category,
          portal: tpl.portal,
          titleFr: tpl.titleFr,
          bodyFr: tpl.bodyFr,
          titleAr: tpl.titleAr || null,
          bodyAr: tpl.bodyAr || null,
          description: tpl.description || null,
          priority: tpl.priority,
          enabled: tpl.enabled,
        }),
      );
      created++;
    }

    return {
      created,
      pruned: 0,
      detail: `${created} inserted, ${TEMPLATE_KEYS.length - created} already present`,
    };
  },
};
