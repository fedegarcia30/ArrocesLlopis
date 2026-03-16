import React, { useEffect } from 'react';
import { SafeArea, type SafeAreaInsets } from 'capacitor-plugin-safe-area';

export const SafeAreaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  useEffect(() => {
    const updateInsets = async () => {
      const data: SafeAreaInsets = await SafeArea.getSafeAreaInsets();
      const { insets } = data;
      
      // Aplicar variables CSS globales
      document.documentElement.style.setProperty('--safe-top', `${insets.top}px`);
      document.documentElement.style.setProperty('--safe-bottom', `${insets.bottom}px`);
      document.documentElement.style.setProperty('--safe-left', `${insets.left}px`);
      document.documentElement.style.setProperty('--safe-right', `${insets.right}px`);
    };

    updateInsets();

    const setupListener = async () => {
      const handle = await SafeArea.addListener('safeAreaChanged', (data: SafeAreaInsets) => {
        const { insets } = data;
        document.documentElement.style.setProperty('--safe-top', `${insets.top}px`);
        document.documentElement.style.setProperty('--safe-bottom', `${insets.bottom}px`);
        document.documentElement.style.setProperty('--safe-left', `${insets.left}px`);
        document.documentElement.style.setProperty('--safe-right', `${insets.right}px`);
      });
      return handle;
    };

    const listenerPromise = setupListener();

    return () => {
      listenerPromise.then(handle => handle.remove());
    };
  }, []);

  return <>{children}</>;
};
