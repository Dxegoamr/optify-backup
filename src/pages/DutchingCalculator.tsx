import DashboardLayout from '@/components/layout/DashboardLayout';
import { DutchingCalculator } from '@/components/freebet/DutchingCalculator';

const DutchingCalculatorPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-10">
        <DutchingCalculator variant="page" />
      </div>
    </DashboardLayout>
  );
};

export default DutchingCalculatorPage;

