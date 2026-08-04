"use client";

import React, { useEffect, useRef, useState } from "react";

// Ground Stations
const GROUND_STATIONS = [
  { id: "seoul", name: "서울", lat: 37.5665, lng: 126.9780 },
  { id: "newyork", name: "뉴욕", lat: 40.7128, lng: -74.0060 },
  { id: "london", name: "런던", lat: 51.5074, lng: -0.1278 },
];

export default function SatelliteGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Hydration state
  const [isMounted, setIsMounted] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  // Game Settings
  const [selectedStation, setSelectedStation] = useState(GROUND_STATIONS[0]);

  // Tamagotchi Stats
  const [energy, setEnergy] = useState(100);
  const [durability, setDurability] = useState(100);
  const [dataCollected, setDataCollected] = useState(0);
  const [isAlive, setIsAlive] = useState(true);

  // Orbit State
  const [timePassed, setTimePassed] = useState(0); // in simulated seconds
  const orbitPeriod = 90 * 60; // 90 minutes in seconds

  // Communication window
  const [canCommunicate, setCanCommunicate] = useState(false);
  const [nextCommWindow, setNextCommWindow] = useState(0);

  // Initialize from LocalStorage
  useEffect(() => {
    const savedData = localStorage.getItem("satelliteGameState");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setEnergy(parsed.energy ?? 100);
      setDurability(parsed.durability ?? 100);
      setDataCollected(parsed.dataCollected ?? 0);
      setIsAlive(parsed.isAlive ?? true);
      setTimePassed(parsed.timePassed ?? 0);
      if (parsed.stationId) {
        const st = GROUND_STATIONS.find(s => s.id === parsed.stationId);
        if (st) setSelectedStation(st);
      }
      setIsSetupComplete(parsed.isSetupComplete ?? false);
    }
    setIsMounted(true);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("satelliteGameState", JSON.stringify({
        energy, durability, dataCollected, isAlive, timePassed,
        stationId: selectedStation.id, isSetupComplete
      }));
    }
  }, [energy, durability, dataCollected, isAlive, timePassed, selectedStation, isSetupComplete, isMounted]);

  // Actions
  const chargeSolar = () => {
    if (!isAlive) return;
    setEnergy((prev) => Math.min(prev + 15, 100));
  };

  const repair = () => {
    if (!isAlive) return;
    if (energy >= 10) {
      setEnergy((prev) => prev - 10);
      setDurability((prev) => Math.min(prev + 20, 100));
    }
  };

  const collectData = () => {
    if (!isAlive || !canCommunicate) return;
    if (energy >= 20) {
      setEnergy((prev) => prev - 20);
      setDataCollected((prev) => prev + 10);
    }
  };

  // Helper: Get Satellite Position based on timePassed
  const getSatellitePosition = React.useCallback((t: number) => {
    // Simplified orbit: Inclination of ~51.6 degrees (like ISS)
    const inclination = 51.6 * (Math.PI / 180);
    const orbitFraction = (t % orbitPeriod) / orbitPeriod;
    const angle = orbitFraction * 2 * Math.PI;

    // Calculate Latitude
    const latRad = Math.asin(Math.sin(inclination) * Math.sin(angle));
    const lat = latRad * (180 / Math.PI);

    // Calculate Longitude
    // Earth rotates ~360 degrees per 24 hours (86400 seconds)
    const earthRotationAngle = (t % 86400) / 86400 * 2 * Math.PI;

    // Simplistic longitude progression
    const lngRad = Math.atan2(Math.cos(inclination) * Math.sin(angle), Math.cos(angle)) - earthRotationAngle;
    let lng = lngRad * (180 / Math.PI);

    // Normalize lng to -180 to 180
    while (lng > 180) lng -= 360;
    while (lng < -180) lng += 360;

    return { lat, lng };
  }, [orbitPeriod]);

  // Game Loop & Rendering
  useEffect(() => {
    if (!isMounted || !isSetupComplete) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let tickCounter = 0;

    const render = (sysTime: number) => {
      const deltaTime = sysTime - lastTime;
      lastTime = sysTime;

      // Update game logic (every ~1s real time = 60s simulated time for faster orbits)
      tickCounter += deltaTime;
      if (tickCounter > 1000) {
        tickCounter = 0;

        if (isAlive) {
          setTimePassed(prev => prev + 60); // Advance 1 minute per second

          setEnergy((prev) => {
            const newEnergy = prev - 0.5;
            return Math.max(0, newEnergy);
          });
          setDurability((prev) => {
            const newDurability = prev - 0.2;
            return Math.max(0, newDurability);
          });
        }
      }

      // Communication Window Logic (simplified distance check)
      const currentPos = getSatellitePosition(timePassed);
      // Rough distance check in degrees
      const latDiff = currentPos.lat - selectedStation.lat;
      const lngDiff = currentPos.lng - selectedStation.lng;
      const distance = Math.sqrt(latDiff*latDiff + lngDiff*lngDiff);

      const inRange = distance < 30; // ~30 degrees communication radius
      setCanCommunicate(inRange);

      // Simple prediction for next window (not perfectly accurate but good for gameplay UI)
      if (inRange) {
        setNextCommWindow(0);
      } else {
        // Very rough estimate based on orbit progress
        const t = timePassed;
        let found = false;
        for(let i = 1; i <= orbitPeriod; i+=60) {
          const p = getSatellitePosition(t + i);
          const d = Math.sqrt(Math.pow(p.lat - selectedStation.lat, 2) + Math.pow(p.lng - selectedStation.lng, 2));
          if (d < 30) {
            setNextCommWindow(i);
            found = true;
            break;
          }
        }
        if (!found) setNextCommWindow(-1);
      }

      // Draw Map
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          ctx.clearRect(0, 0, width, height);

          // Background Map Grid
          ctx.fillStyle = "#0a192f";
          ctx.fillRect(0, 0, width, height);

          ctx.strokeStyle = "#172a45";
          ctx.lineWidth = 1;
          for(let i = 0; i <= 180; i += 30) {
             const y = (i / 180) * height;
             ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
          }
          for(let i = 0; i <= 360; i += 30) {
             const x = (i / 360) * width;
             ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
          }

          // Equator
          ctx.strokeStyle = "#303C55";
          ctx.beginPath(); ctx.moveTo(0, height/2); ctx.lineTo(width, height/2); ctx.stroke();

          // Map lat/lng to canvas x/y
          const getCanvasXY = (lat: number, lng: number) => {
            const x = ((lng + 180) / 360) * width;
            const y = ((-lat + 90) / 180) * height; // Invert lat
            return { x, y };
          };

          // Draw Orbit Track (past & future)
          ctx.strokeStyle = "rgba(100, 255, 218, 0.2)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          let startedTrack = false;
          for(let i = 0; i < orbitPeriod; i += 120) {
            const p = getSatellitePosition(timePassed + i);
            const xy = getCanvasXY(p.lat, p.lng);

            // Handle wrap-around
            if (startedTrack && xy.x > 0 && xy.x < width) {
               // naive wrap check
               if (Math.abs(xy.x - p.lng) > width/2) {
                 ctx.moveTo(xy.x, xy.y);
               } else {
                 ctx.lineTo(xy.x, xy.y);
               }
            } else {
               ctx.moveTo(xy.x, xy.y);
               startedTrack = true;
            }
          }
          ctx.stroke();

          // Draw Ground Station
          const stXY = getCanvasXY(selectedStation.lat, selectedStation.lng);
          ctx.fillStyle = "#ff5555";
          ctx.beginPath(); ctx.arc(stXY.x, stXY.y, 5, 0, Math.PI*2); ctx.fill();

          // Comm Radius
          ctx.strokeStyle = inRange ? "rgba(255, 85, 85, 0.8)" : "rgba(255, 85, 85, 0.3)";
          ctx.beginPath(); ctx.arc(stXY.x, stXY.y, 30 * (width/360), 0, Math.PI*2); ctx.stroke();

          // Draw Satellite
          const satXY = getCanvasXY(currentPos.lat, currentPos.lng);
          ctx.fillStyle = isAlive ? "#64ffda" : "#8892b0";
          ctx.fillRect(satXY.x - 4, satXY.y - 4, 8, 8);

          // Satellite signal animation if in range
          if (isAlive && inRange) {
             const pulseSize = (sysTime % 1000) / 1000 * 20;
             ctx.strokeStyle = `rgba(100, 255, 218, ${1 - pulseSize/20})`;
             ctx.beginPath(); ctx.arc(satXY.x, satXY.y, pulseSize, 0, Math.PI*2); ctx.stroke();
          }

          // Game Over text
          if (!isAlive) {
            ctx.fillStyle = "#ff0000";
            ctx.font = "bold 24px Arial";
            ctx.textAlign = "center";
            ctx.fillText("위성 신호 단절", width / 2, height / 2);
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAlive, isSetupComplete, selectedStation, timePassed, isMounted, getSatellitePosition, orbitPeriod]);

  useEffect(() => {
    if (energy <= 0 || durability <= 0) {
      setIsAlive(false);
    }
  }, [energy, durability]);

  const resetGame = () => {
    setEnergy(100);
    setDurability(100);
    setDataCollected(0);
    setTimePassed(0);
    setIsAlive(true);
    setIsSetupComplete(false); // Go back to setup
  }

  const launchSatellite = () => {
    setIsSetupComplete(true);
    setTimePassed(0); // reset orbit time
  }

  if (!isMounted) return null; // Avoid Hydration mismatch

  if (!isSetupComplete) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-screen bg-slate-900 text-slate-200 font-sans">
        <h1 className="text-4xl font-bold mb-8 text-emerald-400">발사 준비</h1>
        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md">
          <p className="mb-4 text-slate-300">위성과 교신할 지상 기지국을 선택하세요:</p>
          <div className="flex flex-col gap-3 mb-8">
            {GROUND_STATIONS.map((station) => (
              <button
                key={station.id}
                onClick={() => setSelectedStation(station)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedStation.id === station.id
                    ? "border-emerald-500 bg-emerald-900/30 text-emerald-300"
                    : "border-slate-700 bg-slate-800 hover:border-slate-500 text-slate-400"
                }`}
              >
                {station.name} (위도: {station.lat}°, 경도: {station.lng}°)
              </button>
            ))}
          </div>
          <button
            onClick={launchSatellite}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg text-xl"
          >
            🚀 위성 발사
          </button>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    if (seconds < 0) return "계산중...";
    if (seconds === 0) return "교신 중!";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}분 ${s}초`;
  }

  return (
    <div className="flex flex-col items-center p-2 sm:p-4 min-h-screen bg-slate-900 text-slate-200 font-sans">
      <h1 className="text-2xl sm:text-3xl font-bold mt-2 mb-4 text-emerald-400">궤도 관제 센터</h1>

      {/* Stats Grid */}
      <div className="w-full max-w-4xl grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
          <p className="text-xs text-slate-400">에너지</p>
          <div className="w-full bg-slate-700 h-2 rounded mt-1">
            <div className={`h-2 rounded transition-all ${energy > 20 ? 'bg-yellow-400' : 'bg-red-500'}`} style={{ width: `${energy}%` }}></div>
          </div>
          <p className="text-right text-xs mt-1">{energy.toFixed(1)}%</p>
        </div>

        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
          <p className="text-xs text-slate-400">내구도</p>
          <div className="w-full bg-slate-700 h-2 rounded mt-1">
            <div className={`h-2 rounded transition-all ${durability > 20 ? 'bg-emerald-400' : 'bg-red-500'}`} style={{ width: `${durability}%` }}></div>
          </div>
          <p className="text-right text-xs mt-1">{durability.toFixed(1)}%</p>
        </div>

        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col justify-center">
          <p className="text-xs text-slate-400">수집한 데이터</p>
          <p className="text-lg font-mono text-cyan-300">{dataCollected} TB</p>
        </div>

        <div className={`p-3 rounded-lg border flex flex-col justify-center ${canCommunicate ? 'bg-emerald-900/40 border-emerald-500' : 'bg-slate-800 border-slate-700'}`}>
          <p className="text-xs text-slate-400">기지국 ({selectedStation.name}) 교신</p>
          <p className={`text-sm font-bold ${canCommunicate ? 'text-emerald-400' : 'text-slate-500'}`}>
            {canCommunicate ? "교신 가능" : `다음 창: ${formatTime(nextCommWindow)}`}
          </p>
        </div>
      </div>

      {/* Radar / Map */}
      <div className="w-full max-w-4xl aspect-[2/1] relative border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl mb-4 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full h-full block"
        />
      </div>

      {/* Controls */}
      <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-3">
        {isAlive ? (
          <>
            <button
              onClick={chargeSolar}
              className="p-4 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg shadow transition-colors active:scale-95"
            >
              태양열 충전 (+15E)
            </button>
            <button
              onClick={repair}
              disabled={energy < 10}
              className="p-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg shadow transition-colors active:scale-95"
            >
              내구도 수리 (10E)
            </button>
            <button
              onClick={collectData}
              disabled={energy < 20 || !canCommunicate}
              className="p-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg shadow transition-colors active:scale-95 flex flex-col items-center"
            >
              <span>데이터 수집 (20E)</span>
              {!canCommunicate && <span className="text-xs font-normal opacity-70">교신 불가</span>}
            </button>
          </>
        ) : (
          <button
            onClick={resetGame}
            className="col-span-1 sm:col-span-3 p-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow transition-colors text-lg active:scale-95"
          >
            프로젝트 재시작 (새 위성 발사)
          </button>
        )}
      </div>
    </div>
  );
}
