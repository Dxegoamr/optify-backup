import { useEffect } from 'react';
import { DutchingCalculator } from '@/components/freebet/DutchingCalculator';

const DutchingCalculatorPopup = () => {
  useEffect(() => {
    document.body.classList.add('popup-body');
    return () => {
      document.body.classList.remove('popup-body');
    };
  }, []);

  return (
    <div className="popup-shell">
      <header className="popup-header">
        <div className="popup-brand">
          <span className="popup-logo">
            <svg
              className="popup-logo-diamond"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 3h12l4 6-10 13L2 9l4-6z"/>
              <path d="M11 3 8 9l4 13 4-13-3-6"/>
              <path d="M2 9h20"/>
            </svg>
          </span>
          <div className="popup-title">
            <h1>Optify Calculadora</h1>
          </div>
        </div>
        <button
          onClick={() => window.close()}
          className="popup-close"
        >
          Fechar
        </button>
      </header>

      <main className="popup-content">
        <DutchingCalculator variant="page" showLaunchButton={false} showHero={false} className="popup-calculator" />
      </main>
    </div>
  );
};

export default DutchingCalculatorPopup;

