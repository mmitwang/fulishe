import request from '@/utils/request'
import type { FullReductionInfo } from './types'

export const getFullReduction = () =>
  request.get<FullReductionInfo>('/h5/promotions/full-reduction')
