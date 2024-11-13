"use client"; 

import { useState } from 'react';
import { area, sector } from '@/lib/select';

const HomePage = () => {
  const [loading, setLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState(area[0].value); // 初期値を設定
  const [selectedSector, setSelectedSector] = useState(sector[0].value); // 初期値を設定
  // 選択された value に基づいて label を取得
  const getLabel = (options: { value: string; label: string }[], value: string) => {
    const option = options.find((opt) => opt.value === value);
    return option ? option.label : '';
  };

  const handleRunScript = async () => {
    setLoading(true);
    
    const areaLabel = getLabel(area, selectedArea);
    const sectorLabel = getLabel(sector, selectedSector);

    try {
      const response = await fetch('/api/walk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          area: {
            value: selectedArea,
            label: areaLabel,
          },
          sector: {
            value: selectedSector,
            label: sectorLabel,
          },
        }),
      });

      if (response.ok) {
        alert('Script executed successfully');
      } else {
        alert('Failed to execute script');
      }
    } catch (error) {
      console.error('Error executing script:', error);
      alert('Error executing script');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div>
        <button onClick={handleRunScript} disabled={loading}>
          {loading ? 'Executing...' : '【 お散歩開始ボタン 】'}
        </button>
      </div>

      <div>
        <select
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value)}
        >
          {area.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <select
          value={selectedSector}
          onChange={(e) => setSelectedSector(e.target.value)}
        >
          {sector.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default HomePage;