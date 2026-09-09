export { PrintersService, printersService } from './printers.service';
export { Printer } from './printers.model';
export type {
  IPrinter,
  CreatePrinterDTO,
  UpdatePrinterDTO,
  IPrintJob,
  PrintJobStatus,
  IPrintAgent,
  CreatePrintAgentDTO,
  QueuePrintJobDTO,
  PrintJobsResponse,
} from './printers.interface';
export { TERMINAL_STATUSES } from './printers.interface';
