import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        // 古いブラウザのサポートを無効にし、バンドルサイズを削減
        target: 'esnext',
        // ソースマップを生成しない
        sourcemap: false,
        // コードの圧縮を有効化
        minify: 'terser',
        terserOptions: {
            compress: {
                // 本番ビルドからconsole.logを削除
                drop_console: true,
                drop_debugger: true,
            },
        },
    },
    server: {
        // HTTPSを有効にすると、特にモバイルデバイスでのカメラアクセスが安定します
        // https: true, // 必要に応じてコメントを解除し、`vite-plugin-mkcert` などを追加してください
    }
});