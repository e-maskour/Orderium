import { Sequence, CreateSequenceDTO, UpdateSequenceDTO, SequencePreview } from '../interfaces/Sequence.interface';

const BASE_URL = 'http://localhost:3000/api';

export class SequencesService {
  private static instance: SequencesService;
  
  public static getInstance(): SequencesService {
    if (!SequencesService.instance) {
      SequencesService.instance = new SequencesService();
    }
    return SequencesService.instance;
  }

  async getConfiguration(): Promise<any> {
    const response = await fetch(`${BASE_URL}/configurations/entity/sequences`);
    if (!response.ok) {
      throw new Error('Failed to fetch sequences configuration');
    }
    return response.json();
  }

  async getAll(): Promise<Sequence[]> {
    const response = await this.getConfiguration();
    return response?.configuration?.values?.sequences || [];
  }

  async getById(id: string): Promise<Sequence> {
    const sequences = await this.getAll();
    const sequence = sequences.find(seq => seq.id === id);
    if (!sequence) {
      throw new Error(`Sequence with id ${id} not found`);
    }
    return sequence;
  }

  async getByEntityType(entityType: string): Promise<Sequence | null> {
    const sequences = await this.getAll();
    return sequences.find(seq => seq.entityType === entityType && seq.isActive) || null;
  }

  async create(data: CreateSequenceDTO): Promise<Sequence> {
    const response = await fetch(`${BASE_URL}/configurations/entity/sequences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create sequence');
    }

    return response.json();
  }

  async update(id: string, data: UpdateSequenceDTO): Promise<Sequence> {
    const response = await fetch(`${BASE_URL}/configurations/entity/sequences/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update sequence');
    }

    return response.json();
  }

  async delete(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/configurations/entity/sequences/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete sequence');
    }
  }

  async generatePreview(data: Partial<CreateSequenceDTO>): Promise<SequencePreview> {
    const response = await fetch(`${BASE_URL}/configurations/entity/sequences/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate preview');
    }

    return response.json();
  }

  async resetSequence(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/configurations/entity/sequences/${id}/reset`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reset sequence');
    }
  }
}

export const sequencesService = SequencesService.getInstance();