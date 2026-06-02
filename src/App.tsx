import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  RotateCcw, 
  Play, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Heart, 
  Shield, 
  Flame, 
  Zap, 
  Info,
  ChevronRight,
  User,
  Medal,
  Award,
  CircleAlert
} from 'lucide-react';
import { 
  ItemType, 
  PlayerState, 
  Bullet, 
  EnemyType, 
  Enemy, 
  PowerUpItem, 
  BGStar, 
  GameParticle, 
  RankData 
} from './types.ts';
import Leaderboard from './components/Leaderboard.tsx';

// UI Screens
type ScreenType = 'START' | 'SHIP_SELECT' | 'PLAYING' | 'GAMEOVER' | 'VICTORY' | 'LEADERBOARD';

interface ShipPreset {
  id: string;
  name: string;
  description: string;
  hp: number;
  speed: number;
  fireType: 'BALANCED' | 'HEAVY' | 'SPREAD';
  color: string;
  glowColor: string;
  accentColor: string;
}

const SHIP_PRESETS: ShipPreset[] = [
  {
    id: 'specter',
    name: '아스트라 스펙터 (Aero-Specter)',
    description: '균형 잡힌 전투기. 업그레이드 연사 속도가 뛰어나며 가볍고 정교하게 기동합니다.',
    hp: 100,
    speed: 5.5,
    fireType: 'BALANCED',
    color: '#38bdf8', // sky-400
    glowColor: 'rgba(56, 189, 248, 0.4)',
    accentColor: '#0ea5e9'
  },
  {
    id: 'fury',
    name: '크림슨 퓨리 (Crimson Fury)',
    description: '고화력 돌격기. 특수 분열식 플라스마 캐논을 탑재하여 좁은 지역에 폭발적 피해를 줍니다.',
    hp: 80,
    speed: 4.8,
    fireType: 'HEAVY',
    color: '#ef4444', // red-500
    glowColor: 'rgba(239, 68, 68, 0.4)',
    accentColor: '#dc2626'
  },
  {
    id: 'titan',
    name: '티탄 이지스 (Titan Aegis)',
    description: '중무장 방어기. 높은 체력과 기본 보호막 충전 기능을 가지고 있고 탄환 넓이가 넓습니다.',
    hp: 140,
    speed: 4.0,
    fireType: 'SPREAD',
    color: '#10b981', // emerald-500
    glowColor: 'rgba(16, 185, 129, 0.4)',
    accentColor: '#059669'
  }
];

// Audio synthesizer via web audio context
class SoundSynth {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play(type: 'laser' | 'hit' | 'explosion' | 'item' | 'bomb' | 'shield' | 'stageclear') {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      switch (type) {
        case 'laser': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(450, now);
          osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }
        case 'hit': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.linearRampToValueAtTime(60, now + 0.08);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        }
        case 'explosion': {
          // Low rumbling pseudo-noise
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(10, now + 0.45);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.45);
          osc.start(now);
          osc.stop(now + 0.45);
          break;
        }
        case 'item': {
          const oscObj = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();
          oscObj.connect(gainNode);
          gainNode.connect(this.ctx.destination);
          oscObj.type = 'sine';
          oscObj.frequency.setValueAtTime(300, now);
          oscObj.frequency.setValueAtTime(450, now + 0.08);
          oscObj.frequency.setValueAtTime(600, now + 0.16);
          gainNode.gain.setValueAtTime(0.12, now);
          gainNode.gain.linearRampToValueAtTime(0.01, now + 0.25);
          oscObj.start(now);
          oscObj.stop(now + 0.25);
          break;
        }
        case 'bomb': {
          // Deep screen-filling shockwave rumble
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(60, now);
          osc.frequency.linearRampToValueAtTime(15, now + 1.2);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.linearRampToValueAtTime(0.005, now + 1.2);
          osc.start(now);
          osc.stop(now + 1.2);
          break;
        }
        case 'shield': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
          break;
        }
        case 'stageclear': {
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.ctx.destination);
          
          osc1.type = 'sine';
          osc2.type = 'triangle';
          
          osc1.frequency.setValueAtTime(523.25, now); // C5
          osc1.frequency.setValueAtTime(659.25, now + 0.15); // E5
          osc1.frequency.setValueAtTime(783.99, now + 0.3); // G5
          osc1.frequency.setValueAtTime(1046.50, now + 0.45); // C6
          
          osc2.frequency.setValueAtTime(261.63, now); // C4
          osc2.frequency.setValueAtTime(329.63, now + 0.15); // E4
          osc2.frequency.setValueAtTime(392.00, now + 0.3); // G4
          osc2.frequency.setValueAtTime(523.25, now + 0.45); // C5

          gain.gain.setValueAtTime(0.14, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.82);
          
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.85);
          osc2.stop(now + 0.85);
          break;
        }
      }
    } catch (e) {
      console.warn('AudioContext failed to trigger sound:', e);
    }
  }
}

const synth = new SoundSynth();

export default function App() {
  const [screen, setScreen] = useState<ScreenType>('START');
  const [pilotName, setPilotName] = useState(() => {
    return localStorage.getItem('pilotName') || `PILOT_${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [selectedShip, setSelectedShip] = useState<ShipPreset>(SHIP_PRESETS[0]);
  const [soundOn, setSoundOn] = useState(true);
  
  // High scores state
  const [loadingRank, setLoadingRank] = useState(false);
  const [rankSubmitted, setRankSubmitted] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentStage, setCurrentStage] = useState(1);
  const [rankings, setRankings] = useState<RankData[]>([]);

  // Canvas details
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Reactive Game UI Stats
  const [uiHp, setUiHp] = useState(100);
  const [uiMaxHp, setUiMaxHp] = useState(100);
  const [uiScore, setUiScore] = useState(0);
  const [uiStage, setUiStage] = useState(1);
  const [uiMultiplier, setUiMultiplier] = useState(1);
  const [uiBombs, setUiBombs] = useState(3);
  const [uiPowerLevel, setUiPowerLevel] = useState(1);
  const [uiBossHp, setUiBossHp] = useState<number | null>(null);
  const [uiBossMaxHp, setUiBossMaxHp] = useState<number | null>(null);
  const [uiBossName, setUiBossName] = useState<string | null>(null);
  const [activeShieldTime, setActiveShieldTime] = useState(0);
  const [activeHyperTime, setActiveHyperTime] = useState(0);
  const [stageProgressPercent, setStageProgressPercent] = useState(0); // 0 to 100 before boss
  
  // Input Controls
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const touchState = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isUsingMouse = useRef<boolean>(false);

  // References for Canvas animation loop
  const requestRef = useRef<number | null>(null);

  // Game entities refs (to avoid stale React closures in fast loop)
  const gameStateRef = useRef<{
    player: PlayerState;
    bullets: Bullet[];
    enemies: Enemy[];
    powerUps: PowerUpItem[];
    stars: BGStar[];
    particles: GameParticle[];
    stage: number;
    stageProgress: number; // spawns enemies, boss appears at 1000
    bossSpawned: boolean;
    gameOver: boolean;
    victory: boolean;
    frameCounter: number;
    shakeFrames: number;
    shakeStrength: number;
    lastTimeShoot: number;
    scoreMultiplierTimer: number;
  }>({
    player: {
      x: 200,
      y: 450,
      width: 32,
      height: 32,
      hp: 100,
      maxHp: 100,
      score: 0,
      multiplier: 1,
      level: 1,
      shieldTime: 120, // starts with brief shield
      bombs: 3,
      bombTime: 0,
      active: true,
      name: pilotName,
      hyperTime: 0
    },
    bullets: [],
    enemies: [],
    powerUps: [],
    stars: [],
    particles: [],
    stage: 1,
    stageProgress: 0,
    bossSpawned: false,
    gameOver: false,
    victory: false,
    frameCounter: 0,
    shakeFrames: 0,
    shakeStrength: 0,
    lastTimeShoot: 0,
    scoreMultiplierTimer: 0
  });

  // Handle sound settings sync
  useEffect(() => {
    synth.enabled = soundOn;
  }, [soundOn]);

  // Keep pilot name in sync
  useEffect(() => {
    localStorage.setItem('pilotName', pilotName);
  }, [pilotName]);

  // Get Rankings List on startup/transition to leaderboard screen
  const loadRankings = async () => {
    setLoadingRank(true);
    try {
      const res = await fetch('/api/ranking');
      if (res.ok) {
        const data = await res.json();
        setRankings(data);
      }
    } catch (e) {
      console.error('Failed to grab rankings', e);
    } finally {
      setLoadingRank(false);
    }
  };

  useEffect(() => {
    if (screen === 'LEADERBOARD') {
      loadRankings();
    }
  }, [screen]);

  // Handle submit score
  const submitScore = async () => {
    if (rankSubmitted) return;
    setLoadingRank(true);
    try {
      const res = await fetch('/api/ranking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: pilotName.trim() || '무명 조종사',
          score: currentScore,
          stage: currentStage
        }),
      });
      if (res.ok) {
        setRankSubmitted(true);
        loadRankings();
        setScreen('LEADERBOARD');
      }
    } catch (e) {
      console.error('Failed to submit score', e);
    } finally {
      setLoadingRank(false);
    }
  };

  // Keyboard and interaction listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'b', 'B', 'Shift'].includes(e.key)) {
        e.preventDefault();
      }
      keysPressed.current[e.key.toLowerCase()] = true;
      keysPressed.current[e.key] = true;

      // Single triggers
      if (e.key === ' ' || e.key.toLowerCase() === 'b' || e.key === 'Shift') {
        triggerBomb();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [screen]);

  // Screen layout configuration
  const startPlaying = () => {
    setScreen('PLAYING');
    setRankSubmitted(false);
    initGame();
  };

  const triggerBomb = () => {
    const game = gameStateRef.current;
    if (screen !== 'PLAYING' || game.gameOver || game.victory) return;
    if (game.player.bombs <= 0) return;

    // Expend bomb
    game.player.bombs--;
    game.player.bombTime = 40; // bomb shockwave duration
    game.shakeFrames = 30;
    game.shakeStrength = 12;

    synth.play('bomb');

    // Create a ton of particles
    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 40;
      const speed = 4 + Math.random() * 8;
      game.particles.push({
        x: game.player.x + 16,
        y: game.player.y + 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: i % 2 === 0 ? '#fbbf24' : '#ef4444',
        life: 40 + Math.floor(Math.random() * 30),
        maxLife: 70,
        fade: true
      });
    }

    // Erase all enemy bullets
    const bulletCountBefore = game.bullets.length;
    game.bullets = game.bullets.filter(b => b.isPlayer);
    const bulletsCleared = bulletCountBefore - game.bullets.length;
    game.player.score += bulletsCleared * 20;

    // Deal heavy damage to all enemies
    game.enemies.forEach(enemy => {
      let damage = 220;
      enemy.hp -= damage;
      // create impact particles directly on enemy
      for (let i = 0; i < 8; i++) {
        game.particles.push({
          x: enemy.x + (Math.random() - 0.5) * enemy.size,
          y: enemy.y + (Math.random() - 0.5) * enemy.size,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          size: 2 + Math.random() * 3,
          color: '#fbbf24',
          life: 20,
          maxLife: 20,
          fade: true
        });
      }
    });

    // Update state indicators
    setUiBombs(game.player.bombs);
  };

  // Initialize all states
  const initGame = () => {
    const canvas = canvasRef.current;
    const width = canvas ? canvas.width : 440;
    const height = canvas ? canvas.height : 600;

    // Reset game state structure
    const game = gameStateRef.current;
    game.player = {
      x: width / 2 - 16,
      y: height - 100,
      width: 32,
      height: 32,
      hp: selectedShip.hp,
      maxHp: selectedShip.hp,
      score: 0,
      multiplier: 1,
      level: 1,
      shieldTime: 120, // starts with shield
      bombs: 3,
      bombTime: 0,
      active: true,
      name: pilotName,
      hyperTime: 0
    };
    game.bullets = [];
    game.enemies = [];
    game.powerUps = [];
    game.particles = [];
    game.stage = 1;
    game.stageProgress = 0;
    game.bossSpawned = false;
    game.gameOver = false;
    game.victory = false;
    game.frameCounter = 0;
    game.shakeFrames = 0;
    game.lastTimeShoot = 0;
    game.scoreMultiplierTimer = 0;

    // Generate stars (Dim, small, subtle background design that doesn't conflict with bullet visuals)
    const starList: BGStar[] = [];
    const colors = [
      'rgba(226, 232, 240, 0.12)', // Subtle Slate
      'rgba(148, 163, 184, 0.16)', // Dim Slate
      'rgba(56, 189, 248, 0.12)'   // Dim Blue
    ];
    for (let i = 0; i < 45; i++) {
      starList.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.3 + Math.random() * 1.0, // Much slower feel
        size: 0.5 + Math.random() * 1.1, // Smaller size, avoid confusing with lasers
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    game.stars = starList;

    // Flush to react states nicely
    setUiHp(game.player.hp);
    setUiMaxHp(game.player.maxHp);
    setUiScore(0);
    setUiStage(1);
    setUiMultiplier(1);
    setUiBombs(3);
    setUiPowerLevel(1);
    setUiBossHp(null);
    setUiBossMaxHp(null);
    setUiBossName(null);
    setStageProgressPercent(0);

    // Cancel old loop if exists
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  // Helper code for firing player lasers
  const firePlayerLaser = () => {
    const game = gameStateRef.current;
    if (!game.player.active || game.gameOver || game.victory) return;

    const shipX = game.player.x + 16;
    const shipY = game.player.y + 4;
    const level = game.player.level;

    synth.play('laser');

    // Bullet customization depending on Ship Preset & Weapon level
    let damage = 12;
    if (selectedShip.id === 'fury') {
      damage = 18; // Crimson fury is high damage
    }

    if (selectedShip.fireType === 'BALANCED') {
      if (level === 1) {
        // Single central laser
        game.bullets.push({
          id: Math.random().toString(),
          x: shipX,
          y: shipY,
          vx: 0,
          vy: -8,
          isPlayer: true,
          damage,
          size: 4,
          color: '#38bdf8', // Cyan
          glow: true
        });
      } else if (level === 2) {
        // Dual laser
        game.bullets.push(
          { id: Math.random().toString(), x: shipX - 8, y: shipY, vx: 0, vy: -9, isPlayer: true, damage, size: 4, color: '#38bdf8' },
          { id: Math.random().toString(), x: shipX + 8, y: shipY, vx: 0, vy: -9, isPlayer: true, damage, size: 4, color: '#38bdf8' }
        );
      } else if (level === 3) {
        // Triple shot spread
        game.bullets.push(
          { id: Math.random().toString(), x: shipX, y: shipY, vx: 0, vy: -10, isPlayer: true, damage, size: 4, color: '#38bdf8' },
          { id: Math.random().toString(), x: shipX - 10, y: shipY, vx: -1.5, vy: -9.5, isPlayer: true, damage, size: 4, color: '#38bdf8' },
          { id: Math.random().toString(), x: shipX + 10, y: shipY, vx: 1.5, vy: -9.5, isPlayer: true, damage, size: 4, color: '#38bdf8' }
        );
      } else if (level === 4) {
        // Balanced 4-shot
        game.bullets.push(
          { id: Math.random().toString(), x: shipX - 12, y: shipY, vx: -0.5, vy: -10, isPlayer: true, damage, size: 5, color: '#67e8f9' },
          { id: Math.random().toString(), x: shipX - 4, y: shipY - 2, vx: 0, vy: -10, isPlayer: true, damage: damage + 2, size: 5, color: '#38bdf8' },
          { id: Math.random().toString(), x: shipX + 4, y: shipY - 2, vx: 0, vy: -10, isPlayer: true, damage: damage + 2, size: 5, color: '#38bdf8' },
          { id: Math.random().toString(), x: shipX + 12, y: shipY, vx: 0.5, vy: -10, isPlayer: true, damage, size: 5, color: '#67e8f9' }
        );
      } else {
        // Super plasma level 5+
        game.bullets.push(
          { id: Math.random().toString(), x: shipX, y: shipY - 4, vx: 0, vy: -12, isPlayer: true, damage: damage + 6, size: 6, color: '#a5f3fc', glow: true },
          { id: Math.random().toString(), x: shipX - 15, y: shipY, vx: -2.5, vy: -10, isPlayer: true, damage, size: 4, color: '#38bdf8' },
          { id: Math.random().toString(), x: shipX - 6, y: shipY - 1, vx: -0.8, vy: -11, isPlayer: true, damage: damage + 2, size: 5, color: '#67e8f9' },
          { id: Math.random().toString(), x: shipX + 6, y: shipY - 1, vx: 0.8, vy: -11, isPlayer: true, damage: damage + 2, size: 5, color: '#67e8f9' },
          { id: Math.random().toString(), x: shipX + 15, y: shipY, vx: 2.5, vy: -10, isPlayer: true, damage, size: 4, color: '#38bdf8' }
        );
      }
    } else if (selectedShip.fireType === 'HEAVY') {
      // Crimson fury high energy plasma bolts (Slower but heavy hitting)
      const plasmaDmg = damage * 2;
      if (level === 1) {
        game.bullets.push({
          id: Math.random().toString(),
          x: shipX,
          y: shipY,
          vx: 0,
          vy: -6.5,
          isPlayer: true,
          damage: plasmaDmg,
          size: 7,
          color: '#f87171' // red-400
        });
      } else if (level === 2) {
        game.bullets.push(
          { id: Math.random().toString(), x: shipX - 8, y: shipY, vx: 0, vy: -7, isPlayer: true, damage: plasmaDmg, size: 7, color: '#f87171' },
          { id: Math.random().toString(), x: shipX + 8, y: shipY, vx: 0, vy: -7, isPlayer: true, damage: plasmaDmg, size: 7, color: '#f87171' }
        );
      } else if (level === 3) {
        // Heavy splits
        game.bullets.push(
          { id: Math.random().toString(), x: shipX, y: shipY, vx: 0, vy: -7.5, isPlayer: true, damage: plasmaDmg + 5, size: 9, color: '#fca5a5' },
          { id: Math.random().toString(), x: shipX - 12, y: shipY, vx: -1.2, vy: -6.8, isPlayer: true, damage: plasmaDmg - 2, size: 6, color: '#ef4444' },
          { id: Math.random().toString(), x: shipX + 12, y: shipY, vx: 1.2, vy: -6.8, isPlayer: true, damage: plasmaDmg - 2, size: 6, color: '#ef4444' }
        );
      } else if (level === 4) {
        game.bullets.push(
          { id: Math.random().toString(), x: shipX - 8, y: shipY - 2, vx: -0.4, vy: -8, isPlayer: true, damage: plasmaDmg + 5, size: 8, color: '#fcaa9a' },
          { id: Math.random().toString(), x: shipX + 8, y: shipY - 2, vx: 0.4, vy: -8, isPlayer: true, damage: plasmaDmg + 5, size: 8, color: '#fcaa9a' },
          { id: Math.random().toString(), x: shipX - 18, y: shipY, vx: -3, vy: -6, isPlayer: true, damage: plasmaDmg - 4, size: 6, color: '#ef4444' },
          { id: Math.random().toString(), x: shipX + 18, y: shipY, vx: 3, vy: -6, isPlayer: true, damage: plasmaDmg - 4, size: 6, color: '#ef4444' }
        );
      } else {
        // Level 5 Super Nova Firing
        game.bullets.push(
          { id: Math.random().toString(), x: shipX, y: shipY - 6, vx: 0, vy: -8.5, isPlayer: true, damage: plasmaDmg * 2, size: 12, color: '#ef4444', glow: true },
          { id: Math.random().toString(), x: shipX - 12, y: shipY, vx: -1, vy: -7.5, isPlayer: true, damage: plasmaDmg, size: 7, color: '#f87171' },
          { id: Math.random().toString(), x: shipX + 12, y: shipY, vx: 1, vy: -7.5, isPlayer: true, damage: plasmaDmg, size: 7, color: '#f87171' },
          { id: Math.random().toString(), x: shipX - 25, y: shipY, vx: -3.5, vy: -5.5, isPlayer: true, damage: plasmaDmg - 5, size: 5, color: '#b91c1c' },
          { id: Math.random().toString(), x: shipX + 25, y: shipY, vx: 3.5, vy: -5.5, isPlayer: true, damage: plasmaDmg - 5, size: 5, color: '#b91c1c' }
        );
      }
    } else {
      // SPREAD TYPE - Aegon Shield
      const spreadDmg = damage - 2;
      if (level === 1) {
        game.bullets.push(
          { id: Math.random().toString(), x: shipX, y: shipY, vx: 0, vy: -7, isPlayer: true, damage: spreadDmg + 3, size: 5, color: '#34d399' },
          { id: Math.random().toString(), x: shipX - 4, y: shipY, vx: -1.0, vy: -6.8, isPlayer: true, damage: spreadDmg, size: 4, color: '#059669' },
          { id: Math.random().toString(), x: shipX + 4, y: shipY, vx: 1.0, vy: -6.8, isPlayer: true, damage: spreadDmg, size: 4, color: '#059669' }
        );
      } else if (level === 2) {
        game.bullets.push(
          { id: Math.random().toString(), x: shipX - 6, y: shipY, vx: -0.5, vy: -7.5, isPlayer: true, damage: spreadDmg + 2, size: 5, color: '#34d399' },
          { id: Math.random().toString(), x: shipX + 6, y: shipY, vx: 0.5, vy: -7.5, isPlayer: true, damage: spreadDmg + 2, size: 5, color: '#34d399' },
          { id: Math.random().toString(), x: shipX - 12, y: shipY, vx: -2.0, vy: -6.5, isPlayer: true, damage: spreadDmg - 1, size: 4, color: '#059669' },
          { id: Math.random().toString(), x: shipX + 12, y: shipY, vx: 2.0, vy: -6.5, isPlayer: true, damage: spreadDmg - 1, size: 4, color: '#059669' }
        );
      } else if (level === 3) {
        game.bullets.push(
          { id: Math.random().toString(), x: shipX, y: shipY, vx: 0, vy: -8, isPlayer: true, damage: spreadDmg + 4, size: 6, color: '#a7f3d0' },
          { id: Math.random().toString(), x: shipX - 8, y: shipY, vx: -1.2, vy: -7.5, isPlayer: true, damage: spreadDmg + 1, size: 5, color: '#34d399' },
          { id: Math.random().toString(), x: shipX + 8, y: shipY, vx: 1.2, vy: -7.5, isPlayer: true, damage: spreadDmg + 1, size: 5, color: '#34d399' },
          { id: Math.random().toString(), x: shipX - 16, y: shipY, vx: -3.0, vy: -6, isPlayer: true, damage: spreadDmg - 1, size: 4, color: '#059669' },
          { id: Math.random().toString(), x: shipX + 16, y: shipY, vx: 3.0, vy: -6, isPlayer: true, damage: spreadDmg - 1, size: 4, color: '#059669' }
        );
      } else if (level === 4) {
        game.bullets.push(
          { id: Math.random().toString(), x: shipX, y: shipY, vx: 0, vy: -8, isPlayer: true, damage: spreadDmg + 5, size: 6, color: '#a7f3d0' },
          { id: Math.random().toString(), x: shipX - 6, y: shipY - 1, vx: -0.8, vy: -8, isPlayer: true, damage: spreadDmg + 2, size: 5, color: '#34d399' },
          { id: Math.random().toString(), x: shipX + 6, y: shipY - 1, vx: 0.8, vy: -8, isPlayer: true, damage: spreadDmg + 2, size: 5, color: '#34d399' },
          { id: Math.random().toString(), x: shipX - 15, y: shipY, vx: -2.8, vy: -7, isPlayer: true, damage: spreadDmg, size: 4, color: '#34d399' },
          { id: Math.random().toString(), x: shipX + 15, y: shipY, vx: 2.8, vy: -7, isPlayer: true, damage: spreadDmg, size: 4, color: '#34d399' },
          { id: Math.random().toString(), x: shipX - 24, y: shipY, vx: -4.5, vy: -6, isPlayer: true, damage: spreadDmg - 2, size: 4, color: '#047857' },
          { id: Math.random().toString(), x: shipX + 24, y: shipY, vx: 4.5, vy: -6, isPlayer: true, damage: spreadDmg - 2, size: 4, color: '#047857' }
        );
      } else {
        // Level 5 Super Aegon Nova Firing (Massive layout area cover)
        game.bullets.push(
          { id: Math.random().toString(), x: shipX, y: shipY, vx: 0, vy: -9, isPlayer: true, damage: spreadDmg + 6, size: 7, color: '#d1fae5', glow: true },
          { id: Math.random().toString(), x: shipX - 8, y: shipY, vx: -1.0, vy: -8.5, isPlayer: true, damage: spreadDmg + 4, size: 6, color: '#34d399' },
          { id: Math.random().toString(), x: shipX + 8, y: shipY, vx: 1.0, vy: -8.5, isPlayer: true, damage: spreadDmg + 4, size: 6, color: '#34d399' },
          { id: Math.random().toString(), x: shipX - 18, y: shipY, vx: -2.8, vy: -7.5, isPlayer: true, damage: spreadDmg + 2, size: 5, color: '#10b981' },
          { id: Math.random().toString(), x: shipX + 18, y: shipY, vx: 2.8, vy: -7.5, isPlayer: true, damage: spreadDmg + 2, size: 5, color: '#10b981' },
          { id: Math.random().toString(), x: shipX - 28, y: shipY, vx: -4.8, vy: -6.5, isPlayer: true, damage: spreadDmg, size: 4, color: '#059669' },
          { id: Math.random().toString(), x: shipX + 28, y: shipY, vx: 4.8, vy: -6.5, isPlayer: true, damage: spreadDmg, size: 4, color: '#059669' },
          { id: Math.random().toString(), x: shipX - 38, y: shipY, vx: -6.0, vy: -5.5, isPlayer: true, damage: spreadDmg - 3, size: 4, color: '#047857' },
          { id: Math.random().toString(), x: shipX + 38, y: shipY, vx: 6.0, vy: -5.5, isPlayer: true, damage: spreadDmg - 3, size: 4, color: '#047857' }
        );
      }
    }
  };

  // Spark and explosion emitter helper
  const createExplosion = (x: number, y: number, color: string, count = 10, magnitude = 3, fade = true) => {
    const game = gameStateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random() * 0.9) * magnitude;
      game.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 2.5,
        color,
        life: 15 + Math.floor(Math.random() * 20),
        maxLife: 35,
        fade
      });
    }
  };

  // Submit level change
  const triggerNextStage = () => {
    const game = gameStateRef.current;
    if (game.stage >= 10) {
      game.victory = true;
      setScreen('VICTORY');
      setCurrentScore(game.player.score);
      setCurrentStage(10);
    } else {
      game.stage++;
      game.stageProgress = 0;
      game.bossSpawned = false;
      // Shield buffer on next stage
      game.player.shieldTime = 120;
      game.player.hp = Math.min(game.player.hp + 40, game.player.maxHp); // Heal bonus

      setUiStage(game.stage);
      setUiHp(game.player.hp);
      setUiBossName(null);
      setUiBossHp(null);
      setUiBossMaxHp(null);
      setStageProgressPercent(0);

      // Flash notifications or play stage clear audio
      synth.play('stageclear');
      
      // Floating particles
      createExplosion(220, 300, '#10b981', 40, 5);
    }
  };

  // Main Canvas Game Loop
  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const game = gameStateRef.current;

    // 1. Screens Check
    if (gameStateRef.current.gameOver || gameStateRef.current.victory) {
      return; // Stop animation loop
    }

    // 2. Clear & Prepare Shake
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    if (game.shakeFrames > 0) {
      const shakeX = (Math.random() - 0.5) * game.shakeStrength;
      const shakeY = (Math.random() - 0.5) * game.shakeStrength;
      ctx.translate(shakeX, shakeY);
      game.shakeFrames--;
    }

    // Fill pitch dark void background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    game.frameCounter++;

    // 3. Draw Parallax Space Stars (Subtle, clean, and non-distracting)
    game.stars.forEach(star => {
      star.y += star.speed;
      if (star.y > canvas.height) {
        star.y = 0;
        star.x = Math.random() * canvas.width;
      }
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = star.color;
      ctx.fill();
    });

    // 4. Update and Draw Particles
    game.particles = game.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      
      if (p.life <= 0) return false;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      
      let opacity = 1;
      if (p.fade) {
        opacity = p.life / p.maxLife;
      }
      
      ctx.fillStyle = p.color;
      ctx.globalAlpha = opacity;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      return true;
    });

    // 5. Update score multi timers
    if (game.scoreMultiplierTimer > 0) {
      game.scoreMultiplierTimer--;
      if (game.scoreMultiplierTimer <= 0) {
        game.player.multiplier = 1;
        setUiMultiplier(1);
      }
    }

    // Adjust passive shield glow time
    if (game.player.shieldTime > 0) {
      game.player.shieldTime--;
      setActiveShieldTime(game.player.shieldTime);
    }

    // Adjust hyper firing mode countdown
    if (game.player.hyperTime > 0) {
      game.player.hyperTime--;
      setActiveHyperTime(game.player.hyperTime);
    } else if (activeHyperTime > 0) {
      setActiveHyperTime(0);
    }

    // Adjust Active screen-clearing bomb time
    if (game.player.bombTime > 0) {
      game.player.bombTime--;
      ctx.save();
      ctx.beginPath();
      ctx.arc(game.player.x + 16, game.player.y + 16, (40 - game.player.bombTime) * 15, 0, Math.PI * 2);
      ctx.lineWidth = 10;
      ctx.strokeStyle = `rgba(251, 191, 36, ${game.player.bombTime / 40})`;
      ctx.stroke();
      ctx.fillStyle = `rgba(239, 68, 68, ${game.player.bombTime / 120})`;
      ctx.fill();
      ctx.restore();
    }

    // 6. Handle Controls for Fighter Ship Movement
    let dx = 0;
    let dy = 0;
    const speed = selectedShip.speed;

    // Keyboard support
    if (keysPressed.current['arrowup'] || keysPressed.current['w']) dy -= speed;
    if (keysPressed.current['arrowdown'] || keysPressed.current['s']) dy += speed;
    if (keysPressed.current['arrowleft'] || keysPressed.current['a']) dx -= speed;
    if (keysPressed.current['arrowright'] || keysPressed.current['d']) dx += speed;

    // Apply keyboard position change
    game.player.x += dx;
    game.player.y += dy;

    // Mouse/Touch controls: If user uses mouse target, we lock/lerp to position
    if (touchState.current.active) {
      const targetX = touchState.current.x - 16;
      const targetY = touchState.current.y - 16;
      // Interpolate smoothly
      game.player.x += (targetX - game.player.x) * 0.25;
      game.player.y += (targetY - game.player.y) * 0.25;
    } else if (isUsingMouse.current) {
      const targetX = lastMousePos.current.x - 16;
      const targetY = lastMousePos.current.y - 16;
      game.player.x += (targetX - game.player.x) * 0.25;
      game.player.y += (targetY - game.player.y) * 0.25;
    }

    // Stay bounded nicely
    if (game.player.x < 0) game.player.x = 0;
    if (game.player.x > canvas.width - game.player.width) game.player.x = canvas.width - game.player.width;
    if (game.player.y < 0) game.player.y = 0;
    if (game.player.y > canvas.height - game.player.height) game.player.y = canvas.height - game.player.height;

    // 7. Auto Shot Trigger (Every 12 frames depending on ship spec, ultra rapid in HYPER mode!)
    let fireInterval = 13;
    if (selectedShip.id === 'specter') {
      fireInterval = 10; // Specter shoots very fast!
    } else if (selectedShip.id === 'titan') {
      fireInterval = 15; // Titan spread has wider bullets, slower rate
    }

    if (game.player.hyperTime > 0) {
      fireInterval = 3; // Super rapid-fire storm!
    }

    if (game.frameCounter - game.lastTimeShoot >= fireInterval) {
      firePlayerLaser();
      game.lastTimeShoot = game.frameCounter;
    }

    // 8. Draw Fighter Airplane
    if (game.player.active) {
      const px = game.player.x;
      const py = game.player.y;
      const pColor = selectedShip.color;
      const accent = selectedShip.accentColor;

      ctx.save();

      // Draw thruster plume flare (Ship-specific exhaust designs)
      if (selectedShip.id === 'specter') {
        // Dual high-velocity thin plasma glows
        const leftPlume = 10 + Math.sin(game.frameCounter * 0.7) * 4;
        const rightPlume = 10 + Math.cos(game.frameCounter * 0.7) * 4;
        
        // Left thruster
        ctx.beginPath();
        ctx.moveTo(px + 8, py + 30);
        ctx.lineTo(px + 10, py + 30 + leftPlume);
        ctx.lineTo(px + 13, py + 30);
        ctx.closePath();
        let grad = ctx.createLinearGradient(px + 10, py + 30, px + 10, py + 30 + leftPlume);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Right thruster
        ctx.beginPath();
        ctx.moveTo(px + 19, py + 30);
        ctx.lineTo(px + 22, py + 30 + rightPlume);
        ctx.lineTo(px + 24, py + 30);
        ctx.closePath();
        grad = ctx.createLinearGradient(px + 22, py + 30, px + 22, py + 30 + rightPlume);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = grad;
        ctx.fill();

      } else if (selectedShip.id === 'fury') {
        // Triple raw plasma thrusts with heavy combustion flare
        const centerPlume = 18 + Math.sin(game.frameCounter * 0.8) * 7;
        const sidePlume = 8 + Math.cos(game.frameCounter * 0.6) * 4;

        // Big center jet
        ctx.beginPath();
        ctx.moveTo(px + 12, py + 31);
        ctx.lineTo(px + 16, py + 31 + centerPlume);
        ctx.lineTo(px + 20, py + 31);
        ctx.closePath();
        let grad = ctx.createLinearGradient(px + 16, py + 31, px + 16, py + 31 + centerPlume);
        grad.addColorStop(0, '#f97316');
        grad.addColorStop(0.3, '#ef4444');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Left jet
        ctx.beginPath();
        ctx.moveTo(px + 4, py + 29);
        ctx.lineTo(px + 6, py + 29 + sidePlume);
        ctx.lineTo(px + 8, py + 29);
        ctx.closePath();
        grad = ctx.createLinearGradient(px + 6, py + 29, px + 6, py + 29 + sidePlume);
        grad.addColorStop(0, '#f43f5e');
        grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Right jet
        ctx.beginPath();
        ctx.moveTo(px + 24, py + 29);
        ctx.lineTo(px + 26, py + 29 + sidePlume);
        ctx.lineTo(px + 28, py + 29);
        ctx.closePath();
        grad = ctx.createLinearGradient(px + 26, py + 29, px + 26, py + 29 + sidePlume);
        grad.addColorStop(0, '#f43f5e');
        grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
        ctx.fillStyle = grad;
        ctx.fill();

      } else {
        // Titan: Massive glowing Emerald ion blast (Steady, fat shield thruster)
        const activeThrust = 13 + Math.sin(game.frameCounter * 0.4) * 5;
        ctx.beginPath();
        ctx.moveTo(px + 8, py + 32);
        ctx.lineTo(px + 16, py + 32 + activeThrust);
        ctx.lineTo(px + 24, py + 32);
        ctx.closePath();
        const grad = ctx.createLinearGradient(px + 16, py + 32, px + 16, py + 32 + activeThrust);
        grad.addColorStop(0, '#10b981');
        grad.addColorStop(0.6, '#34d399');
        grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Draw Ship Wings & Body (Specific mesh design for each)
      if (selectedShip.id === 'specter') {
        // AERO SPECTER: Stealth jet with dual cannons
        ctx.shadowBlur = 4;
        ctx.shadowColor = pColor;

        // Draw Left Wing
        ctx.fillStyle = pColor;
        ctx.beginPath();
        ctx.moveTo(px + 11, py + 12);
        ctx.lineTo(px - 1, py + 26);
        ctx.lineTo(px + 8, py + 26);
        ctx.closePath();
        ctx.fill();

        // Draw Right Wing
        ctx.beginPath();
        ctx.moveTo(px + 21, py + 12);
        ctx.lineTo(px + 33, py + 26);
        ctx.lineTo(px + 24, py + 26);
        ctx.closePath();
        ctx.fill();

        // Main Sleek Fuselage (Fusiform structure)
        ctx.fillStyle = '#ffffff'; // Dual-tone fuselage
        ctx.beginPath();
        ctx.moveTo(px + 16, py); // sharp nose
        ctx.lineTo(px + 11, py + 18);
        ctx.lineTo(px + 11, py + 30);
        ctx.lineTo(px + 21, py + 30);
        ctx.lineTo(px + 21, py + 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = pColor; // Inner canopy structure
        ctx.beginPath();
        ctx.moveTo(px + 16, py + 4);
        ctx.lineTo(px + 13, py + 16);
        ctx.lineTo(px + 16, py + 22);
        ctx.lineTo(px + 19, py + 16);
        ctx.closePath();
        ctx.fill();

        // Dual Laser Cannon Barrels pointing forward
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(px + 4, py + 15, 2, 7);
        ctx.fillRect(px + 26, py + 15, 2, 7);

        // Wing decals
        ctx.fillStyle = accent;
        ctx.fillRect(px + 1, py + 23, 2, 2);
        ctx.fillRect(px + 29, py + 23, 2, 2);

        // Cockpit Glass
        ctx.fillStyle = '#34d399'; // Emerald canopy contrast
        ctx.beginPath();
        ctx.ellipse(px + 16, py + 12, 2.5, 5, 0, 0, Math.PI * 2);
        ctx.fill();

      } else if (selectedShip.id === 'fury') {
        // CRIMSON FURY: Heavy aggressive fork fighter
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#dc2626';

        // Aggressive forward claw guns
        ctx.fillStyle = pColor;
        ctx.beginPath();
        ctx.moveTo(px + 4, py + 26);
        ctx.lineTo(px + 2, py + 8); // Left tip barrel
        ctx.lineTo(px + 8, py + 8);
        ctx.lineTo(px + 10, py + 20);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(px + 28, py + 26);
        ctx.lineTo(px + 30, py + 8); // Right tip barrel
        ctx.lineTo(px + 24, py + 8);
        ctx.lineTo(px + 22, py + 20);
        ctx.closePath();
        ctx.fill();

        // Arrow sweeps / Back thruster frame
        ctx.fillStyle = '#450a0a'; // Dark armor elements
        ctx.beginPath();
        ctx.moveTo(px + 10, py + 18);
        ctx.lineTo(px - 4, py + 28);
        ctx.lineTo(px + 6, py + 31);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(px + 22, py + 18);
        ctx.lineTo(px + 36, py + 28);
        ctx.lineTo(px + 26, py + 31);
        ctx.closePath();
        ctx.fill();

        // Crimson core engine casing
        ctx.fillStyle = pColor;
        ctx.beginPath();
        ctx.moveTo(px + 16, py + 4); // blunt cockpit capsule nose
        ctx.lineTo(px + 9, py + 15);
        ctx.lineTo(px + 8, py + 28);
        ctx.lineTo(px + 16, py + 26);
        ctx.lineTo(px + 24, py + 28);
        ctx.lineTo(px + 23, py + 15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Neon thermal active panel line decal
        ctx.fillStyle = '#f97316';
        ctx.fillRect(px + 15, py + 7, 2, 8);

        // Cockpit Glass
        ctx.fillStyle = '#fef08a'; // Angry yellow cockpit
        ctx.beginPath();
        ctx.ellipse(px + 16, py + 12, 3, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // TITAN AEGIS: Shield fort massive blocky armor vessel
        ctx.shadowBlur = 5;
        ctx.shadowColor = pColor;

        // Left Heavy Shield Wing
        ctx.fillStyle = '#064e3b'; // Slate forest background plates
        ctx.fillRect(px - 6, py + 10, 10, 18);
        ctx.fillStyle = pColor;
        ctx.beginPath();
        ctx.moveTo(px - 6, py + 12);
        ctx.lineTo(px + 4, py + 6);
        ctx.lineTo(px + 4, py + 28);
        ctx.lineTo(px - 4, py + 28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Right Heavy Shield Wing
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(px + 28, py + 10, 10, 18);
        ctx.fillStyle = pColor;
        ctx.beginPath();
        ctx.moveTo(px + 38, py + 12);
        ctx.lineTo(px + 28, py + 6);
        ctx.lineTo(px + 28, py + 28);
        ctx.lineTo(px + 36, py + 28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Center command bridge fuselage (Diamond fortress look)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(px + 16, py + 1); // command spire
        ctx.lineTo(px + 6, py + 14);
        ctx.lineTo(px + 10, py + 31);
        ctx.lineTo(px + 22, py + 31);
        ctx.lineTo(px + 26, py + 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing Shield Core Reactor in middle
        const corePulse = 4 + Math.sin(game.frameCounter * 0.1) * 1.5;
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(px + 16, py + 20, corePulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#a7f3d0';
        ctx.stroke();

        // Cockpit window (Deep sapphire obsidian armor)
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.moveTo(px + 13, py + 9);
        ctx.lineTo(px + 16, py + 6);
        ctx.lineTo(px + 19, py + 9);
        ctx.lineTo(px + 16, py + 12);
        ctx.closePath();
        ctx.fill();
      }

      // Reset shadows
      ctx.shadowBlur = 0;

      // Wing tip navigation warning strobe indicators
      ctx.fillStyle = game.frameCounter % 14 < 7 ? '#ef4444' : 'rgba(0,0,0,0)';
      if (selectedShip.id === 'fury') {
        ctx.fillRect(px - 3, py + 27, 2.5, 2.5);
        ctx.fillRect(px + 32, py + 27, 2.5, 2.5);
      } else if (selectedShip.id === 'titan') {
        ctx.fillRect(px - 5, py + 10, 2, 2);
        ctx.fillRect(px + 35, py + 10, 2, 2);
      } else {
        ctx.fillRect(px - 1, py + 25, 2, 2);
        ctx.fillRect(px + 31, py + 25, 2, 2);
      }

      // If shield is active, draw beautiful ring
      if (game.player.shieldTime > 0) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.arc(px + 16, py + 16, 26, 0, Math.PI * 2);
        ctx.stroke();

        // Draw active rotating shield particles
        const angle = (game.frameCounter * 0.05) % (Math.PI * 2);
        ctx.fillStyle = '#67e8f9';
        ctx.beginPath();
        ctx.arc(px + 16 + Math.cos(angle) * 26, py + 16 + Math.sin(angle) * 26, 4, 0, Math.PI * 2);
        ctx.arc(px + 16 - Math.cos(angle) * 26, py + 16 - Math.sin(angle) * 26, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0; // reset setup
      }

      ctx.restore();
    }

    // 9. Update & Draw Bullets (Player + Hostile)
    game.bullets = game.bullets.filter(bullet => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      // Bullet bounds exit
      if (bullet.y < -30 || bullet.y > canvas.height + 30 || bullet.x < -30 || bullet.x > canvas.width + 30) {
        return false;
      }

      ctx.beginPath();
      if (bullet.isPlayer) {
        // Player laser projectile
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fillStyle = bullet.color;
        
        if (bullet.glow) {
          ctx.shadowBlur = 9;
          ctx.shadowColor = bullet.color;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // Enemy hostile bullet (usually amber warning or red plasma ball)
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fillStyle = bullet.color || '#f59e0b'; // Default orange amber
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Check player damage collision (Only if bullet is enemy hostile)
      if (!bullet.isPlayer && game.player.active) {
        const dist = Math.hypot(bullet.x - (game.player.x + 16), bullet.y - (game.player.y + 16));
        if (dist < bullet.size + 13) {
          // Player hit!
          if (game.player.shieldTime <= 0) {
            game.player.hp -= bullet.damage;
            game.player.shieldTime = 45; // Invincibility frames buffer
            setUiHp(Math.max(game.player.hp, 0));
            synth.play('hit');
            game.shakeFrames = 10;
            game.shakeStrength = 5;

            // Loose weapon power back slightly on hit to raise difficulty stakes!
            if (game.player.level > 1 && Math.random() < 0.4) {
              game.player.level--;
              setUiPowerLevel(game.player.level);
            }

            // Lose streak multiplier
            game.player.multiplier = 1;
            setUiMultiplier(1);

            // Burst particle indicators
            createExplosion(bullet.x, bullet.y, '#f87171', 8, 2);

            // Check demise
            if (game.player.hp <= 0) {
              game.player.active = false;
              game.gameOver = true;
              synth.play('explosion');
              createExplosion(game.player.x + 16, game.player.y + 16, '#dc2626', 40, 6, true);
              setTimeout(() => {
                setScreen('GAMEOVER');
                setCurrentScore(game.player.score);
                setCurrentStage(game.stage);
              }, 1200);
            }
          } else {
            // Absorbed by shield! Create cool blue sparks
            createExplosion(bullet.x, bullet.y, '#38bdf8', 4, 1.5);
          }
          return false; // Remove bullet
        }
      }

      return true;
    });

    // 10. Handle Enemy Spawning Logic
    const progressThreshold = 1000;
    if (!game.bossSpawned) {
      game.stageProgress += 1.5;
      const progressPercent = Math.min((game.stageProgress / progressThreshold) * 100, 100);
      setStageProgressPercent(Math.floor(progressPercent));

      if (game.stageProgress >= progressThreshold) {
        game.bossSpawned = true;
        // Clear screen of minor hostiles
        game.enemies = game.enemies.filter(e => e.scoreValue > 100);
        
        // Spawn stage specific Boss
        let bossType = EnemyType.BOSS_STAGE_1;
        let bHp = 1200 + (game.stage - 1) * 1100; // scaling HP nicely
        let bSize = 64 + (game.stage - 1) * 5;     // scaling size
        let bName = '';

        if (game.stage === 1) {
          bossType = EnemyType.BOSS_STAGE_1;
          bName = '기동모함 코어 캐리어 (Stage 1: Core Carrier)';
        } else if (game.stage === 2) {
          bossType = EnemyType.BOSS_STAGE_2;
          bName = '공간초월체 플라스마 레비아탄 (Stage 2: Plasma Leviathan)';
        } else if (game.stage === 3) {
          bossType = EnemyType.BOSS_STAGE_3;
          bName = '은하파괴자 제로 포스 (Stage 3: Galaxy Devourer)';
        } else if (game.stage === 4) {
          bossType = EnemyType.BOSS_STAGE_4;
          bName = '차원지배자 퀀텀 오버로드 (Stage 4: Quantum Overlord)';
        } else if (game.stage === 5) {
          bossType = EnemyType.BOSS_STAGE_5;
          bName = '신성 폭발 초무장 전함 (Stage 5: Nova Dreadnought)';
        } else if (game.stage === 6) {
          bossType = EnemyType.BOSS_STAGE_6;
          bName = '암흑 성운 피닉스 (Stage 6: Dark Nebula Phoenix)';
        } else if (game.stage === 7) {
          bossType = EnemyType.BOSS_STAGE_7;
          bName = '하이페리온 기갑 콜로서스 (Stage 7: Hyperion Mech-Colossus)';
        } else if (game.stage === 8) {
          bossType = EnemyType.BOSS_STAGE_8;
          bName = '공허 특이점 레비아탄 (Stage 8: Void Singularity)';
        } else if (game.stage === 9) {
          bossType = EnemyType.BOSS_STAGE_9;
          bName = '대천사 보복 공격함 (Stage 9: Archangel Retribution)';
        } else {
          bossType = EnemyType.BOSS_STAGE_10;
          bHp = 15000;
          bSize = 110;
          bName = '무한 혼돈 넥서스 - 종말 (Stage 10: Infinity Chaos Nexus)';
        }

        game.enemies.push({
          id: 'boss',
          type: bossType,
          x: canvas.width / 2,
          y: -100, // enter from top
          vx: 0.8,
          vy: 1.2,
          hp: bHp,
          maxHp: bHp,
          size: bSize,
          shootCooldown: 0,
          scoreValue: 5000 * game.stage,
          phase: 1,
          stageTimer: 0,
          targetY: 130
        });

        setUiBossHp(bHp);
        setUiBossMaxHp(bHp);
        setUiBossName(bName);
      }
    }

    // Casual Enemy Spawn rates based on current stage
    const spawnRate = game.stage === 1 ? 0.015 : game.stage === 2 ? 0.024 : 0.035;
    if (!game.bossSpawned && Math.random() < spawnRate) {
      const spawnTypes = [EnemyType.SCOUT, EnemyType.INTERCEPTOR];
      if (game.stage >= 2) spawnTypes.push(EnemyType.CHARGER);
      if (game.stage >= 3 || Math.random() < 0.2) spawnTypes.push(EnemyType.HEAVY);

      const chosenType = spawnTypes[Math.floor(Math.random() * spawnTypes.length)];
      let hpVal = 18;
      let scoreVal = 100;
      let sizeVal = 24;
      let vx = 0;
      let vy = 1.5 + Math.random() * 2;

      if (chosenType === EnemyType.INTERCEPTOR) {
        hpVal = 30;
        scoreVal = 150;
        sizeVal = 26;
        vx = (Math.random() - 0.5) * 3;
        vy = (Math.random() * 0.7) + 1.6;
      } else if (chosenType === EnemyType.CHARGER) {
        hpVal = 24;
        scoreVal = 180;
        sizeVal = 20;
        vy = 3.0 + Math.random() * 2; // high speed
      } else if (chosenType === EnemyType.HEAVY) {
        hpVal = 80;
        scoreVal = 300;
        sizeVal = 34;
        vy = 0.9 + Math.random() * 0.5;
      }

      game.enemies.push({
        id: Math.random().toString(),
        type: chosenType,
        x: Math.random() * (canvas.width - 40) + 20,
        y: -40,
        vx,
        vy,
        hp: hpVal,
        maxHp: hpVal,
        size: sizeVal,
        shootCooldown: Math.random() * 100,
        scoreValue: scoreVal
      });
    }

    // 11. Process and Render Enemies
    game.enemies = game.enemies.filter(enemy => {
      const isBoss = enemy.type.startsWith('BOSS');

      // Update positions
      if (isBoss) {
        enemy.stageTimer = (enemy.stageTimer || 0) + 1;
        // Boss entry glide
        if (enemy.y < (enemy.targetY || 130)) {
          enemy.y += enemy.vy;
        } else {
          // Horizontal waving hovering
          enemy.x += enemy.vx;
          if (enemy.x < enemy.size || enemy.x > canvas.width - enemy.size) {
            enemy.vx = -enemy.vx;
          }
        }
      } else {
        // Minor enemies
        enemy.y += enemy.vy;
        enemy.x += enemy.vx;
        
        // Horizontal rebound boundaries if moving sideways
        if (enemy.x < 15 || enemy.x > canvas.width - 15) {
          enemy.vx = -enemy.vx;
        }

        // Dives and weaves for CHARGERS
        if (enemy.type === EnemyType.CHARGER) {
          enemy.vx = Math.sin(enemy.y * 0.03) * 3.5;
        }
      }

      // Check exit boundary for normal mobs
      if (!isBoss && enemy.y > canvas.height + 40) {
        return false;
      }

      // Enemy weapons & firing systems
      enemy.shootCooldown--;
      if (enemy.shootCooldown <= 0) {
        // Trigger projectile firing
        if (isBoss) {
          const timer = enemy.stageTimer || 0;

          if (enemy.type === EnemyType.BOSS_STAGE_1) {
            // Stage 1: Radial 14-bolt circle ring
            enemy.shootCooldown = 90; // Wait 1.5s
            for (let i = 0; i < 14; i++) {
              const angle = (Math.PI * 2 * i) / 14 + (timer * 0.02);
              game.bullets.push({
                id: Math.random().toString(),
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(angle) * 3.2,
                vy: Math.sin(angle) * 3.2,
                isPlayer: false,
                damage: 15,
                size: 5,
                color: '#fb923c' // glowing amber
              });
            }
          } else if (enemy.type === EnemyType.BOSS_STAGE_2) {
            // Spiral shots + rapid targeted volleys
            if (timer % 160 < 80) {
              enemy.shootCooldown = 10; // Spiral stream
              const angle = (timer * 0.15);
              game.bullets.push(
                { id: Math.random().toString(), x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4, isPlayer: false, damage: 15, size: 6, color: '#ec4899' },
                { id: Math.random().toString(), x: enemy.x, y: enemy.y, vx: Math.cos(angle + Math.PI) * 4, vy: Math.sin(angle + Math.PI) * 4, isPlayer: false, damage: 15, size: 6, color: '#ec4899' }
              );
            } else {
              enemy.shootCooldown = 60; // Spread burst targeting player
              const pX = game.player.x + 16;
              const pY = game.player.y + 16;
              const angleToPlayer = Math.atan2(pY - enemy.y, pX - enemy.x);
              // Fire 5 spreads
              for (let i = -2; i <= 2; i++) {
                const spreadAngle = angleToPlayer + (i * 0.2);
                game.bullets.push({
                  id: Math.random().toString(),
                  x: enemy.x,
                  y: enemy.y,
                  vx: Math.cos(spreadAngle) * 4.5,
                  vy: Math.sin(spreadAngle) * 4.5,
                  isPlayer: false,
                  damage: 15,
                  size: 5,
                  color: '#a855f7' // Purple
                });
              }
            }
          } else if (enemy.type === EnemyType.BOSS_STAGE_3) {
            // Stage 3: Singularity pull + rotating walls
            enemy.shootCooldown = 18;
            if (game.player.active) {
              const dx = enemy.x - (game.player.x + 16);
              const dy = enemy.y - (game.player.y + 16);
              const dist = Math.hypot(dx, dy);
              if (dist > 100) {
                game.player.x += (dx / dist) * 1.0;
                game.player.y += (dy / dist) * 1.0;
              }
            }
            const angle = (timer * 0.08);
            for (let j = 0; j < 4; j++) {
              const curAngle = angle + (j * Math.PI / 2);
              game.bullets.push({
                id: Math.random().toString(), x: enemy.x, y: enemy.y,
                vx: Math.cos(curAngle) * 3.8, vy: Math.sin(curAngle) * 3.8,
                isPlayer: false, damage: 15, size: 5.5, color: '#fb7185'
              });
            }
          } else if (enemy.type === EnemyType.BOSS_STAGE_4) {
            // Stage 4 Quantum Overlord: Cross star blasts
            enemy.shootCooldown = 22;
            const angle = Math.random() * Math.PI * 2;
            for (let i = 0; i < 6; i++) {
              const curAngle = angle + (i * Math.PI / 3);
              game.bullets.push({
                id: Math.random().toString(), x: enemy.x, y: enemy.y,
                vx: Math.cos(curAngle) * 4.2, vy: Math.sin(curAngle) * 4.2,
                isPlayer: false, damage: 15, size: 5, color: '#38bdf8'
              });
            }
          } else if (enemy.type === EnemyType.BOSS_STAGE_5) {
            // Stage 5 Nova Dreadnought: Massive scatter fire
            enemy.shootCooldown = 15;
            const pX = game.player.x + 16;
            const pY = game.player.y + 16;
            const angleToPlayer = Math.atan2(pY - enemy.y, pX - enemy.x);
            for (let i = -3; i <= 3; i++) {
              game.bullets.push({
                id: Math.random().toString(), x: enemy.x, y: enemy.y,
                vx: Math.cos(angleToPlayer + i * 0.15) * 3.8,
                vy: Math.sin(angleToPlayer + i * 0.15) * 3.8,
                isPlayer: false, damage: 16, size: 4.5, color: '#f97316'
              });
            }
          } else if (enemy.type === EnemyType.BOSS_STAGE_6) {
            // Stage 6 Dark Nebula Phoenix: Alternating spiral & tracking shots
            enemy.shootCooldown = 12;
            const mode = Math.floor(timer / 120) % 2;
            if (mode === 0) {
              const angle = (timer * 0.22);
              game.bullets.push(
                { id: Math.random().toString(), x: enemy.x, y: enemy.y, vx: Math.cos(angle) * 4.5, vy: Math.sin(angle) * 4.5, isPlayer: false, damage: 15, size: 5, color: '#f43f5e' },
                { id: Math.random().toString(), x: enemy.x, y: enemy.y, vx: Math.cos(angle + Math.PI) * 4.5, vy: Math.sin(angle + Math.PI) * 4.5, isPlayer: false, damage: 15, size: 5, color: '#f43f5e' }
              );
            } else {
              enemy.shootCooldown = 40;
              const px = game.player.x + 16;
              const py = game.player.y + 16;
              const angle = Math.atan2(py - enemy.y, px - enemy.x);
              for (let i = -2; i <= 2; i++) {
                game.bullets.push({
                  id: Math.random().toString(), x: enemy.x, y: enemy.y,
                  vx: Math.cos(angle + i * 0.25) * 5, vy: Math.sin(angle + i * 0.25) * 5,
                  isPlayer: false, damage: 16, size: 5.5, color: '#cbd5e1'
                });
              }
            }
          } else if (enemy.type === EnemyType.BOSS_STAGE_7) {
            // Stage 7 Hyperion Mech: Dual continuous cannon fire
            enemy.shootCooldown = 8;
            game.bullets.push(
              { id: Math.random().toString(), x: enemy.x - 30, y: enemy.y + 10, vx: 0.5, vy: 6, isPlayer: false, damage: 14, size: 4.5, color: '#eab308' },
              { id: Math.random().toString(), x: enemy.x + 30, y: enemy.y + 10, vx: -0.5, vy: 6, isPlayer: false, damage: 14, size: 4.5, color: '#eab308' }
            );
          } else if (enemy.type === EnemyType.BOSS_STAGE_8) {
            // Stage 8 Void Singularity: Pulls items/player and fires inward/outward arcs
            enemy.shootCooldown = 16;
            if (game.player.active) {
              const dx = enemy.x - (game.player.x + 16);
              const dy = enemy.y - (game.player.y + 16);
              const dist = Math.hypot(dx, dy);
              if (dist > 50) {
                game.player.x += (dx / dist) * 1.5; // Very strong pull!
                game.player.y += (dy / dist) * 1.5;
              }
            }
            const angle = (timer * 0.1);
            for (let i = 0; i < 5; i++) {
              const curAngle = angle + (i * Math.PI * 2 / 5);
              game.bullets.push({
                id: Math.random().toString(), x: enemy.x, y: enemy.y,
                vx: Math.cos(curAngle) * 4, vy: Math.sin(curAngle) * 4,
                isPlayer: false, damage: 18, size: 6, color: '#8b5cf6'
              });
            }
          } else if (enemy.type === EnemyType.BOSS_STAGE_9) {
            // Stage 9 Archangel Retribution: Sweeping cross laser and radial bursts
            enemy.shootCooldown = 10;
            const mod = timer % 180;
            if (mod < 90) {
              const sweepAngle = (mod * 0.05) - (Math.PI / 2);
              game.bullets.push({
                id: Math.random().toString(), x: enemy.x, y: enemy.y,
                vx: Math.cos(sweepAngle) * 5.5, vy: Math.sin(sweepAngle) * 5.5,
                isPlayer: false, damage: 18, size: 5, color: '#22d3ee'
              });
            } else {
              enemy.shootCooldown = 45;
              for (let i = 0; i < 18; i++) {
                const angle = (Math.PI * 2 * i) / 18;
                game.bullets.push({
                  id: Math.random().toString(), x: enemy.x, y: enemy.y,
                  vx: Math.cos(angle) * 4.0, vy: Math.sin(angle) * 4.0,
                  isPlayer: false, damage: 18, size: 5, color: '#06b6d4'
                });
              }
            }
          } else if (enemy.type === EnemyType.BOSS_STAGE_10) {
            // Stage 10 Ultimate Boss: INFINITY CHAOS NEXUS! Ultimate cosmic storm
            enemy.shootCooldown = 10;
            const angle1 = (timer * 0.12);
            const angle2 = -(timer * 0.07);
            
            game.bullets.push(
              { id: Math.random().toString(), x: enemy.x, y: enemy.y, vx: Math.cos(angle1) * 3.8, vy: Math.sin(angle1) * 3.8, isPlayer: false, damage: 16, size: 5, color: '#ec4899' },
              { id: Math.random().toString(), x: enemy.x, y: enemy.y, vx: Math.cos(angle1 + Math.PI) * 3.8, vy: Math.sin(angle1 + Math.PI) * 3.8, isPlayer: false, damage: 16, size: 5, color: '#ec4899' },
              { id: Math.random().toString(), x: enemy.x, y: enemy.y, vx: Math.cos(angle2) * 3.2, vy: Math.sin(angle2) * 3.2, isPlayer: false, damage: 16, size: 5, color: '#38bdf8' },
              { id: Math.random().toString(), x: enemy.x, y: enemy.y, vx: Math.cos(angle2 + Math.PI) * 3.2, vy: Math.sin(angle2 + Math.PI) * 3.2, isPlayer: false, damage: 16, size: 5, color: '#38bdf8' }
            );

            if (timer % 50 === 0) {
              const px = game.player.x + 16;
              const py = game.player.y + 16;
              const angle = Math.atan2(py - enemy.y, px - enemy.x);
              for (let i = -3; i <= 3; i++) {
                game.bullets.push({
                  id: Math.random().toString(), x: enemy.x, y: enemy.y,
                  vx: Math.cos(angle + i * 0.18) * 5.5, vy: Math.sin(angle + i * 0.18) * 5.5,
                  isPlayer: false, damage: 20, size: 6, color: '#f43f5e'
                });
              }
            }
          }
        } else {
          // Standard enemies
          enemy.shootCooldown = 75 + Math.random() * 80;
          
          if (enemy.type === EnemyType.SCOUT) {
            // Straight down shot
            game.bullets.push({
              id: Math.random().toString(),
              x: enemy.x,
              y: enemy.y + 10,
              vx: 0,
              vy: 4.5,
              isPlayer: false,
              damage: 10,
              size: 4,
              color: '#fb7185'
            });
          } else if (enemy.type === EnemyType.INTERCEPTOR) {
            // Aimed shot at player
            if (game.player.active) {
              const dx = (game.player.x + 16) - enemy.x;
              const dy = (game.player.y + 16) - enemy.y;
              const dist = Math.hypot(dx, dy);
              game.bullets.push({
                id: Math.random().toString(),
                x: enemy.x,
                y: enemy.y + 10,
                vx: (dx / dist) * 5.0,
                vy: (dy / dist) * 5.0,
                isPlayer: false,
                damage: 12,
                size: 4,
                color: '#f59e0b'
              });
            }
          } else if (enemy.type === EnemyType.HEAVY) {
            // Dual straight lasers
            game.bullets.push(
              { id: Math.random().toString(), x: enemy.x - 8, y: enemy.y + 12, vx: 0, vy: 4.8, isPlayer: false, damage: 15, size: 5, color: '#f97316' },
              { id: Math.random().toString(), x: enemy.x + 8, y: enemy.y + 12, vx: 0, vy: 4.8, isPlayer: false, damage: 15, size: 5, color: '#f97316' }
            );
          }
        }
      }

      // Draw Enemies
      ctx.save();
      const rSize = enemy.size;

      if (isBoss) {
        // Red glowing boss halo
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 15;
        
        // Draw boss hull with multi segments
        ctx.fillStyle = '#1e1e38'; // Dark military tech
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y - rSize / 2); // Top nose
        ctx.lineTo(enemy.x - rSize / 2, enemy.y - rSize / 4);
        ctx.lineTo(enemy.x - rSize * 0.7, enemy.y + rSize / 4); // wing
        ctx.lineTo(enemy.x - rSize / 3, enemy.y + rSize / 2);
        ctx.lineTo(enemy.x + rSize / 3, enemy.y + rSize / 2);
        ctx.lineTo(enemy.x + rSize * 0.7, enemy.y + rSize / 4); // wing
        ctx.lineTo(enemy.x + rSize / 2, enemy.y - rSize / 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Pulsing power core
        const glowPulse = Math.sin(game.frameCounter * 0.1) * 8 + 12;
        ctx.fillStyle = '#ec4899'; // Deep pink/magenta laser core
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, glowPulse, 0, Math.PI * 2);
        ctx.fill();

        // Left/Right energy batteries
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(enemy.x - rSize / 2 - 4, enemy.y + 5, 8, 12);
        ctx.fillRect(enemy.x + rSize / 2 - 4, enemy.y + 5, 8, 12);

        // Update Boss Health reactive UI
        setUiBossHp(Math.max(enemy.hp, 0));
      } else {
        // Normal mobs
        let mobColor = '#f43f5e'; // default crimson
        let coreColor = '#fda4af';

        if (enemy.type === EnemyType.INTERCEPTOR) {
          mobColor = '#eab308'; // Amber
          coreColor = '#fef08a';
        } else if (enemy.type === EnemyType.CHARGER) {
          mobColor = '#ec4899'; // Neon Purple
          coreColor = '#fbcfe8';
        } else if (enemy.type === EnemyType.HEAVY) {
          mobColor = '#8b5cf6'; // Violet
          coreColor = '#c084fc';
        }

        ctx.fillStyle = mobColor;
        ctx.strokeStyle = '#2d2d44';
        ctx.lineWidth = 1;

        ctx.beginPath();
        if (enemy.type === EnemyType.HEAVY) {
          // Broad armored triangle
          ctx.moveTo(enemy.x, enemy.y + rSize);
          ctx.lineTo(enemy.x - rSize, enemy.y - rSize / 3);
          ctx.lineTo(enemy.x - rSize / 2, enemy.y - rSize);
          ctx.lineTo(enemy.x + rSize / 2, enemy.y - rSize);
          ctx.lineTo(enemy.x + rSize, enemy.y - rSize / 3);
        } else if (enemy.type === EnemyType.CHARGER) {
          // Sleek arrow shape
          ctx.moveTo(enemy.x, enemy.y + rSize * 0.6);
          ctx.lineTo(enemy.x - rSize / 2, enemy.y - rSize * 0.6);
          ctx.lineTo(enemy.x + rSize / 2, enemy.y - rSize * 0.6);
        } else {
          // Standard insectoid scout/interceptor
          ctx.moveTo(enemy.x, enemy.y + rSize * 0.8);
          ctx.lineTo(enemy.x - rSize * 0.6, enemy.y - rSize * 0.4);
          ctx.lineTo(enemy.x, enemy.y - rSize * 0.2);
          ctx.lineTo(enemy.x + rSize * 0.6, enemy.y - rSize * 0.4);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Core eye point
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Check collision with player bullets
      for (let b = game.bullets.length - 1; b >= 0; b--) {
        const bullet = game.bullets[b];
        if (bullet.isPlayer) {
          const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
          if (dist < bullet.size + rSize * 0.7) {
            // Hit!
            enemy.hp -= bullet.damage;
            
            // Delete bullet unless it's a super laser level 5 center beam
            if (bullet.size < 10) {
              game.bullets.splice(b, 1);
            }

            // Hit particles
            createExplosion(bullet.x, bullet.y, '#fef08a', 4, 1.8);

            // Defeated!
            if (enemy.hp <= 0) {
              // Destroyed SFX & Score Addition
              synth.play('hit');
              createExplosion(enemy.x, enemy.y, isBoss ? '#ec4899' : '#f43f5e', isBoss ? 45 : 12, isBoss ? 6 : 3);

              // Increment score & multiplier
              const baseValue = enemy.scoreValue;
              game.player.score += baseValue * game.player.multiplier;
              game.player.multiplier = Math.min(game.player.multiplier + 1, 9); // Max x9 streak multi!
              game.scoreMultiplierTimer = 180; // Starts the timer for 3 seconds of streak stability!

              // Update state
              setUiScore(game.player.score);
              setUiMultiplier(game.player.multiplier);

              // Item Drop Probability (15% for minor, 100% for heavy & bosses!)
              const isHeavy = enemy.type === EnemyType.HEAVY;
              const prob = isHeavy ? 0.6 : 0.15;
              if (isBoss || Math.random() < prob) {
                const draw = Math.random();
                let itemType = ItemType.POWER;
                if (draw < 0.25) {
                  itemType = ItemType.POWER;
                } else if (draw < 0.45) {
                  itemType = ItemType.HEAL;
                } else if (draw < 0.60) {
                  itemType = ItemType.SHIELD;
                } else if (draw < 0.72) {
                  itemType = ItemType.BOMB;
                } else if (draw < 0.84) {
                  itemType = ItemType.HYPER;
                } else if (draw < 0.92) {
                  itemType = ItemType.MULTIPLIER;
                } else {
                  itemType = ItemType.GOLD;
                }

                game.powerUps.push({
                  id: Math.random().toString(),
                  type: itemType,
                  x: enemy.x,
                  y: enemy.y,
                  vx: (Math.random() - 0.5) * 1.5,
                  vy: 1.2 + Math.random() * 0.8,
                  size: 16
                });
              }

              // Special flow for defeating Bosses!
              if (isBoss) {
                // Wipe other boss settings
                setUiBossName(null);
                setUiBossHp(null);
                setUiBossMaxHp(null);
                
                // Show clearance
                triggerNextStage();
              }

              return false; // Remove enemy
            }
          }
        }
      }

      // Check crash collision with player (Crash damage is severe!)
      if (game.player.active) {
        const distToPlayer = Math.hypot(enemy.x - (game.player.x + 16), enemy.y - (game.player.y + 16));
        if (distToPlayer < rSize * 0.6 + 14) {
          if (game.player.shieldTime <= 0) {
            // Player takes heavy crash damage
            const dmg = isBoss ? 50 : 25;
            game.player.hp -= dmg;
            game.player.shieldTime = 60; // 1s buffer
            setUiHp(Math.max(game.player.hp, 0));
            synth.play('hit');
            game.shakeFrames = 15;
            game.shakeStrength = 8;

            if (game.player.hp <= 0) {
              game.player.active = false;
              game.gameOver = true;
              synth.play('explosion');
              createExplosion(game.player.x + 16, game.player.y + 16, '#ef4444', 35, 5);
              setTimeout(() => {
                setScreen('GAMEOVER');
                setCurrentScore(game.player.score);
                setCurrentStage(game.stage);
              }, 1200);
            }
          } else {
            // Deflected by active shield
            createExplosion(enemy.x, enemy.y, '#38bdf8', 6, 2.5);
          }

          // Damage or bounce minor enemy
          if (!isBoss) {
            enemy.hp -= 40;
            if (enemy.hp <= 0) {
              createExplosion(enemy.x, enemy.y, '#f43f5e', 8, 2);
              return false; // Delete enemy on self destruct crash
            }
          }
        }
      }

      return true;
    });

    // 12. PowerUp Items Management
    game.powerUps = game.powerUps.filter(item => {
      item.y += item.vy;
      item.x += item.vx;

      // Bound Bounce
      if (item.x < 10 || item.x > canvas.width - 10) item.vx = -item.vx;

      if (item.y > canvas.height + 40) {
        return false;
      }

      // Render Item capsule with glowing color rings
      let ringColor = '#ef4444'; // Red for POWER
      let symbol = 'P';
      if (item.type === ItemType.HEAL) {
        ringColor = '#10b981'; // Green
        symbol = 'H';
      } else if (item.type === ItemType.SHIELD) {
        ringColor = '#3b82f6'; // Blue
        symbol = 'S';
      } else if (item.type === ItemType.BOMB) {
        ringColor = '#eab308'; // Amber
        symbol = 'B';
      } else if (item.type === ItemType.HYPER) {
        ringColor = '#ec4899'; // Hot pink for Hyper fire
        symbol = 'X';
      } else if (item.type === ItemType.GOLD) {
        ringColor = '#fbbf24'; // Gold
        symbol = 'G';
      } else if (item.type === ItemType.MULTIPLIER) {
        ringColor = '#a855f7'; // Purple for Multiplier
        symbol = 'M';
      }

      ctx.save();
      // Glow rings
      ctx.shadowColor = ringColor;
      ctx.shadowBlur = 8;
      
      // Capsule backing
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tech symbol font
      ctx.fillStyle = ringColor;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, item.x, item.y);
      ctx.restore();

      // Check collection collision with player!
      if (game.player.active) {
        const dist = Math.hypot(item.x - (game.player.x + 16), item.y - (game.player.y + 16));
        if (dist < 28) {
          // Item gathered!
          synth.play('item');
          
          if (item.type === ItemType.POWER) {
            game.player.level = Math.min(game.player.level + 1, 5);
            setUiPowerLevel(game.player.level);
            // score reward
            game.player.score += 200;
          } else if (item.type === ItemType.HEAL) {
            game.player.hp = Math.min(game.player.hp + 30, game.player.maxHp);
            setUiHp(game.player.hp);
          } else if (item.type === ItemType.SHIELD) {
            game.player.shieldTime = 240; // ~4 seconds invincibility!
            setActiveShieldTime(240);
          } else if (item.type === ItemType.BOMB) {
            game.player.bombs = Math.min(game.player.bombs + 1, 5); // limit to 5
            setUiBombs(game.player.bombs);
          } else if (item.type === ItemType.HYPER) {
            game.player.hyperTime = 420; // 7 seconds of insane hyper rapid-fire!
            setActiveHyperTime(420);
          } else if (item.type === ItemType.GOLD) {
            // Gold score bonus based on current multiplier streak
            game.player.score += 1500 * game.player.multiplier;
          } else if (item.type === ItemType.MULTIPLIER) {
            // Upgrade score multiplier directly
            game.player.multiplier = Math.min(game.player.multiplier + 2, 9);
            game.scoreMultiplierTimer = 240; // stabilize multiplier (~4 seconds)
            setUiMultiplier(game.player.multiplier);
          }

          // Emit beautiful collection stars
          createExplosion(item.x, item.y, ringColor, 15, 2.5);

          // Refresh and update UI score
          setUiScore(game.player.score);

          return false; // Remove item
        }
      }

      return true;
    });

    ctx.restore(); // end screen shake wrapper

    // 13. Next loop request
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  // Clean-up loop on unmount
  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Tracking Canvas mouse activity
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Scale appropriately based on bounding rect sizing
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    lastMousePos.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
    isUsingMouse.current = true;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    touchState.current = {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
      active: true
    };
    isUsingMouse.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    touchState.current = {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
      active: true
    };
  };

  const handleTouchEnd = () => {
    touchState.current.active = false;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center selection:bg-emerald-500 selection:text-slate-950 font-sans p-2 sm:p-4">
      {/* Dynamic Header */}
      <header className="w-full max-w-4xl flex items-center justify-between border-b border-slate-900 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-6 h-6 text-emerald-400" />
          <div>
            <h1 className="text-md sm:text-lg font-bold tracking-tight text-slate-200">
              Aero Strike: <span className="text-emerald-400">레전드 코어스</span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-mono">STATION COMMAND OPERATOR ACTIVE</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSoundOn(!soundOn)}
            className="p-1.5 sm:p-2 rounded bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-400 transition-all text-xs"
            title="오디오 토글"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>

          {screen !== 'LEADERBOARD' && (
            <button
              onClick={() => {
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
                setScreen('LEADERBOARD');
              }}
              className="px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 text-xs font-mono flex items-center gap-1 transition-all"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>순위표</span>
            </button>
          )}

          {screen === 'LEADERBOARD' && (
            <button
              onClick={() => setScreen('START')}
              className="px-2 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold flex items-center gap-1 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>처음으로</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container / Scene Selector */}
      <main className="w-full max-w-4xl flex-1 flex flex-col justify-center items-center">
        {screen === 'START' && (
          <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md text-center">
            {/* Absolute decor grids */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-amber-500"></div>

            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20 shadow-inner">
              <Flame className="w-8 h-8 animate-pulse" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight text-white mb-2">AERO STRIKE</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mb-6 leading-relaxed">
              최정예 전술 비행선으로 무장하고 끝없는 적함의 공세를 돌파하십시오. 각 스테이지 보스의 치명적인 패턴을 파괴해 대성계 명예에 기록을 세워보세요!
            </p>

            {/* Pilot Name Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 text-left">
              <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <User className="w-3 h-3 text-emerald-400" />
                조종사 코드네임 입력
              </label>
              <input
                type="text"
                placeholder="조종사 이름을 입력하세요"
                maxLength={12}
                value={pilotName}
                onChange={(e) => setPilotName(e.target.value.replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s_-]/g, ''))}
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 font-sans text-sm px-3.5 py-2 rounded-lg text-white font-medium outline-none transition-colors placeholder:text-slate-600"
              />
              <p className="text-[10px] text-slate-500 mt-1 font-mono">※ 영문, 한글 및 숫자 최대 12글자 기록 가능</p>
            </div>

            {/* Ship Selector Switch */}
            <button
              onClick={() => setScreen('SHIP_SELECT')}
              className="w-full group py-3 sm:py-3.5 rounded-lg bg-emerald-500 text-slate-950 font-sans font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>스펙트럼 전투기 선택</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Fast Control Help */}
            <div className="mt-6 pt-5 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-xs text-slate-500 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-sans font-bold">방향키 (←↑↓→)</span>
                <span>이동 (또는 마우스/터치)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-sans font-bold">스페이스바 (Space)</span>
                <span>필살기 발사</span>
              </div>
            </div>
          </div>
        )}

        {screen === 'SHIP_SELECT' && (
          <div className="w-full max-w-2xl bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md">
            <h2 className="text-xl font-bold text-white mb-1">전술 격납고 (Hangar Terminal)</h2>
            <p className="text-xs text-slate-400 mb-6 font-mono">CHOOSE YOUR COMBAT VESSEL & SYSTEMS</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {SHIP_PRESETS.map((ship) => {
                const isSelected = selectedShip.id === ship.id;
                return (
                  <button
                    key={ship.id}
                    onClick={() => setSelectedShip(ship)}
                    className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                      isSelected 
                        ? 'bg-slate-850/90 border-emerald-400 shadow-lg shadow-emerald-500/5 translate-y-[-2px]' 
                        : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top Accent Icon Indicator */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-950 border border-slate-850 text-slate-300">
                          {ship.fireType === 'BALANCED' ? '연사형' : ship.fireType === 'HEAVY' ? '폭발형' : '확산형'}
                        </span>
                        {isSelected && <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />}
                      </div>

                      <h3 className="font-bold text-sm text-slate-200 mb-1">{ship.name}</h3>
                      <p className="text-[11px] text-slate-400 leading-normal mb-3">{ship.description}</p>
                    </div>

                    {/* Stats meter */}
                    <div className="space-y-1.5 pt-3 border-t border-slate-800">
                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span>내구력 (HP)</span>
                          <span className="text-slate-300">{ship.hp}</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1 rounded overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-300" 
                            style={{ width: `${(ship.hp / 140) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span>기동속도 (SPD)</span>
                          <span className="text-slate-300">{ship.speed} LY</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1 rounded overflow-hidden">
                          <div 
                            className="bg-sky-400 h-full transition-all duration-300" 
                            style={{ width: `${(ship.speed / 6.5) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Background glow shadow */}
                    {isSelected && (
                      <div 
                        className="absolute bottom-0 right-0 w-16 h-16 blur-2xl opacity-40 pointer-events-none rounded-full"
                        style={{ backgroundColor: ship.color }}
                      ></div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800">
                <Info className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>선택한 비행선의 고유 스펙 및 화력 모드가 게임 시작 패턴에 즉시 적용됩니다.</span>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setScreen('START')}
                  className="flex-1 sm:flex-initial px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850 rounded-lg text-sm transition-colors text-center"
                >
                  이전으로
                </button>
                <button
                  onClick={startPlaying}
                  className="flex-1 sm:flex-initial px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-sm transition-colors text-center shadow-md shadow-emerald-500/10"
                >
                  출격하기 (Start Flight)
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === 'PLAYING' && (
          <div className="w-full flex flex-col md:flex-row gap-4 items-stretch">
            {/* Left Wing Sidebar: Game Controls Panel */}
            <div className="w-full md:w-56 flex flex-col justify-between gap-4 order-2 md:order-1">
              {/* Mission briefing */}
              <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 relative overflow-hidden">
                <h3 className="text-xs uppercase font-mono tracking-widest text-slate-400 mb-2">실시간 전술 정보</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-mono bg-slate-950/60 p-2 rounded">
                    <span className="text-slate-500">조종사:</span>
                    <span className="text-emerald-400 font-bold max-w-[100px] truncate">{pilotName}</span>
                  </div>
                  <div className="flex justify-between font-mono bg-slate-950/60 p-2 rounded">
                    <span className="text-slate-500">전투기:</span>
                    <span className="text-sky-300 font-semibold">{selectedShip.id === 'specter' ? 'Aero Specter' : selectedShip.id === 'fury' ? 'Crimson Fury' : 'Titan Aegis'}</span>
                  </div>
                  <div className="flex justify-between font-mono bg-slate-950/60 p-2 rounded">
                    <span className="text-slate-500">배율 유지:</span>
                    <span className={`${uiMultiplier > 1 ? 'text-amber-400 font-bold animate-pulse' : 'text-slate-400'} font-mono`}>
                      x{uiMultiplier} Streak
                    </span>
                  </div>
                </div>
              </div>

              {/* Tactical Drop Info Guide with details */}
              <div className="bg-slate-900 border border-slate-850 rounded-xl p-4">
                <h4 className="text-[11px] uppercase font-mono tracking-wider text-slate-400 mb-3 block border-b border-slate-850 pb-1.5">획득 전리품 정보</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="w-5 h-5 flex items-center justify-center bg-red-500/10 border border-red-500/40 text-red-400 rounded-full font-mono font-bold text-[10px]">P</span>
                    <span>레벨 화력 강화 (+강화)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="w-5 h-5 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 rounded-full font-mono font-bold text-[10px]">H</span>
                    <span>방어막 선체 복구 (+30 HP)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="w-5 h-5 flex items-center justify-center bg-blue-500/10 border border-blue-500/40 text-blue-400 rounded-full font-mono font-bold text-[10px]">S</span>
                    <span>차원 에너지 보호막 (무적)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="w-5 h-5 flex items-center justify-center bg-amber-500/10 border border-amber-500/40 text-amber-400 rounded-full font-mono font-bold text-[10px]">B</span>
                    <span>특수 차원 분쇄 폭탄 (+1)</span>
                  </div>
                </div>
              </div>

              {/* Special bomb switch panel */}
              <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 text-center space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase">필살기 폭탄 수량:</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <span 
                        key={idx}
                        className={`w-2.5 h-4 rounded-sm border ${
                          idx < uiBombs 
                            ? 'bg-amber-400 border-amber-500' 
                            : 'bg-slate-950 border-slate-850'
                        }`}
                      ></span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={triggerBomb}
                  disabled={uiBombs <= 0}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 disabled:from-slate-850 disabled:to-slate-850 text-slate-950 disabled:text-slate-600 font-sans font-bold text-xs rounded-lg shadow-lg hover:shadow-red-500/10 transition-all uppercase flex items-center justify-center gap-1"
                >
                  <Flame className="w-4 h-4 text-slate-950" />
                  <span>필살기 발사 (Bomb)</span>
                </button>
                <p className="text-[10px] text-slate-500 font-mono">단축키: <kbd className="px-1 py-0.5 bg-slate-950 rounded text-slate-300 font-sans font-bold">Space</kbd> / <kbd className="px-1 py-0.5 bg-slate-950 rounded">B</kbd></p>
              </div>
            </div>

            {/* Middle Screen: Core Canvas Space with Dashboard Header/Footer HUD */}
            <div className="flex-1 flex flex-col justify-start items-center order-1 md:order-2">
              <div className="w-full bg-slate-900 border border-b-0 border-slate-850 rounded-t-xl p-3 flex justify-between items-center bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900">
                {/* Score */}
                <div>
                  <p className="text-[10px] text-slate-500 font-mono leading-none tracking-widest uppercase">SCORE</p>
                  <p className="text-base font-bold font-mono text-emerald-400">{uiScore.toLocaleString()}</p>
                </div>

                {/* Progress bar */}
                <div className="flex-1 max-w-[120px] sm:max-w-[200px] mx-3">
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mb-1">
                    <span>STAGE {uiStage}</span>
                    <span>{uiBossHp !== null ? '보스전 돌입!' : `${stageProgressPercent}%`}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        uiBossHp !== null ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${uiBossHp !== null ? 100 : stageProgressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Health & Fire power HUD */}
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-mono leading-none tracking-widest uppercase mb-1">SHIELD INTEGRITY</p>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span className="font-mono text-xs font-bold text-slate-200">{uiHp} / {uiMaxHp}</span>
                  </div>
                </div>
              </div>

              {/* Canvas Renderer Interface */}
              <div className="relative border border-slate-800 bg-slate-950 max-w-full overflow-hidden shadow-inner flex items-center justify-center">
                <canvas
                  id="flight-game-canvas"
                  ref={canvasRef}
                  width={440}
                  height={560}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => { isUsingMouse.current = false; }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className="cursor-crosshair w-full aspect-[440/560]"
                />

                {/* On-screen visual overlays for boss incoming warnings */}
                {uiBossHp !== null && uiBossName && (
                  <div className="absolute top-4 left-4 right-4 bg-red-950/80 border border-red-500/30 rounded-xl p-3 text-center animate-pulse shadow-lg backdrop-blur-sm pointer-events-none">
                    <h4 className="text-rose-450 text-[10px] font-mono font-bold tracking-widest">▲ WARNING: HIGH DAMAGE CARRIER SPOTTED</h4>
                    <p className="text-slate-200 text-xs font-bold mt-1 mb-2">{uiBossName}</p>
                    
                    {/* Boss HP Bar */}
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-red-900/40">
                      <div 
                        className="bg-gradient-to-r from-red-600 to-rose-400 h-full transition-all duration-100"
                        style={{ width: `${((uiBossHp || 0) / (uiBossMaxHp || 1)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-mono text-red-400 mt-1">
                      <span>HP UNIT MAX: {uiBossMaxHp}</span>
                      <span>CURRENT: {uiBossHp}</span>
                    </div>
                  </div>
                )}

                {/* Dynamic weapon level indicator on HUD overlay */}
                <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-300 pointer-events-none flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                  <span>C-LASER LV{uiPowerLevel}</span>
                </div>

                {/* Hyper firing countdown overlay */}
                {activeHyperTime > 0 && (
                  <div className="absolute bottom-12 right-3 bg-pink-950/90 border border-pink-400/30 rounded-lg px-2.5 py-1 text-[11px] font-mono text-pink-300 pointer-events-none flex items-center gap-1.5 shadow-lg shadow-pink-500/10 animate-bounce">
                    <Zap className="w-3.5 h-3.5 text-pink-400" />
                    <span className="tracking-widest">초고속 사격 {Math.ceil(activeHyperTime / 60)}초</span>
                  </div>
                )}

                {/* Shield countdown overlay */}
                {activeShieldTime > 0 && (
                  <div className="absolute bottom-3 right-3 bg-blue-950/90 border border-blue-400/30 rounded-lg px-2.5 py-1 text-[11px] font-mono text-blue-300 pointer-events-none flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                    <span>INVINCIBLE {Math.ceil(activeShieldTime / 60)}s</span>
                  </div>
                )}
              </div>

              {/* Canvas controls instruction footer */}
              <div className="w-full text-center py-2.5 text-slate-500 text-[11px] font-mono bg-slate-900/20 border-t border-slate-900">
                <span>[마우스 / 터치 드래그로 탑승 비행기 이동 가능] - 자동 사격 구동 중!</span>
              </div>
            </div>
          </div>
        )}

        {screen === 'GAMEOVER' && (
          <div className="w-full max-w-md bg-slate-900/80 border border-red-500/20 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>

            <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-500 mb-4 border border-red-500/25">
              <CircleAlert className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">MISSION FAILED: 선체 파손</h2>
            <p className="text-xs text-rose-450 font-mono mb-6 uppercase tracking-wider">COMMAND SHIP ELIMINATED</p>

            {/* Score report sheet */}
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 mb-6 space-y-3 text-left font-mono">
              <div className="flex justify-between text-sm py-1 border-b border-slate-900 font-sans">
                <span className="text-slate-500">테스트 조종사 코드:</span>
                <span className="text-slate-200 font-medium">{pilotName}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-slate-900">
                <span className="text-slate-500">도달한 우주 스테이지:</span>
                <span className="text-amber-400 font-bold">STAGE {currentStage} / 10</span>
              </div>
              <div className="flex justify-between text-base py-2">
                <span className="text-slate-400 font-sans font-medium">최종 기록 점수 (SCORE):</span>
                <span className="text-emerald-400 font-bold text-lg">{currentScore.toLocaleString()} P</span>
              </div>
            </div>

            {rankSubmitted ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center mb-6">
                <p className="text-xs text-emerald-400 font-medium">점수 기록이 정상적으로 전송되었습니다!</p>
              </div>
            ) : (
              <button
                onClick={submitScore}
                disabled={loadingRank}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm rounded-lg mb-3 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
              >
                {loadingRank ? (
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Trophy className="w-4 h-4" />
                )}
                <span>서버에 명예 기록 등록 (Leaderboard)</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setScreen('SHIP_SELECT')}
                className="py-2.5 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-mono rounded-lg transition-colors"
              >
                전투장비 재해비
              </button>
              <button
                onClick={startPlaying}
                className="py-2.5 bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-lg transition-colors"
              >
                즉시 재출격
              </button>
            </div>
          </div>
        )}

        {screen === 'VICTORY' && (
          <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>

            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/30">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">ALL STAGES CLEARED</h2>
            <p className="text-xs text-emerald-400 font-mono mb-6 uppercase tracking-wider">성계를 지키고 우주의 평화를 쟁취했습니다!</p>

            {/* Score report sheet */}
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 mb-6 space-y-3 text-left font-mono">
              <div className="flex justify-between text-sm py-1 border-b border-slate-900 font-sans">
                <span className="text-slate-500">정예 조종사:</span>
                <span className="text-slate-200 font-medium">{pilotName}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-slate-900">
                <span className="text-slate-500">최종 진행 상태:</span>
                <span className="text-emerald-400 font-bold">ALL CLEAR (STAGE 10)</span>
              </div>
              <div className="flex justify-between text-base py-2">
                <span className="text-slate-400 font-sans font-medium">최종 누적 점수:</span>
                <span className="text-emerald-400 font-bold text-lg">{(currentScore + 10000).toLocaleString()} P</span>
              </div>
              <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest mt-1">※ 올클리어 특별 보너스 +10,000점 반영 완료!</p>
            </div>

            {rankSubmitted ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center mb-6">
                <p className="text-xs text-emerald-400 font-medium">점수 기록이 정상적으로 전송되었습니다!</p>
              </div>
            ) : (
              <button
                onClick={submitScore}
                disabled={loadingRank}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm rounded-lg mb-4 flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
              >
                {loadingRank ? (
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Trophy className="w-4 h-4" />
                )}
                <span>서버 명예의 전당 등록</span>
              </button>
            )}

            <div className="flex justify-center">
              <button
                onClick={() => setScreen('START')}
                className="px-6 py-2.5 bg-slate-900 text-slate-300 hover:text-emerald-400 hover:bg-slate-850 rounded-lg text-xs font-mono border border-slate-800 transition-colors"
              >
                메인 터미널로 돌아가기
              </button>
            </div>
          </div>
        )}

        {screen === 'LEADERBOARD' && (
          <div className="w-full">
            <Leaderboard />
            <div className="mt-6 text-center">
              <button
                onClick={() => setScreen('START')}
                className="px-6 py-2 bg-slate-900 text-slate-350 hover:text-emerald-400 hover:bg-slate-850 rounded-lg text-xs font-mono border border-slate-800 transition-colors"
                id="btn-back-to-home"
              >
                전투 터미널로 이동
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="w-full max-w-4xl text-center border-t border-slate-900 pt-3 mt-6 text-[10px] text-slate-650 font-mono">
        <span>AERO STRIKE © 2026 GENERAL EMORY TACTICAL OPERATIONS CENTRE. ALL HARDWARE ONLINE.</span>
      </footer>
    </div>
  );
}
