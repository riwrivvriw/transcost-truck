import { TruckType, BusinessSettings, TruckInfo, DriverPaymentMode } from './types';

export const TRUCK_PRESETS: Record<TruckType, {
  avgFuelConsumption: number; // km/l
  maintenancePerKm: number;
  avgPurchasePrice: number;
  avgResaleValue: number;
  avgLifeYears: number;
}> = {
  [TruckType.SIX_WHEELER]: {
    avgFuelConsumption: 6,
    maintenancePerKm: 1.5,
    avgPurchasePrice: 1500000,
    avgResaleValue: 400000,
    avgLifeYears: 10
  },
  [TruckType.TEN_WHEELER]: {
    avgFuelConsumption: 4,
    maintenancePerKm: 2.5,
    avgPurchasePrice: 2800000,
    avgResaleValue: 800000,
    avgLifeYears: 12
  },
  [TruckType.TRAILER]: {
    avgFuelConsumption: 2.5,
    maintenancePerKm: 4.0,
    avgPurchasePrice: 4500000,
    avgResaleValue: 1200000,
    avgLifeYears: 15
  }
};

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: 'กิจการขนส่งทดสอบ',
  mainTruckType: TruckType.SIX_WHEELER,
  truckCount: 1,
  avgDriverWage: 18000,
  driverPaymentMode: DriverPaymentMode.MONTHLY_SALARY,
  refFuelPrice: 30.0,
  annualInsurance: 24000,
  annualTax: 6000,
};

export const DEFAULT_TRUCK_INFO: TruckInfo = {
  purchasePrice: 1200000,
  currentAge: 0,
  expectedLifeYears: 10,
  resaleValue: 0,
  vehicleLoanAmount: 1000000,
  annualInterestRate: 0.05
};
