import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Gamepad2, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-screen">
      <div className="container mx-auto max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* 404 Animation */}
          <div className="mb-8">
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-9xl font-bold gradient-text mb-4"
            >
              404
            </motion.div>
            <div className="text-6xl mb-6">🍄</div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Страница не найдена</span>
          </h1>

          <p className="text-xl text-gray-400 mb-8 max-w-lg mx-auto">
            Похоже, этот гриб затерялся в лесу... Страница, которую вы ищете, не существует или была перемещена.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/"
              className="btn-primary flex items-center gap-2"
            >
              <Home size={18} />
              На главную
            </Link>

            <Link
              to="/play"
              className="btn-discord flex items-center gap-2"
            >
              <Gamepad2 size={18} />
              Играть
            </Link>

            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-gray-300 hover:text-mushroom-neon flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Назад
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
