import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function CheckersRedirect() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/play', { replace: true }); }, [navigate]);
  return (
    <div className="pt-24 flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-mushroom-neon mb-4" size={32} />
      <p className="text-gray-400">Переход к мини-играм...</p>
    </div>
  );
}
