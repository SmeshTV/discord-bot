import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Автоматическая прокрутка наверх при смене маршрута
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
