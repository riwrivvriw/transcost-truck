import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  Settings as SettingsIcon, 
  Truck, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Save,
  Trash2,
  ChevronRight,
  Info,
  Fuel,
  DollarSign,
  BarChart3,
  Download,
  Scale,
  ArrowRight,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { TruckType, BusinessSettings, TransportJob, CalculationResult, TruckInfo, DriverPaymentMode } from './types';
import { TRUCK_PRESETS, DEFAULT_SETTINGS, DEFAULT_TRUCK_INFO } from './constants';
import { calculateJob, getSensitivityData } from './utils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Card = ({ children, className, id }: { children: React.ReactNode, className?: string, id?: string, key?: React.Key }) => (
  <div id={id} className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const InputField = ({ label, value, onChange, type = "number", suffix, placeholder, id, readOnly, disabled }: any) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange && onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        className={cn(
          "w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-slate-900 font-medium",
          readOnly || disabled ? "bg-slate-100 cursor-not-allowed text-slate-500" : "bg-slate-50"
        )}
      />
      {suffix && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

const SelectField = ({ label, value, onChange, options, id }: any) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-slate-900 font-medium appearance-none"
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new-job' | 'history' | 'settings' | 'empty-trip-solution'>('new-job');
  const [settings, setSettings] = useState<BusinessSettings>(() => {
    const saved = localStorage.getItem('transcost_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [savedJobs, setSavedJobs] = useState<TransportJob[]>(() => {
    const saved = localStorage.getItem('transcost_jobs');
    return saved ? JSON.parse(saved) : [];
  });

  const [simTarget, setSimTarget] = useState<number>(15);

  const [currentJob, setCurrentJob] = useState<TransportJob>({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    productType: 'งานทดสอบระบบ',
    weightPerTrip: 15,
    distancePerTrip: 300,
    tripsPerMonth: 20,
    pricePerTrip: 18000,
    fuelCost: 2250,
    driverWage: 0,
    tollFees: 500,
    maintenanceCost: 600,
    otherCosts: 0,
    truckInfo: DEFAULT_TRUCK_INFO,
    totalMonthlyDistance: 6000,
    utilizationRate: 100
  });

  useEffect(() => {
    localStorage.setItem('transcost_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('transcost_jobs', JSON.stringify(savedJobs));
  }, [savedJobs]);

  // Auto-calculate Total Monthly Distance
  useEffect(() => {
    const totalDist = (currentJob.distancePerTrip || 0) * (currentJob.tripsPerMonth || 0);
    if (currentJob.totalMonthlyDistance !== totalDist) {
      setCurrentJob(prev => ({ ...prev, totalMonthlyDistance: totalDist }));
    }
  }, [currentJob.distancePerTrip, currentJob.tripsPerMonth]);

  const [priceAdjustment, setPriceAdjustment] = useState(0);

  const adjustedJob = useMemo(() => ({
    ...currentJob,
    pricePerTrip: currentJob.pricePerTrip + priceAdjustment
  }), [currentJob, priceAdjustment]);

  const calculation = useMemo(() => calculateJob(adjustedJob, settings), [adjustedJob, settings]);
  const baseCalculation = useMemo(() => calculateJob(currentJob, settings), [currentJob, settings]);
  const sensitivity = useMemo(() => getSensitivityData(adjustedJob, settings), [adjustedJob, settings]);

  const monthlyCostStructure = useMemo(() => {
    const fixedMonthly = (calculation.fixedCostPerTrip * adjustedJob.tripsPerMonth) + calculation.depreciationPerMonth;
    const variableMonthly = calculation.variableCostPerTrip * adjustedJob.tripsPerMonth;
    const totalMonthly = fixedMonthly + variableMonthly;
    
    return {
      fixed: fixedMonthly,
      variable: variableMonthly,
      total: totalMonthly,
      fixedPercent: (fixedMonthly / (totalMonthly || 1)) * 100,
      variablePercent: (variableMonthly / (totalMonthly || 1)) * 100
    };
  }, [calculation, adjustedJob.tripsPerMonth]);

  // Benchmark values (Internal system defaults)
  const benchmarks = {
    [TruckType.SIX_WHEELER]: { fuelPerKm: 6.5 },
    [TruckType.TEN_WHEELER]: { fuelPerKm: 8.5 },
    [TruckType.TRAILER]: { fuelPerKm: 13.5 }
  };

  const currentBenchmark = benchmarks[settings.mainTruckType];
  const isFuelHigh = calculation.fuelCostPerKm > currentBenchmark.fuelPerKm * 1.05;

  const recommendations = useMemo(() => {
    const recs = [];
    if (calculation.profitPerTrip < 0) {
      recs.push({
        type: 'danger',
        text: "มีความเสี่ยงขาดทุน ไม่แนะนำให้รับงานในราคานี้",
        action: "ควรปรับราคาขึ้นอย่างน้อย " + formatCurrency(Math.abs(calculation.profitPerTrip)) + " บาท"
      });
    } else if (calculation.marginPercent < 15) {
      recs.push({
        type: 'warning',
        text: "งานนี้กำไรต่ำ ควรรับเฉพาะกรณีมีงานขากลับ หรือควรปรับราคาค่าขนส่งเพิ่ม",
        action: "ลองหาเที่ยวขากลับเพื่อเฉลี่ยต้นทุน"
      });
    }

    if (isFuelHigh) {
      recs.push({
        type: 'warning',
        text: "ต้นทุนน้ำมันของคุณสูงกว่าค่าเฉลี่ยอุตสาหกรรม",
        action: "ควรพิจารณาใช้ Fuel Surcharge (FSC) หรือปรับเส้นทางเพื่อลดต้นทุนน้ำมัน"
      });
    }

    if (recs.length === 0) {
      recs.push({
        type: 'success',
        text: "โครงสร้างต้นทุนและราคาอยู่ในเกณฑ์ดีมาก",
        action: "รักษาระดับต้นทุนนี้ไว้เพื่อความยั่งยืน"
      });
    }
    return recs;
  }, [calculation, isFuelHigh]);

  const emptyTripSim = useMemo(() => {
    const currentLoss = calculation.emptyTripLoss * currentJob.tripsPerMonth;
    const reduced10 = currentLoss * 0.5; 
    const reduced20 = 0; 
    
    return {
      current: currentLoss,
      gain10: currentLoss - reduced10,
      gain20: currentLoss - reduced20
    };
  }, [calculation, currentJob.tripsPerMonth]);

  const usePreset = (type: TruckType) => {
    const preset = TRUCK_PRESETS[type];
    const fuelPrice = settings.refFuelPrice || 33;
    const estimatedFuel = (currentJob.distancePerTrip / preset.avgFuelConsumption) * fuelPrice;
    const estimatedMaintenance = currentJob.distancePerTrip * preset.maintenancePerKm;

    setCurrentJob(prev => ({
      ...prev,
      fuelCost: Math.round(estimatedFuel),
      maintenanceCost: Math.round(estimatedMaintenance),
      truckInfo: {
        purchasePrice: preset.avgPurchasePrice,
        currentAge: 0,
        expectedLifeYears: preset.avgLifeYears,
        resaleValue: preset.avgResaleValue
      }
    }));
  };

  const saveJob = () => {
    setSavedJobs(prev => [currentJob, ...prev]);
    setActiveTab('history');
  };

  const deleteJob = (id: string) => {
    setSavedJobs(prev => prev.filter(j => j.id !== id));
  };

  const loadJob = (job: TransportJob) => {
    setCurrentJob({ ...job, id: crypto.randomUUID(), date: new Date().toISOString() });
    setActiveTab('new-job');
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 md:pb-0">
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-auto bg-white border-t md:border-t-0 md:border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="hidden md:flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Truck className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">TransCost Truck</span>
            </div>
            
            <div className="flex w-full md:w-auto justify-around md:justify-end gap-1 md:gap-4">
              <button 
                id="nav-new-job"
                onClick={() => setActiveTab('new-job')}
                className={cn(
                  "flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-1.5 rounded-xl transition-all",
                  activeTab === 'new-job' ? "text-indigo-600 bg-indigo-50" : "text-slate-500 hover:bg-slate-100"
                )}
              >
                <PlusCircle className="w-5 h-5" />
                <span className="text-[10px] md:text-sm font-semibold uppercase tracking-wide">คำนวณงาน</span>
              </button>
              <button 
                id="nav-history"
                onClick={() => setActiveTab('history')}
                className={cn(
                  "flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-1.5 rounded-xl transition-all",
                  activeTab === 'history' ? "text-indigo-600 bg-indigo-50" : "text-slate-500 hover:bg-slate-100"
                )}
              >
                <History className="w-5 h-5" />
                <span className="text-[10px] md:text-sm font-semibold uppercase tracking-wide">ประวัติงาน</span>
              </button>
              <button 
                id="nav-settings"
                onClick={() => setActiveTab('settings')}
                className={cn(
                  "flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-1.5 rounded-xl transition-all",
                  activeTab === 'settings' ? "text-indigo-600 bg-indigo-50" : "text-slate-500 hover:bg-slate-100"
                )}
              >
                <SettingsIcon className="w-5 h-5" />
                <span className="text-[10px] md:text-sm font-semibold uppercase tracking-wide">ตั้งค่า</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 pt-6 md:pt-24 pb-12">
        <AnimatePresence mode="wait">
          {activeTab === 'new-job' && (
            <motion.div 
              key="new-job"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              <div className="lg:col-span-4 space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                      <PlusCircle className="w-5 h-5 text-indigo-600" />
                      กรอกข้อมูลงาน
                    </h2>
                    <button 
                      id="btn-preset"
                      onClick={() => usePreset(settings.mainTruckType)}
                      className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      ใช้ค่าเริ่มต้นมาตรฐาน
                    </button>
                  </div>

                  <div className="space-y-4">
                    <InputField 
                      id="input-product"
                      label="ประเภทสินค้า" 
                      type="text" 
                      placeholder="เช่น ข้าวสาร, เหล็ก"
                      value={currentJob.productType} 
                      onChange={(val: string) => setCurrentJob(prev => ({ ...prev, productType: val }))} 
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField 
                        id="input-weight"
                        label="น้ำหนักบรรทุก" 
                        suffix="ตัน"
                        value={currentJob.weightPerTrip} 
                        onChange={(val: number) => setCurrentJob(prev => ({ ...prev, weightPerTrip: val }))} 
                      />
                      <InputField 
                        id="input-distance"
                        label="ระยะทางไป-กลับ" 
                        suffix="กม."
                        value={currentJob.distancePerTrip} 
                        onChange={(val: number) => setCurrentJob(prev => ({ ...prev, distancePerTrip: val }))} 
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <InputField 
                        id="input-trips"
                        label="จำนวนเที่ยว/เดือน" 
                        suffix="เที่ยว"
                        value={currentJob.tripsPerMonth} 
                        onChange={(val: number) => setCurrentJob(prev => ({ ...prev, tripsPerMonth: val }))} 
                      />
                      <InputField 
                        id="input-price"
                        label="ราคาที่เก็บลูกค้า" 
                        suffix="บาท"
                        value={currentJob.pricePerTrip} 
                        onChange={(val: number) => setCurrentJob(prev => ({ ...prev, pricePerTrip: val }))} 
                      />
                      <InputField 
                        id="input-utilization"
                        label="อัตราการใช้งานรถ" 
                        suffix="%"
                        value={currentJob.utilizationRate || 100} 
                        onChange={(val: number) => setCurrentJob(prev => ({ ...prev, utilizationRate: val }))} 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <InputField 
                        id="input-total-monthly-distance"
                        label="ระยะทางรวมที่วิ่งต่อเดือน" 
                        suffix="กม."
                        value={currentJob.totalMonthlyDistance} 
                        readOnly
                      />
                      <p className="text-[10px] text-slate-400 font-medium">
                        คำนวณอัตโนมัติจาก ระยะทางไป-กลับ × จำนวนเที่ยวต่อเดือน
                      </p>
                    </div>

                    <hr className="border-slate-100 my-4" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ต้นทุนผันแปรต่อเที่ยว</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <InputField 
                        id="input-fuel"
                        label="ค่าน้ำมัน" 
                        suffix="บาท"
                        value={currentJob.fuelCost} 
                        onChange={(val: number) => setCurrentJob(prev => ({ ...prev, fuelCost: val }))} 
                      />
                      {settings.driverPaymentMode === DriverPaymentMode.PER_TRIP && (
                        <InputField 
                          id="input-wage"
                          label="ค่าแรงต่อเที่ยว" 
                          suffix="บาท/เที่ยว"
                          value={currentJob.driverWage} 
                          onChange={(val: number) => setCurrentJob(prev => ({ ...prev, driverWage: val }))} 
                        />
                      )}
                      {settings.driverPaymentMode === DriverPaymentMode.MONTHLY_SALARY && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ค่าแรงคนขับ</label>
                          <div className="text-sm font-bold text-slate-400 mt-1">เงินเดือนประจำ</div>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField 
                        id="input-toll"
                        label="ค่าทางด่วน" 
                        suffix="บาท"
                        value={currentJob.tollFees} 
                        onChange={(val: number) => setCurrentJob(prev => ({ ...prev, tollFees: val }))} 
                      />
                      <InputField 
                        id="input-maintenance"
                        label="ค่าซ่อมบำรุง" 
                        suffix="บาท"
                        value={currentJob.maintenanceCost} 
                        onChange={(val: number) => setCurrentJob(prev => ({ ...prev, maintenanceCost: val }))} 
                      />
                    </div>
                    <InputField 
                      id="input-other"
                      label="ค่าใช้จ่ายอื่นๆ" 
                      suffix="บาท"
                      value={currentJob.otherCosts} 
                      onChange={(val: number) => setCurrentJob(prev => ({ ...prev, otherCosts: val }))} 
                    />

                    <hr className="border-slate-100 my-4" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ข้อมูลรถ (เพื่อคิดค่าเสื่อม)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField 
                        id="input-purchase-price"
                        label="ราคารถที่ซื้อ" 
                        suffix="บาท"
                        value={currentJob.truckInfo.purchasePrice} 
                        onChange={(val: number) => setCurrentJob(prev => ({ ...prev, truckInfo: { ...prev.truckInfo, purchasePrice: val } }))} 
                      />
                      <InputField 
                        id="input-resale-value"
                        label="ราคาขายต่อ" 
                        suffix="บาท"
                        value={currentJob.truckInfo.resaleValue} 
                        onChange={(val: number) => setCurrentJob(prev => ({ ...prev, truckInfo: { ...prev.truckInfo, resaleValue: val } }))} 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField 
                        id="input-loan-amount"
                        label="ยอดจัดไฟแนนซ์" 
                        suffix="บาท"
                        value={currentJob.truckInfo.vehicleLoanAmount || 0} 
                        onChange={(val: number) => setCurrentJob(prev => ({ ...prev, truckInfo: { ...prev.truckInfo, vehicleLoanAmount: val } }))} 
                      />
                      <InputField 
                        id="input-interest-rate"
                        label="ดอกเบี้ยรายปี" 
                        suffix="%"
                        value={(currentJob.truckInfo.annualInterestRate || 0) * 100} 
                        onChange={(val: number) => setCurrentJob(prev => ({ ...prev, truckInfo: { ...prev.truckInfo, annualInterestRate: val / 100 } }))} 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField 
                        id="input-life-years"
                        label="อายุการใช้งาน" 
                        suffix="ปี"
                        value={currentJob.truckInfo.expectedLifeYears} 
                        onChange={(val: number) => setCurrentJob(prev => ({ ...prev, truckInfo: { ...prev.truckInfo, expectedLifeYears: val } }))} 
                      />
                      <div className="flex items-end pb-1">
                        <button 
                          id="btn-save-job"
                          onClick={saveJob}
                          className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                        >
                          <Save className="w-4 h-4" />
                          บันทึกงาน
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-8 space-y-10">
                <section className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-8 bg-emerald-600 text-white border-none shadow-xl shadow-emerald-100 flex flex-col justify-center items-center text-center">
                      <div className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-2">กำไรสุทธิต่อเดือน</div>
                      <div className="text-4xl font-black">{formatCurrency(calculation.profitPerMonth)}</div>
                      <div className="text-xs text-emerald-100/70 mt-2 font-medium">หลังหักค่าใช้จ่ายทั้งหมดแล้ว</div>
                    </Card>
                    <Card className="p-8 bg-slate-900 text-white border-none shadow-xl shadow-slate-200 flex flex-col justify-center items-center text-center">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ต้นทุนรวมต่อเดือน</div>
                      <div className="text-4xl font-black">{formatCurrency(monthlyCostStructure.total)}</div>
                      <div className="text-xs text-slate-500 mt-2 font-medium">รวมต้นทุนคงที่และผันแปร</div>
                    </Card>
                    <Card className="p-8 bg-white border-slate-200 shadow-xl shadow-slate-100 flex flex-col justify-center items-center text-center">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">จุดคุ้มทุน (BEP)</div>
                      <div className="text-4xl font-black text-indigo-600">{Math.ceil(calculation.bepTripsPerMonth)} <span className="text-lg">เที่ยว</span></div>
                      <div className="text-xs text-slate-400 mt-2 font-medium">จำนวนเที่ยวขั้นต่ำต่อเดือน</div>
                    </Card>
                  </div>

                  <Card className={cn(
                    "p-4 border-l-8",
                    calculation.status === 'accept' ? "border-l-emerald-500 bg-emerald-50/30" : 
                    calculation.status === 'warning' ? "border-l-amber-500 bg-amber-50/30" : "border-l-rose-500 bg-rose-50/30"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        calculation.status === 'accept' ? "bg-emerald-100 text-emerald-600" : 
                        calculation.status === 'warning' ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600"
                      )}>
                        {calculation.status === 'accept' ? <CheckCircle2 className="w-6 h-6" /> : 
                         calculation.status === 'warning' ? <AlertTriangle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                      </div>
                      <div>
                        <h2 className="text-lg font-black tracking-tight">
                          {calculation.status === 'accept' ? "ราคานี้ไม่ขาดทุน" : 
                           calculation.status === 'warning' ? "กำไรน้อย - ควรระวัง" : "งานนี้เสี่ยงขาดทุน"}
                        </h2>
                        <p className="text-xs text-slate-600 font-medium">
                          {calculation.status === 'accept' ? "กำไรอยู่ในเกณฑ์ดี สามารถรับงานได้เลย" : 
                           calculation.status === 'warning' ? "กำไรต่ำกว่า 15% ควรพิจารณาปรับราคาหรือลดต้นทุน" : "ต้นทุนสูงกว่าราคาที่เรียกเก็บ ไม่แนะนำให้รับงานนี้"}
                        </p>
                      </div>
                    </div>
                  </Card>
                </section>

                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">ประสิทธิภาพต้นทุน (Cost Efficiency)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-6 bg-slate-50 border-slate-200">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ต้นทุนต่อกิโลเมตร (รวม)</div>
                      <div className="text-2xl font-black text-slate-900">{calculation.costPerKm?.toFixed(2) || "0.00"} <span className="text-sm font-medium text-slate-400">บาท</span></div>
                      <div className="text-[10px] text-slate-400 mt-1 font-medium italic">ต้นทุนรวมเฉลี่ยต่อ 1 กม.</div>
                    </Card>
                    <Card className="p-6 bg-slate-50 border-slate-200">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ต้นทุนคงที่ (Fixed / km)</div>
                      <div className="text-2xl font-black text-slate-900">{calculation.fixedCostPerKm?.toFixed(2) || "0.00"} <span className="text-sm font-medium text-slate-400">บาท</span></div>
                      <div className="text-[10px] text-slate-400 mt-1 font-medium italic">ค่าเสื่อม/ดอกเบี้ย/ประกัน/ภาษี</div>
                    </Card>
                    <Card className="p-6 bg-slate-50 border-slate-200">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ต้นทุนผันแปร (Variable / km)</div>
                      <div className="text-2xl font-black text-slate-900">{calculation.variableCostPerKm?.toFixed(2) || "0.00"} <span className="text-sm font-medium text-slate-400">บาท</span></div>
                      <div className="text-[10px] text-slate-400 mt-1 font-medium italic">น้ำมัน/ค่าแรง/ซ่อมบำรุง</div>
                    </Card>
                  </div>
                </section>

                <section className="space-y-6 py-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-xl font-black text-slate-900">โครงสร้างต้นทุนรวมต่อเดือน</h3>
                    <p className="text-sm text-slate-500">สัดส่วนค่าใช้จ่ายที่เกิดขึ้นจริงในการดำเนินงาน</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                    <div className="md:col-span-5">
                      <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'น้ำมัน', value: currentJob.fuelCost * currentJob.tripsPerMonth, color: '#6366f1' },
                                { name: 'ค่าแรง', value: currentJob.driverWage * currentJob.tripsPerMonth, color: '#8b5cf6' },
                                { name: 'ทางด่วน', value: currentJob.tollFees * currentJob.tripsPerMonth, color: '#a855f7' },
                                { name: 'ซ่อมบำรุง', value: currentJob.maintenanceCost * currentJob.tripsPerMonth, color: '#d946ef' },
                                { name: 'ค่าเสื่อม', value: calculation.depreciationPerTrip * currentJob.tripsPerMonth, color: '#ec4899' },
                                { name: 'คงที่อื่นๆ', value: (currentJob.otherCosts + calculation.fixedCostPerTrip - calculation.depreciationPerTrip) * currentJob.tripsPerMonth, color: '#f43f5e' },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {[0,1,2,3,4,5].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'][index]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number) => formatCurrency(value)}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">ต้นทุนรวม</span>
                          <span className="text-lg font-black text-slate-900">{formatCurrency(monthlyCostStructure.total)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="md:col-span-7 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-indigo-500" />
                              <span className="text-xs font-bold text-slate-600">น้ำมัน</span>
                            </div>
                            <span className="text-xs font-black text-slate-900">{((currentJob.fuelCost / calculation.totalCostPerTrip) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-pink-500" />
                              <span className="text-xs font-bold text-slate-600">ค่าเสื่อม</span>
                            </div>
                            <span className="text-xs font-black text-slate-900">{((calculation.depreciationPerTrip / calculation.totalCostPerTrip) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-emerald-500" />
                              <span className="text-xs font-bold text-slate-600">Fixed Cost</span>
                            </div>
                            <span className="text-xs font-black text-slate-900">{monthlyCostStructure.fixedPercent.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-amber-500" />
                              <span className="text-xs font-bold text-slate-600">Variable</span>
                            </div>
                            <span className="text-xs font-black text-slate-900">{monthlyCostStructure.variablePercent.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-500">ต้นทุนคงที่รายเดือน</span>
                          <span className="font-bold text-slate-900">{formatCurrency(monthlyCostStructure.fixed)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-500">ต้นทุนผันแปรรายเดือน</span>
                          <span className="font-bold text-slate-900">{formatCurrency(monthlyCostStructure.variable)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <Zap className="w-6 h-6 text-amber-500" />
                      เครื่องมือวิเคราะห์เชิงกลยุทธ์
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <Card className="p-6 bg-slate-900 text-white border-none shadow-xl">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center shrink-0">
                              <Info className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg mb-1">Insight: เที่ยวเปล่า (Empty Trip)</h3>
                              <p className="text-slate-400 text-sm leading-relaxed">
                                ปัจจุบันคุณมีเที่ยวเปล่าประมาณ 20% หากสามารถหางานขากลับได้เพิ่มขึ้น จะช่วยเพิ่มกำไรได้มหาศาล
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                              <div className="text-[10px] font-bold text-indigo-300 uppercase mb-1">ถ้าลดเที่ยวเปล่าเหลือ 10%</div>
                              <div className="text-xl font-black text-emerald-400">+{formatCurrency(emptyTripSim.gain10)} <span className="text-xs font-medium text-slate-400">/เดือน</span></div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                              <div className="text-[10px] font-bold text-indigo-300 uppercase mb-1">ถ้าไม่มีเที่ยวเปล่าเลย (0%)</div>
                              <div className="text-xl font-black text-emerald-400">+{formatCurrency(emptyTripSim.gain20)} <span className="text-xs font-medium text-slate-400">/เดือน</span></div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="md:w-64 bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/20 flex flex-col justify-center">
                          <p className="text-xs font-medium text-indigo-200 text-center mb-3 italic">
                            "หางานขากลับเพียง 2 เที่ยว/เดือน กำไรจะเพิ่มขึ้นประมาณ {formatCurrency(calculation.profitPerTrip * 2)} บาท"
                          </p>
                          <button 
                            onClick={() => setActiveTab('empty-trip-solution')}
                            className="w-full py-2 bg-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                          >
                            ดูวิธีลดเที่ยวเปล่า <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6 bg-indigo-900 text-white border-none overflow-visible relative shadow-xl">
                      <div className="absolute -top-3 -right-3 w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center shadow-xl rotate-12">
                        <Scale className="w-6 h-6 text-indigo-900" />
                      </div>
                      <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex-1 space-y-4 w-full">
                          <div>
                            <h3 className="font-bold text-xl flex items-center gap-2">
                              What-if: ทดลองปรับราคา
                            </h3>
                            <p className="text-indigo-200 text-sm">ลองปรับราคาต่อเที่ยวเพื่อดูผลกำไรที่เปลี่ยนไป</p>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-indigo-300 uppercase">
                              <span>ลดราคา</span>
                              <span>ราคาปัจจุบัน</span>
                              <span>เพิ่มราคา</span>
                            </div>
                            <input 
                              type="range" 
                              min="-5000" 
                              max="5000" 
                              step="100"
                              value={priceAdjustment}
                              onChange={(e) => setPriceAdjustment(parseInt(e.target.value))}
                              className="w-full h-2 bg-indigo-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                            />
                            <div className="flex justify-between text-lg font-black">
                              <span className="text-rose-400">-5,000</span>
                              <span className="text-white">{priceAdjustment >= 0 ? '+' : ''}{priceAdjustment.toLocaleString()}</span>
                              <span className="text-emerald-400">+5,000</span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 bg-white/10 p-6 rounded-2xl border border-white/10 text-center min-w-[200px]">
                          <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">กำไรต่อเดือนจะเปลี่ยนเป็น</div>
                          <div className={cn(
                            "text-3xl font-black",
                            calculation.profitPerMonth >= 0 ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {formatCurrency(calculation.profitPerMonth)}
                          </div>
                          <div className="text-xs font-medium text-indigo-200 mt-2">
                            {priceAdjustment !== 0 ? (
                              <>
                                {priceAdjustment > 0 ? 'เพิ่มขึ้น ' : 'ลดลง '}
                                <span className="font-bold text-white">
                                  {formatCurrency(Math.abs(calculation.profitPerMonth - baseCalculation.profitPerMonth))}
                                </span>
                              </>
                            ) : 'เลื่อนแถบเพื่อดูผลลัพธ์'}
                          </div>
                        </div>
                      </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="p-6">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <Scale className="w-4 h-4 text-indigo-600" />
                          เปรียบเทียบต้นทุนน้ำมัน (Benchmark)
                        </h3>
                        <div className="space-y-4">
                          <div className="flex justify-between items-end">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">ต้นทุนของคุณ</div>
                              <div className={cn(
                                "text-2xl font-black",
                                isFuelHigh ? "text-rose-500" : "text-emerald-500"
                              )}>
                                {calculation.fuelCostPerKm?.toFixed(2) || "0.00"} <span className="text-sm font-medium text-slate-400">บ./กม.</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-bold text-slate-400 uppercase">ค่าเฉลี่ยอุตสาหกรรม</div>
                              <div className="text-xl font-bold text-slate-400">
                                {currentBenchmark.fuelPerKm.toFixed(1)} <span className="text-xs font-medium">บ./กม.</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "absolute top-0 left-0 h-full transition-all duration-500",
                                isFuelHigh ? "bg-rose-500" : "bg-emerald-500"
                              )}
                              style={{ width: `${Math.min((calculation.fuelCostPerKm / (currentBenchmark.fuelPerKm * 1.5)) * 100, 100)}%` }}
                            />
                            <div 
                              className="absolute top-0 h-full w-0.5 bg-slate-400 z-10"
                              style={{ left: `${(currentBenchmark.fuelPerKm / (currentBenchmark.fuelPerKm * 1.5)) * 100}%` }}
                            />
                          </div>
                          
                          <p className="text-xs font-medium text-slate-500">
                            {isFuelHigh 
                              ? "⚠️ ต้นทุนน้ำมันของคุณสูงกว่าค่าเฉลี่ย ควรตรวจสอบการกินน้ำมันหรือพฤติกรรมการขับขี่" 
                              : "✅ ต้นทุนน้ำมันของคุณอยู่ในระดับปกติหรือดีกว่าค่าเฉลี่ย"}
                          </p>
                        </div>
                      </Card>

                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Zap className="w-3 h-3 text-amber-500" />
                          คำแนะนำเชิงตัดสินใจ (Actionable Insights)
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {recommendations.map((rec, i) => (
                            <Card key={i} className={cn(
                              "p-3 border-l-4",
                              rec.type === 'danger' ? "border-l-rose-500 bg-rose-50/50" : 
                              rec.type === 'warning' ? "border-l-amber-500 bg-amber-50/50" : "border-l-emerald-500 bg-emerald-50/50"
                            )}>
                              <div className="flex gap-3">
                                <div className={cn(
                                  "mt-0.5",
                                  rec.type === 'danger' ? "text-rose-600" : 
                                  rec.type === 'warning' ? "text-amber-600" : "text-emerald-600"
                                )}>
                                  {rec.type === 'danger' ? <XCircle className="w-3 h-3" /> : 
                                   rec.type === 'warning' ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-900 leading-tight">{rec.text}</p>
                                  <p className={cn(
                                    "text-[10px] font-medium mt-1",
                                    rec.type === 'danger' ? "text-rose-700" : 
                                    rec.type === 'warning' ? "text-amber-700" : "text-emerald-700"
                                  )}>
                                    💡 {rec.action}
                                  </p>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  <History className="w-6 h-6 text-indigo-600" />
                  ประวัติการคำนวณ
                </h2>
                <div className="text-sm font-medium text-slate-500">
                  บันทึกไว้ {savedJobs.length} รายการ
                </div>
              </div>

              {savedJobs.length === 0 ? (
                <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                    <History className="w-8 h-8 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">ยังไม่มีประวัติการคำนวณ</h3>
                    <p className="text-slate-500">เริ่มคำนวณงานใหม่และกดบันทึกเพื่อดูที่นี่</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('new-job')}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                  >
                    คำนวณงานแรก
                  </button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedJobs.map((job) => {
                    const res = calculateJob(job, settings);
                    return (
                      <Card key={job.id} className="group hover:border-indigo-300 transition-all">
                        <div className="p-5 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {new Date(job.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                              </div>
                              <h3 className="font-bold text-lg text-slate-900">{job.productType || 'ไม่ระบุสินค้า'}</h3>
                            </div>
                            <div className={cn(
                              "px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider",
                              res.status === 'accept' ? "bg-emerald-100 text-emerald-700" : 
                              res.status === 'warning' ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                            )}>
                              {res.status === 'accept' ? 'กำไรดี' : res.status === 'warning' ? 'เสี่ยง' : 'ขาดทุน'}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-50">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">กำไร/เที่ยว</div>
                              <div className={cn("font-black", res.profitPerTrip >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                {formatCurrency(res.profitPerTrip)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">ระยะทาง</div>
                              <div className="font-black text-slate-900">{job.distancePerTrip} กม.</div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              onClick={() => loadJob(job)}
                              className="flex-1 bg-slate-100 text-slate-600 font-bold py-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                            >
                              <ChevronRight className="w-4 h-4" />
                              ดูรายละเอียด
                            </button>
                            <button 
                              onClick={() => deleteJob(job.id)}
                              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'empty-trip-solution' && (
            <motion.div 
              key="empty-trip-solution"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setActiveTab('new-job')}
                  className="flex items-center gap-2 text-slate-500 font-bold hover:text-indigo-600 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                  กลับไปที่การคำนวณ
                </button>
                <h2 className="text-2xl font-black tracking-tight">แนวทางลดเที่ยวเปล่า (Empty Trip Solution)</h2>
                <div className="w-20" /> 
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 bg-slate-900 text-white border-none">
                  <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">สัดส่วนเที่ยวเปล่า</div>
                  <div className="text-3xl font-black">20%</div>
                  <div className="text-[10px] text-slate-400 mt-1">ประเมินจากระยะทางไป-กลับ</div>
                </Card>
                <Card className="p-6 bg-rose-600 text-white border-none">
                  <div className="text-xs font-bold text-rose-200 uppercase tracking-widest mb-1">ต้นทุนที่สูญเสีย/เดือน</div>
                  <div className="text-3xl font-black">{formatCurrency(calculation.emptyTripLoss * (currentJob.tripsPerMonth * 0.2))}</div>
                  <div className="text-[10px] text-rose-200/70 mt-1">เงินที่หายไปจากค่าน้ำมันและค่าเสื่อม</div>
                </Card>
                <Card className="p-6 bg-white border-slate-200">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">ผลกระทบต่อกำไร</div>
                  <div className="text-3xl font-black text-rose-600">-{((calculation.emptyTripLoss * 0.2 / (calculation.profitPerTrip || 1)) * 100).toFixed(1)}%</div>
                  <div className="text-[10px] text-slate-400 mt-1">กำไรที่หายไปเมื่อเทียบกับกำไรปัจจุบัน</div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    แนวทางลดเที่ยวเปล่าที่ SME ทำได้จริง
                  </h3>
                  <div className="space-y-3">
                    {[
                      { title: "การรับงานขากลับในเส้นทางเดียวกัน", desc: "ติดต่อลูกค้าในพื้นที่ปลายทางเพื่อรับสินค้ากลับมายังจุดเริ่มต้น แม้จะได้ราคาต่ำกว่าปกติแต่ก็ช่วยคลุมต้นทุนน้ำมัน" },
                      { title: "การจัดตารางวิ่งแบบ Loop", desc: "วางแผนเส้นทางให้รถวิ่งเป็นวงกลม (A -> B -> C -> A) แทนการวิ่งไป-กลับเส้นทางเดิม เพื่อให้มีสินค้าบรรทุกตลอดเวลา" },
                      { title: "การรวมงานหลายลูกค้าในเที่ยวเดียว", desc: "หากสินค้าไม่เต็มคัน ให้รับงานจากลูกค้าหลายรายที่อยู่ในเส้นทางเดียวกันเพื่อเพิ่ม Utilization" },
                      { title: "การปรับราคาขนส่งสำหรับเที่ยวขากลับ", desc: "เสนอราคาพิเศษ (Backhaul Rate) ให้กับลูกค้าเพื่อจูงใจให้ใช้บริการในเที่ยวที่รถว่าง" }
                    ].map((item, i) => (
                      <Card key={i} className="p-4 hover:border-indigo-300 transition-all cursor-default">
                        <div className="flex gap-4">
                          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0 font-bold text-indigo-600">
                            0{i + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{item.title}</h4>
                            <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    จำลองผลลัพธ์ (Simulation)
                  </h3>
                  <Card className="p-6 space-y-6">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">เลือกเป้าหมายการลดเที่ยวเปล่า</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[15, 10, 0].map((target) => (
                          <button
                            key={target}
                            onClick={() => {
                              setSimTarget(target);
                            }}
                            className={cn(
                              "py-2 rounded-xl font-bold text-sm transition-all border",
                              simTarget === target ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            เหลือ {target}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-500">กำไรใหม่ต่อเดือน</span>
                        <span className="text-xl font-black text-emerald-600">
                          {formatCurrency(calculation.profitPerMonth + (calculation.emptyTripLoss * currentJob.tripsPerMonth * (0.2 - simTarget / 100)))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-500">ต้นทุนต่อเที่ยวใหม่</span>
                        <span className="text-lg font-bold text-slate-900">
                          {formatCurrency(calculation.totalCostPerTrip - (calculation.emptyTripLoss * (0.2 - simTarget / 100)))}
                        </span>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-xl flex justify-between items-center border border-emerald-100">
                        <span className="text-xs font-bold text-emerald-700 uppercase">ส่วนต่างกำไรที่เพิ่มขึ้น</span>
                        <span className="text-lg font-black text-emerald-600">
                          +{formatCurrency(calculation.emptyTripLoss * currentJob.tripsPerMonth * (0.2 - simTarget / 100))}
                        </span>
                      </div>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                      <div className="flex gap-3">
                        <Info className="w-5 h-5 text-indigo-600 shrink-0" />
                        <p className="text-xs font-medium text-indigo-800 leading-relaxed">
                          <span className="font-bold block mb-1">คำแนะนำ:</span>
                          หากคุณสามารถลดเที่ยวเปล่าได้เพียง 1–2 เที่ยว/เดือน กำไรของคุณจะเพิ่มขึ้นอย่างมีนัยสำคัญ โดยไม่ต้องลงทุนเพิ่มจำนวนรถหรือจ้างคนขับเพิ่ม
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <SettingsIcon className="w-6 h-6 text-indigo-600" />
                ข้อมูลกิจการ
              </h2>

              <Card className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField 
                    id="setting-business-name"
                    label="ชื่อกิจการ" 
                    type="text" 
                    value={settings.businessName} 
                    onChange={(val: string) => setSettings(prev => ({ ...prev, businessName: val }))} 
                  />
                  <SelectField 
                    id="setting-truck-type"
                    label="ประเภทรถหลัก" 
                    value={settings.mainTruckType} 
                    onChange={(val: TruckType) => setSettings(prev => ({ ...prev, mainTruckType: val }))}
                    options={Object.values(TruckType).map(t => ({ label: t, value: t }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField 
                    id="setting-truck-count"
                    label="จำนวนรถในทีม" 
                    suffix="คัน"
                    value={settings.truckCount} 
                    onChange={(val: number) => setSettings(prev => ({ ...prev, truckCount: val }))} 
                  />
                  <InputField 
                    id="setting-fuel-price"
                    label="ราคาน้ำมันอ้างอิง" 
                    suffix="บาท/ลิตร"
                    value={settings.refFuelPrice} 
                    onChange={(val: number) => setSettings(prev => ({ ...prev, refFuelPrice: val }))} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {settings.driverPaymentMode === DriverPaymentMode.MONTHLY_SALARY ? (
                    <InputField 
                      id="setting-driver-wage"
                      label="ค่าแรงต่อเดือน" 
                      suffix="บาท/เดือน"
                      value={settings.avgDriverWage} 
                      onChange={(val: number) => setSettings(prev => ({ ...prev, avgDriverWage: val }))} 
                    />
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ค่าแรงคนขับ</label>
                      <div className="text-sm font-bold text-slate-400 mt-1">จ่ายตามเที่ยวงาน</div>
                    </div>
                  )}
                  <SelectField 
                    id="setting-driver-payment-mode"
                    label="รูปแบบการจ่ายค่าแรง" 
                    value={settings.driverPaymentMode} 
                    onChange={(val: DriverPaymentMode) => setSettings(prev => ({ ...prev, driverPaymentMode: val }))}
                    options={[
                      { label: 'จ่ายต่อเที่ยว', value: DriverPaymentMode.PER_TRIP },
                      { label: 'เงินเดือนประจำ', value: DriverPaymentMode.MONTHLY_SALARY }
                    ]}
                  />
                </div>

                <hr className="border-slate-100" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">ค่าใช้จ่ายประจำ (ต่อคัน/ต่อปี)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField 
                    id="setting-insurance"
                    label="ค่าประกันภัยรถ" 
                    suffix="บาท"
                    value={settings.annualInsurance} 
                    onChange={(val: number) => setSettings(prev => ({ ...prev, annualInsurance: val }))} 
                  />
                  <InputField 
                    id="setting-tax"
                    label="ภาษี/พรบ." 
                    suffix="บาท"
                    value={settings.annualTax} 
                    onChange={(val: number) => setSettings(prev => ({ ...prev, annualTax: val }))} 
                  />
                </div>

                <div className="pt-4 space-y-3">
                  <button 
                    id="btn-save-settings"
                    onClick={() => setActiveTab('new-job')}
                    className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    บันทึกข้อมูลและเริ่มคำนวณ
                  </button>
                  <button 
                    id="btn-load-test-data"
                    onClick={() => {
                      setSettings(DEFAULT_SETTINGS);
                      setCurrentJob(prev => ({
                        ...prev,
                        productType: 'งานทดสอบระบบ',
                        weightPerTrip: 15,
                        distancePerTrip: 300,
                        tripsPerMonth: 20,
                        pricePerTrip: 18000,
                        fuelCost: 2250,
                        driverWage: 0,
                        tollFees: 500,
                        maintenanceCost: 600,
                        otherCosts: 0,
                        truckInfo: DEFAULT_TRUCK_INFO,
                        totalMonthlyDistance: 6000,
                        utilizationRate: 100
                      }));
                      setActiveTab('new-job');
                    }}
                    className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-all border border-slate-200"
                  >
                    โหลดข้อมูลทดสอบระบบ (Test Data)
                  </button>
                </div>
              </Card>

              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex gap-4">
                <div className="shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Info className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-indigo-900 text-sm">ทำไมต้องกรอกข้อมูลนี้?</h4>
                  <p className="text-indigo-700 text-xs leading-relaxed mt-1">
                    ข้อมูลเหล่านี้จะถูกนำไปใช้เป็นค่าเริ่มต้นในการคำนวณงานใหม่ เพื่อให้คุณไม่ต้องกรอกข้อมูลเดิมซ้ำๆ และช่วยให้การคำนวณต้นทุนคงที่ (Fixed Cost) แม่นยำยิ่งขึ้น
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="md:hidden fixed bottom-20 right-4">
        <button 
          onClick={() => setActiveTab('new-job')}
          className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        >
          <PlusCircle className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}