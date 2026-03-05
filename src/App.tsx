import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import StartPage from './pages/StartPage';
import Settings from './pages/Settings';
import LiveChannels from './pages/LiveChannels';
import StockResearch from './pages/StockResearch';
import FinanceAnalysis from './pages/FinanceAnalysis';
import Terminal from './pages/Terminal';
import AltData from './pages/AltData';
import './index.css';
import './styles/main.css';
import './styles/panels.css';
import './styles/rtl-overrides.css';
import './styles/happy-theme.css';

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<StartPage />} />
                <Route path="/monitor" element={<Home />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/live-channels" element={<LiveChannels />} />
                <Route path="/stock-research" element={<StockResearch />} />
                <Route path="/finance-analysis" element={<FinanceAnalysis />} />
                <Route path="/terminal" element={<Terminal />} />
                <Route path="/alt-data" element={<AltData />} />
            </Routes>
        </Router>
    );
}
