import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Settings from './pages/Settings';
import LiveChannels from './pages/LiveChannels';
import './index.css';
import './styles/main.css';
import './styles/panels.css';
import './styles/rtl-overrides.css';
import './styles/happy-theme.css';
export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/live-channels" element={<LiveChannels />} />
            </Routes>
        </Router>
    );
}
