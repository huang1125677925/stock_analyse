export type ValuationStatus = 'DIAMOND_PIT' | 'OPPORTUNITY' | 'NORMAL' | 'OVERVALUED' | 'BUBBLE';

export interface EtfData {
  code: string;
  name: string;
  category: 'STOCK_CN' | 'STOCK_US' | 'STOCK_HK' | 'BOND' | 'COMMODITY' | 'REITS';
  pe: number;
  pePercentile: number; // 0-100
  pb: number;
  pbPercentile: number; // 0-100
  currentPrice: number;
  maxDrawdownHistory: number; // e.g., 0.60 for 60%
}

export interface UserProfile {
  age: number;
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  totalCapital: number;
  monthlyCashFlow: number;
  investmentHorizonYears: number;
}

export interface AssetAllocation {
  category: string;
  targetRatio: number; // 0-1
  currentValue: number;
  currentRatio: number;
}

export interface TradeInstruction {
  code: string;
  name: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  quantityParts: number; // Number of "parts" (out of 150)
  priceLimit?: number;
  reason: string;
}

export interface SystemStatus {
  marketTemperature: number; // 0-100 (Cold to Hot)
  cycleStage: 'RECESSION' | 'RECOVERY' | 'OVERHEAT' | 'STAGFLATION';
}
