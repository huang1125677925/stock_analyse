/**
 * 行业资金流相关性坐标点API服务
 * 功能：
 * 1. 获取指定行业板块在时间范围内的 x 与 y 的相关性散点数据
 * 2. 支持选择横轴(x_axis)与纵轴净流入类型(y_axis)，并指定排序方向
 * 3. 返回 points 数组用于 ECharts 散点图展示
 * 
 * 参数（函数）：
 * - sector_code: string 行业板块代码
 * - start_date: string 开始日期(YYYY-MM-DD)
 * - end_date: string 结束日期(YYYY-MM-DD)
 * - x_axis?: AxisX 横轴指标，默认 change_percent
 * - y_axis?: AxisY 纵轴净流入类型，默认 main
 * - sort_order?: 'asc'|'desc' 排序方向，默认 desc
 * 
 * 返回值：IndustryFundFlowCorrelationData
 * 事件：无
 */
import axios from './axiosConfig'

export type AxisX = 'change_percent' | 'turnover_rate' | 'amplitude'
export type AxisY = 'main' | 'super_large' | 'large' | 'medium' | 'small' | 'all'

export interface FundFlowCorrelationPoint {
  date: string
  x: number
  y: number
}

export interface IndustryFundFlowCorrelationData {
  sector_code: string
  sector_name: string
  filters: {
    start_date: string
    end_date: string
    x_axis: AxisX
    y_axis: AxisY
    sort_order: 'asc' | 'desc'
  }
  total: number
  points: FundFlowCorrelationPoint[]
  x_label: string
  y_label: string
}

/**
 * 获取行业资金流相关性散点数据（单个 y_axis）
 */
export async function getIndustryFundFlowCorrelation(params: {
  sector_code: string
  start_date: string
  end_date: string
  x_axis?: AxisX
  y_axis?: AxisY
  sort_order?: 'asc' | 'desc'
}): Promise<IndustryFundFlowCorrelationData> {
  const response = await axios.get<IndustryFundFlowCorrelationData>(
    '/django/api/strategy/industry-fund-flow-correlation/',
    {
      params: {
        sector_code: params.sector_code,
        start_date: params.start_date,
        end_date: params.end_date,
        x_axis: params.x_axis ?? 'change_percent',
        y_axis: params.y_axis ?? 'main',
        sort_order: params.sort_order ?? 'desc'
      }
    }
  )
  return response.data
}

// X轴选项
export const X_AXIS_OPTIONS: { value: AxisX; label: string }[] = [
  { value: 'change_percent', label: '涨跌幅(%)' },
  { value: 'turnover_rate', label: '换手率(%)' },
  { value: 'amplitude', label: '振幅(%)' }
]

// Y轴选项（净流入类型）
export const Y_AXIS_OPTIONS: { value: AxisY; label: string }[] = [
  { value: 'main', label: '主力净流入' },
  { value: 'super_large', label: '超大单净流入' },
  { value: 'large', label: '大单净流入' },
  { value: 'medium', label: '中单净流入' },
  { value: 'small', label: '小单净流入' },
  { value: 'all', label: '全部净流入' }
]