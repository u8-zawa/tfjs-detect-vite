import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

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
    try {
        const { type, payload } = event.data;

        if (type === 'init') {
            await initialize(payload.backend);
        } else if (type === 'detect' && isReady) {
            detectObjects(payload.frame);
        }
    } catch (error) {
        handleWorkerError(error, 'メッセージ処理');
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
        handleWorkerError(error, 'Worker初期化');
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

    } catch (error) {
        console.error("物体検出エラー:", error.message, "- 検出をスキップします");
    } finally {
        // try...finally を使うことで、成功・失敗に関わらずメモリを確実に解放
        tensor.dispose();
        // ImageBitmapはWorkerが所有権を持つので、使い終わったら閉じる
        frame.close();
    }
}