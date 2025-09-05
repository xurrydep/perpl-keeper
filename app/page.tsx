"use client";
import { useState } from 'react';
import Image from 'next/image';
import ClickerEmpire from './components/Dash';
import AuthComponent from './components/AuthComponent';
import ScoreDebugger from './components/ScoreDebugger';

export default function Home() {
  const [playerAddress, setPlayerAddress] = useState<string>("");

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-8">
      <AuthComponent onAddressChange={setPlayerAddress} />
      {playerAddress ? (
        <>
          <ClickerEmpire playerAddress={playerAddress} />
          <ScoreDebugger playerAddress={playerAddress} />
        </>
      ) : (
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-4 mb-6">
              <Image 
                src="/character.png" 
                alt="Perpl Character" 
                width={80} 
                height={80} 
                className="animate-pulse"
              />
              <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-400 via-purple-500 to-purple-500 bg-clip-text text-transparent animate-pulse">
                Perpl Keeper
              </h1>
              <Image 
                src="/character.png" 
                alt="Perpl Character" 
                width={80} 
                height={80} 
                className="animate-pulse scale-x-[-1]"
              />
            </div>
            <p className="text-cyan-300 text-xl mb-8">
              Avoid the wind and grow Perpl, the bigger the flame, the better.
            </p>
            <p className="text-gray-300 text-lg mb-8">
              Log in to dance in Perpl’s light!
            </p>
          </div>

          {/* How to Play Section */}
          <div className="bg-black bg-opacity-50 rounded-lg border border-purple-500 p-8 mb-8">
            <h2 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              🎮 HOW TO PLAY
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Game Objective */}
              <div className="bg-gradient-to-br from-orange-900 to-red-900 p-6 rounded-lg border border-orange-500">
                <h3 className="text-2xl font-bold text-orange-400 mb-4 flex items-center">
                  🔥 GROW YOUR FLAME
                </h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Click the Perpl flame to make it grow</li>
                  <li>• The bigger your flame gets, the better!</li>
                  <li>• Each click increases your flame size</li>
                  <li>• Watch your Perpl dance with light</li>
                  <li>• Bigger flames earn more points</li>
                </ul>
              </div>

              {/* Avoid the Wind */}
              <div className="bg-gradient-to-br from-blue-900 to-cyan-900 p-6 rounded-lg border border-blue-500">
                <h3 className="text-2xl font-bold text-blue-400 mb-4 flex items-center">
                  💨 AVOID THE WIND
                </h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Watch out for wind gusts that appear</li>
                  <li>• Wind can shrink your flame</li>
                  <li>• Move quickly to dodge the wind</li>
                  <li>• Protect your growing Perpl</li>
                  <li>• Wind gets stronger as you progress</li>
                </ul>
              </div>

              {/* Survival Strategy */}
              <div className="bg-gradient-to-br from-purple-900 to-indigo-900 p-6 rounded-lg border border-purple-500">
                <h3 className="text-2xl font-bold text-purple-400 mb-4 flex items-center">
                  🛡️ SURVIVAL STRATEGY
                </h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Balance growth with protection</li>
                  <li>• Time your clicks carefully</li>
                  <li>• Learn wind patterns to survive</li>
                  <li>• Keep your flame alive as long as possible</li>
                  <li>• Higher scores unlock new achievements</li>
                </ul>
              </div>

              {/* Scoring System */}
              <div className="bg-gradient-to-br from-green-900 to-emerald-900 p-6 rounded-lg border border-green-500">
                <h3 className="text-2xl font-bold text-green-400 mb-4 flex items-center">
                  🏆 SCORING SYSTEM
                </h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Points increase with flame size</li>
                  <li>• Survival time multiplies your score</li>
                  <li>• Perfect dodges give bonus points</li>
                  <li>• Compete on the blockchain leaderboard</li>
                  <li>• Your best scores are saved forever</li>
                </ul>
              </div>
            </div>
          </div>


        </div>
      )}
      
      <style jsx>{`
        .neon-text {
          text-shadow: 0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor;
        }
      `}</style>
    </div>
  );
}