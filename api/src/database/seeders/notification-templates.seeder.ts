import { DataSource } from 'typeorm';
import { NotificationTemplate } from '../../modules/notifications/entities/notification-template.entity';
import { DEFAULT_NOTIFICATION_TEMPLATES } from '../../modules/notifications/notification-templates.defaults';

export async function seedNotificationTemplates(dataSource: DataSource) {
  const repo = dataSource.getRepository(NotificationTemplate);

  let inserted = 0;
  let skipped = 0;

  for (const tpl of DEFAULT_NOTIFICATION_TEMPLATES) {
    const exists = await repo.findOne({ where: { key: tpl.key } });
    if (exists) {
      skipped++;
      continue;
    }

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
    inserted++;
  }

  console.log(
    `  ✔ Notification templates: ${inserted} inserted, ${skipped} already exist`,
  );
}
