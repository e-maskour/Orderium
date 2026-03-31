import { apiClient } from './client'
import type {
    TenantMigrationStatus,
    MigrationRunLog,
    RunAllResult,
    LogsFilterParams,
} from '../types/migration'

export const migrationsApi = {
    getAllStatus: async (): Promise<TenantMigrationStatus[]> => {
        const { data } = await apiClient.get('/super-admin/migrations')
        return data
    },

    getTenantStatus: async (tenantId: number): Promise<TenantMigrationStatus> => {
        const { data } = await apiClient.get(`/super-admin/migrations/${tenantId}`)
        return data
    },

    runForTenant: async (tenantId: number): Promise<MigrationRunLog> => {
        const { data } = await apiClient.post(`/super-admin/migrations/${tenantId}/run`)
        return data
    },

    runAll: async (): Promise<RunAllResult[]> => {
        const { data } = await apiClient.post('/super-admin/migrations/run-all')
        return data
    },

    revertForTenant: async (tenantId: number): Promise<MigrationRunLog> => {
        const { data } = await apiClient.post(`/super-admin/migrations/${tenantId}/revert`)
        return data
    },

    getLogs: async (params: LogsFilterParams = {}): Promise<MigrationRunLog[]> => {
        const { data } = await apiClient.get('/super-admin/migrations/logs', { params })
        return data
    },
}
