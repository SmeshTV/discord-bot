import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, X, ArrowLeft, Loader2, Trophy, Coins, Play, RotateCcw, Clock, Users, Crown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getCached, setCached } from '../lib/cache';
import { addToast } from '../components/NotificationToast';

// Карты и масти
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUE: { [key: string]: number } = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// Создание и перемешивание колоды
const createDeck = (): string[] => {
  const deck: string[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push(`${rank}${suit}`);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

// Правильная оценка покерных рук
const evaluateHand = (cards: string[]): { score: number; label: string; rank: number } => {
  if (cards.length < 5) return { score: 0, label: '...', rank: 0 };

  const ranks = cards.map(c => RANK_VALUE[c.slice(0, -1)] || 0);
  const suits = cards.map(c => c.slice(-1));
  
  // Подсчет комбинаций
  const rankCounts: { [key: number]: number } = {};
  ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
  
  const sortedRanks = Object.keys(rankCounts).map(Number).sort((a, b) => b - a);
  const values = Object.values(rankCounts);
  
  const isFlush = SUITS.some(s => suits.filter(x => x === s).length >= 5);
  
  // Проверка стрита
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b);
  let isStraight = false;
  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    if (uniqueRanks[i + 4] - uniqueRanks[i] === 4) { isStraight = true; break; }
  }
  // Проверка A-2-3-4-5
  if (!isStraight && uniqueRanks.includes(14) && uniqueRanks.includes(2) && 
      uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
    isStraight = true;
  }
  
  const hasFour = values.includes(4);
  const hasThree = values.includes(3);
  const pairs = values.filter(v => v === 2).length;
  const hasFullHouse = hasThree && pairs >= 1;
  
  // Роял-флеш
  if (isFlush && isStraight && Math.max(...ranks) === 14 && ranks.length >= 5) {
    const royalSuits = SUITS.filter(s => suits.filter(x => x === s).length >= 5);
    for (const s of royalSuits) {
      const flushCards = cards.filter(c => c.slice(-1) === s).map(c => RANK_VALUE[c.slice(0, -1)]);
      if (flushCards.includes(14) && flushCards.includes(13) && flushCards.includes(12) && 
          flushCards.includes(11) && flushCards.includes(10)) {
        return { score: 10000, label: 'Роял-флеш 👑', rank: 10 };
      }
    }
  }
  
  // Стрит-флеш
  if (isFlush && isStraight) return { score: 9000, label: 'Стрит-флеш', rank: 9 };
  if (hasFour) return { score: 8000, label: 'Каре', rank: 8 };
  if (hasFullHouse) return { score: 7000, label: 'Фулл-хаус', rank: 7 };
  if (isFlush) return { score: 6000, label: 'Флеш', rank: 6 };
  if (isStraight) return { score: 5000, label: 'Стрит', rank: 5 };
  if (hasThree) return { score: 4000, label: 'Тройка', rank: 4 };
  if (pairs >= 2) return { score: 3000, label: 'Две пары', rank: 3 };
  if (pairs === 1) return { score: 2000, label: 'Пара', rank: 2 };
  
  return { score: Math.max(...ranks), label: `Старшая: ${cards.find(c => RANK_VALUE[c.slice(0, -1)] === Math.max(...ranks))}`, rank: 1 };
};

interface PokerRoom {
  id: string;
  name: string;
  host_id: string;
  host_name: string;
  guests: string[];
  guest_names: string[];
  deck: string[];
  player_cards: { [key: string]: string[] };
  board_cards: string[];
  current_bet: number;
  pot: number;
  status: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';
  created_at: string;
  last_activity: string;
}

export default function Poker() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [rooms, setRooms] = useState<PokerRoom[]>(() => getCached('poker_rooms') || []);
  const [activeRoom, setActiveRoom] = useState<PokerRoom | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [newRoom, setNewRoom] = useState({ name: '', bet: 10 });
  const [creating, setCreating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startCountdown, setStartCountdown] = useState(0);
  const roomRef = useRef<PokerRoom | null>(null);

  useEffect(() => { roomRef.current = activeRoom; }, [activeRoom]);

  const loadRooms = useCallback(async () => {
    const { data } = await supabase.from('poker_rooms').select('*').order('created_at', { ascending: false });
    const active = (data || []).filter(r => r.status !== 'finished' && new Date(r.created_at) > new Date(Date.now() - 30 * 60 * 1000));
    setRooms(active);
    setCached('poker_rooms', active);
  }, []);

  useEffect(() => {
    if (!user || authLoading) return;
    loadRooms();
    const ch = supabase.channel('poker_public').on('postgres_changes', { event: '*', schema: 'public', table: 'poker_rooms' }, loadRooms).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, authLoading, loadRooms]);

  useEffect(() => {
    if (!activeRoom?.id) return;
    let cancelled = false;
    
    const ch = supabase.channel(`poker-${activeRoom.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_rooms', filter: `id=eq.${activeRoom.id}` }, async (payload) => {
        if (cancelled) return;
        const { data } = await supabase.from('poker_rooms').select('*').eq('id', activeRoom.id).single();
        if (data && !cancelled) setActiveRoom(data);
      })
      .subscribe();
    
    const poll = setInterval(async () => {
      if (cancelled || !user) return;
      const { data } = await supabase.from('poker_rooms').select('*').eq('id', activeRoom.id).single();
      if (data && !cancelled) setActiveRoom(data);
    }, 3000);
    
    return () => { cancelled = true; supabase.removeChannel(ch); clearInterval(poll); };
  }, [activeRoom?.id]);

  // Таймер для фаз игры
  useEffect(() => {
    if (!activeRoom) { setTimeLeft(0); return; }
    if (activeRoom.status === 'waiting' || activeRoom.status === 'finished') { setTimeLeft(0); return; }

    const stageTime = 30;
    setTimeLeft(stageTime);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleNextStage();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeRoom?.status]);

  const handleNextStage = async () => {
    const room = roomRef.current;
    if (!room || !user) return;
    
    const isHost = user.id === room.host_id;
    if (!isHost) {
      const lastActivity = new Date(room.last_activity || room.created_at);
      const secondsSince = (Date.now() - lastActivity.getTime()) / 1000;
      if (secondsSince < 30) return;
    }
    
    if (room.status === 'finished') return;

    const deck = [...room.deck];
    const board = [...room.board_cards];
    let nextStatus = room.status;

    if (room.status === 'preflop') {
      board.push(deck.pop()!, deck.pop()!, deck.pop()!);
      nextStatus = 'flop';
    } else if (room.status === 'flop') {
      board.push(deck.pop()!);
      nextStatus = 'turn';
    } else if (room.status === 'turn') {
      board.push(deck.pop()!);
      nextStatus = 'river';
    } else if (room.status === 'river') {
      nextStatus = 'showdown';
    }

    if (nextStatus === 'showdown') {
      let bestScore = -1;
      let winnerId = '';
      let winnerLabel = '';
      let winnerRank = 0;
      
      const pcObj = typeof room.player_cards === 'string' ? JSON.parse(room.player_cards) : room.player_cards;
      
      for (const pid of room.guests) {
        const pc = pcObj[pid] || [];
        const all = [...pc, ...board];
        const res = evaluateHand(all);
        if (res.score > bestScore) { 
          bestScore = res.score; 
          winnerId = pid; 
          winnerLabel = res.label;
          winnerRank = res.rank;
        }
      }
      
      if (winnerId) {
        await supabase.rpc('add_mushrooms', { user_id: winnerId, amount: room.pot });
        const guestNames = room.guest_names || [];
        const winnerIdx = room.guests.indexOf(winnerId);
        const winnerName = guestNames[winnerIdx] || 'Игрок';
        addToast({ title: `🏆 ${winnerName} выиграл!`, message: `Комбинация: ${winnerLabel} | +${room.pot} 🍄`, icon: '🏆', duration: 6000 });
      }
      
      await supabase.from('poker_rooms').update({ 
        status: 'finished', 
        board_cards: board, 
        deck 
      }).eq('id', room.id);
      
      setTimeout(() => setActiveRoom(null), 6000);
      refreshUser?.();
    } else {
      await supabase.from('poker_rooms').update({ 
        status: nextStatus, 
        board_cards: board, 
        deck,
        last_activity: new Date().toISOString()
      }).eq('id', room.id);
    }
  };

  const createRoom = async () => {
    if (creating || !newRoom.name.trim() || !user) return;
    setCreating(true);
    
    try {
      const { data: existingRooms } = await supabase
        .from('poker_rooms')
        .select('id')
        .eq('host_id', user.id)
        .eq('status', 'waiting')
        .limit(1);
       
      if (existingRooms && existingRooms.length > 0) {
        const { data: existingRoom } = await supabase
          .from('poker_rooms')
          .select('*')
          .eq('id', existingRooms[0].id)
          .single();
         
        if (existingRoom) {
          setActiveRoom(existingRoom);
          setShowCreate(false);
          addToast({ title: '✅ Вы уже создали комнату', message: 'Переходим в неё', icon: '✅', duration: 2000 });
        }
        return;
      }
       
      const id = `poker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const deck = createDeck();
      const myCards = [deck.pop()!, deck.pop()!];
       
      const { error } = await supabase.from('poker_rooms').insert([{
        id, name: newRoom.name.trim(), host_id: user.id, host_name: user.username,
        guests: [user.id], guest_names: [user.username], deck, board_cards: [],
        player_cards: JSON.stringify({ [user.id]: myCards }),
        current_bet: newRoom.bet, pot: 0, status: 'waiting',
        last_activity: new Date().toISOString()
      }]);
       
      if (!error) { 
        const { data } = await supabase.from('poker_rooms').select('*').eq('id', id).single();
        if (data) { setActiveRoom(data); setShowCreate(false); }
        else addToast({ title: '❌ Ошибка', message: 'Не удалось создать комнату', icon: '❌' });
      } else addToast({ title: '❌ Ошибка', message: error?.message, icon: '❌' });
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async (room: PokerRoom) => {
    if (!user) return addToast({ title: '❌ Войдите', message: '', icon: '❌' });
    
    const { data: freshRoom, error: fetchError } = await supabase
      .from('poker_rooms')
      .select('*')
      .eq('id', room.id)
      .single();
     
    if (fetchError || !freshRoom) return addToast({ title: '❌ Комната не найдена', message: '', icon: '❌' });
    if (freshRoom.status !== 'waiting') return addToast({ title: '❌ Игра уже идёт', message: '', icon: '❌' });
    if (freshRoom.guests.length >= 6) return addToast({ title: '❌ Стол полон', message: '', icon: '❌' });
    if (freshRoom.guests.includes(user.id)) { setActiveRoom(freshRoom); setShowJoin(false); return; }
     
    if (user.mushrooms < freshRoom.current_bet) {
      return addToast({ title: '❌ Недостаточно грибов', message: `Нужно ${freshRoom.current_bet} 🍄, у вас ${user.mushrooms} 🍄`, icon: '❌' });
    }
     
    const deck = [...freshRoom.deck];
    const myCards = [deck.pop()!, deck.pop()!];
    const existingCards = typeof freshRoom.player_cards === 'string' ? JSON.parse(freshRoom.player_cards) : (freshRoom.player_cards || {});
    const newPlayerCards = { ...existingCards, [user.id]: myCards };
     
    const { error } = await supabase.from('poker_rooms').update({
      guests: [...freshRoom.guests, user.id],
      guest_names: [...freshRoom.guest_names, user.username],
      player_cards: JSON.stringify(newPlayerCards),
      deck: deck,
      last_activity: new Date().toISOString()
    }).eq('id', room.id).eq('status', 'waiting');
     
    if (error) {
      return addToast({ title: '❌ Ошибка', message: error?.message || 'Не удалось присоединиться', icon: '❌' });
    }
     
    const { data } = await supabase.from('poker_rooms').select('*').eq('id', room.id).single();
    if (data) {
      setActiveRoom(data); setShowJoin(false); setJoinCode('');
      addToast({ title: '✅ Вы за столом!', message: '', icon: '✅', duration: 2000 });
       
      if (data.guests.length >= 2 && data.host_id !== user.id) {
        addToast({ title: '👥 2 игрока за столом!', message: 'Можно начинать', icon: '🎰', duration: 3000 });
      }
    }
  };

  const startGameNow = async () => {
    const room = roomRef.current;
    if (!room || !user) return;
    if (room.guests.length < 2) return addToast({ title: '❌ Нужно 2+ игроков', message: '', icon: '❌' });
     
    const deck = createDeck();
    const playerCards: { [key: string]: string[] } = {};
    for (const pid of room.guests) {
      playerCards[pid] = [deck.pop()!, deck.pop()!];
    }
     
    await supabase.from('poker_rooms').update({
      deck, player_cards: JSON.stringify(playerCards), board_cards: [], 
      pot: room.current_bet * room.guests.length, status: 'preflop',
      last_activity: new Date().toISOString()
    }).eq('id', room.id);
     
    const { data: updated } = await supabase.from('poker_rooms').select('*').eq('id', room.id).single();
    if (updated) setActiveRoom(updated);
    addToast({ title: '🎰 Игра началась!', message: 'Карты розданы', icon: '🃏' });
  };

  const initiateStart = async () => {
    if (!activeRoom || !user) return;
    if (user.id !== activeRoom.host_id) return;
    if (activeRoom.guests.length < 2) return addToast({ title: '❌ Нужно 2+ игроков', message: '', icon: '❌' });
     
    setStartCountdown(5);
    addToast({ title: '🎰 Игра начнется через 5 секунд!', message: 'Приготовьтесь', icon: '⏰', duration: 5000 });
  };

  const leaveRoom = async () => {
    if (!activeRoom || !user) return;
     
    const isHost = user.id === activeRoom.host_id;
    const newGuests = activeRoom.guests.filter(id => id !== user.id);
    const newGuestNames = activeRoom.guest_names.filter((_, i) => activeRoom.guests[i] !== user.id);
     
    const pcObj = typeof activeRoom.player_cards === 'string' ? JSON.parse(activeRoom.player_cards) : (activeRoom.player_cards || {});
    delete pcObj[user.id];
     
    let newHostId = activeRoom.host_id;
    let newHostName = activeRoom.host_name;
     
    if (isHost && newGuests.length > 0) {
      newHostId = newGuests[0];
      newHostName = newGuestNames[0];
      addToast({ title: '👑 Новый хост', message: `${newHostName} теперь хост`, icon: '👑', duration: 3000 });
    }
     
    if (newGuests.length < 2) {
      await supabase.from('poker_rooms').delete().eq('id', activeRoom.id);
    } else {
      await supabase.from('poker_rooms').update({
        guests: newGuests,
        guest_names: newGuestNames,
        host_id: newHostId,
        host_name: newHostName,
        player_cards: JSON.stringify(pcObj),
        last_activity: new Date().toISOString()
      }).eq('id', activeRoom.id);
    }
     
    setActiveRoom(null);
    loadRooms();
  };

  const myIdx = activeRoom ? activeRoom.guests.findIndex(id => id === user?.id) : -1;
  const isHost = user?.id === activeRoom?.host_id;
  const guestsCount = activeRoom?.guests.length || 0;

  if (authLoading) return null;
  if (!user) return <div className="pt-24 flex items-center justify-center min-h-screen text-xl text-gray-400">Войдите через Discord</div>;

  if (activeRoom) {
    return (
      <div className="pt-20 pb-8 px-2 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={leaveRoom} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm"><ArrowLeft size={18}/> Покинуть</button>
          <span className="font-bold gradient-text text-lg flex items-center gap-2"><Trophy size={20} className="text-yellow-400"/> {activeRoom.name}</span>
          <div className="flex items-center gap-3 text-sm">
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">Ставка: {activeRoom.current_bet} 🍄</span>
            <span className="px-3 py-1 bg-mushroom-neon/20 text-mushroom-neon rounded-full">Банк: {activeRoom.pot} 🍄</span>
          </div>
        </div>
        
        {activeRoom.status !== 'waiting' && activeRoom.status !== 'finished' && (
          <div className="mb-6 flex flex-col items-center">
             <div className={`text-4xl font-bold font-mono mb-1 ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
               {timeLeft}с
             </div>
             <div className="text-xs text-gray-500 uppercase tracking-widest">
               {activeRoom.status === 'preflop' ? 'Флоп' : activeRoom.status === 'flop' ? 'Тёрн' : activeRoom.status === 'turn' ? 'Ривер' : 'Вскрытие'}
             </div>
          </div>
        )}
        
        {startCountdown > 0 && (
          <div className="mb-6 flex flex-col items-center">
            <div className="text-4xl font-bold font-mono mb-1 text-yellow-400 animate-pulse">
              {startCountdown}с
            </div>
            <div className="text-xs text-yellow-400 uppercase tracking-widest">
              До начала игры...
            </div>
          </div>
        )}

        <div className="glass-card p-6 mb-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-green-900/10 to-transparent pointer-events-none" />
          <div className="text-xs text-gray-500 mb-4 uppercase tracking-widest">Общие карты</div>
          <div className="flex gap-3 justify-center min-h-[100px] items-center z-10 relative">
            {activeRoom.board_cards.length > 0 ? activeRoom.board_cards.map((c, i) => (
              <motion.div key={i} initial={{opacity:0, scale:0.5}} animate={{opacity:1, scale:1}} transition={{delay: i*0.1}} className="w-16 h-24 bg-white rounded-lg flex items-center justify-center text-2xl font-bold border-2 border-gray-300 shadow-lg">
                <span className={(c.includes('♥') || c.includes('♦')) ? 'text-red-500' : 'text-gray-900'}>{c}</span>
              </motion.div>
            )) : <span className="text-gray-600 text-sm">Ожидание раздачи...</span>}
          </div>
           
          <div className="mt-6 text-sm font-medium text-white bg-black/20 inline-block px-4 py-1 rounded-full">
            {activeRoom.status === 'preflop' && '🃏 Префлоп'}
            {activeRoom.status === 'flop' && '🌊 Флоп'}
            {activeRoom.status === 'turn' && '🔥 Тёрн'}
            {activeRoom.status === 'river' && '🌊 Ривер'}
            {activeRoom.status === 'showdown' && '🏆 Вскрытие'}
            {activeRoom.status === 'finished' && '✅ Игра окончена'}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {activeRoom.guests.map((pid, i) => {
            const isMe = pid === user?.id;
            const pcObj = typeof activeRoom.player_cards === 'string' ? JSON.parse(activeRoom.player_cards) : activeRoom.player_cards;
            const cards = pcObj?.[pid] || [];
            return (
              <motion.div key={pid} whileHover={{y:-5}} className={`p-4 rounded-xl border transition-all ${isMe ? 'border-mushroom-neon bg-mushroom-neon/10 ring-1 ring-mushroom-neon/50' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs ${isMe ? 'text-mushroom-neon font-bold' : 'text-gray-400'}`}>{isMe ? 'Вы' : activeRoom.guest_names[i]}</span>
                  {pid === activeRoom.host_id && <Crown size={14} className="text-yellow-400"/>}
                </div>
                <div className="flex gap-1 justify-center h-14 items-center">
                  {cards.map((c: string, j: number) => (
                    <div key={j} className={`w-10 h-14 rounded flex items-center justify-center text-sm font-bold border shadow-sm ${
                      isMe ? 'bg-white border-gray-300' : 'bg-gradient-to-br from-blue-700 to-blue-900 border-blue-600'
                    }`}>
                      {isMe ? <span className={(c.includes('♥') || c.includes('♦')) ? 'text-red-500' : 'text-gray-900'}>{c}</span> : '🂠'}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex gap-3 justify-center">
          {activeRoom.status === 'waiting' && isHost && guestsCount >= 2 && startCountdown === 0 && (
            <button onClick={initiateStart} className="btn-primary px-8 py-3 flex items-center gap-2 animate-pulse"><Play size={18}/> Начать раздачу</button>
          )}
          {activeRoom.status === 'waiting' && isHost && guestsCount < 2 && (
            <div className="text-yellow-400 text-sm">Ожидаем игроков... ({guestsCount}/2+)</div>
          )}
          {activeRoom.status === 'waiting' && !isHost && (
            <div className="text-yellow-400 text-sm">Ожидаем начала игры хостом...</div>
          )}
          {activeRoom.status === 'finished' && (
            <button onClick={() => setActiveRoom(null)} className="btn-primary px-8 py-3 flex items-center gap-2"><RotateCcw size={18}/> В лобби</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="mb-8">
          <h1 className="text-5xl font-bold gradient-text mb-2">🃏 Покер</h1>
          <p className="text-gray-400">Texas Hold'em. Садись и играй!</p>
        </motion.div>
        
        <div className="flex gap-4 mb-8">
          <button onClick={()=>setShowCreate(true)} className="btn-primary flex-1 flex items-center justify-center gap-2"><Plus size={18}/> Создать стол</button>
          <button onClick={()=>setShowJoin(true)} className="btn-primary flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500"><Search size={18}/> Присоединиться</button>
        </div>
        
        <div className="glass-card p-6 mb-8 flex items-center gap-6 border-l-4 border-mushroom-neon">
          <div className="text-6xl">🤖</div>
          <div>
            <h3 className="text-2xl font-bold mb-1">Авто-режим</h3>
            <p className="text-gray-400 text-sm">Хост нажимает "Начать", дальше игра идёт сама. 30 секунд на каждую улицу.</p>
          </div>
        </div>
        
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2"><Users className="text-mushroom-neon" size={24}/> Игровые столы</h3>
        {rooms.length > 0 ? (
          <div className="space-y-2">
            {rooms.map(room => (
              <div key={room.id} className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🎰</span>
                  <div>
                    <p className="font-bold">{room.name}</p>
                    <p className="text-sm text-gray-400">{room.host_name} • {room.guests.length}/6 • {room.current_bet} 🍄</p>
                  </div>
                </div>
                <button onClick={()=>joinRoom(room)} className="btn-primary text-sm">Сесть</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-12 text-center"><Users className="mx-auto text-gray-500 mb-4" size={48}/><p className="text-xl text-gray-400">Нет активных столов</p></div>
        )}
      </div>

      {/* Модалка создания */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setShowCreate(false)}>
            <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="glass-card p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6"><h3 className="text-2xl font-bold">Новый стол</h3><button onClick={()=>setShowCreate(false)} className="text-gray-400 hover:text-white"><X size={24}/></button></div>
              <div className="space-y-4">
                <div><label className="block text-gray-400 mb-2">Название</label><input type="text" value={newRoom.name} onChange={e=>setNewRoom({...newRoom,name:e.target.value})} placeholder="VIP Room..." className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3"/></div>
                <div><label className="block text-gray-400 mb-2">Ставка (1-100) • Начальная ставка: {newRoom.bet} 🍄</label><input type="range" min="1" max="100" step="1" value={newRoom.bet} onChange={e=>setNewRoom({...newRoom,bet:Math.max(1,parseInt(e.target.value)||1)})} className="w-full"/></div>
                <button onClick={createRoom} disabled={creating || !newRoom.name.trim()} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                  {creating ? <Loader2 className="animate-spin" size={18}/> : <Play size={18}/>} Создать
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модалка входа */}
      <AnimatePresence>
        {showJoin && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setShowJoin(false)}>
            <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="glass-card p-6 w-full max-w-md" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6"><h3 className="text-2xl font-bold">Код стола</h3><button onClick={()=>setShowJoin(false)} className="text-gray-400 hover:text-white"><X size={24}/></button></div>
              <div className="space-y-4">
                <input type="text" value={joinCode} onChange={e=>setJoinCode(e.target.value)} placeholder="poker-..." className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3"/>
                <button onClick={async()=>{if(!joinCode.trim())return;const{data}=await supabase.from('poker_rooms').select('*').eq('id',joinCode.trim()).maybeSingle();if(data)joinRoom(data);else addToast({title:'❌ Не найден',message:'',icon:'❌'});}} className="btn-primary w-full">Найти</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
