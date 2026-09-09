import {
  IPrinter,
  CreatePrinterDTO,
  UpdatePrinterDTO,
  IPrintJob,
  IPrintAgent,
  CreatePrintAgentDTO,
  QueuePrintJobDTO,
} from './printers.interface';
import { Printer } from './printers.model';
import { apiClient, API_ROUTES } from '../../common';

export class PrintersService {
  async getPrinters(): Promise<Printer[]> {
    const response = await apiClient.get<IPrinter[]>(API_ROUTES.PRINTERS.LIST);
    return (response.data || []).map((p: any) => Printer.fromApiResponse(p));
  }

  async getPrinter(id: string): Promise<Printer> {
    const response = await apiClient.get<IPrinter>(API_ROUTES.PRINTERS.DETAIL(id));
    return Printer.fromApiResponse(response.data);
  }

  async createPrinter(data: CreatePrinterDTO): Promise<Printer> {
    const response = await apiClient.post<IPrinter>(API_ROUTES.PRINTERS.CREATE, data);
    return Printer.fromApiResponse(response.data);
  }

  async updatePrinter(id: string, data: UpdatePrinterDTO): Promise<Printer> {
    const response = await apiClient.patch<IPrinter>(API_ROUTES.PRINTERS.UPDATE(id), data);
    return Printer.fromApiResponse(response.data);
  }

  async deletePrinter(id: string): Promise<void> {
    await apiClient.delete(API_ROUTES.PRINTERS.DELETE(id));
  }



  async getPrintJobs(
    params: {
      printerId?: string;
      status?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<any> {
    const response = await apiClient.get(API_ROUTES.PRINT_JOBS.LIST, { params });
    return response;
  }

  // ── Queue ────────────────────────────────────────────────────────────────

  async queueJob(dto: QueuePrintJobDTO): Promise<IPrintJob> {
    const response = await apiClient.post<IPrintJob>(
      API_ROUTES.PRINT_JOBS.CREATE,
      dto,
    );
    return response.data;
  }

  async getJob(id: string): Promise<IPrintJob> {
    const response = await apiClient.get<IPrintJob>(
      API_ROUTES.PRINT_JOBS.DETAIL(id),
    );
    return response.data;
  }

  async retryJob(id: string): Promise<IPrintJob> {
    const response = await apiClient.post<IPrintJob>(
      API_ROUTES.PRINT_JOBS.RETRY(id),
      {},
    );
    return response.data;
  }

  async cancelJob(id: string): Promise<IPrintJob> {
    const response = await apiClient.post<IPrintJob>(
      API_ROUTES.PRINT_JOBS.CANCEL(id),
      {},
    );
    return response.data;
  }

  // ── Agents ───────────────────────────────────────────────────────────────

  async getAgents(): Promise<IPrintAgent[]> {
    const response = await apiClient.get<IPrintAgent[]>(
      API_ROUTES.PRINT_AGENTS.LIST,
    );
    return response.data;
  }

  /** The pairing code is returned once and never retrievable again. */
  async createAgent(
    dto: CreatePrintAgentDTO,
  ): Promise<{ agent: IPrintAgent; pairingCode: string }> {
    const response = await apiClient.post<{
      agent: IPrintAgent;
      pairingCode: string;
    }>(API_ROUTES.PRINT_AGENTS.CREATE, dto);
    return response.data;
  }

  async revokeAgent(id: string): Promise<void> {
    await apiClient.delete(API_ROUTES.PRINT_AGENTS.REVOKE(id));
  }
}

export const printersService = new PrintersService();
