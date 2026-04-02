import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { notificationsService } from '../modules/notifications/notifications.service';
import type { NotificationFilters } from '../modules/notifications/notifications.interface';
import type { Notification } from '../modules/notifications/notifications.model';

const NOTIFICATIONS_KEY = ['notifications'] as const;
const UNREAD_COUNT_KEY = ['notifications', 'unread-count'] as const;

export function useNotifications(filters?: NotificationFilters) {
    const { admin } = useAuth();
    const queryClient = useQueryClient();

    // Fetch notifications list
    const {
        data: notificationsData,
        isLoading,
    } = useQuery({
        queryKey: [...NOTIFICATIONS_KEY, 'list', filters],
        queryFn: () =>
            notificationsService.getNotifications(
                { ...filters, isArchived: false },
                { page: 1, limit: 50, sortBy: 'dateCreated', sortOrder: 'DESC' }
            ),
        enabled: !!admin,
        staleTime: 30000,
        refetchInterval: 30000,
    });

    // Fetch unread count
    const { data: unreadData } = useQuery({
        queryKey: [...UNREAD_COUNT_KEY],
        queryFn: () => notificationsService.getUnreadCount(),
        enabled: !!admin,
        staleTime: 30000,
        refetchInterval: 30000,
    });

    const notifications: Notification[] = notificationsData?.data ?? [];
    const unreadCount: number = unreadData?.count ?? 0;

    // Has critical/high unread
    const hasCriticalUnread = notifications.some(
        (n) => !n.isRead && n.isCriticalOrHigh
    );

    // --- Optimistic mutations ---

    const markAsReadMutation = useMutation({
        mutationFn: (id: number) => notificationsService.markAsRead(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
            await queryClient.cancelQueries({ queryKey: UNREAD_COUNT_KEY });

            const prevNotifications = queryClient.getQueriesData({ queryKey: NOTIFICATIONS_KEY });
            const prevCount = queryClient.getQueryData(UNREAD_COUNT_KEY);

            // Optimistically update all notification lists
            queryClient.setQueriesData(
                { queryKey: NOTIFICATIONS_KEY },
                (old: any) => {
                    if (!old?.data) return old;
                    return {
                        ...old,
                        data: old.data.map((n: Notification) =>
                            n.id === id ? Object.assign(Object.create(Object.getPrototypeOf(n)), n, { isRead: true }) : n
                        ),
                    };
                }
            );

            // Decrement unread count
            queryClient.setQueryData(UNREAD_COUNT_KEY, (old: any) => ({
                count: Math.max(0, (old?.count ?? 1) - 1),
            }));

            return { prevNotifications, prevCount };
        },
        onError: (_err, _id, context) => {
            if (context?.prevNotifications) {
                context.prevNotifications.forEach(([key, data]) => {
                    queryClient.setQueryData(key, data);
                });
            }
            if (context?.prevCount) {
                queryClient.setQueryData(UNREAD_COUNT_KEY, context.prevCount);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
            queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => notificationsService.markAllAsRead(),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
            await queryClient.cancelQueries({ queryKey: UNREAD_COUNT_KEY });

            const prevNotifications = queryClient.getQueriesData({ queryKey: NOTIFICATIONS_KEY });
            const prevCount = queryClient.getQueryData(UNREAD_COUNT_KEY);

            queryClient.setQueriesData(
                { queryKey: NOTIFICATIONS_KEY },
                (old: any) => {
                    if (!old?.data) return old;
                    return {
                        ...old,
                        data: old.data.map((n: Notification) =>
                            Object.assign(Object.create(Object.getPrototypeOf(n)), n, { isRead: true })
                        ),
                    };
                }
            );

            queryClient.setQueryData(UNREAD_COUNT_KEY, { count: 0 });

            return { prevNotifications, prevCount };
        },
        onError: (_err, _vars, context) => {
            if (context?.prevNotifications) {
                context.prevNotifications.forEach(([key, data]) => {
                    queryClient.setQueryData(key, data);
                });
            }
            if (context?.prevCount) {
                queryClient.setQueryData(UNREAD_COUNT_KEY, context.prevCount);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
            queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
        },
    });

    const dismissMutation = useMutation({
        mutationFn: (id: number) => notificationsService.delete(id),
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
            await queryClient.cancelQueries({ queryKey: UNREAD_COUNT_KEY });

            const prevNotifications = queryClient.getQueriesData({ queryKey: NOTIFICATIONS_KEY });
            const prevCount = queryClient.getQueryData(UNREAD_COUNT_KEY);

            let wasUnread = false;
            queryClient.setQueriesData(
                { queryKey: NOTIFICATIONS_KEY },
                (old: any) => {
                    if (!old?.data) return old;
                    const target = old.data.find((n: Notification) => n.id === id);
                    if (target && !target.isRead) wasUnread = true;
                    return {
                        ...old,
                        data: old.data.filter((n: Notification) => n.id !== id),
                        total: Math.max(0, (old.total ?? 0) - 1),
                    };
                }
            );

            if (wasUnread) {
                queryClient.setQueryData(UNREAD_COUNT_KEY, (old: any) => ({
                    count: Math.max(0, (old?.count ?? 1) - 1),
                }));
            }

            return { prevNotifications, prevCount };
        },
        onError: (_err, _id, context) => {
            if (context?.prevNotifications) {
                context.prevNotifications.forEach(([key, data]) => {
                    queryClient.setQueryData(key, data);
                });
            }
            if (context?.prevCount) {
                queryClient.setQueryData(UNREAD_COUNT_KEY, context.prevCount);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
            queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
        },
    });

    const markAsRead = useCallback((id: number) => markAsReadMutation.mutate(id), [markAsReadMutation]);
    const markAllRead = useCallback(() => markAllReadMutation.mutate(), [markAllReadMutation]);
    const dismiss = useCallback((id: number) => dismissMutation.mutate(id), [dismissMutation]);

    return {
        notifications,
        unreadCount,
        hasCriticalUnread,
        isLoading,
        markAsRead,
        markAllRead,
        dismiss,
    };
}
