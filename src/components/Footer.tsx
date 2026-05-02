import { Link } from 'react-router-dom';
import { Heart, Gamepad2, MessageCircle } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black/60 border-t border-white/10 mt-auto safe-area-bottom">
      <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
          {/* Бренд */}
          <div className="col-span-1 sm:col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <span className="text-xl sm:text-2xl font-bold gradient-text">🍄 LOLA</span>
            </Link>
            <p className="text-gray-400 text-sm mb-4 sm:mb-3">
              Играй. Общайся. Побеждай.
            </p>
            <a
              href="https://discord.gg/lolaamongus"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-discord hover:bg-discord-dark text-white text-sm font-medium rounded-xl transition-all min-h-[44px]"
            >
              <MessageCircle size={16} />
              Discord
            </a>
          </div>

          {/* Навигация */}
          <div>
            <h4 className="font-bold text-white mb-3 flex items-center gap-2">
              <Gamepad2 size={16} className="text-mushroom-neon" />
              Навигация
            </h4>
            <div className="space-y-2">
              {[
                { label: 'Главная', path: '/' },
                { label: 'Дашборд', path: '/dashboard' },
                { label: 'Все игры', path: '/games' },
                { label: 'Казино', path: '/casino' },
                { label: 'Лидеры', path: '/leaderboard' },
                { label: 'Мониторинг', path: '/monitoring' },
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-gray-400 hover:text-mushroom-neon text-sm transition-colors block py-1.5"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Сообщество */}
          <div>
            <h4 className="font-bold text-white mb-3 flex items-center gap-2">
              <Gamepad2 size={16} className="text-purple-400" />
              Сообщество
            </h4>
            <div className="space-y-2">
              {[
                { label: 'Мероприятия', path: '/events' },
                { label: 'Магазин', path: '/shop' },
                { label: 'Отзывы', path: '/reviews' },
                { label: 'Команда', path: '/team' },
                { label: 'Тикеты', path: '/tickets' },
                { label: 'Варны', path: '/warnings' },
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-gray-400 hover:text-mushroom-neon text-sm transition-colors block py-1.5"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Помощь */}
          <div>
            <h4 className="font-bold text-white mb-3 flex items-center gap-2">
              <MessageCircle size={16} className="text-blue-400" />
              Помощь
            </h4>
            <div className="space-y-2">
              {[
                { label: 'Правила', path: '/rules' },
                { label: 'Частые вопросы', path: '/faq' },
                { label: 'Контакты', path: '/contact' },
                { label: 'Подать на роль', path: '/community' },
                { label: 'Роли', path: '/community' },
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-gray-400 hover:text-mushroom-neon text-sm transition-colors block py-1.5"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Нижняя полоса */}
        <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
          <p className="text-gray-500 text-sm flex items-center gap-1.5">
            © {currentYear} LOLA. Сделано с <Heart size={13} className="text-red-500 inline" /> для комьюнити
          </p>
          <span className="text-gray-600 text-xs">v1.1.0</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
