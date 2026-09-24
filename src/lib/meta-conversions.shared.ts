export type MetaOrderEventName = "CompleteRegistration" | "Purchase";

export type MetaDatasetEventLog = {
  id: string;
  order_id: string;
  order_number: string;
  registration_id: string;
  event_slug: string;
  event_id: string;
  event_name: MetaOrderEventName;
  source: string;
  source_path: string;
  status: string;
  dataset_id: string;
  graph_api_version: string;
  payload: unknown;
  response: unknown;
  response_http_status: number | null;
  meta_trace_id: string;
  attempt_count: number;
  last_error: string;
  last_attempt_at: Date | null;
  sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type MetaDatasetEventStats = {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  sending: number;
  completeRegistration: number;
  ladipageRegistrations: number;
  purchase: number;
  last24Hours: number;
};
