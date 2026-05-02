import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Copy, Play, Users, Globe, X, ArrowLeft, Loader2, Hand, Scissors, FileText, Trophy } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getCached, setCached } from '../lib/cache';

type RpsChoice = 'rock' | 'paper' | 'scissors';
type RoomStatus = 'waiting' | 'choosing' | 'revealed' | 'finished';

interface RpsRoom {
  id: string;
  name: string;
  host_id: string;
  host_name: string;
  guest_id: string | null;
  guest_name: string | null;
  host_choice: RpsChoice | null;
  guest_choice: RpsChoice | null;
  winner: string | null;
  status: RoomStatus;
  bet: number;
  is_private: boolean;
  created_at: string;
}

const CHOICES: { id: RpsChoice; emoji: string; label: string; icon: typeof Hand }[] = [
  { id: 'rock', emoji: '✊', label: 'Камень', icon: Hand },
  { id: 'paper', emoji: '✋', label: 'Бумага', icon: FileText },
  { id: 'scissors', emoji: '✌️', label: 'Ножницы', icon: Scissors },
];

const getWinner = (a: RpsChoice, b: RpsChoice): RpsChoice | 'draw' => {
  if (a === b) return 'draw';
  if (
    (a === 'rock' && b === 'scissors') ||
    (a === 'paper' && b === 'rock') ||
    (a === 'scissors' && b === 'paper')
  ) return a;
  return b;
};

export default function GameRooms() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [rooms, setRooms] = useState<RpsRoom[]>(() => getCached('rps_rooms') || []);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  // Create form
  const [newRoom, setNewRoom] = useState({ name: '', bet: 1, isPrivate: false });
  const [creating, setCreating] = useState(false);

  // Active room
  const [activeRoom, setActiveRoom] = useState<RpsRoom | null>(null);
  const [myChoice, setMyChoice] = useState<RpsChoice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const choiceMadeRef = useRef(false);

  // Load rooms
  const loadRooms = useCallback(async () => {
    const { data } = await supabase
      .from('rps_rooms')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Фильтруем finished и пустые waiting комнаты
    const activeRooms = (data || []).filter(room => 
      !room.is_private && // Не показывать приватные комнаты в списке
      room.status !== 'finished' && 
      !(room.status === 'waiting' && !room.guest_id && 
        new Date(room.created_at) < new Date(Date.now() - 5 * 60 * 1000)) // старше 5 минут
    );
    
    setRooms(activeRooms);
    setCached('rps_rooms', activeRooms);
  }, []);

  useEffect(() => {
    if (!user || authLoading) return;
    loadRooms();

    // Real-time subscription
    const channel = supabase
      .channel('rps_rooms')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rps_rooms' },
        () => loadRooms()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, authLoading, loadRooms]);

  // If in a room, poll for updates to detect opponent choice reveal
  useEffect(() => {
    if (!activeRoom) return;

    const poll = async () => {
      try {
        // If room was deleted, exit
        const { data } = await supabase
          .from('rps_rooms')
          .select('*')
          .eq('id', activeRoom.id)
          .single();

        if (!data) {
          // Room was deleted - cleanup
          setActiveRoom(null);
          setMyChoice(null);
          setRevealed(false);
          choiceMadeRef.current = false;
          return;
        }
        
        const updated: RpsRoom = data;
        
        // Check if both chose and determine winner if needed
        const bothChose = updated.host_choice && updated.guest_choice;
        
        // If both chose but status is still 'choosing', force finish
        if (bothChose && updated.status === 'choosing') {
          const winner = getWinner(updated.host_choice!, updated.guest_choice!);
          const bet = updated.bet;
          let hostMushrooms = 0;
          let guestMushrooms = 0;
          
          if (winner !== 'draw') {
            // Determine actual winner by comparing host_choice vs guest_choice
            const actualWinner = getWinner(updated.host_choice!, updated.guest_choice!);
            if (actualWinner === updated.host_choice!) {
              hostMushrooms = bet;
              guestMushrooms = -bet;
            } else {
              hostMushrooms = -bet;
              guestMushrooms = bet;
            }
          }
          
          const winnerId = winner === 'draw' ? null : (
            winner === updated.host_choice! ? updated.host_id : updated.guest_id
          );
          
          // Update room to finished
          await supabase
            .from('rps_rooms')
            .update({
              winner: winner === 'draw' ? 'draw' : winnerId,
              status: 'finished',
            })
            .eq('id', activeRoom.id);
        }
        
        // If game just finished and we haven't revealed yet
        if (updated.status === 'finished' && !revealed) {
          setRevealed(true);
        }

        setActiveRoom({...updated, status: updated.status === 'choosing' && bothChose ? 'finished' : updated.status});
      } catch (e) {
        console.error('❌ Poll error:', e);
      }
    };

    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, [activeRoom?.id, revealed]);

  const createRoom = async () => {
    if (creating || !newRoom.name.trim() || !user) return;
    setCreating(true);

    try {
      const { data, error } = await supabase
        .from('rps_rooms')
        .insert([{
          id: `rps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: newRoom.name.trim(),
          host_id: user.id,
          host_name: user.username,
          guest_id: null,
          guest_name: null,
          host_choice: null,
          guest_choice: null,
          winner: null,
          status: newRoom.isPrivate ? 'waiting' : 'waiting',
          bet: newRoom.bet,
          is_private: newRoom.isPrivate,
        }])
        .select()
        .single();

      if (data && !error) {
        setActiveRoom(data);
        setShowCreate(false);
        setNewRoom({ name: '', bet: 1, isPrivate: false });
      }
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async (room: RpsRoom) => {
    if (!user) {
      alert('Войди в систему чтобы играть!');
      return;
    }

    if (room.host_id === user.id) {
      alert('Это твоя комната!');
      return;
    }

    // Получаем свежие данные из БД
    const { data: freshRoom, error: fetchError } = await supabase
      .from('rps_rooms')
      .select('*')
      .eq('id', room.id)
      .single();

    if (fetchError || !freshRoom) {
      alert('Комната не найдена!');
      return;
    }

    if (freshRoom.status !== 'waiting') {
      alert('Игра уже идёт!');
      return;
    }

    if (freshRoom.guest_id) {
      alert('Комната уже заполнена!');
      return;
    }

    if (user.mushrooms < freshRoom.bet) {
      alert(`Недостаточно грибов! Нужно ${freshRoom.bet} 🍄, у вас ${user.mushrooms} 🍄`);
      return;
    }

    console.log('🎮 Join room:', freshRoom.id, 'by', user.username);

    const { data, error } = await supabase
      .from('rps_rooms')
      .update({
        guest_id: user.id,
        guest_name: user.username,
        status: 'choosing',
      })
      .eq('id', freshRoom.id)
      .eq('status', 'waiting')
      .is('guest_id', null)
      .select()
      .single();

    if (error) {
      console.error('❌ Join error:', error);
      alert('Ошибка подключения: ' + error.message);
      return;
    }

    if (data) {
      console.log('✅ Joined room:', data);
      setActiveRoom(data);
      setShowJoin(false);
      setJoinCode('');
    } else {
      alert('Не удалось присоединиться. Возможно, комната уже заполнена.');
    }
  };

  const leaveRoom = async () => {
    if (!activeRoom) return;
    
    // Always delete room when any player leaves
    await supabase.from('rps_rooms').delete().eq('id', activeRoom.id);
    
    setActiveRoom(null);
    setMyChoice(null);
    setRevealed(false);
    choiceMadeRef.current = false;
  };

  const submitChoice = async (choice: RpsChoice) => {
    if (!activeRoom || !user || choiceMadeRef.current) return;
    
    // Проверяем что у игрока достаточно грибов
    if (user.mushrooms < activeRoom.bet) {
      alert('Недостаточно грибов!');
      return;
    }

    setSubmitting(true);
    choiceMadeRef.current = true;
    setMyChoice(choice);

    const isHost = activeRoom.host_id === user.id;
    const choiceKey = isHost ? 'host_choice' : 'guest_choice';
    const update = {
      [choiceKey]: choice,
    };

    // First, just save the choice
    await supabase
      .from('rps_rooms')
      .update(update)
      .eq('id', activeRoom.id);

    // Fetch latest room state to check opponent's choice
    const { data: roomAfterSave } = await supabase
      .from('rps_rooms')
      .select('*')
      .eq('id', activeRoom.id)
      .single();

    if (!roomAfterSave) {
      setSubmitting(false);
      return;
    }

    const oppChoiceKey = isHost ? 'guest_choice' : 'host_choice';
    const oppChoiceValue = roomAfterSave[oppChoiceKey];
    const bothChose = roomAfterSave.host_choice && roomAfterSave.guest_choice;
    
    if (bothChose) {
      // ОБА ВЫБРАЛИ — определяем победителя
      const myChoiceValue = choice;
      const winner = getWinner(myChoiceValue, oppChoiceValue);

      const bet = activeRoom.bet;
      let hostMushrooms = 0;
      let guestMushrooms = 0;

      if (winner === 'draw') {
        hostMushrooms = 0;
        guestMushrooms = 0;
      } else {
        const hostChoice = isHost ? myChoiceValue : oppChoiceValue;
        const guestChoice = isHost ? oppChoiceValue : myChoiceValue;
        const gameWinner = getWinner(hostChoice, guestChoice);
        
        if (gameWinner === hostChoice) {
          hostMushrooms = bet;
          guestMushrooms = -bet;
        } else {
          hostMushrooms = -bet;
          guestMushrooms = bet;
        }
      }

      const winnerId = winner === 'draw' ? null : (
        winner === (isHost ? myChoiceValue : oppChoiceValue)
          ? activeRoom.host_id
          : activeRoom.guest_id
      );

      console.log('🏆 Game finished:', {
        host: activeRoom.host_name,
        hostChoice: isHost ? myChoiceValue : oppChoiceValue,
        guest: activeRoom.guest_name,
        guestChoice: isHost ? oppChoiceValue : myChoiceValue,
        winner: winner,
        winnerId,
        hostMushrooms,
        guestMushrooms
      });

      // Update room to finished
      await supabase
        .from('rps_rooms')
        .update({
          ...update,
          winner: winner === 'draw' ? 'draw' : winnerId,
          status: 'finished',
        })
        .eq('id', activeRoom.id);

      // Update mushrooms via direct SQL update (more reliable than RPC)
      try {
        console.log('🍄 Updating mushrooms:', { host: activeRoom.host_id, hostMushrooms, guest: activeRoom.guest_id, guestMushrooms });
        
        if (hostMushrooms !== 0) {
          // Get current mushrooms first
          const { data: hostUser } = await supabase
            .from('users')
            .select('mushrooms')
            .eq('id', activeRoom.host_id)
            .single();
          
          if (hostUser) {
            const newBalance = (hostUser.mushrooms || 0) + hostMushrooms;
            const { error: hostError } = await supabase
              .from('users')
              .update({ mushrooms: newBalance })
              .eq('id', activeRoom.host_id);
            console.log('🍄 Host update:', hostError ? hostError.message : `new balance: ${newBalance}`);
          }
        }
        if (activeRoom.guest_id && guestMushrooms !== 0) {
          const { data: guestUser } = await supabase
            .from('users')
            .select('mushrooms')
            .eq('id', activeRoom.guest_id)
            .single();
          
          if (guestUser) {
            const newBalance = (guestUser.mushrooms || 0) + guestMushrooms;
            const { error: guestError } = await supabase
              .from('users')
              .update({ mushrooms: newBalance })
              .eq('id', activeRoom.guest_id);
            console.log('🍄 Guest update:', guestError ? guestError.message : `new balance: ${newBalance}`);
          }
        }
      } catch (e) {
        console.error('❌ Mushroom update error:', e);
      }

      // Record games
      try {
        await supabase.from('games').insert([{
          user_id: activeRoom.host_id,
          game_type: 'Камень-Ножницы-Бумага',
          bet,
          result: winner === 'draw' ? 'draw' : (winnerId === activeRoom.host_id ? 'win' : 'loss'),
          mushrooms_change: hostMushrooms
        }]);
        
        if (activeRoom.guest_id) {
          await supabase.from('games').insert([{
            user_id: activeRoom.guest_id,
            game_type: 'Камень-Ножницы-Бумага',
            bet,
            result: winner === 'draw' ? 'draw' : (winnerId === activeRoom.guest_id ? 'win' : 'loss'),
            mushrooms_change: guestMushrooms
          }]);
        }
      } catch (e) {
        console.error('❌ Games record error:', e);
      }
    } else {
      // Waiting for opponent
      await supabase
        .from('rps_rooms')
        .update(update)
        .eq('id', activeRoom.id);
    }

    setSubmitting(false);

    // Refresh room state immediately
    const { data } = await supabase.from('rps_rooms').select('*').eq('id', activeRoom.id).single();
    if (data) {
      setActiveRoom(data);
      console.log('🔄 Room state updated:', data);
      
      // If game finished, mark as revealed
      if (data.status === 'finished' && data.host_choice && data.guest_choice) {
        setRevealed(true);
      }
    }
    
    // Also refresh user data to update mushrooms
    if (data?.status === 'finished') {
      await refreshUser();
      
      // УДАЛЯЕМ комнату после завершения игры с задержкой
      // Даём время обоим игрокам увидеть результат
      setTimeout(async () => {
        console.log('🗑️ Deleting finished room:', activeRoom.id);
        await supabase.from('rps_rooms').delete().eq('id', activeRoom.id);
        setActiveRoom(null);
        setMyChoice(null);
        setRevealed(false);
        choiceMadeRef.current = false;
      }, 5000); // 5 секунд чтобы увидеть результат
    }
  };

  const isHost = activeRoom?.host_id === user?.id;
  // const oppChoice = isHost ? activeRoom?.guest_choice : activeRoom?.host_choice;
  // const myChosen = isHost ? activeRoom?.host_choice : activeRoom?.guest_choice;

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-screen">
        <p className="text-2xl text-gray-400">Войдите через Discord</p>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-5xl font-bold gradient-text mb-2">✊✋✌️ Камень-Ножницы-Бумага</h1>
          <p className="text-gray-400">Создай комнату или присоединись к PvP!</p>
        </motion.div>

        {/* Active Room */}
        {activeRoom ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8">
            <div className="flex items-center justify-between mb-6">
              <button onClick={leaveRoom} className="text-gray-400 hover:text-white flex items-center gap-2">
                <ArrowLeft size={18} /> Покинуть комнату
              </button>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                  Ставка: {activeRoom.bet} 🍄
                </span>
              </div>
            </div>

            {/* Players */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Player 1 (Host) */}
              <div className={`p-6 rounded-xl text-center border-2 ${isHost ? 'border-mushroom-neon bg-mushroom-neon/10' : 'border-white/10 bg-white/5'}`}>
                <p className="text-sm text-gray-400 mb-2">{isHost ? 'Ты (Хост)' : activeRoom.host_name}</p>
                <p className="font-bold text-lg mb-2">{activeRoom.host_name}</p>
                {activeRoom.status === 'finished' ? (
                  <div className="text-5xl">
                    {activeRoom.host_choice === 'rock' ? '✊' : activeRoom.host_choice === 'paper' ? '✋' : '✌️'}
                  </div>
                ) : isHost && myChoice ? (
                  <p className="text-mushroom-neon font-bold">Выбрано ✓</p>
                ) : isHost ? (
                  <p className="text-gray-600 text-sm">Твой ход ↓</p>
                ) : (
                  <p className="text-gray-600 text-sm">Ожидание...</p>
                )}
              </div>

              {/* Player 2 (Guest) */}
              <div className={`p-6 rounded-xl text-center border-2 ${!isHost ? 'border-mushroom-neon bg-mushroom-neon/10' : 'border-white/10 bg-white/5'}`}>
                {activeRoom.guest_id ? (
                  <>
                    <p className="text-sm text-gray-400 mb-2">{!isHost ? 'Ты' : activeRoom.guest_name}</p>
                    <p className="font-bold text-lg mb-2">{activeRoom.guest_name}</p>
                    {activeRoom.status === 'finished' ? (
                      <div className="text-5xl">
                        {activeRoom.guest_choice === 'rock' ? '✊' : activeRoom.guest_choice === 'paper' ? '✋' : '✌️'}
                      </div>
                    ) : !isHost && myChoice ? (
                      <p className="text-mushroom-neon font-bold">Выбрано ✓</p>
                    ) : !isHost ? (
                      <p className="text-gray-600 text-sm">Твой ход ↓</p>
                    ) : (
                      <p className="text-gray-600 text-sm">Ожидание...</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-400 mb-2">Ожидание...</p>
                    <p className="font-bold text-lg mb-2 text-gray-500">?</p>
                    <p className="text-gray-600 text-sm">Противник не подключился</p>
                  </>
                )}
              </div>
            </div>

            {/* Result */}
            {activeRoom.status === 'finished' && activeRoom.winner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center mb-6"
              >
                <div className="text-6xl mb-4">
                  {activeRoom.winner === 'draw' ? '🤝' : activeRoom.winner === user?.id ? '🏆' : '💀'}
                </div>
                <h2 className="text-3xl font-bold mb-2">
                  {activeRoom.winner === 'draw' ? 'Ничья!' : activeRoom.winner === user?.id ? 'Победа!' : 'Поражение!'}
                </h2>
                <p className="text-xl text-gray-400">
                  {activeRoom.winner === 'draw'
                    ? 'Ничья — грибы возвращены'
                    : activeRoom.winner === user?.id
                      ? `+${activeRoom.bet} 🍄`
                      : `-${activeRoom.bet} 🍄`}
                </p>
              </motion.div>
            )}

            {/* Waiting for opponent */}
            {activeRoom.status === 'waiting' && (
              <div className="text-center mb-6">
                <Loader2 className="mx-auto animate-spin text-mushroom-neon mb-3" size={32} />
                <p className="text-xl text-gray-400">Ожидание противника...</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(activeRoom.id); }}
                  className="btn-primary mt-4 flex items-center gap-2 mx-auto"
                >
                  <Copy size={16} /> Скопировать код комнаты
                </button>
              </div>
            )}

            {/* Choose phase */}
            {activeRoom.status === 'choosing' && !myChoice && activeRoom.guest_id && (
              <div className="text-center mb-6">
                <p className="text-xl font-bold mb-6">
                  {isHost ? 'Противник готов! Выбери свой ход!' : 'Выбери свой ход!'}
                </p>
                <div className="flex gap-4 justify-center">
                  {CHOICES.map(({ id, emoji, label }) => (
                    <button
                      key={id}
                      onClick={() => submitChoice(id)}
                      disabled={submitting}
                      className="glass-card p-6 rounded-xl hover:bg-mushroom-neon/10 hover:border-mushroom-neon/50 border-2 border-transparent transition-all cursor-pointer disabled:opacity-50 flex flex-col items-center gap-2 min-w-[120px]"
                    >
                      <span className="text-5xl">{emoji}</span>
                      <span className="font-bold">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Waiting for opponent to choose */}
            {activeRoom.status === 'choosing' && myChoice && !activeRoom.winner && (
              <div className="text-center mb-6">
                <Loader2 className="mx-auto animate-spin text-yellow-400 mb-3" size={32} />
                <p className="text-xl text-gray-400">Противник выбирает...</p>
              </div>
            )}

            {/* Both chose but game not finished yet */}
            {activeRoom.status === 'choosing' && activeRoom.host_choice && activeRoom.guest_choice && (
              <div className="text-center mb-6">
                <Loader2 className="mx-auto animate-spin text-mushroom-neon mb-3" size={32} />
                <p className="text-xl text-mushroom-neon font-bold">Раскрываем...</p>
              </div>
            )}

            {/* Waiting for opponent to connect */}
            {activeRoom.status === 'choosing' && !myChoice && !activeRoom.guest_id && (
              <div className="text-center mb-6">
                <Loader2 className="mx-auto animate-spin text-mushroom-neon mb-3" size={32} />
                <p className="text-xl text-gray-400">Ожидание противника...</p>
              </div>
            )}

            {/* Finished - back to lobby */}
            {activeRoom.status === 'finished' && (
              <div className="flex gap-3">
                <button onClick={leaveRoom} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Trophy size={18} /> Вернуться в лобби
                </button>
                <button
                  onClick={() => {
                    const bet = activeRoom.bet;
                    leaveRoom();
                    setShowCreate(true);
                    setNewRoom({ name: `Реванш ${user?.username}`, bet });
                  }}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-mushroom-purple to-mushroom-pink"
                >
                  🔄 Играть снова
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <>
            {/* Action Buttons */}
            <div className="flex gap-4 mb-8">
              <button onClick={() => setShowCreate(true)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Plus size={18} /> Создать комнату
              </button>
              <button onClick={() => setShowJoin(true)} className="btn-primary flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500">
                <Search size={18} /> Присоединиться
              </button>
            </div>

            {/* Game Info */}
            <div className="glass-card p-6 mb-8 flex items-center gap-6">
              <div className="text-6xl">✊✋✌️</div>
              <div>
                <h3 className="text-2xl font-bold mb-1">Камень-Ножницы-Бумага</h3>
                <p className="text-gray-400">Классическая PvP игра. Камень бьёт ножницы, ножницы режут бумагу, бумага накрывает камень.</p>
              </div>
            </div>

            {/* Room List */}
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Globe className="text-mushroom-neon" size={24} />
              Открытые комнаты
            </h3>
            {rooms.length > 0 ? (
              <div className="space-y-2">
                {rooms.map(room => (
                  <div key={room.id} className="glass-card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">✊✋✌️</span>
                      <div>
                        <p className="font-bold">{room.name}</p>
                        <p className="text-sm text-gray-400 flex items-center gap-2">
                          <Globe size={12} />
                          {room.host_name} • Ставка: {room.bet} 🍄
                        </p>
                      </div>
                    </div>
                    {room.status === 'waiting' && !room.guest_id ? (
                      <button onClick={() => joinRoom(room)} className="btn-primary text-sm">
                        Играть
                      </button>
                    ) : (
                      <span className="text-gray-500 text-sm">Играют...</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <Users className="mx-auto text-gray-500 mb-4" size={48} />
                <p className="text-xl text-gray-400 mb-2">Нет открытых комнат</p>
                <p className="text-gray-500">Создай первую комнату!</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Создать комнату</h3>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 mb-2">Название</label>
                  <input
                    type="text"
                    value={newRoom.name}
                    onChange={e => setNewRoom({ ...newRoom, name: e.target.value })}
                    placeholder="Моя комната..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-2">Ставка (1-100) • Начальная ставка</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={newRoom.bet}
                      onChange={e => setNewRoom({ ...newRoom, bet: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="flex-1"
                    />
                    <span className="font-bold text-mushroom-neon min-w-[60px] text-center">{newRoom.bet} 🍄</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
                  <div>
                    <div className="font-bold">🔒 Приватная комната</div>
                    <div className="text-xs text-gray-500">Видна только по коду</div>
                  </div>
                  <button
                    onClick={() => setNewRoom({ ...newRoom, isPrivate: !newRoom.isPrivate })}
                    className={`w-12 h-7 rounded-full transition-colors ${newRoom.isPrivate ? 'bg-mushroom-neon' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${newRoom.isPrivate ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <button onClick={createRoom} disabled={creating || !newRoom.name.trim()} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                  {creating ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />} Создать
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Room Modal */}
      <AnimatePresence>
        {showJoin && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setShowJoin(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass-card p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Присоединиться</h3>
                <button onClick={() => setShowJoin(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 mb-2">Код комнаты</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    placeholder="Вставь код..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3"
                  />
                </div>

                <button
                  onClick={async () => {
                    if (!joinCode.trim()) return;
                    const { data } = await supabase.from('rps_rooms').select('*').eq('id', joinCode.trim()).single();
                    if (data && data.status === 'waiting' && !data.guest_id) {
                      joinRoom(data);
                    } else {
                      alert('Комната не найдена или уже заполнена');
                    }
                  }}
                  className="btn-primary w-full"
                >
                  Найти комнату
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
