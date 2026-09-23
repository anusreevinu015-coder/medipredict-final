import { api } from './client';
import type { HospitalCatalogItem, HospitalRecommendation } from '../types/hospital';

interface RecommendationsResponse {
  hospitals: HospitalRecommendation[];
  cities: string[];
}

interface RecommendationsInput {
  specialty: string;
  location?: string;
}

interface CatalogResponse {
  hospitals: HospitalCatalogItem[];
  cities: string[];
}

export const hospitalApi = {
  recommendations: (params: RecommendationsInput) => {
    const query = new URLSearchParams({ specialty: params.specialty });
    if (params.location) query.set('location', params.location);
    return api.get<RecommendationsResponse>(`/api/hospitals/recommendations?${query.toString()}`);
  },
  catalog: (params?: { location?: string }) => {
    const query = new URLSearchParams();
    if (params?.location && params.location !== 'all') query.set('location', params.location);
    const qs = query.toString();
    return api.get<CatalogResponse>(`/api/hospitals/catalog${qs ? `?${qs}` : ''}`);
  },
};