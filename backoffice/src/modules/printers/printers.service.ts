import { IPrinter, CreatePrinterDTO, UpdatePrinterDTO } from './printers.interface';
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

  async pingPrinter(id: string): Promise<void> {
    await apiClient.post(API_ROUTES.PRINTERS.PING(id), {});
  }

  async logPrintJob(dto: {
    printerId?: string;
    documentType: string;
    documentId?: string;
    method?: string;
    status: string;
    durationMs?: number;
    errorMessage?: string;
  }): Promise<void> {
    await apiClient.post(API_ROUTES.PRINT_JOBS.CREATE, dto);
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
}

export const printersService = new PrintersService();
