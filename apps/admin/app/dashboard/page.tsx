import DashboardHeader from './components/DashboardHeader';
import KPISection from './components/KPISection';
import QuickActionsPanel from './components/QuickActionsPanel';
import ChartSection from './components/ChartSection';
import { DashboardService } from './services/dashboard.service';

export default async function DashboardPage() {
  const data = await DashboardService.fetchDashboardData();
  
  // Calculate derived values
  const orderData = data.daily.length 
    ? data.daily.map((d) => d.orders) 
    : [3, 4, 2, 6, 5, 8, 7, 9, 6, 10, 8, 11, 9, 12];
    
  const delta = DashboardService.calculateDelta(orderData);
  const avgOrderValue = DashboardService.calculateAvgOrderValue(
    data.kpis.ordersToday, 
    data.kpis.revenueToday
  );

  return (
    <main>
      <div className="s-wrap">
        <DashboardHeader 
          scopeApplied={data.kpis.scopeApplied?.scope}
          dataError={data.dataError}
        />

        <KPISection 
          kpis={data.kpis} 
          delta={delta} 
        />

        <QuickActionsPanel 
          recent={data.recent} 
          health={data.health}
          avgOrderValue={avgOrderValue}
        />

        <ChartSection daily={data.daily} />
      </div>
    </main>
  );
}