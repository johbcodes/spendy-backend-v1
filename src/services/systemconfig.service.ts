import prisma from '../config/database';
import { UpdateSystemConfigInput } from '../validators/systemconfig.validator';

export class SystemConfigService {
  async getConfig() {
    let config = await prisma.systemConfig.findFirst();
    if (!config) {
      config = await prisma.systemConfig.create({ data: {} });
    }
    return config;
  }

  async updateConfig(data: UpdateSystemConfigInput, updatedById: string) {
    const existing = await this.getConfig();
    return prisma.systemConfig.update({
      where: { id: existing.id },
      data: { ...data, updatedById },
    });
  }
}

export const systemConfigService = new SystemConfigService();
