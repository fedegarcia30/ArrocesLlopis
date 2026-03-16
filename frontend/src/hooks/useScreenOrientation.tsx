import { useEffect, useState } from 'react';
import { ScreenOrientation, type OrientationLockType } from '@capacitor/screen-orientation';

export const useScreenOrientation = () => {
  const [orientation, setOrientation] = useState<string | null>(null);

  useEffect(() => {
    const handleOrientationChange = async () => {
      const result = await ScreenOrientation.orientation();
      setOrientation(result.type);
      
      const width = window.innerWidth;
      // Móvil < 768px -> Portrait only
      if (width < 768) {
        await ScreenOrientation.lock({ orientation: 'portrait' as OrientationLockType });
      } else {
        // Tablet preferences: Landscape
        await ScreenOrientation.lock({ orientation: 'landscape' as OrientationLockType });
      }
    };

    handleOrientationChange();

    const setupListener = async () => {
      const handle = await ScreenOrientation.addListener('screenOrientationChange', (res) => {
        setOrientation(res.type);
      });
      return handle;
    };

    const listenerPromise = setupListener();

    window.addEventListener('resize', handleOrientationChange);

    return () => {
      listenerPromise.then(handle => handle.remove());
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  return orientation;
};
