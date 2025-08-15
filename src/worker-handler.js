import { state } from './state.js';
import { showMain, showError } from './ui.js';
import { renderPredictions } from './loop.js';

/**
 * 物体検出を行うWeb Workerをセットアップし、メッセージハンドラを設定します。
 * Workerは初期化メッセージを受け取ると'ready'メッセージを返し、
 * その後'predict'メッセージに応じて検出結果を'result'メッセージとして返します。
 * @sideEffects
 * - `state.detectionWorker`にWorkerインスタンスを格納します。
 * - Workerからのメッセージに応じて`state.isWorkerReady`を更新します。
 * - Workerの準備完了時やエラー発生時にUI（`showMain`, `showError`）を更新します。
 * - 検出結果を`renderPredictions`に渡して描画します。
 */
export function setupWorker() {
  state.detectionWorker = new Worker(new URL('./detection.worker.js', import.meta.url), {
    type: 'module'
  });

  state.detectionWorker.onmessage = (event) => {
    const { type, payload } = event.data;

    switch (type) {
      case 'ready':
        state.isWorkerReady = true;
        showMain();
        break;
      case 'result':
        renderPredictions(payload);
        break;
      case 'error':
        showError(payload.message);
        break;
    }
  };

  state.detectionWorker.postMessage({ type: 'init' });
}