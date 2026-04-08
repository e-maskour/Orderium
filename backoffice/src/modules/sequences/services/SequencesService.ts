import {
  CreateSequenceDTO,
  UpdateSequenceDTO,
  SequencePreview,
} from '../interfaces/Sequence.interface';
import { Sequence } from '../sequences.model';
import { apiClient, API_ROUTES } from '../../../common';

/**
 * Translate UI DTO field names (yearInPrefix, …) → API field names (yearInFormat, …)
 * before sending create / update requests.
 */
function toApiDto(dto: Partial<CreateSequenceDTO>): Record<string, unknown> {
  const mapped: Record<string, unknown> = { ...dto };
  if ('yearInPrefix' in dto) {
    mapped['yearInFormat'] = dto.yearInPrefix;
    delete mapped['yearInPrefix'];
  }
  if ('monthInPrefix' in dto) {
    mapped['monthInFormat'] = dto.monthInPrefix;
    delete mapped['monthInPrefix'];
  }
  if ('dayInPrefix' in dto) {
    mapped['dayInFormat'] = dto.dayInPrefix;
    delete mapped['dayInPrefix'];
  }
  if ('trimesterInPrefix' in dto) {
    mapped['trimesterInFormat'] = dto.trimesterInPrefix;
    delete mapped['trimesterInPrefix'];
  }
  return mapped;
}

export class SequencesService {
  private static instance: SequencesService;

  public static getInstance(): SequencesService {
    if (!SequencesService.instance) {
      SequencesService.instance = new SequencesService();
    }
    return SequencesService.instance;
  }

  async getAll(): Promise<Sequence[]> {
    const response = await apiClient.get<any[]>(API_ROUTES.SEQUENCES.LIST);
    const items = response?.data || [];
    return items.map((s: any) => Sequence.fromApiResponse(s));
  }

  async getById(id: string): Promise<Sequence> {
    const response = await apiClient.get<any>(API_ROUTES.SEQUENCES.DETAIL(id));
    return Sequence.fromApiResponse(response.data);
  }

  async getByEntityType(entityType: string): Promise<Sequence | null> {
    const sequences = await this.getAll();
    return sequences.find((seq) => seq.entityType === entityType && seq.isActive) || null;
  }

  async create(data: CreateSequenceDTO): Promise<Sequence> {
    const response = await apiClient.post<any>(API_ROUTES.SEQUENCES.CREATE, toApiDto(data));
    return Sequence.fromApiResponse(response.data);
  }

  async update(id: string, data: UpdateSequenceDTO): Promise<Sequence> {
    const response = await apiClient.patch<any>(API_ROUTES.SEQUENCES.UPDATE(id), toApiDto(data));
    return Sequence.fromApiResponse(response.data);
  }

  async delete(_id: string): Promise<void> {
    // Hard delete is not supported on the new API — deactivate instead.
    await apiClient.patch(API_ROUTES.SEQUENCES.UPDATE(_id), { isActive: false });
  }

  async generatePreview(data: Partial<CreateSequenceDTO>): Promise<SequencePreview> {
    const entityType = (data as any).entityType;
    if (!entityType) return { preview: '' };
    const response = await apiClient.get<any>(API_ROUTES.SEQUENCES.PREVIEW(entityType));
    return { preview: response?.data?.preview ?? '' };
  }

  async resetSequence(entityType: string): Promise<void> {
    await apiClient.post(API_ROUTES.SEQUENCES.RESET(entityType));
  }
}

export const sequencesService = SequencesService.getInstance();

