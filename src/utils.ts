import { BusinessSettings, TransportJob, CalculationResult, TruckType, DriverPaymentMode } from './types';
import { TRUCK_PRESETS } from './constants';

const safeNumber = (val: any): number => {
  const num = Number(val);
  return isFinite(num) ? num : 0;
};

export const calculateJob = (
  job: TransportJob,
  settings: BusinessSettings
): CalculationResult => {
  // Sanitize inputs
  const truckInfo = {
    purchasePrice: safeNumber(job.truckInfo.purchasePrice),
    resaleValue: safeNumber(job.truckInfo.resaleValue),
    expectedLifeYears: safeNumber(job.truckInfo.expectedLifeYears) || 1, // Prevent div by 0
    vehicleLoanAmount: safeNumber(job.truckInfo.vehicleLoanAmount),
    annualInterestRate: safeNumber(job.truckInfo.annualInterestRate),
  };

  const distancePerTrip = safeNumber(job.distancePerTrip);
  const tripsPerMonth = safeNumber(job.tripsPerMonth);
  const pricePerTrip = safeNumber(job.pricePerTrip);
  const fuelCost = safeNumber(job.fuelCost);
  const driverWage = safeNumber(job.driverWage);
  const tollFees = safeNumber(job.tollFees);
  const maintenanceCost = safeNumber(job.maintenanceCost);
  const otherCosts = safeNumber(job.otherCosts);
  const utilizationRate = safeNumber(job.utilizationRate) || 100;
  const totalMonthlyDistance = safeNumber(job.totalMonthlyDistance);

  const annualInsurance = safeNumber(settings.annualInsurance);
  const annualTax = safeNumber(settings.annualTax);
  const avgDriverWage = safeNumber(settings.avgDriverWage);

  // 0. Driver Payment Logic
  const isMonthlySalary = settings.driverPaymentMode === DriverPaymentMode.MONTHLY_SALARY;
  const effectiveDriverWagePerTrip = isMonthlySalary ? 0 : driverWage;
  const monthlyDriverSalary = isMonthlySalary ? avgDriverWage : 0;

  // 0.1 Interest Cost (Finance)
  const monthlyInterestCost = (truckInfo.vehicleLoanAmount * truckInfo.annualInterestRate) / 12;

  // 0.2 Utilization Rate
  const effectiveTripsPerMonth = tripsPerMonth * (utilizationRate / 100);

  // 1. Depreciation (Straight line)
  const totalDepreciation = truckInfo.purchasePrice - truckInfo.resaleValue;
  const depreciationPerYear = totalDepreciation / truckInfo.expectedLifeYears;
  const depreciationPerMonth = depreciationPerYear / 12;
  const depreciationPerTrip = depreciationPerMonth / (tripsPerMonth || 1);

  // 2. Fixed Costs (Insurance, Tax, Salary, Interest)
  const annualFixed = annualInsurance + annualTax;
  const baseFixedPerMonth = annualFixed / 12;
  const totalFixedPerMonth = baseFixedPerMonth + monthlyDriverSalary + monthlyInterestCost;
  const fixedPerTrip = totalFixedPerMonth / (tripsPerMonth || 1);

  // 3. Variable Costs
  const variableCostPerTrip = fuelCost + effectiveDriverWagePerTrip + tollFees + maintenanceCost + otherCosts;

  // 4. Total Costs
  // New logic for Fixed Cost per KM
  let fixedCostPerKm: number | undefined = undefined;
  let fixedCostForThisTrip = fixedPerTrip + depreciationPerTrip;

  if (totalMonthlyDistance > 0) {
    fixedCostPerKm = (totalFixedPerMonth + depreciationPerMonth) / totalMonthlyDistance;
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
  const costPerTon = totalCostPerTrip / (safeNumber(job.weightPerTrip) || 1);

  // 7. Break Even Point (BEP)
  const monthlyFixedTotal = totalFixedPerMonth + depreciationPerMonth;
  const contributionMarginPerTrip = pricePerTrip - variableCostPerTrip;
  
  let bepTripsPerMonth = 0;
  if (contributionMarginPerTrip > 0) {
    bepTripsPerMonth = monthlyFixedTotal / contributionMarginPerTrip;
  } else {
    bepTripsPerMonth = -1; // Use -1 to indicate never breaks even
  }
  
  const bepKmPerMonth = bepTripsPerMonth * distancePerTrip;

  // 8. Empty Trip Insight
  const emptyTripLoss = fuelCost + effectiveDriverWagePerTrip + maintenanceCost + depreciationPerTrip;

  // 9. Fuel Cost per KM
  const fuelCostPerKm = fuelCost / (distancePerTrip || 1);

  // 10. Carbon Impact
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
    depreciationPerMonth: safeNumber(depreciationPerMonth),
    depreciationPerTrip: safeNumber(depreciationPerTrip),
    variableCostPerTrip: safeNumber(variableCostPerTrip),
    fixedCostPerTrip: safeNumber(fixedPerTrip),
    totalCostPerTrip: safeNumber(totalCostPerTrip),
    totalCostPerMonth: safeNumber(totalCostPerMonth),
    profitPerTrip: safeNumber(profitPerTrip),
    profitPerMonth: safeNumber(profitPerMonth),
    marginPercent: safeNumber(marginPercent),
    costPerKm: safeNumber(costPerKm),
    costPerTon: safeNumber(costPerTon),
    bepKmPerMonth: safeNumber(bepKmPerMonth),
    bepTripsPerMonth: safeNumber(bepTripsPerMonth),
    emptyTripLoss: safeNumber(emptyTripLoss),
    riskLevel,
    status,
    fuelCostPerKm: safeNumber(fuelCostPerKm),
    co2PerTrip: safeNumber(co2PerTrip),
    co2PerMonth: safeNumber(co2PerMonth),
    fixedCostPerKm: fixedCostPerKm !== undefined ? safeNumber(fixedCostPerKm) : undefined
  };
};

export const getSensitivityData = (job: TransportJob, settings: BusinessSettings) => {
  const baseFuel = safeNumber(job.fuelCost);
  const refFuelPrice = safeNumber(settings.refFuelPrice);
  const percentages = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
  
  return percentages.map(p => {
    const adjustedFuel = baseFuel * (1 + p / 100);
    const adjustedJob = { ...job, fuelCost: adjustedFuel };
    const result = calculateJob(adjustedJob, settings);
    return {
      percent: `${p > 0 ? '+' : ''}${p}%`,
      profit: Math.round(result.profitPerTrip),
      fuelPrice: (refFuelPrice * (1 + p / 100)).toFixed(2)
    };
  });
};
