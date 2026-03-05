import { BusinessSettings, TransportJob, CalculationResult, TruckType, DriverPaymentMode } from './types';
import { TRUCK_PRESETS } from './constants';

export const calculateJob = (
  job: TransportJob,
  settings: BusinessSettings
): CalculationResult => {
  const { truckInfo, distancePerTrip, tripsPerMonth, pricePerTrip, fuelCost, driverWage, tollFees, maintenanceCost, otherCosts } = job;

  // 0. Driver Payment Logic
  const isMonthlySalary = settings.driverPaymentMode === DriverPaymentMode.MONTHLY_SALARY;
  const effectiveDriverWagePerTrip = isMonthlySalary ? 0 : driverWage;
  const monthlyDriverSalary = isMonthlySalary ? settings.avgDriverWage : 0;

  // 0.1 Interest Cost (Finance)
  const monthlyInterestCost = ((truckInfo.vehicleLoanAmount || 0) * (truckInfo.annualInterestRate || 0)) / 12;

  // 0.2 Utilization Rate
  const effectiveTripsPerMonth = tripsPerMonth * ((job.utilizationRate || 100) / 100);

  // 1. Depreciation (Straight line)
  const totalDepreciation = truckInfo.purchasePrice - truckInfo.resaleValue;
  const depreciationPerYear = totalDepreciation / truckInfo.expectedLifeYears;
  const depreciationPerMonth = depreciationPerYear / 12;
  const depreciationPerTrip = depreciationPerMonth / (tripsPerMonth || 1);

  // 2. Fixed Costs (Insurance, Tax, Salary, Interest)
  const annualFixed = settings.annualInsurance + settings.annualTax;
  const baseFixedPerMonth = annualFixed / 12;
  const totalFixedPerMonth = baseFixedPerMonth + monthlyDriverSalary + monthlyInterestCost;
  const fixedPerTrip = totalFixedPerMonth / (tripsPerMonth || 1);

  // 3. Variable Costs
  const variableCostPerTrip = fuelCost + effectiveDriverWagePerTrip + tollFees + maintenanceCost + otherCosts;

  // 4. Total Costs
  // New logic for Fixed Cost per KM
  let fixedCostPerKm: number | undefined = undefined;
  let fixedCostForThisTrip = fixedPerTrip + depreciationPerTrip;

  if (job.totalMonthlyDistance && job.totalMonthlyDistance > 0) {
    fixedCostPerKm = (totalFixedPerMonth + depreciationPerMonth) / job.totalMonthlyDistance;
    fixedCostForThisTrip = fixedCostPerKm * distancePerTrip;
  }

  const totalCostPerTrip = variableCostPerTrip + fixedCostForThisTrip;
  const totalCostPerMonth = totalCostPerTrip * tripsPerMonth;

  // 5. Profitability
  const profitPerTrip = pricePerTrip - totalCostPerTrip;
  const profitPerMonth = profitPerTrip * effectiveTripsPerMonth;
  const marginPercent = (profitPerTrip / (pricePerTrip || 1)) * 100;

  // 6. Unit Costs
  const costPerKm = totalCostPerTrip / (distancePerTrip || 1);
  const costPerTon = totalCostPerTrip / (job.weightPerTrip || 1);

  // 7. Break Even Point (BEP)
  // BEP (Trips) = Fixed Costs / (Price - Variable Costs)
  // Fixed costs here include depreciation and business fixed costs
  const monthlyFixedTotal = totalFixedPerMonth + depreciationPerMonth;
  const contributionMarginPerTrip = pricePerTrip - variableCostPerTrip;
  
  let bepTripsPerMonth = 0;
  if (contributionMarginPerTrip > 0) {
    bepTripsPerMonth = monthlyFixedTotal / contributionMarginPerTrip;
  } else {
    bepTripsPerMonth = Infinity; // Never breaks even if variable costs > price
  }
  
  const bepKmPerMonth = bepTripsPerMonth * distancePerTrip;

  // 8. Empty Trip Insight
  // เที่ยวเปล่าต้องมี: ค่าน้ำมัน 100% ค่าแรง 100% ค่าซ่อมบำรุง 100% ค่าเสื่อม 100% รายได้ = 0
  const emptyTripLoss = fuelCost + effectiveDriverWagePerTrip + maintenanceCost + depreciationPerTrip;

  // 9. Fuel Cost per KM
  const fuelCostPerKm = fuelCost / (distancePerTrip || 1);

  // 10. Carbon Impact (Approx 2.68 kg CO2 per liter of diesel)
  // Estimate liters used: fuelCost / refFuelPrice
  // const litersUsed = fuelCost / (settings.refFuelPrice || 33);
  // const co2PerTrip = litersUsed * 2.68;
  // const co2PerMonth = co2PerTrip * tripsPerMonth;
  const co2PerTrip = 0;
  const co2PerMonth = 0;

  // 11. Status & Risk
  let status: 'accept' | 'warning' | 'reject' = 'accept';
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  if (profitPerTrip < 0) {
    status = 'reject';
    riskLevel = 'high';
  } else if (marginPercent < 15) {
    status = 'warning';
    riskLevel = 'medium';
  }

  return {
    depreciationPerMonth,
    depreciationPerTrip,
    variableCostPerTrip,
    fixedCostPerTrip: fixedPerTrip,
    totalCostPerTrip,
    totalCostPerMonth,
    profitPerTrip,
    profitPerMonth,
    marginPercent,
    costPerKm,
    costPerTon,
    bepKmPerMonth,
    bepTripsPerMonth,
    emptyTripLoss,
    riskLevel,
    status,
    fuelCostPerKm,
    co2PerTrip,
    co2PerMonth,
    fixedCostPerKm
  };
};

export const getSensitivityData = (job: TransportJob, settings: BusinessSettings) => {
  const baseFuel = job.fuelCost;
  const percentages = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
  
  return percentages.map(p => {
    const adjustedFuel = baseFuel * (1 + p / 100);
    const adjustedJob = { ...job, fuelCost: adjustedFuel };
    const result = calculateJob(adjustedJob, settings);
    return {
      percent: `${p > 0 ? '+' : ''}${p}%`,
      profit: Math.round(result.profitPerTrip),
      fuelPrice: (settings.refFuelPrice * (1 + p / 100)).toFixed(2)
    };
  });
};
