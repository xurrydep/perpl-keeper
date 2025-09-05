"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { submitPlayerScore } from '../lib/score-api';

interface DashProps {
  playerAddress?: string;
}

interface Candle {
  x: number;
  y: number;
  flameSize: number;
  maxFlame: number;
  speed: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  type: 'wind' | 'bug' | 'drop' | 'shadow';
  speed: number;
  direction: number;
  active: boolean;
}

interface Collectible {
  id: number;
  x: number;
  y: number;
  type: 'wick' | 'wax' | 'oil' | 'light';
  collected: boolean;
  glow: number;
}

interface GameState {
  score: number;
  timeAlive: number;
  isPlaying: boolean;
  isPaused: boolean;
  gameOver: boolean;
  highScore: number;
  speedMode: 'slow' | 'normal' | 'fast';
  comboCount: number;
  collectiblesGathered: number;
  difficulty: number;
}

export default function Dash({ playerAddress }: DashProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  const keysRef = useRef<{[key: string]: boolean}>({});
  const characterImageRef = useRef<HTMLImageElement | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null); // Logo image reference
  
  // Game constants
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const INITIAL_FLAME_SIZE = 30; // Reduced from 35 for moderate challenge
  const MAX_FLAME_SIZE = 50; // Reduced from 55 for more management
  const MIN_FLAME_SIZE = 5;
  const CANDLE_SPEED = 2.2; // Reduced from 2.5 for more careful movement
  const FLAME_DECAY_RATE = 0.035; // Increased from 0.025 for more pressure
  const VISION_RADIUS = 120; // Reduced from 130 for more challenge
  
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    timeAlive: 0,
    isPlaying: false,
    isPaused: false,
    gameOver: false,
    highScore: parseInt(localStorage.getItem('candleGameHighScore') || '0'),
    speedMode: 'normal',
    comboCount: 0,
    collectiblesGathered: 0,
    difficulty: 1
  });
  
  const [candle, setCandle] = useState<Candle>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    flameSize: INITIAL_FLAME_SIZE,
    maxFlame: MAX_FLAME_SIZE,
    speed: CANDLE_SPEED
  });
  
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Generate random enemies
  const generateEnemy = useCallback((id: number): Enemy => {
    const types: Enemy['type'][] = ['wind', 'bug', 'drop', 'shadow', 'wind', 'drop', 'drop', 'drop', 'drop', 'drop', 'wind']; // Increased wind frequency
    const type = types[Math.floor(Math.random() * types.length)];
    
    let x, y, speed, direction;
    
    switch (type) {
      case 'wind':
        x = Math.random() < 0.5 ? -50 : CANVAS_WIDTH + 50;
        y = Math.random() * CANVAS_HEIGHT;
        speed = 1.5 + Math.random() * 2.5; // Wind speed
        direction = x < 0 ? 0 : Math.PI;
        break;
      case 'drop':
        x = Math.random() * CANVAS_WIDTH;
        y = -30;
        speed = 3.5 + Math.random() * 4; // Maximum rain speed
        direction = Math.PI / 2;
        break;
      case 'bug':
        x = Math.random() * CANVAS_WIDTH;
        y = Math.random() * CANVAS_HEIGHT;
        speed = 1 + Math.random() * 1.5; // Keep bug speed same
        direction = Math.random() * Math.PI * 2;
        break;
      default: // shadow
        x = Math.random() * CANVAS_WIDTH;
        y = Math.random() * CANVAS_HEIGHT;
        speed = 0.8 + Math.random() * 1.2; // Keep shadow speed same
        direction = Math.random() * Math.PI * 2;
    }
    
    return { id, x, y, type, speed, direction, active: true };
  }, []);
  
  // Generate collectibles
  const generateCollectible = useCallback((id: number): Collectible => {
    const types: Collectible['type'][] = ['wick', 'wax', 'oil', 'light'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    return {
      id,
      x: Math.random() * (CANVAS_WIDTH - 40) + 20,
      y: Math.random() * (CANVAS_HEIGHT - 40) + 20,
      type,
      collected: false,
      glow: Math.random() * 0.5 + 0.5
    };
  }, []);
  
  // Get distance between two points
  const getDistance = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  }, []);
  
  // Save score to blockchain
  const saveScore = useCallback(async () => {
    if (!playerAddress || gameState.score === 0) return;
    
    setIsSavingScore(true);
    setSaveMessage('');
    
    try {
      await submitPlayerScore(playerAddress, gameState.score);
      setSaveMessage('Score successfully saved to blockchain!');
    } catch (error) {
      console.error('Error saving score:', error);
      setSaveMessage('Failed to save score. Please try again.');
    } finally {
      setIsSavingScore(false);
    }
  }, [playerAddress, gameState.score]);
  
  // Continuous movement based on held keys
  const updateMovement = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    setCandle(prev => {
      let newX = prev.x;
      let newY = prev.y;
      const speed = gameState.speedMode === 'fast' ? prev.speed * 1.5 : 
                   gameState.speedMode === 'slow' ? prev.speed * 0.7 : prev.speed;
      
      if (keysRef.current['ArrowLeft'] || keysRef.current['a'] || keysRef.current['A']) {
        newX = Math.max(20, prev.x - speed);
      }
      if (keysRef.current['ArrowRight'] || keysRef.current['d'] || keysRef.current['D']) {
        newX = Math.min(CANVAS_WIDTH - 20, prev.x + speed);
      }
      if (keysRef.current['ArrowUp'] || keysRef.current['w'] || keysRef.current['W']) {
        newY = Math.max(20, prev.y - speed);
      }
      if (keysRef.current['ArrowDown'] || keysRef.current['s'] || keysRef.current['S']) {
        newY = Math.min(CANVAS_HEIGHT - 20, prev.y + speed);
      }
      
      return { ...prev, x: newX, y: newY };
    });
  }, [gameState]);
  
  // Update game state
  const updateGame = useCallback(() => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.gameOver) return;
    
    // Update movement first
    updateMovement();
    
    // Update time only (removed continuous scoring)
    setGameState(prev => {
      // Balanced difficulty progression
      let difficultyLevel = 1;
      if (prev.timeAlive > 2400) { // After 40 seconds (2400 frames at 60fps)
        difficultyLevel = 1 + Math.floor((prev.timeAlive - 2400) / 900); // Increase every 15 seconds after 40s
      } else if (prev.timeAlive > 1200) { // After 20 seconds (1200 frames at 60fps)
        difficultyLevel = 1 + Math.floor((prev.timeAlive - 1200) / 1800); // Slight increase every 30 seconds
      }
      // Else stay at difficulty 1 for first 20 seconds
      
      return {
        ...prev,
        timeAlive: prev.timeAlive + 1,
        difficulty: difficultyLevel
      };
    });
    
    // Decay flame over time (moderate difficulty scaling)
    setCandle(prev => {
      // Moderate difficulty impact for balanced challenge
      let difficultyMultiplier = 1;
      if (gameState.difficulty > 1) {
        difficultyMultiplier = 1 + (gameState.difficulty - 1) * 0.1; // Moderate scaling (10% per level)
      }
      
      const decayRate = gameState.speedMode === 'fast' ? FLAME_DECAY_RATE * 2 * difficultyMultiplier : 
                       gameState.speedMode === 'slow' ? FLAME_DECAY_RATE * 0.6 * difficultyMultiplier : FLAME_DECAY_RATE * 1.3 * difficultyMultiplier;
      const newFlameSize = Math.max(0, prev.flameSize - decayRate);
      
      if (newFlameSize <= 0) {
        setGameState(prevState => ({ ...prevState, gameOver: true, isPlaying: false }));
      }
      
      return { ...prev, flameSize: newFlameSize };
    });
    
    // Update enemies
    setEnemies(prevEnemies => {
      return prevEnemies.map(enemy => {
        let newX = enemy.x + Math.cos(enemy.direction) * enemy.speed;
        let newY = enemy.y + Math.sin(enemy.direction) * enemy.speed;
        
        // Bug AI - move towards candle
        if (enemy.type === 'bug') {
          const distanceToCandle = getDistance(enemy.x, enemy.y, candle.x, candle.y);
          if (distanceToCandle < 150) {
            const angle = Math.atan2(candle.y - enemy.y, candle.x - enemy.x);
            newX = enemy.x + Math.cos(angle) * enemy.speed;
            newY = enemy.y + Math.sin(angle) * enemy.speed;
          }
        }
        
        // Shadow AI - only attack when flame is small
        if (enemy.type === 'shadow' && candle.flameSize > 15) {
          return { ...enemy, active: false };
        }
        
        // Check collision with candle
        const distanceToCandle = getDistance(newX, newY, candle.x, candle.y);
        if (distanceToCandle < 30) {
          let flameDamage = 0;
          // Moderate damage scaling for balanced challenge
          const difficultyBonus = gameState.timeAlive < 2400 ? 0 : Math.floor((gameState.difficulty - 1) / 2); // Gradual scaling after 40s
          
          switch (enemy.type) {
            case 'wind': flameDamage = 8 + difficultyBonus; break; // Wind damage
            case 'bug': flameDamage = 5 + difficultyBonus; break; // Bug damage
            case 'drop': flameDamage = 9 + difficultyBonus; break; // Maximum rain damage
            case 'shadow': flameDamage = 9 + difficultyBonus * 2; break; // Shadow damage
          }
          
          setCandle(prev => ({
            ...prev,
            flameSize: Math.max(0, prev.flameSize - flameDamage)
          }));
          
          return { ...enemy, active: false };
        }
        
        // Remove enemies that go off screen
        if (newX < -100 || newX > CANVAS_WIDTH + 100 || newY < -100 || newY > CANVAS_HEIGHT + 100) {
          return { ...enemy, active: false };
        }
        
        return { ...enemy, x: newX, y: newY };
      }).filter(enemy => enemy.active);
    });
    
    // Spawn new enemies based on difficulty (increased for more wind and rain)
    let enemySpawnChance = 0.009; // Increased base rate for more enemies
    if (gameState.timeAlive > 2400) { // After 40 seconds
      enemySpawnChance = 0.009 + (gameState.difficulty - 1) * 0.005; // Increased scaling
    } else if (gameState.timeAlive > 1200) { // After 20 seconds
      enemySpawnChance = 0.009 + (gameState.difficulty - 1) * 0.002; // Increased scaling
    }
    // Else keep base rate for first 20 seconds
    
    if (Math.random() < enemySpawnChance) {
      setEnemies(prev => [...prev, generateEnemy(Date.now())]);
    }
    
    // Check collectibles
    setCollectibles(prevCollectibles => {
      return prevCollectibles.map(collectible => {
        const distance = getDistance(candle.x, candle.y, collectible.x, collectible.y);
        if (distance < 25 && !collectible.collected) {
          let flameBoost = 0;
          let scoreBoost = 0;
          
          switch (collectible.type) {
            case 'wick': flameBoost = 8; scoreBoost = 10; break; // Fixed score to 10
            case 'wax': flameBoost = 5; scoreBoost = 10; break; // Fixed score to 10
            case 'oil': flameBoost = 12; scoreBoost = 10; break; // Fixed score to 10
            case 'light': flameBoost = 15; scoreBoost = 10; break; // Fixed score to 10
          }
          
          setCandle(prev => ({
            ...prev,
            flameSize: Math.min(prev.maxFlame, prev.flameSize + flameBoost)
          }));
          
          setGameState(prev => ({
            ...prev,
            score: prev.score + scoreBoost,
            comboCount: prev.comboCount + 1,
            collectiblesGathered: prev.collectiblesGathered + 1
          }));
          
          return { ...collectible, collected: true };
        }
        return collectible;
      }).filter(c => !c.collected);
    });
    
    // Spawn new collectibles (balanced frequency)
    if (Math.random() < 0.008) { // Reduced from 0.01 for moderate challenge
      setCollectibles(prev => [...prev, generateCollectible(Date.now())]);
    }
  }, [gameState, candle, generateEnemy, generateCollectible, getDistance, updateMovement]);
  
  // Handle keyboard input for immediate movement
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (keysRef.current[e.key]) return; // Prevent key repeat delay
    keysRef.current[e.key] = true;
    
    // Speed controls
    if (e.key === '1') setGameState(prev => ({ ...prev, speedMode: 'slow' }));
    if (e.key === '2') setGameState(prev => ({ ...prev, speedMode: 'normal' }));
    if (e.key === '3') setGameState(prev => ({ ...prev, speedMode: 'fast' }));
    
    if (e.key === ' ') {
      e.preventDefault();
      if (gameState.isPlaying) {
        setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
      }
    }
  }, [gameState]);
  
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current[e.key] = false;
  }, []);
  
  // Game rendering
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Create vision circle around candle
    const visionRadius = VISION_RADIUS + (candle.flameSize * 2);
    
    // Dark overlay with vision hole
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.globalCompositeOperation = 'destination-out';
    const gradient = ctx.createRadialGradient(candle.x, candle.y, 0, candle.x, candle.y, visionRadius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(candle.x, candle.y, visionRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Draw collectibles in vision
    collectibles.forEach(collectible => {
      const distance = getDistance(candle.x, candle.y, collectible.x, collectible.y);
      if (distance < visionRadius) {
        ctx.save();
        ctx.translate(collectible.x, collectible.y);
        
        // Glow effect
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
        let color = '';
        switch (collectible.type) {
          case 'wick': color = '#fbbf24'; break;
          case 'wax': color = '#f3f4f6'; break;
          case 'oil': color = '#10b981'; break;
          case 'light': color = '#8b5cf6'; break;
        }
        
        glowGradient.addColorStop(0, color);
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, 15 * collectible.glow, 0, Math.PI * 2);
        ctx.fill();
        
        // Item
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }
    });
    
    // Draw logo in center if visible in candle light
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const logoDistance = getDistance(candle.x, candle.y, centerX, centerY);
    
    if (logoImageRef.current && logoDistance < visionRadius) {
      ctx.save();
      ctx.translate(centerX, centerY);
      
      // Logo size - even wider horizontally for better spread
      const logoWidth = 160; // Further increased width for more horizontal spread
      const logoHeight = 80; // Keep original height
      
      // Draw logo with some transparency based on distance
      const maxDistance = visionRadius;
      const opacity = Math.max(0.3, 1 - (logoDistance / maxDistance));
      ctx.globalAlpha = opacity;
      
      ctx.drawImage(
        logoImageRef.current,
        -logoWidth / 2,
        -logoHeight / 2,
        logoWidth,
        logoHeight
      );
      
      ctx.restore();
    }
    
    // Draw enemies in vision
    enemies.forEach(enemy => {
      const distance = getDistance(candle.x, candle.y, enemy.x, enemy.y);
      if (distance < visionRadius && enemy.active) {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        
        let color = '';
        let size = 8;
        switch (enemy.type) {
          case 'wind': color = '#64748b'; size = 16; break; // Increased wind size
          case 'bug': color = '#dc2626'; size = 6; break;
          case 'drop': color = '#0ea5e9'; size = 6; break; // Increased rain size
          case 'shadow': color = '#1f2937'; size = 10; break;
        }
        
        ctx.fillStyle = color;
        ctx.beginPath();
        
        if (enemy.type === 'wind') {
          // Enhanced wind particles - more visible
          for (let i = 0; i < 8; i++) { // Increased particles
            ctx.fillRect(i * 2.5 - 10, -2, 3, 4); // Larger wind particles
          }
        } else if (enemy.type === 'drop') {
          // Maximum enhanced water drop - highly visible
          ctx.ellipse(0, 0, size / 1.2, size * 1.5, 0, 0, Math.PI * 2); // Maximum raindrop size
        } else {
          // Regular circle
          ctx.arc(0, 0, size, 0, Math.PI * 2);
        }
        
        ctx.fill();
        ctx.restore();
      }
    });
    
    // Draw candle character
    if (characterImageRef.current) {
      // Draw character image
      const characterSize = 75; // Increased width slightly (from 90)
      ctx.save();
      ctx.translate(candle.x, candle.y);
      ctx.drawImage(
        characterImageRef.current,
        -characterSize / 2,
        -characterSize / 2,
        characterSize,
        characterSize
      );
      ctx.restore();
    } else {
      // Fallback: Draw candle base if image not loaded
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(candle.x - 8, candle.y - 5, 16, 30);
    }
    
    // Draw candle flame (positioned above the character)
    const flameHeight = candle.flameSize;
    const flameWidth = candle.flameSize * 0.6;
    
    ctx.save();
    // Position flame above the character
    ctx.translate(candle.x, candle.y - 25);
    
    // Flame glow
    const flameGlow = ctx.createRadialGradient(0, -flameHeight/2, 0, 0, -flameHeight/2, flameHeight);
    flameGlow.addColorStop(0, '#fbbf24');
    flameGlow.addColorStop(0.3, '#f97316');
    flameGlow.addColorStop(0.7, '#dc2626');
    flameGlow.addColorStop(1, 'transparent');
    
    ctx.fillStyle = flameGlow;
    ctx.beginPath();
    ctx.ellipse(0, -flameHeight/2, flameWidth * 1.5, flameHeight * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Flame shape
    const flameGradient = ctx.createLinearGradient(0, 0, 0, -flameHeight);
    flameGradient.addColorStop(0, '#fbbf24');
    flameGradient.addColorStop(0.5, '#f97316');
    flameGradient.addColorStop(1, '#dc2626');
    
    ctx.fillStyle = flameGradient;
    ctx.beginPath();
    ctx.ellipse(0, -flameHeight/3, flameWidth/2, flameHeight/1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Flame tip
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.ellipse(0, -flameHeight + 5, flameWidth/4, flameHeight/4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Flame size indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(10, 10, 200, 20);
    
    const flamePercent = candle.flameSize / candle.maxFlame;
    const barColor = flamePercent > 0.6 ? '#10b981' : flamePercent > 0.3 ? '#f59e0b' : '#dc2626';
    ctx.fillStyle = barColor;
    ctx.fillRect(10, 10, 200 * flamePercent, 20);
    
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(`Flame: ${Math.floor(candle.flameSize)}/${candle.maxFlame}`, 15, 25);
  }, [candle, enemies, collectibles, getDistance]);
  
  // Game loop
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused && !gameState.gameOver) {
      const loop = () => {
        updateGame();
        render();
        gameLoopRef.current = requestAnimationFrame(loop);
      };
      gameLoopRef.current = requestAnimationFrame(loop);
    } else if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.isPaused, gameState.gameOver, updateGame, render]);
  
  // Keyboard events
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
  
  // Load character image
  useEffect(() => {
    const img = new Image();
    img.src = '/character.png';
    img.onload = () => {
      characterImageRef.current = img;
    };
  }, []);
  
  // Load logo image
  useEffect(() => {
    const logoImg = new Image();
    logoImg.src = '/logo.png';
    logoImg.onload = () => {
      logoImageRef.current = logoImg;
    };
  }, []);
  
  useEffect(() => {
    render();
  }, [render]);
  
  // Start game
  const startGame = () => {
    setGameState({
      score: 0,
      timeAlive: 0,
      isPlaying: true,
      isPaused: false,
      gameOver: false,
      highScore: gameState.highScore,
      speedMode: 'normal',
      comboCount: 0,
      collectiblesGathered: 0,
      difficulty: 1
    });
    
    setCandle({
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      flameSize: INITIAL_FLAME_SIZE,
      maxFlame: MAX_FLAME_SIZE,
      speed: CANDLE_SPEED
    });
    
    setEnemies([]);
    setCollectibles([]);
    
    // Generate initial collectibles
    const initialCollectibles = [];
    for (let i = 0; i < 3; i++) {
      initialCollectibles.push(generateCollectible(i));
    }
    setCollectibles(initialCollectibles);
  };
  
  // Game over
  useEffect(() => {
    if (gameState.gameOver && gameState.score > gameState.highScore) {
      setGameState(prev => ({ ...prev, highScore: gameState.score }));
      localStorage.setItem('candleGameHighScore', gameState.score.toString());
    }
  }, [gameState.gameOver, gameState.score, gameState.highScore]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      {!gameState.isPlaying ? (
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 text-center max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg mx-auto mb-6">
            <img src="/character.png" alt="Perpl" className="w-12 h-12 object-contain" />
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-2">Perpl Keeper</h1>
          <p className="text-slate-400 mb-8">Keep your perpl burning as long as possible!</p>
          
          <div className="space-y-4 mb-8">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-2xl font-bold text-yellow-400">High Score</div>
              <div className="text-lg text-white">{gameState.highScore}</div>
            </div>
            
            {gameState.gameOver && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                <div className="text-xl font-bold text-red-400 mb-2">Flame Extinguished!</div>
                <div className="text-white">Final Score: {gameState.score}</div>
                <div className="text-slate-300">Time Survived: {Math.floor(gameState.timeAlive / 60)}s</div>
                <div className="text-slate-300">Items Collected: {gameState.collectiblesGathered}</div>
              </div>
            )}
          </div>
          
          <button
            onClick={startGame}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-4 px-8 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg"
          >
            {gameState.gameOver ? 'Light Again' : 'Light the Perpl'}
          </button>
          
          <div className="mt-6 text-sm text-slate-400">
            <p>🕯️ Keep your perpl burning!</p>
            <p>📍 WASD/Arrows to move</p>
            <p>⚡ 1: Slow (safe) • 2: Normal • 3: Fast (risky)</p>
            <p>💡 Collect: Wick, Wax, Oil, Light</p>
            <p>⚠️ Avoid: Wind, Bugs, Drops, Shadows</p>
          </div>
          
          {playerAddress && (
            <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
              <button
                onClick={saveScore}
                disabled={isSavingScore || gameState.score === 0}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-6 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingScore ? 'Saving...' : 'Save Score to Blockchain'}
              </button>
              
              <button
                onClick={() => window.open('https://monad-games-id-site.vercel.app/leaderboard?page=1&gameId=263', '_blank')}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:scale-105 transition-all duration-300 shadow-lg"
              >
                🏆 Leaderboards
              </button>
              
              {saveMessage && (
                <p className={`mt-2 text-sm ${
                  saveMessage.includes('success') ? 'text-green-400' : 'text-red-400'
                }`}>
                  {saveMessage}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-sm rounded-xl p-4 text-white">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-sm text-slate-300">Score</div>
                <div className="text-xl font-bold text-yellow-400">{gameState.score}</div>
              </div>
              <div>
                <div className="text-sm text-slate-300">Time</div>
                <div className="text-xl font-bold text-green-400">{Math.floor(gameState.timeAlive / 60)}s</div>
              </div>
              <div>
                <div className="text-sm text-slate-300">Speed</div>
                <div className={`text-lg font-bold ${
                  gameState.speedMode === 'fast' ? 'text-red-400' :
                  gameState.speedMode === 'slow' ? 'text-blue-400' : 'text-white'
                }`}>
                  {gameState.speedMode.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
          
          {gameState.isPaused && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 text-center">
                <h2 className="text-3xl font-bold text-white mb-4">Game Paused</h2>
                <p className="text-slate-300 mb-6">Press SPACE to continue</p>
                <button
                  onClick={() => setGameState(prev => ({ ...prev, isPaused: false }))}
                  className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-bold py-3 px-6 rounded-xl hover:scale-105 transition-all duration-300"
                >
                  Resume
                </button>
              </div>
            </div>
          )}
          
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-white/20 rounded-xl shadow-2xl"
          />
          
          <div className="mt-4 text-center text-slate-400 text-sm">
            <p>🔥 Your flame provides the only light • Stay alive and collect items!</p>
            <p>Press 1/2/3 for speed modes • Higher speed = more score but faster flame decay</p>
          </div>
        </div>
      )}
    </div>
  );
}