import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolveBase } from './src/utils/basePath.ts'

/**
 * La base debe coincidir con la ruta del repositorio en GitHub Pages.
 *
 * - En desarrollo se sirve en la raiz ("/").
 * - En produccion se usa `/<nombre-repo>/` (por defecto "/f-movies/").
 * - Puedes sobrescribirla con `VITE_BASE` (por ejemplo VITE_BASE=/mi-repo/).
 * - En GitHub Actions, `GITHUB_REPOSITORY` aporta el nombre del repositorio.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'f-movies'
  const base = resolveBase({ mode, repo: repoName, override: env.VITE_BASE })

  return {
    base,
    plugins: [react()],
    build: {
      target: 'es2020',
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 900,
    },
    // No precargar los modulos pesados de conversion al iniciar.
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    worker: {
      format: 'es',
    },
  }
})
