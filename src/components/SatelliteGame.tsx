"use client";

import React, { useEffect, useRef, useState } from "react";

export default function SatelliteGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Tamagotchi Stats
  const [energy, setEnergy] = useState(100);
  const [durability, setDurability] = useState(100);
  const [dataCollected, setDataCollected] = useState(0);
  const isAlive = energy > 0 && durability > 0;

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
    if (!isAlive) return;
    if (energy >= 20) {
      setEnergy((prev) => prev - 20);
      setDataCollected((prev) => prev + 10);
    }
  };

  // Game Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let tickCounter = 0;

    const render = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      // Update stats based on time (every ~1s)
      tickCounter += deltaTime;
      if (tickCounter > 1000) {
        tickCounter = 0;
        if (isAlive) {
          setEnergy((prev) => {
            const newEnergy = prev - 1;
            return Math.max(0, newEnergy);
          });
          setDurability((prev) => {
            const newDurability = prev - 0.5;
            return Math.max(0, newDurability);
          });
        }
      }

      // Draw
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw Space Background
          ctx.fillStyle = "#0b0c10";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw Stars
          ctx.fillStyle = "#ffffff";
          for(let i = 0; i < 50; i++) {
             const x = (Math.sin(i * 1234.5) * 0.5 + 0.5) * canvas.width;
             const y = (Math.cos(i * 5432.1) * 0.5 + 0.5) * canvas.height;
             const size = (Math.sin(time * 0.001 + i) * 0.5 + 0.5) * 2;
             ctx.fillRect(x, y, size, size);
          }

          // Draw Satellite
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;

          // Rotation based on time
          ctx.save();
          ctx.translate(centerX, centerY);

          if (!isAlive) {
             // slowly drift if dead
             ctx.translate(Math.sin(time*0.0005) * 20, Math.cos(time*0.0005) * 20);
             ctx.rotate(time * 0.0001);
          } else {
             // hover if alive
             ctx.translate(0, Math.sin(time * 0.002) * 5);
          }

          // Body
          ctx.fillStyle = isAlive ? "#c5c6c7" : "#555555";
          ctx.fillRect(-20, -20, 40, 40);

          // Solar Panels
          ctx.fillStyle = isAlive ? "#45a29e" : "#2b3d3c";
          ctx.fillRect(-70, -10, 45, 20); // Left
          ctx.fillRect(25, -10, 45, 20);  // Right

          // Antenna
          ctx.strokeStyle = isAlive ? "#66fcf1" : "#555555";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -20);
          ctx.lineTo(0, -40);
          ctx.stroke();

          if (isAlive) {
             ctx.fillStyle = "#ff0000";
             ctx.beginPath();
             ctx.arc(0, -40, Math.sin(time * 0.01) > 0 ? 3 : 1, 0, Math.PI * 2);
             ctx.fill();
          }

          ctx.restore();

          // Game Over text
          if (!isAlive) {
            ctx.fillStyle = "#ff0000";
            ctx.font = "30px Arial";
            ctx.textAlign = "center";
            ctx.fillText("인공위성 손실됨", canvas.width / 2, canvas.height / 2 - 80);
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isAlive]);

  const resetGame = () => {
    setEnergy(100);
    setDurability(100);
    setDataCollected(0);
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 min-h-screen bg-gray-900 text-white font-sans">
      <h1 className="text-3xl font-bold mb-6 text-cyan-400 tracking-wider">인공위성 다마고치</h1>

      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400 uppercase tracking-widest">에너지</p>
          <div className="w-full bg-gray-700 h-4 rounded mt-2">
            <div className="bg-yellow-400 h-4 rounded transition-all" style={{ width: `${energy}%` }}></div>
          </div>
          <p className="text-right text-xs mt-1">{Math.round(energy)}%</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700">
          <p className="text-sm text-gray-400 uppercase tracking-widest">내구도</p>
          <div className="w-full bg-gray-700 h-4 rounded mt-2">
            <div className="bg-green-400 h-4 rounded transition-all" style={{ width: `${durability}%` }}></div>
          </div>
          <p className="text-right text-xs mt-1">{Math.round(durability)}%</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700 col-span-2 flex flex-col justify-center">
          <p className="text-sm text-gray-400 uppercase tracking-widest">수집한 데이터</p>
          <p className="text-2xl font-mono text-cyan-300 mt-1">{dataCollected} TB</p>
        </div>
      </div>

      <div className="relative border-4 border-gray-700 rounded-lg overflow-hidden shadow-2xl">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="bg-black"
        />
      </div>

      <div className="mt-8 flex gap-4">
        {isAlive ? (
          <>
            <button
              onClick={chargeSolar}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg shadow transition-colors uppercase tracking-wider text-sm"
            >
              태양열 충전
            </button>
            <button
              onClick={repair}
              disabled={energy < 10}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:text-gray-400 text-white font-bold rounded-lg shadow transition-colors uppercase tracking-wider text-sm"
            >
              수리하기 (10E)
            </button>
            <button
              onClick={collectData}
              disabled={energy < 20}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:text-gray-400 text-white font-bold rounded-lg shadow transition-colors uppercase tracking-wider text-sm"
            >
              데이터 수집 (20E)
            </button>
          </>
        ) : (
          <button
            onClick={resetGame}
            className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow transition-colors uppercase tracking-wider text-lg"
          >
            새 위성 배치하기
          </button>
        )}
      </div>
    </div>
  );
}
