import { setupEventListeners, showError } from './ui.js';
import { setupCamera } from './camera.js';
import { setupWorker } from './worker-handler.js';
import { startLoop } from './loop.js';
import { state } from './state.js';

/**
 * アプリケーションを初期化します。
 * イベントリスナー、Web Worker、カメラをセットアップし、メインループを開始します。
 * 初期化中にエラーが発生した場合は、エラーメッセージを表示します。
 * @returns {Promise<void>}
 * @sideEffects
 * - DOMにイベントリスナーを設定します。
 * - Web Workerを生成し、`state`に格納します。
 * - カメラをセットアップし、`state`を更新します。
 * - メインループを開始します。
 * - エラー発生時にUIにエラーメッセージを表示します。
 */
async function initialize() {
  try {
    setupEventListeners();
    setupWorker();
    await setupCamera();
    state.isCameraReady = true;
    startLoop();
  } catch (error) {
    const errorMessage = error.message.includes('MediaDevices') || error.message.includes('getUserMedia')
      ? '初期化に失敗しました。カメラのアクセス権限を確認するか、ページをリフレッシュしてください。'
      : error.message;
    showError(errorMessage);
    console.error('初期化エラー:', error);
  }
}

initialize();