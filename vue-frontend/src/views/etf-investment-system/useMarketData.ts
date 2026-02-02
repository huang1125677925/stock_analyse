import { ref, computed } from 'vue';
import axios from '@/services/axiosConfig';
import { getMockEtfData } from './core';
import type { EtfData } from './types';

// Global state (singleton) to share data across components
const etfList = ref<EtfData[]>([]);
const loading = ref(false);
const initialized = ref(false);

export function useMarketData() {
  const fetchEtfData = async () => {
    if (initialized.value) return; // Prevent double fetch
    
    loading.value = true;
    try {
      const response = await axios.get('/django/api/index/index-valuation-summary/');
      const data = response.data || response;
      const results = Array.isArray(data) ? data : (data.results || data.items);
      
      if (results && results.length > 0) {
        etfList.value = results.map((item: any) => ({
          code: item.value,
          name: item.label,
          category: 'STOCK_CN',
          pe: item.pe,
          pePercentile: item.pe_quantile_10y * 100, // Use 10y percentile
          pb: item.pb,
          pbPercentile: item.pb_quantile_10y * 100, // Use 10y percentile
          currentPrice: 0,
          maxDrawdownHistory: 0,
          totalMv: item.total_mv
        }));
      } else {
        // Fallback to mock data
        etfList.value = getMockEtfData();
      }
    } catch (error) {
      console.error('Failed to fetch ETF data:', error);
      if (etfList.value.length === 0) {
        etfList.value = getMockEtfData();
      }
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  };

  const marketTemp = computed(() => {
    if (!etfList.value.length) return 0;
    const sum = etfList.value.reduce((acc, cur) => acc + cur.pePercentile, 0);
    return sum / etfList.value.length;
  });

  const targetPosition = computed(() => {
    if (!etfList.value.length) return 0;
    const minPosition = 20;
    const maxPosition = 90;
    const ratio = Math.min(Math.max(marketTemp.value / 100, 0), 1);
    return maxPosition - ratio * (maxPosition - minPosition);
  });

  return {
    etfList,
    loading,
    fetchEtfData,
    marketTemp,
    targetPosition
  };
}
