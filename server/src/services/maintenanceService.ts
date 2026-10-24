import { getSettings } from '../repositories/settingsRepository.js';

export interface MaintenanceStatus {
  enabled: boolean;
  message: string;
  eta: string | null;
}

let maintenanceCache: { status: MaintenanceStatus; cachedAt: number } | null = null;
const CACHE_TTL_MS = 10000;

export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  const now = Date.now();
  if (maintenanceCache && now - maintenanceCache.cachedAt < CACHE_TTL_MS) {
    return maintenanceCache.status;
  }

  const map = await getSettings(['maintenance_enabled', 'maintenance_message', 'maintenance_eta']);
  const enabled = map.maintenance_enabled === 'true' || map.maintenance_enabled === '1';
  const message = map.maintenance_message || 'Hệ thống đang bảo trì để nâng cấp dịch vụ. Vui lòng quay lại sau!';
  const eta = map.maintenance_eta || null;

  const status: MaintenanceStatus = { enabled, message, eta };
  maintenanceCache = { status, cachedAt: now };
  return status;
}

export function invalidateMaintenanceCache(): void {
  maintenanceCache = null;
}
