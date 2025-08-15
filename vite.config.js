import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
    return {
        base: command === 'build' ? '/tfjs-detect-vite/' : './',
        build: {
            target: 'esnext',
            sourcemap: false,
            minify: 'terser',
            terserOptions: {
                compress: {
                    drop_console: true,
                    drop_debugger: true,
                },
            },
        },
        server: {
            // https: true,
        }
    }
});