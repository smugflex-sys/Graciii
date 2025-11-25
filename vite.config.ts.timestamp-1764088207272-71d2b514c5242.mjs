// vite.config.ts
import { defineConfig } from "file:///C:/Users/Tijjani/Documents/Germ-in-game-main/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Tijjani/Documents/Germ-in-game-main/node_modules/@vitejs/plugin-react-swc/index.js";
import { resolve } from "path";
var __vite_injected_original_dirname = "C:\\Users\\Tijjani\\Documents\\Germ-in-game-main";
var vite_config_default = defineConfig(({ mode }) => {
  const isProduction = mode === "production";
  return {
    plugins: [
      react({
        // Use minimal SWC configuration
        jsxImportSource: void 0
      })
      // Remove all plugins that could trigger virus scanners
      // No compression, no bundle analyzer, no image optimizer
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": resolve(__vite_injected_original_dirname, "src")
      }
    },
    build: {
      outDir: "public_html",
      emptyOutDir: true,
      sourcemap: false,
      // Disable sourcemaps
      // Ultra-conservative build settings
      target: "es2015",
      // Conservative target
      minify: "esbuild",
      // Use esbuild instead of terser
      rollupOptions: {
        output: {
          // Simple chunking to avoid complex patterns
          manualChunks: void 0,
          // Clean file naming
          entryFileNames: "assets/js/[name].js",
          chunkFileNames: "assets/js/[name].js",
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || "";
            if (/(png|jpe?g|svg|gif|webp|avif)$/i.test(name)) {
              return "assets/images/[name][extname]";
            }
            if (/css$/i.test(name)) {
              return "assets/css/[name].css";
            }
            return "assets/[name][extname]";
          }
        },
        // External dependencies that might cause issues
        external: []
      },
      // Conservative chunk sizes
      chunkSizeWarningLimit: 1e3,
      // No asset inlining
      assetsInlineLimit: 0
    },
    server: {
      port: 3e3,
      host: "0.0.0.0",
      strictPort: true,
      open: false,
      // Disable auto-open
      proxy: {
        "^/api": {
          target: isProduction ? "https://gracelandroyalacademy.com.ng" : "http://localhost:8000",
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path
        }
      }
    },
    preview: {
      port: 4173,
      host: "0.0.0.0",
      strictPort: true
    },
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
        isProduction ? "https://gracelandroyalacademy.com.ng/api" : "http://localhost:8000/api"
      )
    },
    // Conservative CSS handling
    css: {
      devSourcemap: false,
      preprocessorOptions: {}
    },
    // No environment variables that could cause issues
    envPrefix: "VITE_"
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxUaWpqYW5pXFxcXERvY3VtZW50c1xcXFxHZXJtLWluLWdhbWUtbWFpblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcVGlqamFuaVxcXFxEb2N1bWVudHNcXFxcR2VybS1pbi1nYW1lLW1haW5cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL1RpamphbmkvRG9jdW1lbnRzL0dlcm0taW4tZ2FtZS1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XHJcbiAgY29uc3QgaXNQcm9kdWN0aW9uID0gbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgcGx1Z2luczogW1xyXG4gICAgICByZWFjdCh7XHJcbiAgICAgICAgLy8gVXNlIG1pbmltYWwgU1dDIGNvbmZpZ3VyYXRpb25cclxuICAgICAgICBqc3hJbXBvcnRTb3VyY2U6IHVuZGVmaW5lZCxcclxuICAgICAgfSksXHJcbiAgICAgIC8vIFJlbW92ZSBhbGwgcGx1Z2lucyB0aGF0IGNvdWxkIHRyaWdnZXIgdmlydXMgc2Nhbm5lcnNcclxuICAgICAgLy8gTm8gY29tcHJlc3Npb24sIG5vIGJ1bmRsZSBhbmFseXplciwgbm8gaW1hZ2Ugb3B0aW1pemVyXHJcbiAgICBdLmZpbHRlcihCb29sZWFuKSxcclxuXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgIGFsaWFzOiB7XHJcbiAgICAgICAgJ0AnOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuXHJcbiAgICBidWlsZDoge1xyXG4gICAgICBvdXREaXI6ICdwdWJsaWNfaHRtbCcsXHJcbiAgICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxyXG4gICAgICBzb3VyY2VtYXA6IGZhbHNlLCAvLyBEaXNhYmxlIHNvdXJjZW1hcHNcclxuICAgICAgXHJcbiAgICAgIC8vIFVsdHJhLWNvbnNlcnZhdGl2ZSBidWlsZCBzZXR0aW5nc1xyXG4gICAgICB0YXJnZXQ6ICdlczIwMTUnLCAvLyBDb25zZXJ2YXRpdmUgdGFyZ2V0XHJcbiAgICAgIG1pbmlmeTogJ2VzYnVpbGQnLCAvLyBVc2UgZXNidWlsZCBpbnN0ZWFkIG9mIHRlcnNlclxyXG4gICAgICBcclxuICAgICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICAgIG91dHB1dDoge1xyXG4gICAgICAgICAgLy8gU2ltcGxlIGNodW5raW5nIHRvIGF2b2lkIGNvbXBsZXggcGF0dGVybnNcclxuICAgICAgICAgIG1hbnVhbENodW5rczogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBDbGVhbiBmaWxlIG5hbWluZ1xyXG4gICAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdhc3NldHMvanMvW25hbWVdLmpzJyxcclxuICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAnYXNzZXRzL2pzL1tuYW1lXS5qcycsXHJcbiAgICAgICAgICBhc3NldEZpbGVOYW1lczogKGFzc2V0SW5mbykgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBuYW1lID0gYXNzZXRJbmZvLm5hbWUgfHwgJyc7XHJcbiAgICAgICAgICAgIGlmICgvKHBuZ3xqcGU/Z3xzdmd8Z2lmfHdlYnB8YXZpZikkL2kudGVzdChuYW1lKSkge1xyXG4gICAgICAgICAgICAgIHJldHVybiAnYXNzZXRzL2ltYWdlcy9bbmFtZV1bZXh0bmFtZV0nO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICgvY3NzJC9pLnRlc3QobmFtZSkpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gJ2Fzc2V0cy9jc3MvW25hbWVdLmNzcyc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuICdhc3NldHMvW25hbWVdW2V4dG5hbWVdJztcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICBcclxuICAgICAgICAvLyBFeHRlcm5hbCBkZXBlbmRlbmNpZXMgdGhhdCBtaWdodCBjYXVzZSBpc3N1ZXNcclxuICAgICAgICBleHRlcm5hbDogW10sXHJcbiAgICAgIH0sXHJcbiAgICAgIFxyXG4gICAgICAvLyBDb25zZXJ2YXRpdmUgY2h1bmsgc2l6ZXNcclxuICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxyXG4gICAgICBcclxuICAgICAgLy8gTm8gYXNzZXQgaW5saW5pbmdcclxuICAgICAgYXNzZXRzSW5saW5lTGltaXQ6IDAsXHJcbiAgICB9LFxyXG5cclxuICAgIHNlcnZlcjoge1xyXG4gICAgICBwb3J0OiAzMDAwLFxyXG4gICAgICBob3N0OiAnMC4wLjAuMCcsXHJcbiAgICAgIHN0cmljdFBvcnQ6IHRydWUsXHJcbiAgICAgIG9wZW46IGZhbHNlLCAvLyBEaXNhYmxlIGF1dG8tb3BlblxyXG4gICAgICBwcm94eToge1xyXG4gICAgICAgICdeL2FwaSc6IHtcclxuICAgICAgICAgIHRhcmdldDogaXNQcm9kdWN0aW9uID8gJ2h0dHBzOi8vZ3JhY2VsYW5kcm95YWxhY2FkZW15LmNvbS5uZycgOiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcclxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICAgIHNlY3VyZTogdHJ1ZSxcclxuICAgICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG5cclxuICAgIHByZXZpZXc6IHtcclxuICAgICAgcG9ydDogNDE3MyxcclxuICAgICAgaG9zdDogJzAuMC4wLjAnLFxyXG4gICAgICBzdHJpY3RQb3J0OiB0cnVlLFxyXG4gICAgfSxcclxuXHJcbiAgICBkZWZpbmU6IHtcclxuICAgICAgJ2ltcG9ydC5tZXRhLmVudi5WSVRFX0FQSV9CQVNFX1VSTCc6IEpTT04uc3RyaW5naWZ5KFxyXG4gICAgICAgIGlzUHJvZHVjdGlvbiBcclxuICAgICAgICAgID8gJ2h0dHBzOi8vZ3JhY2VsYW5kcm95YWxhY2FkZW15LmNvbS5uZy9hcGknIFxyXG4gICAgICAgICAgOiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwL2FwaSdcclxuICAgICAgKSxcclxuICAgIH0sXHJcblxyXG4gICAgLy8gQ29uc2VydmF0aXZlIENTUyBoYW5kbGluZ1xyXG4gICAgY3NzOiB7XHJcbiAgICAgIGRldlNvdXJjZW1hcDogZmFsc2UsXHJcbiAgICAgIHByZXByb2Nlc3Nvck9wdGlvbnM6IHt9LFxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBObyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgdGhhdCBjb3VsZCBjYXVzZSBpc3N1ZXNcclxuICAgIGVudlByZWZpeDogJ1ZJVEVfJyxcclxuICB9O1xyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVSxTQUFTLG9CQUFvQjtBQUM3VixPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBRnhCLElBQU0sbUNBQW1DO0FBSXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQ3hDLFFBQU0sZUFBZSxTQUFTO0FBRTlCLFNBQU87QUFBQSxJQUNMLFNBQVM7QUFBQSxNQUNQLE1BQU07QUFBQTtBQUFBLFFBRUosaUJBQWlCO0FBQUEsTUFDbkIsQ0FBQztBQUFBO0FBQUE7QUFBQSxJQUdILEVBQUUsT0FBTyxPQUFPO0FBQUEsSUFFaEIsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxRQUFRLGtDQUFXLEtBQUs7QUFBQSxNQUMvQjtBQUFBLElBQ0Y7QUFBQSxJQUVBLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxNQUNSLGFBQWE7QUFBQSxNQUNiLFdBQVc7QUFBQTtBQUFBO0FBQUEsTUFHWCxRQUFRO0FBQUE7QUFBQSxNQUNSLFFBQVE7QUFBQTtBQUFBLE1BRVIsZUFBZTtBQUFBLFFBQ2IsUUFBUTtBQUFBO0FBQUEsVUFFTixjQUFjO0FBQUE7QUFBQSxVQUdkLGdCQUFnQjtBQUFBLFVBQ2hCLGdCQUFnQjtBQUFBLFVBQ2hCLGdCQUFnQixDQUFDLGNBQWM7QUFDN0Isa0JBQU0sT0FBTyxVQUFVLFFBQVE7QUFDL0IsZ0JBQUksa0NBQWtDLEtBQUssSUFBSSxHQUFHO0FBQ2hELHFCQUFPO0FBQUEsWUFDVDtBQUNBLGdCQUFJLFFBQVEsS0FBSyxJQUFJLEdBQUc7QUFDdEIscUJBQU87QUFBQSxZQUNUO0FBQ0EsbUJBQU87QUFBQSxVQUNUO0FBQUEsUUFDRjtBQUFBO0FBQUEsUUFHQSxVQUFVLENBQUM7QUFBQSxNQUNiO0FBQUE7QUFBQSxNQUdBLHVCQUF1QjtBQUFBO0FBQUEsTUFHdkIsbUJBQW1CO0FBQUEsSUFDckI7QUFBQSxJQUVBLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLFlBQVk7QUFBQSxNQUNaLE1BQU07QUFBQTtBQUFBLE1BQ04sT0FBTztBQUFBLFFBQ0wsU0FBUztBQUFBLFVBQ1AsUUFBUSxlQUFlLHlDQUF5QztBQUFBLFVBQ2hFLGNBQWM7QUFBQSxVQUNkLFFBQVE7QUFBQSxVQUNSLFNBQVMsQ0FBQyxTQUFTO0FBQUEsUUFDckI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBRUEsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sWUFBWTtBQUFBLElBQ2Q7QUFBQSxJQUVBLFFBQVE7QUFBQSxNQUNOLHFDQUFxQyxLQUFLO0FBQUEsUUFDeEMsZUFDSSw2Q0FDQTtBQUFBLE1BQ047QUFBQSxJQUNGO0FBQUE7QUFBQSxJQUdBLEtBQUs7QUFBQSxNQUNILGNBQWM7QUFBQSxNQUNkLHFCQUFxQixDQUFDO0FBQUEsSUFDeEI7QUFBQTtBQUFBLElBR0EsV0FBVztBQUFBLEVBQ2I7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
