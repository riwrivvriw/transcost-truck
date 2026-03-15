export enum TruckType {
  SIX_WHEELER = '6 ล้อ',
  TEN_WHEELER = '10 ล้อ',
  TRAILER = 'รถพ่วง'
}

export enum DriverPaymentMode {
  PER_TRIP = 'per_trip',
  MONTHLY_SALARY = 'monthly_salary'
}

export interface BusinessSettings {
  businessName: string;
  mainTruckType: TruckType;
  truckCount: number;
  avgDriverWage: number;
  driverPaymentMode: DriverPaymentMode;
  refFuelPrice: number;
  annualInsurance: number;
  annualTax: number;
}

export interface TruckInfo {
  purchasePrice: number;
  currentAge: number;
  expectedLifeYears: number;
  resaleValue: number;
  vehicleLoanAmount?: number;
  annualInterestRate?: number;
}

export interface TransportJob {
  id: string;
  date: string;
  productType: string;
  distancePerTrip: number;
  tripsPerMonth: number;
  pricePerTrip: number;
  fuelCost: number;
  driverWage: number;
  tollFees: number;
  maintenanceCost: number;
  otherCosts: number;
  truckInfo: TruckInfo;
  totalMonthlyDistance?: number;
  utilizationRate?: number;
  emptyTripsPerMonth: number;
}

export interface CalculationResult {
  depreciationPerMonth: number;
  depreciationPerTrip: number;
  variableCostPerTrip: number;
  fixedCostPerTrip: number;
  totalCostPerTrip: number;
  totalCostPerMonth: number;
  profitPerTrip: number;
  profitPerMonth: number;
  marginPercent: number;
  costPerKm: number;
  bepKmPerMonth: number;
  bepTripsPerMonth: number;
  emptyTripLoss: number;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'accept' | 'warning' | 'reject';
  fuelCostPerKm: number;
  co2PerTrip: number;
  co2PerMonth: number;
  fixedCostPerKm?: number;
}
