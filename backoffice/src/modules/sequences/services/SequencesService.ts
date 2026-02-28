import { CreateSequenceDTO, UpdateSequenceDTO, SequencePreview } from '../interfaces/Sequence.interface';
import { Sequence } from '../sequences.model';
import { apiClient, API_ROUTES } from '../../../common';

export class SequencesService {
  private static instance: SequencesService;

  public static getInstance(): SequencesService {
    if (!SequencesService.instance) {
      SequencesService.instance = new SequencesService();
    }
    return SequencesService.instance;
  }

  async getConfiguration(): Promise<any> {
    return apiClient.get<any>(API_ROUTES.SEQUENCES.CONFIG);
  }

  async getAll(): Promise<Sequence[]> {
    const response = await this.getConfiguration();
    const sequences = response?.data?.values?.sequences || [];
    return sequences.map((s: any) => Sequence.fromApiResponse(s));
  }

  async getById(id: string): Promise<Sequence> {
    const sequences = await this.getAll();
    const sequence = sequences.find((seq) => seq.id === id);
    if (!sequence) {
      throw new Error(`ISequence with id ${id} not found`);
    }
    return sequence;
  }

  async getByEntityType(entityType: string): Promise<Sequence | null> {
    const sequences = await this.getAll();
    return sequences.find((seq) => seq.entityType === entityType && seq.isActive) || null;
  }

  async create(data: CreateSequenceDTO): Promise<Sequence> {
    const response = await apiClient.post<any>(API_ROUTES.SEQUENCES.CREATE, data);
    return Sequence.fromApiResponse(response.data);
  }

  async update(id: string, data: UpdateSequenceDTO): Promise<Sequence> {
    const response = await apiClient.put<any>(API_ROUTES.SEQUENCES.UPDATE(id), data);
    return Sequence.fromApiResponse(response.data);
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(API_ROUTES.SEQUENCES.DELETE(id));
  }

  async generatePreview(data: Partial<CreateSequenceDTO>): Promise<SequencePreview> {
    const response = await apiClient.post<SequencePreview>(API_ROUTES.SEQUENCES.PREVIEW, data);
    return response.data;
  }

  async resetSequence(id: string): Promise<void> {
    await apiClient.post(API_ROUTES.SEQUENCES.RESET(id));
  }
}

export const sequencesService = SequencesService.getInstance();