import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

let model = null;
let isReady = false;

// メインスレッドからのメッセージを受け取るリスナー
self.onmessage = async (event) => {
    const { type, payload } = event.data;

    if (type === 'init') {
        await initialize(payload.backend);
    } else if (type === 'detect' && isReady) {
        detectObjects(payload.frame);
    }
};

// Workerの初期化関数
async function initialize(backend) {
    try {
        await tf.setBackend(backend);
        await tf.ready();

        model = await cocoSsd.load();

        isReady = true;
        self.postMessage({ type: 'ready' });

    } catch (error) {
        console.error("Worker initialization failed:", error);
        self.postMessage({ type: 'error', payload: { message: 'モデルの読み込みに失敗しました。' } });
    }
}

// 物体検出を実行する関数
async function detectObjects(frame) {
    if (!model || !frame) {
        return;
    }

    // imageDataからテンソルを作成
    const tensor = tf.browser.fromPixels(frame);

    try {
        // モデルで物体を検出 (非同期処理の完了を待つ)
        const predictions = await model.detect(tensor);

        // 検出結果をメインスレッドに送信
        self.postMessage({ type: 'detectionResult', payload: { predictions } });

    } catch (e) {
        console.error("Detection failed:", e);
    } finally {
        // try...finally を使うことで、成功・失敗に関わらずメモリを確実に解放
        tensor.dispose();
        // ImageBitmapはWorkerが所有権を持つので、使い終わったら閉じる
        frame.close();
    }
}