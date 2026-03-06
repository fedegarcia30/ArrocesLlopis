import { post } from './client';
import type { AvailabilityResponse } from '../types';

export async function checkAvailability(date: string): Promise<AvailabilityResponse> {
  return post<AvailabilityResponse>('/availability/check', { date });
}
