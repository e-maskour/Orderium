export interface ImportResultDto {
  success: boolean;
  imported: number;
  updated: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
    data?: any;
  }>;
}
