import type { Request, Response, NextFunction } from 'express';
import { checkIsVpn } from '../services/vpnDetectionService.js';
import { HttpError } from '../utils/httpError.js';

export async function requireNoVpn(req: Request, res: Response, next: NextFunction): Promise<void> {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
  const { isVpn } = await checkIsVpn(clientIp);

  if (isVpn) {
    return next(
      new HttpError(
        403,
        'Hệ thống phát hiện bạn đang sử dụng VPN hoặc Proxy. Vui lòng tắt VPN để tiếp tục thao tác!'
      )
    );
  }

  next();
}
