import type { EtfData, ValuationStatus, UserProfile, AssetAllocation, TradeInstruction, SystemStatus } from './types';

export const TOTAL_PARTS = 150;

/**
 * Determine the valuation status based on PE percentile
 */
export function getValuationStatus(percentile: number): ValuationStatus {
  if (percentile <= 10) return 'DIAMOND_PIT';
  if (percentile <= 30) return 'OPPORTUNITY';
  if (percentile <= 70) return 'NORMAL';
  if (percentile <= 90) return 'OVERVALUED';
  return 'BUBBLE';
}

/**
 * Calculate one "part" value based on total capital
 */
export function calculatePartValue(totalCapital: number): number {
  return totalCapital / TOTAL_PARTS;
}

/**
 * Generate a recommended asset allocation based on user profile
 */
export function generateBaseAllocation(profile: UserProfile): AssetAllocation[] {
  let stockRatio = 0.5;
  let bondRatio = 0.5;

  if (profile.riskTolerance === 'LOW') {
    stockRatio = 0.2;
    bondRatio = 0.8;
  } else if (profile.riskTolerance === 'HIGH') {
    stockRatio = 0.8;
    bondRatio = 0.2;
  }

  // Adjust for age (simple rule: 100 - age = stock %)
  const ageBasedStock = Math.max(0, (100 - profile.age) / 100);
  stockRatio = (stockRatio + ageBasedStock) / 2;
  bondRatio = 1 - stockRatio;

  return [
    { category: 'STOCK_CN', targetRatio: stockRatio * 0.4, currentValue: 0, currentRatio: 0 },
    { category: 'STOCK_US', targetRatio: stockRatio * 0.4, currentValue: 0, currentRatio: 0 },
    { category: 'BOND', targetRatio: bondRatio, currentValue: 0, currentRatio: 0 },
    { category: 'COMMODITY', targetRatio: 0.05, currentValue: 0, currentRatio: 0 }, // Small hedge
  ];
}

/**
 * Simulate Max Drawdown impact
 */
export function simulateStressTest(holdings: { etf: EtfData; value: number }[], shockPercent: number): number {
  let totalLoss = 0;
  holdings.forEach(h => {
    // Apply shock adjusted by asset class (stocks hit full shock, bonds less)
    let adjuster = 1.0;
    if (h.etf.category === 'BOND') adjuster = 0.2;
    if (h.etf.category === 'COMMODITY') adjuster = 0.5;
    
    totalLoss += h.value * (shockPercent * adjuster);
  });
  return totalLoss;
}

/**
 * Mock Data Generator
 */
export function getMockEtfData(): EtfData[] {
  return [
    { code: '510300', name: '沪深300ETF', category: 'STOCK_CN', pe: 11.5, pePercentile: 25, pb: 1.2, pbPercentile: 15, currentPrice: 3.5, maxDrawdownHistory: 0.45 },
    { code: '510500', name: '中证500ETF', category: 'STOCK_CN', pe: 22.0, pePercentile: 18, pb: 1.8, pbPercentile: 12, currentPrice: 5.8, maxDrawdownHistory: 0.55 },
    { code: '513500', name: '标普500ETF', category: 'STOCK_US', pe: 24.5, pePercentile: 85, pb: 4.2, pbPercentile: 90, currentPrice: 1.2, maxDrawdownHistory: 0.35 },
    { code: '159915', name: '创业板ETF', category: 'STOCK_CN', pe: 28.5, pePercentile: 5, pb: 3.5, pbPercentile: 8, currentPrice: 1.8, maxDrawdownHistory: 0.65 },
    { code: '518880', name: '黄金ETF', category: 'COMMODITY', pe: 0, pePercentile: 60, pb: 0, pbPercentile: 60, currentPrice: 4.5, maxDrawdownHistory: 0.20 },
    { code: '511260', name: '十年国债ETF', category: 'BOND', pe: 0, pePercentile: 50, pb: 0, pbPercentile: 50, currentPrice: 102.5, maxDrawdownHistory: 0.05 },
  ];
}

export const MINDSET_QUOTES = [
  "只有波动才能带来超额利润。",
  "建立足够的低成本仓位，然后关上账户静静等待。",
  "你现在该兴奋，而不是恐惧。",
  "投资第一重要的是保住本金。",
  "一周可以给你三年的利润，前提是你一直在车上。",
];
