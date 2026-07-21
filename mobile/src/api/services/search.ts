import { societyService } from './societies';
import { propertyService } from './properties';

export const searchService = {
  async searchAll(query: string) {
    const [societies, properties] = await Promise.all([
      societyService.list({ q: query, per_page: 10 }),
      propertyService.list({ q: query, per_page: 10 }),
    ]);
    return { societies, properties };
  },
};
