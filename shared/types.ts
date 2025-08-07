export interface WebSocketMessage {
  type: string;
  data: unknown;
}

export interface WebSocketError {
  message: string;
  code?: string;
}

export interface MonitoringStatusData {
  isActive: boolean;
  subreddits: string[];
  keywords: string[];
  scanInterval: number;
  lastScanTime?: Date;
  totalPosts: number;
  newPosts: number;
}

export interface ScanCompleteData {
  totalPosts: number;
  newPosts: number;
  timestamp: string;
}

export interface ErrorResponse {
  message: string;
  details?: unknown;
}

export interface SuccessResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}