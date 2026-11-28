import request from '@/utils/request'
import type { Address } from './types'

export const getAddresses = (userId: number) =>
  request.get<Address[]>('/h5/addresses', { params: { userId } })
