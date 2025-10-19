<template>
  <!--
    组件名称: FactorStockPickerView
    功能: 基于多因子组合进行选股，支持从 /stock-tags/choices/ 拉取枚举项，并调用 /stock-tags/ 获取结果列表
    参数: 无（页面级组件）
    返回值: 无（渲染选股结果）
    事件: 无（内部处理查询与分页事件）
  -->
  <div class="factor-stock-picker-view">
    <el-card class="filter-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>因子选股</span>
          <el-button type="primary" :icon="Search" :loading="loading" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </div>
      </template>
      <el-form label-width="120px" :model="filters" class="filter-form">
        <el-row :gutter="12">
          <el-col :xs="24" :sm="12" :md="12" :lg="8">
            <el-form-item label="形态类型">
              <el-select v-model="filters.pattern_types" multiple clearable filterable placeholder="选择形态类型">
                <el-option v-for="item in choices.pattern_types" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="12" :lg="8">
            <el-form-item label="技术指标">
              <el-select v-model="filters.technical_indicator_types" multiple clearable filterable placeholder="选择技术指标">
                <el-option v-for="item in choices.technical_indicator_types" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="12" :lg="8">
            <el-form-item label="市值类型">
              <el-select v-model="filters.market_cap_types" multiple clearable filterable placeholder="选择市值类型">
                <el-option v-for="item in choices.market_cap_types" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="12" :lg="8">
            <el-form-item label="PE区间">
              <el-select v-model="filters.pe_range_types" multiple clearable filterable placeholder="选择PE区间">
                <el-option v-for="item in choices.pe_range_types" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="12" :lg="8">
            <el-form-item label="PB区间">
              <el-select v-model="filters.pb_range_types" multiple clearable filterable placeholder="选择PB区间">
                <el-option v-for="item in choices.pb_range_types" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="12" :lg="8">
            <el-form-item label="行业类型">
              <el-select v-model="filters.industry_types" multiple clearable filterable placeholder="选择行业类型">
                <el-option v-for="item in choices.industry_types" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="12" :lg="8">
            <el-form-item label="成交量">
              <el-select v-model="filters.volume_types" multiple clearable filterable placeholder="选择成交量类型">
                <el-option v-for="item in choices.volume_types" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="12" :lg="8">
            <el-form-item label="波动率">
              <el-select v-model="filters.volatility_types" multiple clearable filterable placeholder="选择波动率类型">
                <el-option v-for="item in choices.volatility_types" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="12" :lg="8">
            <el-form-item label="趋势类型">
              <el-select v-model="filters.trend_types" multiple clearable filterable placeholder="选择趋势类型">
                <el-option v-for="item in choices.trend_types" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="12" :lg="8">
            <el-form-item label="创建时间">
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                unlink-panels
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card class="result-card" shadow="never">
      <template #header>
        <div class="result-header">
          <span>结果列表</span>
          <el-text type="info">共 {{ pagination.total }} 条</el-text>
        </div>
      </template>
      <el-table :data="tableData" stripe border v-loading="loading">
        <el-table-column prop="stock_code" label="股票代码" width="120" />
        <el-table-column prop="stock_name" label="股票名称" min-width="140" />
        <el-table-column prop="pattern_type_display" label="形态" min-width="140" />
        <el-table-column prop="technical_indicator_type_display" label="技术指标" min-width="160" />
        <el-table-column prop="market_cap_type_display" label="市值" min-width="160" />
        <el-table-column prop="pe_range_type_display" label="PE区间" min-width="140" />
        <el-table-column prop="pb_range_type_display" label="PB区间" min-width="140" />
        <el-table-column prop="industry_type_display" label="行业" min-width="140" />
        <el-table-column prop="volume_type_display" label="成交量" min-width="140" />
        <el-table-column prop="volatility_type_display" label="波动率" min-width="140" />
        <el-table-column prop="trend_type_display" label="趋势" min-width="140" />
        <el-table-column prop="created_at" label="创建时间" width="200" />
      </el-table>
      <div class="pagination-bar">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pagination.page_size"
          :current-page="pagination.page"
          @size-change="onPageSizeChange"
          @current-change="onPageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getStockTagChoices, getStockTagList, type StockTagChoices, type StockTagListParams, type StockTag } from '@/services/stockTagApi'

// 过滤条件（组合式API + ref）
const filters = ref<StockTagListParams>({
  pattern_types: [],
  technical_indicator_types: [],
  market_cap_types: [],
  pe_range_types: [],
  pb_range_types: [],
  industry_types: [],
  volume_types: [],
  volatility_types: [],
  trend_types: [],
  page: 1,
  page_size: 20
})

// 日期范围（YYYY-MM-DD）
const dateRange = ref<string[] | null>(null)

// choices 数据源
const choices = ref<StockTagChoices>({
  pattern_types: [],
  technical_indicator_types: [],
  stock_types: [],
  market_cap_types: [],
  pe_range_types: [],
  pb_range_types: [],
  industry_types: [],
  volume_types: [],
  volatility_types: [],
  trend_types: []
})

// 列表与分页
const tableData = ref<StockTag[]>([])
const pagination = ref({ total: 0, page: 1, page_size: 20, total_pages: 0 })
const loading = ref(false)

// 提交查询
const handleSearch = async () => {
  loading.value = true
  try {
    const params: StockTagListParams = {
      ...filters.value,
      start_date: dateRange.value?.[0],
      end_date: dateRange.value?.[1]
    }
    const resp = await getStockTagList(params)
    console.log(resp)
    tableData.value = resp.data
    pagination.value = {
      total: resp.total,
      page: resp.page,
      page_size: resp.page_size,
      total_pages: resp.total_pages
    }
  } catch (error: unknown) {
    ElMessage.error('获取股票列表失败')
  } finally {
    loading.value = false
  }
}

// 重置筛选
const resetFilters = () => {
  filters.value = {
    pattern_types: [],
    technical_indicator_types: [],
    market_cap_types: [],
    pe_range_types: [],
    pb_range_types: [],
    industry_types: [],
    volume_types: [],
    volatility_types: [],
    trend_types: [],
    page: 1,
    page_size: 20
  }
  dateRange.value = null
}

// 分页事件
const onPageChange = async (page: number) => {
  filters.value.page = page
  await handleSearch()
}
const onPageSizeChange = async (size: number) => {
  filters.value.page_size = size
  filters.value.page = 1
  await handleSearch()
}

// 初始化：获取choices并首次查询
onMounted(async () => {
  loading.value = true
  try {
    const resp = await getStockTagChoices()
    choices.value = resp.data
    await handleSearch()
  } catch (error: unknown) {
    ElMessage.error('初始化因子选项失败')
  } finally {
    loading.value = false
  }
})

// 计算属性（示例）：选中因子数量
const selectedFactorCount = computed(() => {
  const f = filters.value
  const arrs = [
    f.pattern_types, f.technical_indicator_types, f.market_cap_types, f.pe_range_types,
    f.pb_range_types, f.industry_types, f.volume_types, f.volatility_types, f.trend_types
  ]
  return arrs.reduce((sum, curr) => sum + (curr?.length || 0), 0)
})
</script>

<style scoped lang="scss">
.factor-stock-picker-view {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .filter-card {
    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }
    .filter-form {
      .el-select { width: 100%; }
    }
  }

  .result-card {
    .result-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .pagination-bar {
      margin-top: 12px;
      display: flex;
      justify-content: flex-end;
    }
  }
}
</style>