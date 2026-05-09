import { Request, Response, NextFunction } from 'express';
import { systemConfigService } from '../services/systemconfig.service';
import { updateSystemConfigSchema } from '../validators/systemconfig.validator';

export class SystemConfigController {
  async getConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      const config = await systemConfigService.getConfig();
      res.json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  }

  async updateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateSystemConfigSchema.parse(req.body);
      const config = await systemConfigService.updateConfig(data, req.user!.userId);
      res.json({ success: true, data: config });
    } catch (err) {
      next(err);
    }
  }
}

export const systemConfigController = new SystemConfigController();
