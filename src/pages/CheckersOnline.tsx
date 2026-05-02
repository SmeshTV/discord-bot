import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, ArrowLeft, Copy, CheckCircle, RotateCcw, Loader2,
  Users, Timer, Flag, Coins, Settings, Info, Trophy, AlertCircle,
  Zap, Shield, Eye, Hand, Skull
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { addToast } from '../components/NotificationToast';

// ========== TYPES ==========
type Color = 'w' | 'b';
type PieceType = 'man' | 'king';

interface Piece {
  color: Color;
  type: PieceType;
  id: string;
}

type Board = (Piece | null)[][];
type Pos = [number, number];

interface Move {
  from: Pos;
  to: Pos;
  captures: Pos[];
  isJump: boolean;
  promotes?: boolean;
}

interface Rules {
  mode: 'russian' | 'classic';
  flyingKings: boolean;
  captureBackwards: boolean;
  movedBackwards: boolean;
  forcedCaptures: boolean;
  maxCaptureChain: boolean;
  fastKings: boolean;
}

interface Room {
  id: string;
  name: string;
  player_white: string;
  player_white_name: string;
  player_black: string | null;
  player_black_name: string | null;
  board_state: Board;
  current_turn: Color;
  status: 'waiting' | 'playing' | 'finished' | 'abandoned';
  winner: Color | null;
  bet: number;
  has_bet: boolean;
  rules: Rules;
  timer_seconds: number;
  created_at: string;
  last_activity: string;
  move_history: Array<{ from: Pos; to: Pos; captures: Pos[]; timestamp: string }>;
  reset_requested_by: string | null;
}

// ========== CONSTANTS ==========
const BOARD_SIZE = 8;
const DEFAULT_TIMER = 600;
const COORDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// ========== INIT BOARD ==========
const createInitialBoard = (): Board => {
  const board: Board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) board[r][c] = { color: 'b', type: 'man', id: `b-${r}-${c}-${Date.now()}` };
        if (r > 4) board[r][c] = { color: 'w', type: 'man', id: `w-${r}-${c}-${Date.now()}` };
      }
    }
  }
  return board;
};

// ========== MOVE GENERATION ==========
const getMoveDirections = (piece: Piece, rules: Rules): [number, number][] => {
  if (piece.type === 'king') return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const forward = piece.color === 'w' ? -1 : 1;
  const dirs: [number, number][] = [[forward, -1], [forward, 1]];
  // movedBackwards - можно ходить назад обычным шашкам
  if (rules.movedBackwards) dirs.push([-forward, -1], [-forward, 1]);
  return dirs;
};

const getCaptureDirections = (piece: Piece, rules: Rules): [number, number][] => {
  if (piece.type === 'king') return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const forward = piece.color === 'w' ? -1 : 1;
  const dirs: [number, number][] = [[forward, -1], [forward, 1]];
  // captureBackwards - можно есть назад
  if (rules.captureBackwards) dirs.push([-forward, -1], [-forward, 1]);
  return dirs;
};

const getSimpleMoves = (board: Board, pos: Pos, piece: Piece, rules: Rules): Move[] => {
  const [r, c] = pos;
  const moves: Move[] = [];
  const dirs = getMoveDirections(piece, rules);
  
  for (const [dr, dc] of dirs) {
    if (piece.type === 'king' && rules.flyingKings) {
      let step = 1;
      while (true) {
        const nr = r + dr * step, nc = c + dc * step;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) break;
        if (board[nr][nc]) break;
        moves.push({ from: pos, to: [nr, nc], captures: [], isJump: false });
        step++;
      }
    } else {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && !board[nr][nc]) {
        moves.push({ from: pos, to: [nr, nc], captures: [], isJump: false });
      }
    }
  }
  return moves;
};

const getCaptureMoves = (board: Board, pos: Pos, piece: Piece, rules: Rules): Move[] => {
  const [r, c] = pos;
  const moves: Move[] = [];
  
  const dirs = piece.type === 'king' ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : getCaptureDirections(piece, rules);
  
  for (const [dr, dc] of dirs) {
    if (piece.type === 'king' && rules.flyingKings) {
      let step = 1;
      while (true) {
        const er = r + dr * step, ec = c + dc * step;
        if (er < 0 || er >= BOARD_SIZE || ec < 0 || ec >= BOARD_SIZE) break;
        const enemy = board[er][ec];
        if (enemy) {
          if (enemy.color !== piece.color) {
            let landStep = 1;
            while (true) {
              const lr = er + dr * landStep, lc = ec + dc * landStep;
              if (lr < 0 || lr >= BOARD_SIZE || lc < 0 || lc >= BOARD_SIZE) break;
              if (board[lr][lc]) break;
              moves.push({ from: pos, to: [lr, lc], captures: [[er, ec]], isJump: true });
              landStep++;
            }
          }
          break;
        }
        step++;
      }
    } else {
      const mr = r + dr, mc = c + dc;
      const jr = r + dr * 2, jc = c + dc * 2;
      if (jr >= 0 && jr < BOARD_SIZE && jc >= 0 && jc < BOARD_SIZE) {
        const enemy = board[mr]?.[mc];
        if (enemy && enemy.color !== piece.color && !board[jr][jc]) {
          // Пешки едят только вперёд, если captureBackwards выключено
          if (piece.type === 'man') {
            const isForward = (piece.color === 'w' && dr === -1) || (piece.color === 'b' && dr === 1);
            if (!isForward && !rules.captureBackwards) continue;
          }
          moves.push({ from: pos, to: [jr, jc], captures: [[mr, mc]], isJump: true });
        }
      }
    }
  }
  return moves;
};

const getAllMoves = (board: Board, pos: Pos, rules: Rules): Move[] => {
  const piece = board[pos[0]][pos[1]] as Piece | null;
  if (!piece) return [];
  const captures = getCaptureMoves(board, pos, piece, rules);
  if (rules.forcedCaptures && captures.length > 0) return captures;
  const simple = getSimpleMoves(board, pos, piece, rules);
  return [...captures, ...simple];
};

const hasAnyCaptures = (board: Board, color: Color, rules: Rules): boolean => {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (piece?.color === color) {
        if (getCaptureMoves(board, [r, c], piece, rules).length > 0) return true;
      }
    }
  }
  return false;
};

const countPieces = (board: Board, color: Color): number => {
  let count = 0;
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c]?.color === color) count++;
  return count;
};

const applyMove = (board: Board, move: Move, rules: Rules): { newBoard: Board; promoted: boolean } => {
  const newBoard = board.map(row => [...row]);
  const piece = { ...newBoard[move.from[0]][move.from[1]]! };
  newBoard[move.from[0]][move.from[1]] = null;
  for (const [cr, cc] of move.captures) newBoard[cr][cc] = null;
  
  let promoted = false;
  const [toR, toC] = move.to;
  if (piece.type === 'man') {
    if ((piece.color === 'w' && toR === 0) || (piece.color === 'b' && toR === BOARD_SIZE - 1)) {
      if (rules.fastKings || !move.isJump) {
        piece.type = 'king';
        promoted = true;
      }
    }
  }
  newBoard[toR][toC] = piece;
  return { newBoard, promoted };
};

const checkWinner = (board: Board, turn: Color, rules: Rules): Color | null => {
  const wCount = countPieces(board, 'w'), bCount = countPieces(board, 'b');
  if (wCount === 0) return 'b';
  if (bCount === 0) return 'w';
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (piece?.color === turn) {
        if (getAllMoves(board, [r, c], rules).length > 0) return null;
      }
    }
  }
  return turn === 'w' ? 'b' : 'w';
};

// ========== COMPONENT ==========
export default function CheckersOnline() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshUser } = useAuth();

  // State
  const [room, setRoom] = useState<Room | null>(null);
  const [myColor, setMyColor] = useState<Color | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [board, setBoard] = useState<Board>(createInitialBoard());
  const [turn, setTurn] = useState<Color>('w');
  const [selected, setSelected] = useState<Pos | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [winner, setWinner] = useState<Color | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMER);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [timerValue, setTimerValue] = useState(DEFAULT_TIMER);
  const [betValue, setBetValue] = useState(1);
  const [rulesState, setRulesState] = useState({
    forcedCaptures: true,
    captureBackwards: true,
    movedBackwards: false,
    flyingKings: true,
    fastKings: true,
  });
  const [modeValue, setModeValue] = useState('russian');
  const [showFukConfirm, setShowFukConfirm] = useState<{ pos: Pos } | null>(null);
  
  const executeFukPenalty = async (pos: Pos) => {
    if (!room || !user) return;
    setIsProcessing(true);
    const newBoard = board.map(row => [...row]);
    newBoard[pos[0]][pos[1]] = null;
    
    const { error } = await supabase.from('checkers_rooms').update({
      board_state: newBoard,
      current_turn: myColor,
      last_activity: new Date().toISOString(),
    }).eq('id', roomId);
    
    setShowFukConfirm(null);
    setIsProcessing(false);
    if (!error) addToast('Шашка снята! Ход переходит к вам', 'success');
    else addToast('Ошибка: ' + error.message, 'error');
  };
  
  const settings = useRef({
    bet: 0,
    hasBet: false,
    rules: {
      mode: 'russian' as const,
      flyingKings: true,
      captureBackwards: true,
      movedBackwards: false,
      forcedCaptures: true,
      maxCaptureChain: true,
      fastKings: true,
    },
    timer: DEFAULT_TIMER,
  });

  const myColorRef = useRef<Color | null>(null);
  const boardRef = useRef(board);
  const turnRef = useRef(turn);
  const roomRef = useRef(room);

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { turnRef.current = turn; }, [turn]);
  useEffect(() => { roomRef.current = room; }, [room]);

  if (roomId === 'new' && !showSettings) setShowSettings(true);

  // Load room & subscribe
  useEffect(() => {
    if (!user || authLoading || !roomId || roomId === 'new') return;
    let cancelled = false;

    console.log('🎮 Loading room:', roomId, 'for user:', user?.username);

    const loadRoom = async () => {
      const { data, error } = await supabase.from('checkers_rooms').select('*').eq('id', roomId).single();
      if (error || !data) { 
        console.error('❌ Room load error:', error);
        if (!cancelled) setError('Комната не найдена'); 
        return; 
      }
      console.log('✅ Room loaded:', data);
      applyRoom(data);
    };
    loadRoom();

    const channel = supabase.channel(`checkers-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkers_rooms', filter: `id=eq.${roomId}` },
        (payload) => { 
          console.log('📬 Realtime update:', payload.new);
          if (!cancelled) applyRoom(payload.new as Room); 
        })
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    // Poll for updates as backup
    const poll = setInterval(async () => {
      if (cancelled || !user) return;
      const { data, error } = await supabase.from('checkers_rooms').select('*').eq('id', roomId).single();
      if (error) console.error('Poll error:', error);
      if (data && !cancelled) {
        applyRoom(data);
      }
    }, 3000);

    const heartbeat = setInterval(async () => {
      if (roomRef.current?.status === 'playing' && user?.id) {
        await supabase.from('checkers_rooms').update({ last_activity: new Date().toISOString() }).eq('id', roomId);
      }
    }, 30000);

    return () => { cancelled = true; clearInterval(heartbeat); clearInterval(poll); supabase.removeChannel(channel); };
  }, [user, roomId, authLoading]);

  // Timer
  useEffect(() => {
    if (!room || room.status !== 'playing' || winner) return;
    if (timeLeft <= 0) { endGame(turn === 'w' ? 'b' : 'w', 'timeout'); return; }
    const iv = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(iv);
  }, [timeLeft, room?.status, winner, turn]);

  useEffect(() => { if (myColorRef.current) setFlipped(myColorRef.current === 'b'); }, [myColor]);

  const applyRoom = async (r: Room) => {
    setRoom(r);
    setBoard(r.board_state);
    setTurn(r.current_turn);
    setWinner(r.winner);
    setSelected(null);
    setValidMoves([]);
    setIsProcessing(false);
    setShowFukConfirm(null);

    if (!myColorRef.current && user) {
      if (r.player_white === user.id) { 
        myColorRef.current = 'w'; setMyColor('w'); 
      }
      else if (r.player_black === user.id) { 
        myColorRef.current = 'b'; setMyColor('b'); 
      }
      else if (!r.player_black && r.status === 'waiting') {
        // Проверяем грибы
        if (r.has_bet && r.bet > 0 && user.mushrooms < r.bet) {
          setError(`Недостаточно грибов! Нужно ${r.bet} 🍄, у вас ${user.mushrooms} 🍄`);
          return;
        }
        myColorRef.current = 'b'; setMyColor('b');
        const { data, error } = await supabase.from('checkers_rooms').update({
          player_black: user.id, player_black_name: user.username,
          status: 'playing', last_activity: new Date().toISOString(),
        }).eq('id', roomId).select().single();
        
        if (error) {
          console.error('Join error:', error);
          setError('Ошибка при входе: ' + error.message);
          myColorRef.current = null;
          setMyColor(null);
          return;
        }
        
        if (data) {
          console.log('✅ Joined as black:', data);
          // Обновляем состояние комнаты немедленно
          setRoom(data);
          setBoard(data.board_state);
          setTurn(data.current_turn);
          setWinner(data.winner);
        }
      } else { 
        setError('Комната заполнена'); 
        return; 
      }
    }

    if (r.last_activity && r.status === 'playing') {
      const elapsed = Math.floor((Date.now() - new Date(r.last_activity).getTime()) / 1000);
      setTimeLeft(Math.max(0, (r.timer_seconds || DEFAULT_TIMER) - elapsed));
    }
  };

  const endGame = async (winColor: Color, reason: 'normal' | 'timeout' | 'surrender' | 'abandon' = 'normal') => {
    if (!room) return;
    const winnerId = winColor === 'w' ? room.player_white : room.player_black;
    const loserId = winColor === 'w' ? room.player_black : room.player_white;
    
    if (winnerId && room.has_bet) await supabase.rpc('add_mushrooms', { user_id: winnerId, amount: room.bet });
    if (loserId && room.has_bet && reason !== 'abandon') await supabase.rpc('add_mushrooms', { user_id: loserId, amount: -room.bet });

    await supabase.from('checkers_rooms').update({ status: 'finished', winner: winColor, last_activity: new Date().toISOString() }).eq('id', room.id);
    setWinner(winColor);
    
    const isMyWin = winColor === myColorRef.current;
    let message = '';
    if (reason === 'timeout') message = isMyWin ? 'Время вышло' : 'У вас закончилось время';
    else if (reason === 'surrender') message = isMyWin ? 'Соперник сдался' : 'Вы сдались';
    else message = isMyWin ? `+${room.bet} 🍄` : 'Соперник победил';

    addToast({
      title: isMyWin ? '🏆 Победа!' : '💀 Поражение',
      message,
      icon: isMyWin ? '🏆' : '💀',
      duration: 6000,
    });
    if (isMyWin || reason !== 'abandon') refreshUser?.();
  };

  const handleSquareClick = useCallback((r: number, c: number) => {
    if (!room || winner || !myColorRef.current || isProcessing) return;
    const piece = board[r][c];

    // Обычный ход
    if (room.status !== 'playing' || turn !== myColorRef.current) return;
    
    if (piece?.color === myColorRef.current) {
      const hasForced = room.rules.forcedCaptures && hasAnyCaptures(board, myColorRef.current, room.rules);
      const moves = getAllMoves(board, [r, c], room.rules);
      const filtered = hasForced ? moves.filter(m => m.isJump) : moves;
      setSelected([r, c]);
      setValidMoves(filtered);
      return;
    }
    
    if (selected) {
      const move = validMoves.find(m => m.to[0] === r && m.to[1] === c);
      if (move) executeMove(move);
    }
  }, [board, selected, validMoves, room, winner, isProcessing, turn]);

  const executeMove = async (move: Move) => {
    if (!room || isProcessing) return;
    setIsProcessing(true);

    const { newBoard, promoted } = applyMove(board, move, room.rules);
    
    let nextTurn = turn === 'w' ? 'b' : 'w';
    let mustContinue: Pos | null = null;
    
    if (move.isJump) {
      const more = getCaptureMoves(newBoard, move.to, newBoard[move.to[0]][move.to[1]]!, room.rules);
      if (more.length > 0 && room.rules.forcedCaptures) {
        nextTurn = turn;
        mustContinue = move.to;
      }
    }

    const win = checkWinner(newBoard, nextTurn, room.rules);
    
    const update: Partial<Room> = {
      board_state: newBoard,
      current_turn: nextTurn,
      winner: win || null,
      status: win ? 'finished' : 'playing',
      last_activity: new Date().toISOString(),
      move_history: [...(room.move_history || []), {
        from: move.from, to: move.to, captures: move.captures,
        timestamp: new Date().toISOString()
      }]
    };

    const { error } = await supabase.from('checkers_rooms').update(update).eq('id', room.id);
    if (error) {
      console.error('Move error:', error);
      addToast({ title: '❌ Ошибка', message: 'Не удалось сделать ход', icon: '❌', duration: 3000 });
      setIsProcessing(false);
      return;
    }

    setBoard(newBoard);
    setTurn(nextTurn);
    
    if (win) {
      setWinner(win);
      endGame(win, 'normal');
    } else {
      setSelected(mustContinue);
      setValidMoves(mustContinue ? getCaptureMoves(newBoard, mustContinue, newBoard[mustContinue[0]][mustContinue[1]]!, room.rules) : []);
      setTimeLeft(room.timer_seconds || DEFAULT_TIMER);
    }
    setIsProcessing(false);
  };

  const createRoom = async () => {
    if (isCreating || !user) return;
    if (betValue > 0 && user.mushrooms < betValue) {
      setError(`Недостаточно грибов для создания комнаты! Нужно ${betValue} 🍄, у вас ${user.mushrooms} 🍄`);
      return;
    }
    setIsCreating(true);
    try {
      setShowSettings(false);
      const id = `ck-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      
      const rules: Rules = {
        mode: modeValue as 'russian' | 'classic',
        flyingKings: rulesState.flyingKings,
        captureBackwards: rulesState.captureBackwards,
        movedBackwards: rulesState.movedBackwards,
        forcedCaptures: rulesState.forcedCaptures,
        maxCaptureChain: true,
        fastKings: rulesState.fastKings,
      };
      
      const newRoom: Partial<Room> = {
        id, name: 'Шашки',
        player_white: user.id, player_white_name: user.username,
        player_black: null, player_black_name: null,
        board_state: createInitialBoard(),
        current_turn: 'w', status: 'waiting', winner: null,
        bet: betValue, has_bet: betValue > 0,
        rules,
        timer_seconds: timerValue,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        move_history: [],
        reset_requested_by: null,
      };

      const { error } = await supabase.from('checkers_rooms').insert([newRoom]);
      if (error) { 
        console.error('Checkers create error:', error);
        setError('Ошибка: ' + error.message + ' (код: ' + error.code + ')'); 
        return; 
      }
      navigate(`/checkers-online/${id}`, { replace: true });
    } finally {
      setIsCreating(false);
    }
  };

  const surrender = () => {
    if (!room || winner || !myColorRef.current) return;
    if (!confirm('Сдаться?')) return;
    endGame(myColorRef.current === 'w' ? 'b' : 'w', 'surrender');
  };

  const requestReset = async () => {
    if (!room || !user) return;
    if (room.reset_requested_by === user.id) {
      await supabase.from('checkers_rooms').update({
        board_state: createInitialBoard(), current_turn: 'w', status: 'playing',
        winner: null, reset_requested_by: null,
        last_activity: new Date().toISOString(), move_history: [],
      }).eq('id', room.id);
      setBoard(createInitialBoard()); setTurn('w'); setWinner(null);
      setSelected(null); setValidMoves([]); setTimeLeft(room.timer_seconds || DEFAULT_TIMER);
      addToast({ title: '🔄 Новая партия!', message: 'Доска сброшена', icon: '🔄', duration: 3000 });
    } else {
      await supabase.from('checkers_rooms').update({ reset_requested_by: user.id }).eq('id', room.id);
      addToast({ title: '🔄 Запрос на сброс', message: 'Ждём соперника...', icon: '🔄', duration: 4000 });
    }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast({ title: '✅ Скопировано!', message: 'Ссылка в буфере', icon: '📋', duration: 2000 });
    } catch { addToast({ title: '❌ Ошибка', message: 'Не удалось скопировать', icon: '❌', duration: 2000 }); }
  };

  // ========== SETTINGS MODAL ==========
  if (showSettings && roomId === 'new') {
    return (
      <div className="pt-24 pb-8 px-4 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => { setShowSettings(false); navigate('/play'); }} className="text-gray-400 hover:text-white flex items-center gap-2">
              <ArrowLeft size={18} /> Назад
            </button>
            <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
              <Settings className="text-mushroom-neon" /> Настройки
            </h2>
          </div>

          <div className="space-y-6">
            {/* Mode */}
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-300 flex items-center gap-2">
                <Zap size={16} className="text-yellow-400" /> Режим
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { id: 'russian', name: '🇷🇺 Русские', desc: 'Ест назад, дамка летает' },
                  { id: 'classic', name: '🏛️ Классика', desc: 'Ест вперёд, дамка на 1' },
                ].map(m => (
                  <button key={m.id} onClick={() => setModeValue(m.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      modeValue === m.id ? 'border-mushroom-neon bg-mushroom-neon/10' : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}>
                    <div className="font-bold text-sm">{m.name}</div>
                    <div className="text-xs text-gray-400">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-300 flex items-center gap-2">
                <Shield size={16} className="text-blue-400" /> Правила
              </label>
              <div className="space-y-2">
                {[
                  { key: 'forcedCaptures', label: '🎯 Обязательное взятие', desc: 'Если можно съесть — только взятие', always: true },
                  { key: 'captureBackwards', label: '🔄 Взятие назад', desc: 'Простая шашка ест назад', only: 'russian' },
                  { key: 'movedBackwards', label: '↩️ Ходить назад', desc: 'Простая шашка может ходить назад', only: 'russian' },
                  { key: 'flyingKings', label: '✈️ Летающая дамка', desc: 'Дамка ходит далеко', only: 'russian' },
                  { key: 'fastKings', label: '⚡ Мгновенная дамка', desc: 'Превращение сразу при входе', always: true },
                ].map(rule => {
                  const disabled = rule.only && modeValue !== rule.only;
                  const checked = rulesState[rule.key as keyof typeof rulesState];
                  return (
                    <label key={rule.key} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      disabled ? 'opacity-50 cursor-not-allowed bg-gray-800/30 border-gray-700' :
                      checked ? (rule.warning ? 'bg-red-500/10 border-red-500/30' : 'bg-mushroom-neon/5 border-mushroom-neon/30') :
                      'bg-white/5 border-white/10 hover:border-white/30'
                    }`}>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          {rule.label}
                          {rule.warning && <AlertCircle size={14} className="text-red-400" />}
                        </div>
                        <div className="text-xs text-gray-500">{rule.desc}</div>
                        {rule.only && <span className="text-[10px] text-gray-600 mt-1 block">Только в "{rule.only === 'russian' ? 'Русские' : 'Классика'}"</span>}
                      </div>
                      <input type="checkbox" checked={checked} disabled={disabled}
                        onChange={(e) => { setRulesState(s => ({...s, [rule.key]: e.target.checked})); }}
                        className="w-5 h-5 rounded accent-mushroom-neon disabled:opacity-50" />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Timer */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                <Timer size={16} className="text-red-400" /> Время
              </label>
              <div className="flex items-center gap-4">
                <input type="range" min="60" max="1800" step="60" value={timerValue}
                  onChange={(e) => { const v = parseInt(e.target.value); setTimerValue(v); settings.current.timer = v; }} className="flex-1 accent-mushroom-neon" />
                <span className="font-bold text-mushroom-neon min-w-[80px] text-center">
                  {Math.floor(timerValue / 60)}:{(timerValue % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Bet */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300 flex items-center gap-2">
                <Coins size={16} className="text-yellow-400" /> Ставка
              </label>
              <div className="flex items-center gap-4">
                <input type="range" min="1" max="100" step="1" value={betValue || 1}
                  onChange={(e) => { const v = parseInt(e.target.value); setBetValue(v); settings.current.bet = v; settings.current.hasBet = v > 0; }}
                  className="flex-1 accent-mushroom-neon" />
                <span className="font-bold text-mushroom-neon min-w-[70px] text-center">{betValue || 1} 🍄</span>
              </div>
            </div>

            <button onClick={createRoom} disabled={isCreating} className="btn-primary w-full py-4 text-lg font-bold flex items-center justify-center gap-3 disabled:opacity-50">
              {isCreating ? <Loader2 className="animate-spin" size={20} /> : <Users size={20} />} Создать комнату
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ========== ERROR / LOADING ==========
  if (error) return (
    <div className="pt-24 flex flex-col items-center justify-center min-h-screen px-4">
      <AlertCircle className="text-red-400 mb-4" size={48} />
      <p className="text-xl text-red-400 mb-4 text-center">{error}</p>
      <button onClick={() => navigate('/play')} className="btn-primary">В лобби</button>
    </div>
  );
  if (!room) return (
    <div className="pt-24 flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-mushroom-neon mb-4" size={40} />
      <p className="text-gray-400">Загрузка...</p>
    </div>
  );

  // ========== GAME UI ==========
  const myTurn = turn === myColorRef.current && !winner && room.status === 'playing';
  const wCnt = countPieces(board, 'w'), bCnt = countPieces(board, 'b');
  const mins = Math.floor(timeLeft / 60), secs = timeLeft % 60;
  const resetByOther = room.reset_requested_by && room.reset_requested_by !== user?.id;
  const rules = room.rules;

  return (
    <div className="pt-20 pb-8 px-2 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => winner || room.status !== 'playing' ? navigate('/play') : surrender()}
          className="text-gray-400 hover:text-white flex items-center gap-2 text-sm">
          <ArrowLeft size={18} /> {winner || room.status !== 'playing' ? 'В лобби' : 'Сдаться'}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowRules(!showRules)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white" title="Правила">
            <Info size={18} />
          </button>
          <span className="font-bold gradient-text text-sm flex items-center gap-1">
            <Crown size={16} className="text-yellow-400" /> Шашки
          </span>
        </div>
        {room.status === 'playing' && !winner && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${timeLeft < 60 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 text-gray-400'}`}>
            <Timer size={14} /><span className="font-mono font-bold">{mins}:{secs.toString().padStart(2, '0')}</span>
          </div>
        )}
      </div>

      {/* Rules Info */}
      <AnimatePresence>
        {showRules && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
            <div className="glass-card p-4 text-sm text-gray-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-white mb-2">
                <Sparkles size={16} className="text-mushroom-neon" />
                {rules.mode === 'russian' ? '🇷🇺 Русские' : '🏛️ Классика'}
              </div>
              <ul className="space-y-1 text-xs">
                {rules.forcedCaptures && <li>🎯 Обязательное взятие</li>}
                {rules.captureBackwards && <li>🔄 Ест назад</li>}
                {rules.movedBackwards && <li>↩️ Ходит назад</li>}
                {rules.flyingKings && <li>✈️ Летающая дамка</li>}
                {rules.fastKings && <li>⚡ Мгновенная дамка</li>}
                <li>👑 Дамка = корона</li>
                <li>⏱️ Время: {Math.floor(room.timer_seconds / 60)} мин</li>
                {room.has_bet && <li className="text-yellow-400">💰 Ставка: {room.bet} 🍄</li>}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Room Info */}
      <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5 mb-4">
        <span className="text-xs text-gray-500 font-mono">ID: {roomId?.slice(0, 14)}...</span>
        <button onClick={copyInvite} className="text-xs text-mushroom-neon flex items-center gap-1.5 hover:underline">
          {copied ? <><CheckCircle size={12} /> Скопировано!</> : <><Copy size={12} /> Пригласить</>}
        </button>
      </div>

      {/* Waiting */}
      {!room.player_black && room.status === 'waiting' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-6 mb-4 text-center">
          <Users size={32} className="mx-auto text-gray-500 mb-3" />
          <p className="text-gray-300 font-medium">Ожидание игрока...</p>
          {room.has_bet && <p className="text-mushroom-neon text-sm mt-2 flex items-center justify-center gap-1"><Coins size={14} /> Ставка: {room.bet} 🍄</p>}
          <button onClick={() => navigate('/play')} className="mt-4 text-sm text-gray-400 hover:text-white">Отменить</button>
        </motion.div>
      )}

      {/* Players */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className={`p-4 rounded-xl transition-all ${myColorRef.current === 'w' ? 'bg-mushroom-neon/10 border-2 border-mushroom-neon/40' : 'bg-white/5 border border-white/10'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white to-gray-300 border-2 border-gray-400 flex items-center justify-center"><span className="text-[10px] font-bold text-gray-700">⚪</span></div>
            <span className="text-xs text-gray-400">Белые</span>
          </div>
          <p className="font-bold text-sm truncate">{room.player_white_name}</p>
          <p className="text-xs text-gray-500 mt-1">🪙 {wCnt}</p>
          {turn === 'w' && !winner && room.status === 'playing' && <p className="text-xs text-mushroom-neon font-bold mt-2 flex items-center gap-1 animate-pulse"><Zap size={12} /> Ход</p>}
        </div>
        <div className={`p-4 rounded-xl transition-all ${myColorRef.current === 'b' ? 'bg-mushroom-neon/10 border-2 border-mushroom-neon/40' : 'bg-white/5 border border-white/10'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-600 to-black border-2 border-gray-600 flex items-center justify-center"><span className="text-[10px] font-bold text-gray-300">⚫</span></div>
            <span className="text-xs text-gray-400">Чёрные</span>
          </div>
          <p className="font-bold text-sm truncate">{room.player_black_name || 'Ожидание...'}</p>
          <p className="text-xs text-gray-500 mt-1">🪙 {bCnt}</p>
          {turn === 'b' && !winner && room.status === 'playing' && <p className="text-xs text-mushroom-neon font-bold mt-2 flex items-center gap-1 animate-pulse"><Zap size={12} /> Ход</p>}
        </div>
      </div>

      {/* Status */}
      <div className="text-center mb-4 min-h-[2rem]">
        {winner ? (
          <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-2xl font-bold flex items-center justify-center gap-2">
            {winner === myColorRef.current ? <><Trophy className="text-yellow-400" /> Победа! +{room.bet} 🍄</> : <><AlertCircle className="text-red-400" /> Поражение</>}
          </motion.span>
        ) : myTurn ? (
          <p className="text-mushroom-neon font-bold text-lg animate-pulse">✨ Ваш ход!</p>
        ) : room.status === 'waiting' ? (
          <p className="text-yellow-400">⏳ Ожидание...</p>
        ) : (
          <p className="text-gray-400">🔄 Ход соперника...</p>
        )}
      </div>

      {/* Board */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl shadow-2xl overflow-hidden border-4 border-amber-900/50 mx-auto relative bg-amber-950" style={{ aspectRatio: '1/1', maxWidth: '100%' }}>
        
        {/* Coordinates */}
        <div className="absolute top-0 left-4 right-4 flex z-20 pointer-events-none">
          {(flipped ? [...COORDS].reverse() : COORDS).map(l => <div key={l} className="flex-1 text-center text-[10px] text-amber-200/50 font-bold py-1">{l}</div>)}
        </div>
        <div className="absolute top-4 bottom-4 left-0 flex flex-col z-20 pointer-events-none">
          {(flipped ? Array.from({length:8},(_,i)=>i+1) : Array.from({length:8},(_,i)=>8-i)).map(n => <div key={n} className="flex-1 flex items-center justify-end pr-1 text-[10px] text-amber-200/50 font-bold">{n}</div>)}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-8 w-full h-full pt-6 pl-6">
          {Array.from({length: BOARD_SIZE}, (_,dr) => Array.from({length: BOARD_SIZE}, (_,dc) => {
            const r = flipped ? BOARD_SIZE-1-dr : dr, c = flipped ? BOARD_SIZE-1-dc : dc;
            const piece = board[r][c];
            const isDark = (r+c)%2===1;
            const isSelected = selected?.[0]===r && selected?.[1]===c;
            const isValid = validMoves.some(m=>m.to[0]===r&&m.to[1]===c);
            const isMine = piece?.color===myColorRef.current && myTurn && room.status==='playing';
            const isCapture = validMoves.some(m=>m.to[0]===r&&m.to[1]===c&&m.isJump);

            return (
              <div key={`${r}-${c}`} className={`relative flex items-center justify-center transition-colors ${isDark?'bg-[#8B6F47]':'bg-[#E8D5B7]'} ${isSelected?'ring-4 ring-inset ring-mushroom-neon/60 z-10':''}`} style={{aspectRatio:'1/1'}} onClick={()=>isDark&&handleSquareClick(r,c)}>
                {/* Valid move */}
                {isValid && <motion.div initial={{scale:0}} animate={{scale:1}} className={`absolute inset-0 flex items-center justify-center z-10 ${isCapture?'':'pointer-events-none'}`}>
                  <div className={`w-[40%] h-[40%] rounded-full ${isCapture?'bg-red-500/60 ring-2 ring-red-400/50 animate-pulse':'bg-green-500/50 ring-2 ring-green-400/30'}`} />
                </motion.div>}
                
                {/* Piece */}
                {piece && (
                  <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}}
                    className={`rounded-full flex items-center justify-center transition-all ${isMine?'cursor-pointer hover:scale-110 active:scale-95':''} ${isSelected?'ring-4 ring-mushroom-neon ring-offset-2 z-20':''}`}
                    style={{width:'85%',height:'85%'}}
                  >
                    <div className={`w-full h-full rounded-full flex items-center justify-center shadow-lg border-2 ${piece.color==='w'?'bg-gradient-to-br from-white via-gray-100 to-gray-300 border-gray-400':'bg-gradient-to-br from-gray-700 via-gray-800 to-black border-gray-600'}`}>
                      {piece.type==='king' && <Crown className={piece.color==='w'?'text-yellow-700':'text-yellow-400'} size={20} />}
                    </div>
                  </motion.div>
                )}
              </div>
            );
          }))}
        </div>
      </motion.div>

      {/* Captured */}
      <div className="flex justify-between px-4 py-3 mt-3 text-xs text-gray-500 bg-white/5 rounded-xl">
        <span>⚪ Съели: <b className="text-mushroom-neon">{12-wCnt}</b></span>
        <span>⚫ Съели: <b className="text-mushroom-neon">{12-bCnt}</b></span>
      </div>

      {/* Controls */}
      {winner ? (
        <motion.button initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} onClick={()=>navigate('/play')} className="btn-primary w-full mt-4 py-4 text-lg font-bold flex items-center justify-center gap-2">
          <RotateCcw size={20} /> В лобби
        </motion.button>
      ) : room.status==='playing' && !winner && myColorRef.current ? (
        <div className="flex gap-3 mt-4">
          <button onClick={surrender} className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-medium border border-red-500/20 flex items-center justify-center gap-2">
            <Flag size={16} /> Сдаться
          </button>
          <button onClick={requestReset} className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${room.reset_requested_by===user?.id?'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse':resetByOther?'bg-green-500/20 text-green-400 border border-green-500/30':'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`}>
            <RotateCcw size={16} /> {room.reset_requested_by===user?.id?'Ждём...':resetByOther?'✓ Принять':'Сбросить'}
          </button>
        </div>
      ) : null}

      {/* 🔥 Fuk Penalty Confirmation Modal */}
      <AnimatePresence>
        {showFukConfirm && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={()=>setShowFukConfirm(null)}>
            <motion.div initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} exit={{scale:0.9,y:20}} onClick={e=>e.stopPropagation()} className="glass-card p-6 max-w-sm w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Skull className="text-red-400" size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Взять за фук?</h3>
                  <p className="text-sm text-gray-400">Соперник не съел, когда мог</p>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4 mb-4 text-center">
                <p className="text-gray-300 text-sm mb-2">Шашка будет <span className="text-red-400 font-bold">снята с доски</span></p>
                <p className="text-xs text-gray-500">Ход перейдёт к вам после наказания</p>
              </div>

              <div className="flex gap-3">
                <button onClick={()=>setShowFukConfirm(null)} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-medium">Отмена</button>
                <button onClick={()=>executeFukPenalty(showFukConfirm.pos)} className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-xl text-white font-bold flex items-center justify-center gap-2">
                  <Hand size={18} /> Взять!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-card p-6 flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-mushroom-neon" size={32} />
            <p className="text-gray-300">Обработка...</p>
          </div>
        </div>
      )}
    </div>
  );
} 