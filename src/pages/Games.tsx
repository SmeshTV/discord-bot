import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dice1, Coins, Crown, Sparkles, AlertCircle, CheckCircle, XCircle, Shield, Clover } from 'lucide-react';
import { recordGame } from '../lib/database';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { playCasinoGame, CasinoResult, getCasinoStats, formatStreak } from '../lib/casino';

type GameType = 'coinflip' | 'dice' | 'roulette';
type RouletteColor = 'red' | 'black';
type CoinSide = 'heads' | 'tails';

interface GameConfig {
  id: GameType;
  name: string;
  icon: typeof Coins;
  description: string;
  emoji: string;
  minBet: number;
  maxBet: number;
}

const GAMES: GameConfig[] = [
  {
    id: 'coinflip',
    name: 'Монетка',
    icon: Coins,
    description: 'Угадай сторону монетки и удвой свои грибы!',
    emoji: '🪙',
    minBet: 5,
    maxBet: 500,
  },
  {
    id: 'dice',
    name: 'Кости',
    icon: Dice1,
    description: 'Выпадет 4, 5 или 6 — ты победил!',
    emoji: '🎲',
    minBet: 10,
    maxBet: 1000,
  },
  {
    id: 'roulette',
    name: 'Рулетка',
    icon: Crown,
    description: 'Красное или чёрное? Делай ставку!',
    emoji: '🎰',
    minBet: 20,
    maxBet: 2000,
  },
];

// ===== Анимация монетки =====
function CoinFlipAnimation({ result, side }: { result: CasinoResult | null; side: CoinSide | null }) {
  if (!result || !side) return null;

  const isWin = result.win;
  const flipSide = isWin ? side : (side === 'heads' ? 'tails' : 'heads');

  return (
    <div className="flex justify-center mb-6">
      <motion.div
        initial={{ rotateY: 0, y: 0 }}
        animate={{ rotateY: 1800, y: [-40, 0] }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        className="relative w-24 h-24"
      >
        <div className={`w-full h-full rounded-full flex items-center justify-center text-4xl border-4 ${
          flipSide === 'heads'
            ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-700'
            : 'bg-gradient-to-br from-gray-300 to-gray-500 border-gray-600'
        } shadow-2xl`}>
          {flipSide === 'heads' ? '👑' : '🌿'}
        </div>
      </motion.div>
    </div>
  );
}

// ===== Анимация костей =====
function DiceAnimation({ result }: { result: CasinoResult | null }) {
  if (!result) return null;

  // Определяем число из detail
  const match = result.detail.match(/Выпало (\d)/);
  const num = match ? parseInt(match[1]) : (result.win ? 5 : 2);
  const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  return (
    <div className="flex justify-center mb-6">
      <motion.div
        initial={{ rotate: 0, scale: 0.5 }}
        animate={{ rotate: 720, scale: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="text-7xl"
      >
        {diceFaces[num - 1]}
      </motion.div>
    </div>
  );
}

// ===== Анимация рулетки =====
function RouletteAnimation({ result, color }: { result: CasinoResult | null; color: RouletteColor | null }) {
  if (!result || !color) return null;

  const winColor = result.win ? color : (color === 'red' ? 'black' : 'red');
  const isNearMiss = result.nearMiss;

  return (
    <div className="flex justify-center mb-6">
      <div className="relative w-28 h-28">
        {/* Spinning wheel */}
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: 1440 + Math.random() * 360 }}
          transition={{ duration: 2.5, ease: 'easeOut' }}
          className="w-full h-full rounded-full border-4 border-yellow-600 overflow-hidden shadow-2xl"
          style={{
            background: `conic-gradient(
              #dc2626 0deg 18deg, #1a1a2e 18deg 36deg,
              #dc2626 36deg 54deg, #1a1a2e 54deg 72deg,
              #dc2626 72deg 90deg, #1a1a2e 90deg 108deg,
              #dc2626 108deg 126deg, #1a1a2e 126deg 144deg,
              #dc2626 144deg 162deg, #1a1a2e 162deg 180deg,
              #dc2626 180deg 198deg, #1a1a2e 198deg 216deg,
              #dc2626 216deg 234deg, #1a1a2e 234deg 252deg,
              #dc2626 252deg 270deg, #1a1a2e 270deg 288deg,
              #dc2626 288deg 306deg, #1a1a2e 306deg 324deg,
              #dc2626 324deg 342deg, #1a1a2e 342deg 360deg
            )`,
          }}
        />
        {/* Ball */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 2, duration: 0.3 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className={`w-6 h-6 rounded-full shadow-lg ${
            isNearMiss ? 'bg-green-500' : winColor === 'red' ? 'bg-red-600' : 'bg-gray-900'
          }`} />
        </motion.div>
        {/* Center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-black/50" />
        </div>
      </div>
    </div>
  );
}

// ===== Компонент результата =====
const ResultDisplay = ({ result }: { result: CasinoResult | null }) => {
  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-center p-4 rounded-xl ${
        result.win
          ? 'bg-green-500/10 border border-green-500/30'
          : result.nearMiss
          ? 'bg-yellow-500/10 border border-yellow-500/30'
          : 'bg-red-500/10 border border-red-500/30'
      }`}
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        {result.win ? (
          <CheckCircle className="text-green-500" size={20} />
        ) : result.nearMiss ? (
          <AlertCircle className="text-yellow-500" size={20} />
        ) : (
          <XCircle className="text-red-500" size={20} />
        )}
        <span className={`text-lg font-bold ${
          result.win ? 'text-green-500' : result.nearMiss ? 'text-yellow-500' : 'text-red-500'
        }`}>
          {result.detail}
        </span>
      </div>
      <p className={`text-sm ${
        result.mushroomsChange > 0 ? 'text-mushroom-neon' : result.mushroomsChange < 0 ? 'text-red-400' : 'text-gray-500'
      }`}>
        {result.mushroomsChange > 0
          ? `+${result.mushroomsChange} 🍄`
          : result.mushroomsChange < 0
          ? `${result.mushroomsChange} 🍄`
          : 'Без изменений'}
      </p>
      {result.insuranceRefund > 0 && (
        <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
          <Shield size={10} /> Страховка вернула +{result.insuranceRefund} 🍄
        </p>
      )}
      {result.mushroomsChange === 0 && !result.insuranceRefund && (
        <p className="text-xs text-gray-600 mt-1">Дневной лимит потерь достигнут</p>
      )}
    </motion.div>
  );
};

// ===== Главная страница казино =====
const Games = () => {
  const { user, refreshUser } = useAuth();
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [bet, setBet] = useState(10);
  const [result, setResult] = useState<CasinoResult | null>(null);
  const [playing, setPlaying] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);
  const gameInProgress = useRef(false);

  const [coinSide, setCoinSide] = useState<CoinSide | null>(null);
  const [rouletteColor, setRouletteColor] = useState<RouletteColor | null>(null);
  const [hasInsurance, setHasInsurance] = useState(false);
  const [hasLuckyHour, setHasLuckyHour] = useState(false);

  // Rejoin: восстанавливаем состояние игры
  const [pendingGame, setPendingGame] = useState<{
    gameType: string;
    bet: number;
    win: boolean;
    detail: string;
    nearMiss: boolean;
    change: number;
    timestamp: number;
  } | null>(() => {
    try {
      const raw = localStorage.getItem('lola_pending_game');
      if (raw) {
        const data = JSON.parse(raw);
        // Удаляем если старше 5 минут
        if (Date.now() - data.timestamp < 5 * 60 * 1000) return data;
        localStorage.removeItem('lola_pending_game');
      }
    } catch {}
    return null;
  });

  // Проверяем активную страховку и Удачный час
  useEffect(() => {
    if (!user) return;
    const checkPerks = async () => {
      const { data } = await supabase
        .from('shop_purchases')
        .select('item_id, expires_at')
        .eq('user_id', user.id)
        .in('item_id', ['insurance', 'lucky-hour']);
      if (data) {
        const now = new Date();
        setHasInsurance(data.some(p => p.item_id === 'insurance' && (!p.expires_at || new Date(p.expires_at) > now)));
        setHasLuckyHour(data.some(p => p.item_id === 'lucky-hour' && (!p.expires_at || new Date(p.expires_at) > now)));
      }
    };
    checkPerks();
  }, [user]);

  const currentGame = GAMES.find(g => g.id === selectedGame);
  const balance = user?.mushrooms ?? 0;
  const casinoStats = getCasinoStats();

  // Валидация ставки
  const validateBet = useCallback((value: number): string | null => {
    if (!currentGame) return 'Выберите игру';
    if (isNaN(value) || value <= 0) return 'Некорректная ставка';
    if (!Number.isInteger(value)) return 'Ставка должна быть целым числом';
    if (value < currentGame.minBet) return `Мин. ставка: ${currentGame.minBet} 🍄`;
    if (value > currentGame.maxBet) return `Макс. ставка: ${currentGame.maxBet} 🍄`;
    if (value > balance) return 'Недостаточно грибов';
    return null;
  }, [currentGame, balance]);

  useEffect(() => {
    setBetError(validateBet(bet));
  }, [bet, validateBet]);

  useEffect(() => {
    if (currentGame) setBet(currentGame.minBet);
  }, [currentGame]);

  // Единая функция игры
  const playGame = useCallback(async (
    gameType: string,
    betAmount: number,
    win: boolean,
    detail?: string,
    nearMiss?: boolean,
    mushroomsChange?: number
  ) => {
    if (!user || gameInProgress.current) return;

    const validation = validateBet(betAmount);
    if (validation) {
      setResult({ win: false, nearMiss: false, detail: validation, mushroomsChange: 0 });
      return;
    }

    gameInProgress.current = true;
    setPlaying(true);
    setResult(null);

    const change = mushroomsChange ?? (win ? betAmount : -betAmount);

    // Сохраняем для rejoin (если страница перезагрузится)
    const pendingData = { gameType, bet: betAmount, win, detail: detail || '', nearMiss: nearMiss ?? false, change, timestamp: Date.now() };
    localStorage.setItem('lola_pending_game', JSON.stringify(pendingData));

    const success = await recordGame(user.id, gameType, betAmount, win ? 'win' : 'loss', change);

    if (success) {
      await refreshUser();
      setResult({
        win,
        nearMiss: nearMiss ?? false,
        detail: detail || (win ? 'Победа!' : 'Поражение!'),
        mushroomsChange: change,
      });
      // Очи pending после успешной записи
      localStorage.removeItem('lola_pending_game');
    } else {
      setResult({ win: false, nearMiss: false, detail: 'Ошибка записи игры. Попробуй снова.', mushroomsChange: 0 });
    }

    setPlaying(false);
    gameInProgress.current = false;
  }, [user, validateBet, refreshUser]);

  // Восстанавливаем pending game при загрузке
  useEffect(() => {
    if (pendingGame && user && !gameInProgress.current) {
      const { gameType, bet: b, win, detail, nearMiss, change } = pendingGame;
      gameInProgress.current = true;
      setPlaying(true);
      recordGame(user.id, gameType, b, win ? 'win' : 'loss', change).then(success => {
        if (success) {
          refreshUser();
          setResult({ win, nearMiss, detail, mushroomsChange: change });
        }
        localStorage.removeItem('lola_pending_game');
        setPendingGame(null);
        setPlaying(false);
        gameInProgress.current = false;
      });
    }
  }, []); // Только при монтировании

  const playCoinFlip = useCallback((choice: CoinSide) => {
    if (!user || playing) return;
    setCoinSide(choice);
    const casinoResult = playCasinoGame('coinflip', bet, balance, choice, hasInsurance, hasLuckyHour);
    setTimeout(() => {
      playGame('Монетка', bet, casinoResult.win, casinoResult.detail, casinoResult.nearMiss, casinoResult.mushroomsChange);
    }, 1600);
  }, [user, bet, playing, balance, playGame, hasInsurance, hasLuckyHour]);

  const playDice = useCallback(() => {
    if (!user || playing) return;
    const casinoResult = playCasinoGame('dice', bet, balance, undefined, hasInsurance, hasLuckyHour);
    setPlaying(true);
    setTimeout(() => {
      playGame('Кости', bet, casinoResult.win, casinoResult.detail, casinoResult.nearMiss, casinoResult.mushroomsChange);
    }, 1200);
  }, [user, bet, playing, balance, playGame, hasInsurance, hasLuckyHour]);

  const playRoulette = useCallback((color: RouletteColor) => {
    if (!user || playing) return;
    setRouletteColor(color);
    const casinoResult = playCasinoGame('roulette', bet, balance, color, hasInsurance, hasLuckyHour);
    setTimeout(() => {
      playGame('Рулетка', bet, casinoResult.win, casinoResult.detail, casinoResult.nearMiss, casinoResult.mushroomsChange);
    }, 2700);
  }, [user, bet, playing, balance, playGame, hasInsurance, hasLuckyHour]);

  if (!user) {
    return (
      <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-2xl text-gray-400 mb-4">Войдите через Discord для игры</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-5xl font-bold gradient-text mb-2">🎰 Казино</h1>
          <p className="text-gray-400">Испытай удачу с умной системой!</p>
        </motion.div>

        {/* Balance & Stats */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Sparkles className="text-mushroom-neon" size={32} />
              <div>
                <p className="text-gray-400">Твой баланс</p>
                <p className="text-3xl font-bold text-mushroom-neon">{balance} 🍄</p>
              </div>
            </div>

            {/* Casino Stats */}
            {casinoStats.totalGames > 0 && (
              <div className="flex gap-4 text-xs text-gray-500">
                <span>🎮 {casinoStats.totalGames} игр</span>
                <span>🏆 {casinoStats.totalWins} побед</span>
                {casinoStats.streak !== 0 && (
                  <span className={casinoStats.streak > 0 ? 'text-orange-400' : 'text-red-400'}>
                    {formatStreak(casinoStats.streak)}
                  </span>
                )}
              </div>
            )}

            {/* Active Perks */}
            <div className="flex gap-2">
              {hasInsurance && (
                <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs text-blue-400">
                  <Shield size={12} /> Страховка
                </span>
              )}
              {hasLuckyHour && (
                <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-xs text-yellow-400 animate-pulse">
                  <Clover size={12} /> Удачный час
                </span>
              )}
            </div>
          </div>

          {/* Bet Controls */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
            <label className="text-gray-400 whitespace-nowrap">Ставка:</label>
            <div className="flex gap-1">
              <input
                type="number"
                value={bet}
                onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
                className={`bg-white/10 border rounded-lg px-4 py-2 w-24 ${
                  betError ? 'border-red-500' : 'border-white/20'
                }`}
                min={currentGame?.minBet ?? 5}
                max={currentGame?.maxBet ?? 2000}
              />
              <button onClick={() => setBet(Math.floor(balance / 2))} className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm">½</button>
              <button onClick={() => setBet(balance)} className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm">MAX</button>
            </div>
          </div>
        </motion.div>

        {/* Bet Error */}
        <AnimatePresence>
          {betError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500"
            >
              <AlertCircle size={20} />
              <span>{betError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {GAMES.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`glass-card p-6 card-hover cursor-pointer border-2 transition-colors ${
                selectedGame === game.id ? 'border-mushroom-neon' : 'border-transparent'
              }`}
              onClick={() => { setSelectedGame(game.id); setResult(null); setCoinSide(null); setRouletteColor(null); }}
            >
              <div className="text-6xl mb-4 text-center">{game.emoji}</div>
              <h3 className="text-2xl font-bold mb-2 text-mushroom-neon">{game.name}</h3>
              <p className="text-gray-400 mb-4">{game.description}</p>
              <p className="text-sm text-gray-500">Ставка: {game.minBet}–{game.maxBet} 🍄</p>
            </motion.div>
          ))}
        </div>

        {/* Game Area */}
        <AnimatePresence mode="wait">
          {selectedGame === 'coinflip' && (
            <motion.div
              key="coinflip"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card p-8 text-center"
            >
              <h2 className="text-3xl font-bold mb-6">🪙 Монетка</h2>

              <CoinFlipAnimation result={result} side={coinSide} />

              <div className="flex gap-4 justify-center mb-6">
                <button
                  onClick={() => playCoinFlip('heads')}
                  disabled={playing || !!betError}
                  className="btn-primary text-xl px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  👑 Орёл
                </button>
                <button
                  onClick={() => playCoinFlip('tails')}
                  disabled={playing || !!betError}
                  className="btn-primary text-xl px-8 py-4 bg-gradient-to-r from-gray-400 to-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🌿 Решка
                </button>
              </div>
              <ResultDisplay result={result} />
            </motion.div>
          )}

          {selectedGame === 'dice' && (
            <motion.div
              key="dice"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card p-8 text-center"
            >
              <h2 className="text-3xl font-bold mb-6">🎲 Кости</h2>

              <DiceAnimation result={result} />

              <p className="text-gray-400 mb-6">Выпадет 4, 5 или 6 — ты победил!</p>
              <button
                onClick={playDice}
                disabled={playing || !!betError}
                className="btn-primary text-xl px-8 py-4 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {playing ? 'Бросаем...' : 'Бросить кости'}
              </button>
              <ResultDisplay result={result} />
            </motion.div>
          )}

          {selectedGame === 'roulette' && (
            <motion.div
              key="roulette"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card p-8 text-center"
            >
              <h2 className="text-3xl font-bold mb-6">🎰 Рулетка</h2>

              <RouletteAnimation result={result} color={rouletteColor} />

              <div className="flex gap-4 justify-center mb-6">
                <button
                  onClick={() => playRoulette('red')}
                  disabled={playing || !!betError}
                  className="btn-primary text-xl px-8 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔴 Красное
                </button>
                <button
                  onClick={() => playRoulette('black')}
                  disabled={playing || !!betError}
                  className="btn-primary text-xl px-8 py-4 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ⚫ Чёрное
                </button>
              </div>
              <ResultDisplay result={result} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Games;
