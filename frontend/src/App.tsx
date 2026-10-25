import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ArchitectureStudioPage } from './features/architecture';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ArchitectureStudioPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
