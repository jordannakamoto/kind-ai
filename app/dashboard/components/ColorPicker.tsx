'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface ColorTheme {
  name: string;
  color: string; // Just store the hex color
}

interface ColorPickerProps {
  selectedTheme: ColorTheme;
  onColorSelect: (theme: ColorTheme) => void;
  onClose: () => void;
}

const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  s /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const generateThemeFromColor = (hex: string): ColorTheme => {
  return {
    name: 'Custom',
    color: hex // Just store the hex color
  };
};

// Helper function to adjust color lightness
const adjustColorLightness = (hex: string, percent: number): string => {
  // Convert hex to RGB
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
};

export default function ColorPicker({ selectedTheme, onColorSelect, onClose }: ColorPickerProps) {
  const [hue, setHue] = useState(220);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const satLightRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    drawColorWheel();
    drawSaturationLightness();
  }, [hue]);

  const drawColorWheel = () => {
    const canvas = wheelRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 5;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw color wheel
    for (let angle = 0; angle < 360; angle += 1) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, (angle - 1) * Math.PI / 180, angle * Math.PI / 180);
      ctx.lineWidth = 3;
      ctx.strokeStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.stroke();
    }

    // Draw current hue indicator
    const hueAngle = (hue - 90) * Math.PI / 180;
    const indicatorX = centerX + Math.cos(hueAngle) * (radius - 1);
    const indicatorY = centerY + Math.sin(hueAngle) * (radius - 1);

    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawSaturationLightness = () => {
    const canvas = satLightRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Create saturation/lightness gradient
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const s = (x / width) * 100;
        const l = ((height - y) / height) * 100;
        ctx.fillStyle = `hsl(${hue}, ${s}%, ${l}%)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Draw current selection indicator
    const x = (saturation / 100) * width;
    const y = height - (lightness / 100) * height;

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const handleWheelClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = wheelRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = Math.min(centerX, centerY) - 5;

    if (distance <= radius + 10) {
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const newHue = (angle + 90 + 360) % 360;
      setHue(newHue);
    }
  };

  const handleSatLightClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = satLightRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newSaturation = Math.max(0, Math.min(100, (x / canvas.width) * 100));
    const newLightness = Math.max(0, Math.min(100, ((canvas.height - y) / canvas.height) * 100));

    setSaturation(newSaturation);
    setLightness(newLightness);
  };

  const currentColor = hslToHex(hue, saturation, lightness);

  const handleUseColor = () => {
    const customTheme = generateThemeFromColor(currentColor);
    onColorSelect(customTheme);
    onClose();
  };

  useEffect(() => {
    drawSaturationLightness();
  }, [saturation, lightness]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-80 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="text-sm font-semibold">Pick Color</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Color Wheel and Controls */}
        <div className="p-4 space-y-4">
          <div className="flex gap-4">
            {/* Color Wheel */}
            <div className="flex-shrink-0">
              <canvas
                ref={wheelRef}
                width={120}
                height={120}
                onClick={handleWheelClick}
                className="cursor-crosshair rounded-full"
              />
            </div>

            {/* Saturation/Lightness */}
            <div className="flex-1">
              <canvas
                ref={satLightRef}
                width={120}
                height={120}
                onClick={handleSatLightClick}
                className="cursor-crosshair rounded border"
              />
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-600">Hue: {Math.round(hue)}°</label>
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={(e) => setHue(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Sat: {Math.round(saturation)}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={saturation}
                onChange={(e) => setSaturation(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Light: {Math.round(lightness)}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={lightness}
                onChange={(e) => setLightness(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Preview and Controls */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-8 rounded border-2 border-gray-300"
              style={{ backgroundColor: currentColor }}
            />
            <input
              type="text"
              value={currentColor}
              readOnly
              className="flex-1 px-2 py-1 text-xs font-mono bg-gray-50 border rounded"
            />
            <button
              onClick={handleUseColor}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Use
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}