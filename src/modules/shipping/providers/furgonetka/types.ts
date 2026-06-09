// Typy Furgonetka REST API (na podstawie sprawdzonego klienta). Patrz client.ts.

export interface FurgonetkaOptions {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  sandbox?: boolean;
}

export interface FurgonetkaTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token?: string;
  scope?: string;
}

export interface FurgonetkaService {
  id: number;
  service: string;
  name: string;
  owner?: string;
  pricelist_id?: number;
  configuration?: {
    additional_services?: { cod_enabled?: boolean };
    national_only?: boolean;
  };
  [key: string]: unknown;
}

export interface FurgonetkaRegulation {
  service: string;
  version: number;
  datetime: string;
  accepted: boolean;
  name: string;
  [key: string]: unknown;
}

export interface FurgonetkaLabel {
  page_format?: "a4" | "a6";
  file_format?: "pdf" | "zpl" | "epl";
  add_cutting_line?: boolean;
}

export interface FurgonetkaAddress {
  name?: string;
  company?: string;
  street: string;
  postcode: string;
  city: string;
  country_code?: string;
  email?: string;
  phone?: string;
  point?: string;
}

export interface FurgonetkaParcel {
  width: number;
  height: number;
  depth: number;
  weight: number;
  value?: number;
  description?: string;
}

export interface FurgonetkaPackagePayload {
  service_id: number;
  type: "package" | "dox" | "pallet";
  pickup: FurgonetkaAddress;
  receiver: FurgonetkaAddress;
  sender?: FurgonetkaAddress;
  parcels: FurgonetkaParcel[];
  user_reference_number?: string;
  additional_services?: Record<string, unknown>;
}
