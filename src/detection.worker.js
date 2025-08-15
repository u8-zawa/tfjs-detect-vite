import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { SCORE_THRESHOLD, MODEL_CONFIG } from './config.js';

let model = null;
let isReady = false;

// --- Worker共通エラーハンドラー ---
function handleWorkerError(error, context = 'Worker') {
    console.error(`${context}エラー:`, error);
    self.postMessage({
        type: 'error',
        payload: { message: error.message || 'Worker内でエラーが発生しました' }
    });
}

// メインスレッドからのメッセージを受け取るリスナー
self.onmessage = async (event) => {
    const { type, payload } = event.data;
    try {
        switch (type) {
            case 'init':
                await initialize();
                break;
            case 'predict':
                if (isReady && payload) {
                    // imageDataからテンソルを作成
                    const tensor = tf.browser.fromPixels(payload);

                    try {
                        // モデルで物体を検出 (非同期処理の完了を待つ)
                        const predictions = await model.detect(tensor, undefined, SCORE_THRESHOLD);

                        // 検出結果をメインスレッドに送信
                        self.postMessage({ type: 'result', payload: predictions });

                    } catch (error) {
                        console.error("物体検出エラー:", error.message, "- 検出をスキップします");
                    } finally {
                        // try...finally を使うことで、成功・失敗に関わらずメモリを確実に解放
                        tensor.dispose();
                        // ImageBitmapはWorkerが所有権を持つので、使い終わったら閉じる
                        payload.close();
                    }
                }
                break;
        }
    } catch (error) {
        handleWorkerError(error, `メッセージ[${type}]の処理`);
    }
};

// Workerの初期化関数
async function initialize() {
    try {
        // WebGLバックエンドを設定
        await tf.setBackend('webgl');
        await tf.ready();

        model = await cocoSsd.load(MODEL_CONFIG);

        isReady = true;
        self.postMessage({ type: 'ready' });

    } catch (error) {
        handleWorkerError(error, 'Worker初期化');
    }
}
