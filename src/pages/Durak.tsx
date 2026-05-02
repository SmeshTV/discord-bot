console.log('DURAK_FILE_V8_FIXED_LOADED');

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, ArrowLeft, Copy, CheckCircle, Loader2,
  Users, Flag, Coins, Play, Eye, EyeOff,
  Timer, Plus, Search, Globe, X, Lock
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getCached, setCached } from '../lib/cache';
import { addToast } from '../components/NotificationToast';

// ========== TYPES ==========
type CardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type CardRank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
type GameMode = 'podkidnoy' | 'perevodnoy' | 'prostoi';

interface Card {
  suit: CardSuit;
  rank: CardRank;
  id: string;
}

interface TableEntry {
  attackCard: Card;
  defendCard: Card | null;
  isBluff: boolean;
  realCard: Card | null;
  isConverted: boolean;
}

interface Player {
  id: string;
  name: string;
  hand: Card[];
}

interface DurakRoom {
  id: string;
  name: string;
  host_id: string;
  host_name: string;
  players: Player[];
  deck: Card[];
  trump_suit: CardSuit | null;
  trump_card: Card | null;
  table_state: TableEntry[];
  attacker_idx: number;
  defender_idx: number;
  next_player_idx: number;
  status: 'waiting' | 'playing' | 'finished' | 'abandoned';
  winner: string | null;
  loser: string | null;
  bet: number;
  has_bet: boolean;
  mode: GameMode;
  max_players: number;
  timer_enabled: boolean;
  timer_seconds: number;
  current_turn_time: number;
  is_private: boolean;
  allow_bluff: boolean;
  auto_take: boolean;
  created_at: string;
  last_activity: string;
  waiting_for_bito: boolean;
}

// ========== CONSTANTS ==========
const SUITS: CardSuit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: CardRank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUE: {CardRank, number} = {
  '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};
const SUIT_SYMBOL: {CardSuit, string} = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠'
};
const SUIT_COLOR: {CardSuit, string} = {
  hearts: 'text-red-500', diamonds: 'text-red-500',
  clubs: 'text-gray-800', spades: 'text-gray-800'
};

// ========== HELPERS ==========
const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}${suit[0]}-${Math.random().toString(36).slice(2, 8)}` });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const cardId = (card: Card): string => `${card.rank}${card.suit[0]}`;

const canBeat = (attack: Card, defend: Card, trump: CardSuit): boolean => {
  if (defend.suit === attack.suit) return RANK_VALUE[defend.rank] > RANK_VALUE[attack.rank];
  return defend.suit === trump && attack.suit !== trump;
};

const getTableRanks = (table: TableEntry[]): CardRank[] => {
  const ranks: CardRank[] = [];
  for (const e of table) {
    ranks.push(e.attackCard.rank);
    if (e.defendCard) ranks.push(e.defendCard.rank);
  }
  return [...new Set(ranks)];
};

const canToss = (card: Card, table: TableEntry[], maxToss: number = 6): boolean => {
  if (table.length === 0) return true;
  if (table.length >= maxToss) return false;
  return getTableRanks(table).includes(card.rank);
};

// ========== CARD COMPONENT ==========
const CardView = ({ 
  card, onClick, disabled, selected, showBack = false, isTrump = false, size = 'normal' 
}: {
  card?: Card; onClick?: () => void; disabled?: boolean; selected?: boolean;
  showBack?: boolean; isTrump?: boolean; size?: 'small' | 'normal' | 'large';
}) => {
  const sizes = { small: 'w-10 h-14 text-xs', normal: 'w-14 h-20 text-sm', large: 'w-16 h-24 text-base' };
  
  if (!card || showBack) {
    return (
      <div className={`${sizes[size]} rounded-lg border-2 border-blue-700 bg-gradient-to-br from-blue-600 to-blue-800 shadow-md flex items-center justify-center ${disabled ? 'opacity-50' : ''}`}>
        <span className="text-blue-300 font-bold text-lg">🂠</span>
      </div>
    );
  }

  const color = SUIT_COLOR[card.suit];
  return (
    <motion.button
      whileHover={!disabled ? { y: -4, scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`relative ${sizes[size]} rounded-lg border-2 shadow-md flex flex-col items-center justify-center select-none bg-white transition-all duration-150
        ${selected ? 'ring-4 ring-yellow-400 -translate-y-4 scale-110 z-10' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}
        ${isTrump ? 'ring-1 ring-yellow-500/40' : ''}`}
    >
      {isTrump && <Crown className="absolute -top-2 -right-2 text-yellow-500 drop-shadow" size={12} />}
      <span className={`${color} absolute top-1 left-1 font-bold leading-none`}>{SUIT_SYMBOL[card.suit]}</span>
      <span className={`${color} font-bold`}>{card.rank}</span>
      <span className={`${color} absolute bottom-1 right-1 font-bold leading-none rotate-180`}>{SUIT_SYMBOL[card.suit]}</span>
    </motion.button>
  );
};

// ========== MAIN COMPONENT ==========
export default function DurakOnline() {
  const isDisabled = false;
  const { user, loading: authLoading } = useAuth();
  const [rooms, setRooms] = useState<DurakRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<DurakRoom | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTrump, setShowTrump] = useState(true);
  const [filterMode, setFilterMode] = useState<GameMode | 'all'>('all');

  const [roomSettings, setRoomSettings] = useState({
    name: '', bet: 1, isPrivate: false,
    mode: 'podkidnoy' as GameMode, maxPlayers: 2,
    timerEnabled: true, timerSeconds: 30,
    allowBluff: true, autoTake: false, firstAttack: 'random',
  });

  // Load rooms
  const loadRooms = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('durak_rooms')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        const toDelete = data
          .filter(r => r.status === 'waiting' && (!r.players || r.players.length < 2))
          .map(r => r.id);
        if (toDelete.length > 0) {
          await supabase.from('durak_rooms').delete().in('id', toDelete);
        }
      }
      
      const active = (data || []).filter(r => 
        r.status === 'waiting' &&
        r.players && r.players.length >= 2 &&
        r.players.length < r.max_players &&
        !(new Date(r.created_at) < new Date(Date.now() - 10*60*1000))
      );
      
      setRooms(active);
      setCached('durak_rooms', active);
    } catch (e: any) {
      console.error('Load rooms error:', e);
      addToast({title:'❌ Ошибка загрузки', message:e.message, icon:'❌', duration:4000});
    }
  }, []);

  useEffect(() => {
    if (!user || authLoading) return;
    loadRooms();
    
    const ch = supabase.channel('durak_public')
      .on('postgres_changes', {event:'*', schema:'public', table:'durak_rooms'}, loadRooms)
      .subscribe();
    
    return () => { supabase.removeChannel(ch); };
  }, [user, authLoading, loadRooms]);

  // Room polling
  useEffect(() => {
    if (!activeRoom?.id) return;
    
    const poll = setInterval(async () => {
      try {
        const { data } = await supabase.from('durak_rooms').select('*').eq('id', activeRoom.id).maybeSingle();
        if (data) setActiveRoom(data);
      } catch(e) { console.error('Poll error:', e); }
    }, 2000);

    const ch = supabase.channel(`durak-${activeRoom.id}`)
      .on('postgres_changes', {event:'*', schema:'public', table:'durak_rooms', filter:`id=eq.${activeRoom.id}`}, 
        (p) => setActiveRoom(p.new as DurakRoom))
      .subscribe();

    return () => { clearInterval(poll); supabase.removeChannel(ch); };
  }, [activeRoom?.id]);

  // Timer
  useEffect(() => {
    if (!activeRoom || activeRoom.status !== 'playing' || !activeRoom.timer_enabled) return;
    if (activeRoom.current_turn_time <= 0) {
      handleTimeout();
      return;
    }
    const t = setInterval(() => {
      setActiveRoom(prev => prev ? {...prev, current_turn_time: prev.current_turn_time - 1} : null);
    }, 1000);
    return () => clearInterval(t);
  }, [activeRoom?.current_turn_time, activeRoom?.status, activeRoom?.timer_enabled]);

  // ========== ACTIONS ==========
  const createRoom = async () => {
    if (!roomSettings.name.trim() || !user) return;
    setActionLoading(true);
    
    const id = `durak-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const { data, error } = await supabase.from('durak_rooms').insert([{
      id, name: roomSettings.name.trim(), host_id: user.id, host_name: user.username,
      players: [{id:user.id, name:user.username, hand:[]}],
      deck: [], trump_suit: null, trump_card: null, table_state: [],
      attacker_idx: 0, defender_idx: 1, next_player_idx: 2,
      status: 'waiting', winner: null, loser: null,
      bet: roomSettings.bet, has_bet: roomSettings.bet > 0,
      mode: roomSettings.mode, max_players: roomSettings.maxPlayers,
      timer_enabled: roomSettings.timerEnabled, timer_seconds: roomSettings.timerSeconds,
      current_turn_time: roomSettings.timerSeconds,
      is_private: roomSettings.isPrivate,
      allow_bluff: roomSettings.allowBluff,
      auto_take: roomSettings.autoTake,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      waiting_for_bito: false
    }]).select().single();

    if (error) {
      addToast({title:'❌ Ошибка создания', message:error.message, icon:'❌', duration:5000});
    } else if (data) {
      setActiveRoom(data);
      setShowCreate(false);
    }
    setActionLoading(false);
  };

  const joinRoom = async (room: DurakRoom) => {
    if (!user) return addToast({title:'❌ Войдите', message:'', icon:'❌', duration:3000});
    if (room.status !== 'waiting') return addToast({title:'❌ Игра уже идёт', message:'', icon:'❌', duration:3000});
    if (!room.players || (room.players as any[]).length >= room.max_players) return addToast({title:'❌ Комната заполнена', message:'', icon:'❌', duration:3000});
    if (room.players?.some((p: any) => p.id === user.id)) {
      setActiveRoom(room);
      return;
    }

    // Проверка грибов
    if (room.has_bet && room.bet > 0 && user.mushrooms < room.bet) {
      return addToast({title:'❌ Недостаточно грибов', message: `Нужно ${room.bet} 🍄, у вас ${user.mushrooms} 🍄`, icon:'❌', duration:3000});
    }

    const newPlayers = [...(room.players || []), {id: user.id, name: user.username, hand: []}];
    
    const { data, error } = await supabase
      .from('durak_rooms')
      .update({ 
        players: newPlayers,
        last_activity: new Date().toISOString()
      })
      .eq('id', room.id)
      .eq('status', 'waiting')
      .select()
      .single();

    if (error) {
      console.error('Join room error:', error);
      return addToast({title:'❌ Ошибка', message: error.message || 'Не удалось присоединиться', icon:'❌', duration:3000});
    }
    
    if (data) setActiveRoom(data);
    else addToast({title:'❌ Ошибка', message: 'Комната уже не доступна', icon:'❌', duration:3000});
    setShowJoin(false); setJoinCode('');
  };

  const startGame = async () => {
    if (!activeRoom || !activeRoom.players || activeRoom.players.length < 2) {
      addToast({title:'❌ Нужно 2 игрока', message:'', icon:'❌', duration:3000});
      return;
    }
    setActionLoading(true);

    const deck = createDeck();
    const players = activeRoom.players.map(p => ({...p, hand: [] as Card[]}));
    for (let i = 0; i < 6; i++) {
      for (const p of players) {
        if (deck.length > 0) p.hand.push(deck.shift()!);
      }
    }

    const trumpCard = deck[0];
    let attIdx = 0, minVal = 99;
    players.forEach((p, i) => {
      p.hand.forEach(c => {
        if (c.suit === trumpCard.suit && RANK_VALUE[c.rank] < minVal) {
          minVal = RANK_VALUE[c.rank];
          attIdx = i;
        }
      });
    });
    if (players[attIdx].hand.length === 0) attIdx = 0;

    const { error } = await supabase.from('durak_rooms').update({
      deck, trump_suit: trumpCard.suit, trump_card: trumpCard, table_state: [],
      players, attacker_idx: attIdx,
      defender_idx: (attIdx + 1) % players.length,
      next_player_idx: (attIdx + 2) % players.length,
      status: 'playing', current_turn_time: activeRoom.timer_seconds,
      last_activity: new Date().toISOString(), waiting_for_bito: false
    }).eq('id', activeRoom.id);

    if (error) {
      addToast({title:'❌ Ошибка', message:error.message, icon:'❌', duration:3000});
    }
    setActionLoading(false);
  };

  const playCard = async (card: Card, action: 'attack'|'defend'|'toss') => {
    if (!activeRoom || !user || actionLoading) return;
    const myIdx = activeRoom.players.findIndex(p => p.id === user.id);
    const player = activeRoom.players[myIdx];
    if (!player || activeRoom.status !== 'playing') return;

    const isAttacker = myIdx === activeRoom.attacker_idx;
    const isDefender = myIdx === activeRoom.defender_idx;
    if (!isAttacker && !isDefender) return;

    if (action==='attack' && activeRoom.table_state.length!==0) return;
    if (action==='toss' && !canToss(card, activeRoom.table_state)) return;
    if (action==='defend') {
      const undef = activeRoom.table_state.find(t => !t.defendCard);
      if (!undef || !canBeat(undef.attackCard, card, activeRoom.trump_suit!)) return;
    }

    setActionLoading(true);
    const newPlayers = activeRoom.players.map(p => ({...p, hand:[...p.hand]}));
    const newTable = [...activeRoom.table_state];
    const newDeck = [...activeRoom.deck];
    const me = newPlayers[myIdx];
    me.hand = me.hand.filter(c => c.id !== card.id);

    if (action === 'attack') {
      newTable.push({attackCard:card, defendCard:null, isBluff:false, realCard:null, isConverted:false});
    } else if (action === 'toss') {
      newTable.push({attackCard:card, defendCard:null, isBluff:false, realCard:null, isConverted:false});
    } else {
      const idx = newTable.findIndex(t => !t.defendCard);
      if (idx !== -1) newTable[idx] = {...newTable[idx], defendCard:card};
    }

    for (let i=0; i<newPlayers.length; i++) {
      const idx = (activeRoom.attacker_idx + i) % newPlayers.length;
      while (newPlayers[idx].hand.length < 6 && newDeck.length > 0) newPlayers[idx].hand.push(newDeck.shift()!);
    }

    let winner: string|null = null, loser: string|null = null;
    if (newDeck.length === 0) {
      const withCards = newPlayers.filter(p => p.hand.length > 0);
      if (withCards.length === 1) { loser = withCards[0].id; winner = newPlayers.find(p => p.id !== loser)?.id || null; }
    }

    const allDef = newTable.length > 0 && newTable.every(t => t.defendCard);
    await supabase.from('durak_rooms').update({
      players: newPlayers, deck: newDeck, table_state: newTable,
      trump_card: newDeck.length > 0 ? newDeck[0] : null,
      status: winner ? 'finished' : 'playing',
      winner, loser,
      current_turn_time: activeRoom.timer_seconds,
      last_activity: new Date().toISOString(),
      waiting_for_bito: allDef && !winner
    }).eq('id', activeRoom.id);
    setActionLoading(false);
  };

  const takeCards = async () => {
    if (!activeRoom || !user) return;
    const myIdx = activeRoom.players.findIndex(p => p.id === user.id);
    if (myIdx !== activeRoom.defender_idx) return;
    setActionLoading(true);

    const newPlayers = activeRoom.players.map(p => ({...p, hand:[...p.hand]}));
    const def = newPlayers[activeRoom.defender_idx];
    for (const t of activeRoom.table_state) {
      def.hand.push(t.attackCard);
      if (t.defendCard) def.hand.push(t.defendCard);
    }

    const newDeck = [...activeRoom.deck];
    for (let i=0; i<newPlayers.length; i++) {
      const idx = (activeRoom.attacker_idx + i) % newPlayers.length;
      while (newPlayers[idx].hand.length < 6 && newDeck.length > 0) newPlayers[idx].hand.push(newDeck.shift()!);
    }

    await supabase.from('durak_rooms').update({
      players: newPlayers, deck: newDeck, table_state: [],
      trump_card: newDeck.length > 0 ? newDeck[0] : null,
      waiting_for_bito: false,
      current_turn_time: activeRoom.timer_seconds,
      last_activity: new Date().toISOString()
    }).eq('id', activeRoom.id);
    setActionLoading(false);
  };

  const pressBito = async () => {
    if (!activeRoom || !activeRoom.waiting_for_bito) return;
    setActionLoading(true);

    const newPlayers = activeRoom.players.map(p => ({...p, hand:[...p.hand]}));
    const newDeck = [...activeRoom.deck];
    
    for (let i=0; i<newPlayers.length; i++) {
      const idx = (activeRoom.attacker_idx + i) % newPlayers.length;
      while (newPlayers[idx].hand.length < 6 && newDeck.length > 0) newPlayers[idx].hand.push(newDeck.shift()!);
    }

    const nextAtt = activeRoom.defender_idx;
    const nextDef = (activeRoom.defender_idx + 1) % newPlayers.length;
    const nextNext = (nextDef + 1) % newPlayers.length;

    let winner: string|null = null, loser: string|null = null;
    if (newDeck.length === 0) {
      const withCards = newPlayers.filter(p => p.hand.length > 0);
      if (withCards.length === 1) { loser = withCards[0].id; winner = newPlayers.find(p => p.id !== loser)?.id || null; }
    }

    await supabase.from('durak_rooms').update({
      players: newPlayers, deck: newDeck, table_state: [],
      trump_card: newDeck.length > 0 ? newDeck[0] : null,
      attacker_idx: nextAtt, defender_idx: nextDef, next_player_idx: nextNext,
      waiting_for_bito: false, status: winner ? 'finished' : 'playing',
      winner, loser,
      current_turn_time: activeRoom.timer_seconds,
      last_activity: new Date().toISOString()
    }).eq('id', activeRoom.id);
    setActionLoading(false);
  };

  const handleTimeout = async () => {
    if (!activeRoom) return;
    const defIdx = activeRoom.defender_idx;
    const myIdx = activeRoom.players.findIndex(p => p.id === user?.id);
    if (myIdx === defIdx) await takeCards();
    else await pressBito();
  };

  const leaveRoom = async () => {
    if (!activeRoom || !user) return;
    
    if (activeRoom.status === 'playing') {
      const confirmed = window.confirm('Покинуть игру? Это поражение.');
      if (!confirmed) return;
      
      const loserId = user.id;
      const winnerId = activeRoom.players.find(p => p.id !== user.id)?.id || '';
      
      await supabase.from('durak_rooms').update({
        status: 'finished', 
        loser: loserId, 
        winner: winnerId,
        last_activity: new Date().toISOString()
      }).eq('id', activeRoom.id);
    } else {
      const newPlayers = activeRoom.players.filter(p => p.id !== user.id);
      
      if (newPlayers.length < 2) {
        await supabase.from('durak_rooms').delete().eq('id', activeRoom.id);
        addToast({title:'⚠️ Комната закрыта', message:'Недостаточно игроков', icon:'⚠️', duration:3000});
      } else {
        await supabase.from('durak_rooms').update({
          players: newPlayers,
          last_activity: new Date().toISOString()
        }).eq('id', activeRoom.id);
      }
    }
    
    setActiveRoom(null);
  };

  // ========== DERIVED STATE ==========
  const myIdx = activeRoom ? activeRoom.players.findIndex(p => p.id === user?.id) : -1;
  const myPlayer = myIdx >= 0 ? activeRoom?.players[myIdx] : null;
  const isAttacker = myIdx === activeRoom?.attacker_idx;
  const isDefender = myIdx === activeRoom?.defender_idx;
  const isMyTurn = activeRoom?.status === 'playing' && myIdx >= 0 && (isAttacker || isDefender);

  const validMoves = useMemo(() => {
    if (!activeRoom || !isMyTurn || !myPlayer) return {attack:[] as Card[], defend:[] as Card[], toss:[] as Card[]};
    const v = {attack:[] as Card[], defend:[] as Card[], toss:[] as Card[]};
    if (isAttacker) {
      if (activeRoom.table_state.length === 0) v.attack = [...myPlayer.hand];
      else v.toss = myPlayer.hand.filter(c => canToss(c, activeRoom.table_state));
    } else if (isDefender) {
      const undef = activeRoom.table_state.find(t => !t.defendCard);
      if (undef) v.defend = myPlayer.hand.filter(c => canBeat(undef.attackCard, c, activeRoom.trump_suit!));
    }
    return v;
  }, [activeRoom, myPlayer, isMyTurn, isAttacker, isDefender]);

  const filteredRooms = filterMode === 'all' ? rooms : rooms.filter(r => r.mode === filterMode);

  // ========== RENDER ==========
  if (authLoading) return <div className="pt-24 flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-mushroom-neon" size={32}/></div>;
  if (!user) return <div className="pt-24 flex items-center justify-center min-h-screen text-xl text-gray-400">Войдите через Discord</div>;
  if (isDisabled) return (
    <div className="pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="glass-card p-12">
          <div className="text-6xl mb-6">🃏</div>
          <h1 className="text-4xl font-bold text-red-500 mb-4">Дурак временно недоступен</h1>
          <p className="text-gray-400 text-lg">Игра находится на техническом обслуживании.</p>
          <p className="text-gray-500 mt-2">Скоро вернёмся!</p>
          <a href="/play" className="btn-primary inline-flex items-center gap-2 mt-8">
            <ArrowLeft size={18} /> Вернуться к играм
          </a>
        </motion.div>
      </div>
    </div>
  );

  if (activeRoom) {
    return (
      <div className="pt-20 pb-8 px-2 max-w-3xl mx-auto select-none">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={leaveRoom} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm"><ArrowLeft size={18}/> Покинуть</button>
          <span className="font-bold gradient-text text-sm flex items-center gap-1"><Crown size={16} className="text-yellow-400"/> Дурак</span>
          <div className="flex items-center gap-2">
            {activeRoom.timer_enabled && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono ${activeRoom.current_turn_time < 10 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 text-gray-400'}`}>
                <Timer size={12}/> {activeRoom.current_turn_time}с
              </div>
            )}
            <button onClick={()=>setShowTrump(!showTrump)} className="text-gray-400 hover:text-white p-1">{showTrump ? <Eye size={16}/> : <EyeOff size={16}/>}</button>
          </div>
        </div>

        {/* Status */}
        {activeRoom.status === 'playing' && (
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} className="text-center mb-3 font-medium text-sm">
            {isMyTurn ? <span className="text-mushroom-neon">✨ Ваш ход</span> : 
             activeRoom.waiting_for_bito ? <span className="text-green-400 animate-pulse">⏳ Ожидание "Бито"...</span> : 
             <span className="text-gray-400">Ход соперника...</span>}
          </motion.div>
        )}

        {/* Waiting */}
        {activeRoom.status === 'waiting' && (
          <div className="glass-card p-6 mb-4 text-center">
            <Users size={32} className="mx-auto text-gray-500 mb-3"/>
            <p className="text-gray-300 font-medium mb-2">Ожидание ({activeRoom.players?.length || 0}/{activeRoom.max_players})</p>
            {activeRoom.has_bet && activeRoom.bet > 0 && <p className="text-yellow-400 text-sm mb-4">💰 {activeRoom.bet} 🍄</p>}
            {activeRoom.players && activeRoom.players.length >= 2 && myIdx >= 0 && (
              <button onClick={startGame} disabled={actionLoading} className="btn-primary flex items-center justify-center gap-2 mx-auto mb-3">
                {actionLoading ? <Loader2 className="animate-spin" size={16}/> : <Play size={16}/>} Начать
              </button>
            )}
            <button onClick={()=>{navigator.clipboard.writeText(activeRoom.id); setCopied(true); setTimeout(()=>setCopied(false),2000);}} 
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1 mx-auto">
              {copied ? <CheckCircle size={12}/> : <Copy size={12}/>} {copied ? 'Скопировано' : 'Код: '+activeRoom.id.slice(0,12)}
            </button>
          </div>
        )}

        {/* Opponents */}
        <div className="flex flex-wrap gap-3 mb-4 justify-center">
          {activeRoom.players.map((p,i) => {
            if (p.id === user?.id) return null;
            const isAtk = i === activeRoom.attacker_idx;
            const isDef = i === activeRoom.defender_idx;
            return (
              <div key={p.id} className="glass-card px-4 py-3 text-center min-w-[120px] border border-white/10">
                <div className="text-xs text-gray-400 mb-1">{p.name}</div>
                <div className="flex gap-0.5 justify-center my-1 flex-wrap max-w-[160px]">
                  {p.hand.map((_,ci) => <CardView key={ci} showBack size="small"/>)}
                </div>
                <div className="text-xs text-gray-500">{p.hand.length} карт</div>
                {activeRoom.status === 'playing' && (
                  <>
                    {isAtk && <div className="text-[10px] text-red-400 font-bold mt-1">⚔️</div>}
                    {isDef && <div className="text-[10px] text-blue-400 font-bold mt-1">🛡️</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Table */}
        {activeRoom.table_state.length > 0 && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="glass-card p-4 mb-4 min-h-[90px]">
            <div className="text-xs text-gray-500 mb-3 text-center">Стол</div>
            <div className="flex flex-wrap gap-4 justify-center items-center">
              {activeRoom.table_state.map((e,i) => (
                <div key={i} className="flex items-center gap-2">
                  <CardView card={e.attackCard} size="normal" isTrump={e.attackCard.suit===activeRoom.trump_suit}/>
                  {e.defendCard ? (
                    <><ArrowRight className="text-gray-500" size={18}/><CardView card={e.defendCard} size="normal" isTrump={e.defendCard.suit===activeRoom.trump_suit}/></>
                  ) : (
                    <><span className="text-gray-500 text-lg">→</span><div className="w-14 h-20 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center"><span className="text-gray-600 text-xs">?</span></div></>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Trump */}
        {(showTrump || activeRoom.status === 'playing') && activeRoom.trump_card && (
          <div className="text-center mb-4">
            <span className="text-xs text-gray-500 mr-2">Козырь:</span>
            <CardView card={activeRoom.trump_card} size="small"/>
            <span className={`ml-2 font-bold ${SUIT_COLOR[activeRoom.trump_suit!]}`}>{SUIT_SYMBOL[activeRoom.trump_suit!]}</span>
          </div>
        )}

        {/* Game Over */}
        {activeRoom.status === 'finished' && (
          <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="glass-card p-6 text-center mb-4">
            <div className="text-5xl mb-3">{activeRoom.winner === user?.id ? '🏆' : '💀'}</div>
            <h2 className="text-2xl font-bold mb-2">{activeRoom.winner === user?.id ? 'Победа!' : activeRoom.loser === user?.id ? 'Вы — дурак!' : 'Игра окончена'}</h2>
            <button onClick={leaveRoom} className="btn-primary mt-3">В лобби</button>
          </motion.div>
        )}

        {/* My Hand */}
        {myPlayer && activeRoom.status === 'playing' && !activeRoom.waiting_for_bito && (
          <div className="glass-card p-4 mb-4">
            <div className="text-xs text-gray-500 mb-3 text-center">Ваши карты</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {myPlayer.hand.map(card => {
                const canPlay = isAttacker 
                  ? (activeRoom.table_state.length===0 ? validMoves.attack.some(c=>c.id===card.id) : validMoves.toss.some(c=>c.id===card.id))
                  : validMoves.defend.some(c=>c.id===card.id);
                return (
                  <CardView key={card.id} card={card} onClick={()=>canPlay && playCard(card, isAttacker ? (activeRoom.table_state.length===0?'attack':'toss') : 'defend')} 
                    disabled={!canPlay || actionLoading} isTrump={card.suit===activeRoom.trump_suit} size="normal"/>
                );
              })}
            </div>
          </div>
        )}

        {/* Buttons */}
        {activeRoom.status === 'playing' && (
          <div className="flex flex-wrap gap-3 justify-center mb-4">
            {isDefender && !activeRoom.waiting_for_bito && activeRoom.table_state.some(t=>!t.defendCard) && (
              <button onClick={takeCards} disabled={actionLoading} className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium border border-red-500/30 flex items-center gap-2">
                <Hand size={16}/> Взять
              </button>
            )}
            {activeRoom.waiting_for_bito && (
              <button onClick={pressBito} disabled={actionLoading} className="px-6 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl font-bold border border-green-500/40 flex items-center gap-2 animate-pulse">
                <CheckCircle size={16}/> ✅ Бито
              </button>
            )}
            <button onClick={leaveRoom} className="px-6 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl font-medium border border-yellow-500/30 flex items-center gap-2">
              <Flag size={16}/> Сдаться
            </button>
          </div>
        )}

        {actionLoading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-6 flex flex-col items-center gap-2"><Loader2 className="animate-spin text-mushroom-neon" size={32}/><p className="text-gray-300">Ход...</p></div>
          </div>
        )}
      </div>
    );
  }

  // ========== LOBBY ==========
  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="mb-8">
          <h1 className="text-5xl font-bold gradient-text mb-2">🃏 Дурак Онлайн</h1>
          <p className="text-gray-400">Классическая карточная игра</p>
        </motion.div>

        <div className="flex gap-4 mb-8">
          <button onClick={()=>setShowCreate(true)} className="btn-primary flex-1 flex items-center justify-center gap-2"><Plus size={18}/> Создать</button>
          <button onClick={()=>setShowJoin(true)} className="btn-primary flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500"><Search size={18}/> Войти по коду</button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {[{id:'all',l:'Все'}, {id:'podkidnoy',l:'🃏 Подкидной'}, {id:'perevodnoy',l:'🔄 Переводной'}, {id:'prostoi',l:'⚔️ Простой'}].map(f => (
            <button key={f.id} onClick={()=>setFilterMode(f.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
                filterMode===f.id ? 'bg-mushroom-neon/20 text-mushroom-neon border border-mushroom-neon/30' : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
              }`}>{f.l}</button>
          ))}
        </div>

        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2"><Globe className="text-mushroom-neon" size={24}/> Комнаты ({filteredRooms.length})</h3>
        {filteredRooms.length > 0 ? (
          <div className="space-y-2">
            {filteredRooms.map(room => (
              <div key={room.id} className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🃏</span>
                  <div>
                    <p className="font-bold">{room.name}</p>
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                      {room.mode==='podkidnoy'?'🃏':room.mode==='perevodnoy'?'🔄':'⚔️'} {room.host_name || 'Хост'} • {room.players?.length || 0}/{room.max_players}
                      {room.has_bet && room.bet > 0 && <span className="text-yellow-400">• {room.bet}🍄</span>}
                    </p>
                  </div>
                </div>
                {room.status === 'waiting' && room.players && room.players.length < room.max_players ? (
                  <button onClick={()=>joinRoom(room)} className="btn-primary text-sm">Играть</button>
                ) : <span className="text-gray-500 text-sm">Играют</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-12 text-center"><Users className="mx-auto text-gray-500 mb-4" size={48}/><p className="text-xl text-gray-400 mb-2">Нет комнат</p><p className="text-gray-500">Создай первую!</p></div>
        )}
      </div>

{/* Create Modal */}
      <AnimatePresence>{showCreate && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setShowCreate(false)}>
          <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="glass-card p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-2xl font-bold">Создать комнату</h3><button onClick={()=>setShowCreate(false)} className="text-gray-400 hover:text-white"><X size={24}/></button></div>
            
            <div className="space-y-4">
              <div><label className="block text-gray-400 mb-2">Название</label><input type="text" value={roomSettings.name} onChange={e=>setRoomSettings({...roomSettings,name:e.target.value})} placeholder="Моя комната..." className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3"/></div>
              
              <div className="grid grid-cols-3 gap-2">
                {[{id:'podkidnoy', icon:'🃏', name:'Подкидной'}, {id:'perevodnoy', icon:'🔄', name:'Переводной'}, {id:'prostoi', icon:'⚔️', name:'Простой'}].map(m => (
                  <button key={m.id} onClick={()=>setRoomSettings({...roomSettings, mode:m.id as GameMode})}
                    className={`py-3 rounded-xl border-2 font-medium transition-all ${
                      roomSettings.mode===m.id ? 'border-mushroom-neon bg-mushroom-neon/10 text-mushroom-neon' : 'border-white/10 text-gray-400 hover:border-white/30'
                    }`}>
                    <span className="text-xl block mb-1">{m.icon}</span>
                    <span className="text-sm">{m.name}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-2 text-sm">Игроков</label>
                  <div className="flex gap-1">
                    {[2,3,4,5,6].map(n => (
                      <button key={n} onClick={()=>setRoomSettings({...roomSettings,maxPlayers:n})}
                        className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                          roomSettings.maxPlayers===n ? 'bg-mushroom-neon/20 text-mushroom-neon border border-mushroom-neon/30' : 'bg-white/5 text-gray-400 border border-transparent'
                        }`}>{n}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 mb-2 text-sm">Ставка (1-100) • Начальная ставка</label>
                  <input type="number" min="1" max="100" value={roomSettings.bet}
                    onChange={e=>setRoomSettings({...roomSettings,bet:Math.max(1,Math.min(100,parseInt(e.target.value)||1)),hasBet:true})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-center font-bold text-mushroom-neon"/>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-gray-400 mb-1 text-sm">Правила</label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={()=>setRoomSettings({...roomSettings, allowBluff:!roomSettings.allowBluff})}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      roomSettings.allowBluff ? 'bg-mushroom-neon/20 text-mushroom-neon border border-mushroom-neon/30' : 'bg-white/5 text-gray-400 border border-transparent'
                    }`}>🎭 Блеф</button>
                  <button onClick={()=>setRoomSettings({...roomSettings, autoTake:!roomSettings.autoTake})}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      roomSettings.autoTake ? 'bg-mushroom-neon/20 text-mushroom-neon border border-mushroom-neon/30' : 'bg-white/5 text-gray-400 border border-transparent'
                    }`}>⚡ Автовзятие</button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5">
                <div className="flex items-center gap-2"><Lock size={16}/> <span className="text-sm">Приватная</span></div>
                <button onClick={()=>setRoomSettings({...roomSettings,isPrivate:!roomSettings.isPrivate})}
                  className={`w-10 h-6 rounded-full transition-colors ${roomSettings.isPrivate?'bg-mushroom-neon':'bg-gray-600'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${roomSettings.isPrivate?'translate-x-5':'translate-x-1'}`}/>
                </button>
              </div>

              <button onClick={createRoom} disabled={!roomSettings.name.trim()||actionLoading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 py-3">{actionLoading?<Loader2 className="animate-spin" size={18}/>:<Play size={18}/>} Создать</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      {/* Join Modal */}
      <AnimatePresence>{showJoin && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setShowJoin(false)}>
          <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="glass-card p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h3 className="text-2xl font-bold">Войти по коду</h3><button onClick={()=>setShowJoin(false)} className="text-gray-400 hover:text-white"><X size={24}/></button></div>
            <div className="space-y-4">
              <div><label className="block text-gray-400 mb-2">Код комнаты</label><input type="text" value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="durak-..." className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3"/></div>
              <button onClick={async()=>{
                if(!joinCode.trim()) return;
                const {data} = await supabase.from('durak_rooms').select('*').eq('id',joinCode.trim()).maybeSingle();
                if(!data) return addToast({title:'❌ Не найдена',message:'Комната не существует',icon:'❌',duration:3000});
                if(data.status==='playing') return addToast({title:'❌ Игра уже идёт',message:'',icon:'❌',duration:3000});
                if(!data.players || data.players.length>=data.max_players) return addToast({title:'❌ Комната заполнена',message:'',icon:'❌',duration:3000});
                joinRoom(data);
              }} className="btn-primary w-full">Найти</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}