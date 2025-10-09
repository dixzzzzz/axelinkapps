import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Suppress console warnings from Three.js for deprecated parameters
// This is needed because Vanta.js uses deprecated Three.js parameters
if (typeof console !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args[0];
    if (typeof message === 'string' && (
      message.includes('THREE.Material: parameter') ||
      message.includes('vertexColors') ||
      message.includes('deprecated')
    )) {
      // Skip these warnings - they're from Vanta.js and we can't fix them
      return;
    }
    originalWarn.apply(console, args);
  };
}

// Import different Vanta effects
import GLOBE from 'vanta/dist/vanta.globe.min';
import NET from 'vanta/dist/vanta.net.min';
import CELLS from 'vanta/dist/vanta.cells.min';
import CLOUDS from 'vanta/dist/vanta.clouds.min';
import WAVES from 'vanta/dist/vanta.waves.min';
import TOPOLOGY from 'vanta/dist/vanta.topology.min';

export interface VantaBackgroundProps {
  effect: 'globe' | 'net' | 'cells' | 'clouds' | 'waves' | 'topology';
}

export function VantaBackground({ effect }: VantaBackgroundProps) {
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<any>(null);

  useEffect(() => {
    if (!vantaEffect.current && vantaRef.current) {
      let config: any = {
        el: vantaRef.current,
        THREE: THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.00,
        minWidth: 200.00,
        scale: 1.00,
        scaleMobile: 1.00,
      };

      switch (effect) {
        case 'globe':
          vantaEffect.current = GLOBE({
            ...config,
            color: 0x8b5cf6, // purple-500
            color2: 0x6366f1, // indigo-500  
            backgroundColor: 0x1e1b4b, // indigo-900
            size: 1.20,
            zoom: 0.80
          });
          break;

        case 'net':
          vantaEffect.current = NET({
            ...config,
            color: 0x8b5cf6, // purple-500
            backgroundColor: 0x1e1b4b, // indigo-900
            points: 10.00,
            maxDistance: 25.00,
            spacing: 15.00
          });
          break;

        case 'cells':
          vantaEffect.current = CELLS({
            ...config,
            color1: 0x8b5cf6, // purple-500
            color2: 0x6366f1, // indigo-500
            backgroundColor: 0x1e1b4b, // indigo-900
            size: 1.50,
            speed: 1.00
          });
          break;

        case 'clouds':
          vantaEffect.current = CLOUDS({
            ...config,
            cloudColor: 0x8b5cf6, // purple-500
            cloudShadowColor: 0x6366f1, // indigo-500
            backgroundColor: 0x1e1b4b, // indigo-900
            skyColor: 0x312e81, // indigo-800
            speed: 1.20
          });
          break;

        case 'waves':
          vantaEffect.current = WAVES({
            ...config,
            color: 0x4c1d95, // deep purple
            shininess: 60.00,
            waveHeight: 15.00,
            waveSpeed: 1.25,
            zoom: 0.65
          });
          break;

        case 'topology':
          vantaEffect.current = TOPOLOGY({
            ...config,
            color: 0x8b5cf6, // purple-500
            backgroundColor: 0x1e1b4b, // indigo-900
            points: 8.00,
            maxDistance: 23.00,
            spacing: 17.00
          });
          break;

        default:
          // Default to net effect
          vantaEffect.current = NET({
            ...config,
            color: 0x8b5cf6,
            backgroundColor: 0x1e1b4b,
            points: 10.00,
            maxDistance: 25.00,
            spacing: 15.00
          });
      }
    }

    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
      }
    };
  }, [effect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
      }
    };
  }, []);

  return (
    <div 
      ref={vantaRef}
      className="absolute inset-0 z-0"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

export default VantaBackground;
