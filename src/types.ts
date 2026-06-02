export enum ItemType {
  POWER = 'POWER',
  HEAL = 'HEAL',
  SHIELD = 'SHIELD',
  BOMB = 'BOMB',
  HYPER = 'HYPER',       // NEW: Super high-frequency gold lasers
  GOLD = 'GOLD',         // NEW: Instant large score bonus
  MULTIPLIER = 'MULTIPLIER' // NEW: Adds +2 score multiplier directly
}

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  score: number;
  multiplier: number;
  level: number; // Gun level
  shieldTime: number; // Remaining invincibility frames/time
  bombs: number; // Special bomb stock
  bombTime: number; // Active special bomb visual flash time
  active: boolean;
  name: string;
  hyperTime: number; // NEW: Hyper-mode shooting timer remaining frames
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isPlayer: boolean;
  damage: number;
  size: number;
  color: string;
  angle?: number;
  glow?: boolean;
}

export enum EnemyType {
  SCOUT = 'SCOUT',            // Low health, shoots straight down
  INTERCEPTOR = 'INTERCEPTOR', // Faster, moves sideways, shoots aimed bullets
  CHARGER = 'CHARGER',        // Moves in a wavy patten, dives down
  HEAVY = 'HEAVY',            // High health, dual straight cannons
  BOSS_STAGE_1 = 'BOSS_STAGE_1', // Boss 1: Core Carrier (Radial blasts)
  BOSS_STAGE_2 = 'BOSS_STAGE_2', // Boss 2: Plasma Leviathan (Spiral blasts, Sweeping lasers)
  BOSS_STAGE_3 = 'BOSS_STAGE_3', // Boss 3: Galaxy Devourer (Singularity pulls, Extreme circles, Multiple stages)
  BOSS_STAGE_4 = 'BOSS_STAGE_4', // Boss 4: Quantum Overlord (Slick homing beams, spatial warps)
  BOSS_STAGE_5 = 'BOSS_STAGE_5', // Boss 5: Nova Dreadnought (Huge scatter flames, hyper rings)
  BOSS_STAGE_6 = 'BOSS_STAGE_6', // Boss 6: Dark Nebula Phoenix (Regen shields, flame sweeps)
  BOSS_STAGE_7 = 'BOSS_STAGE_7', // Boss 7: Hyperion Mech-Colossus (Twin cannon streams)
  BOSS_STAGE_8 = 'BOSS_STAGE_8', // Boss 8: Void Singularity (Inward gravity vortex, dark pulses)
  BOSS_STAGE_9 = 'BOSS_STAGE_9', // Boss 9: Archangel Retribution (Cross laser arrays, rapid lasers)
  BOSS_STAGE_10 = 'BOSS_STAGE_10', // Boss 10: Infinity Chaos Nexus (Ultimate cosmic bullet storm)
}

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  size: number;
  shootCooldown: number;
  scoreValue: number;
  phase?: number;         // For bosses
  stageTimer?: number;    // Boss time in action
  targetX?: number;       // Lerping targets
  targetY?: number;
}

export interface PowerUpItem {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

export interface BGStar {
  x: number;
  y: number;
  speed: number;
  size: number;
  color: string;
}

export interface GameParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number; // remaining life frames
  maxLife: number;
  fade: boolean;
}

export interface RankData {
  name: string;
  score: number;
  stage: number;
  date: string;
}
