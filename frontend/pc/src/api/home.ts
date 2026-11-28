import request from '@/utils/request'
import type { HomeData } from './types'

export const getHome = () => request.get<HomeData>('/h5/home')
