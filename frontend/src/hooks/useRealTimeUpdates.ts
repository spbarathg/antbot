import { useState, useEffect } from 'react';

interface UpdateAnimation {
  isActive: boolean;
  type: 'blink' | 'fade' | 'pulse';
  duration: number;
}

export const useRealTimeUpdates = (updateInterval: number = 5000) => {
  const [animation, setAnimation] = useState<UpdateAnimation>({
    isActive: false,
    type: 'fade',
    duration: 1000,
  });

  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval]);

  const triggerUpdate = (type: UpdateAnimation['type'] = 'fade') => {
    setAnimation({
      isActive: true,
      type,
      duration: 1000,
    });

    setTimeout(() => {
      setAnimation(prev => ({ ...prev, isActive: false }));
    }, 1000);
  };

  return {
    animation,
    triggerUpdate,
    lastUpdate,
  };
}; 