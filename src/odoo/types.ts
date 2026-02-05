export interface OdooProxy {
  giaothuc: string;
  ip: string;
  port: number | string;
  tendangnhap?: string;
  matkhau?: string;
}

export interface OdooProfile {
  id: number | string;
  name: string;
  user_agent?: string;
  timezone?: string;
  language?: string;
  platform?: string;
  proxy_ids?: OdooProxy[];
  profile_url?: string;
  local_path?: string;
}
