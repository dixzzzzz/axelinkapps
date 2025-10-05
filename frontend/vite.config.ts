import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { viteSourceLocator } from "@metagptx/vite-plugin-source-locator";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const portalType = process.env.VITE_PORTAL_TYPE;
  const isAdmin = portalType === 'admin';
  const isCustomer = portalType === 'customer';
  
  // Get server IP from environment or detect automatically
  const serverIP = process.env.VITE_SERVER_IP || process.env.SERVER_IP || 'localhost';
  console.log(`🔗 Using server IP: ${serverIP}`);
  
  // Define portal-specific configurations
  const portalConfig = {
    admin: {
      port: 5432,
      host: '0.0.0.0',
      outDir: 'dist-admin',
      title: 'AxeLink Apps - Admin Device Management'
    },
    customer: {
      port: 2345, 
      host: '0.0.0.0',
      outDir: 'dist-customer',
      title: 'AxeLink Apps - Customer Device Management'
    }
  };
  
  const currentConfig = portalConfig[portalType as keyof typeof portalConfig] || {};
  
  return {
    base: isAdmin ? '/u/' : isCustomer ? '/x/' : '/',
    plugins: [
      ...(mode !== 'production' ? [viteSourceLocator({
        prefix: "mgx",
      })] : []),
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: currentConfig.outDir || 'dist',
      sourcemap: mode !== 'production',
      minify: 'esbuild',
      esbuild: {
        drop: mode === 'production' ? ['console', 'debugger'] : []
      },
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    },
    server: {
      port: currentConfig.port,
      host: currentConfig.host,
      allowedHosts: [
        'localhost',
        'localhost',
        serverIP,
        // Allow all duckdns.org subdomains
      ],
      proxy: {
        // Only proxy API calls, NOT UI routes
        '/api': {
          target: `http://${serverIP}:3003`,
          changeOrigin: true,
          secure: false
        }
      }
    },
    preview: {
      port: 4173 | 4174,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: `http://${serverIP}:3003`,
          changeOrigin: true,
          secure: false
        }
      }
    },
    define: {
      'import.meta.env.VITE_PORTAL_TYPE': JSON.stringify(portalType),
      'import.meta.env.VITE_APP_TITLE': JSON.stringify(currentConfig.title)
    }
  };
});
