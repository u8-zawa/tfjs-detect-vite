import { state } from './state.js';
import { elements, ctx, updateFpsCounter } from './ui.js';
import { FRAME_SKIP, FPS_UPDATE_INTERVAL, SCORE_THRESHOLD } from './config.js';
import { drawBoundingBox } from './utils.js';

/**
 * @typedef {object} Prediction
 * @property {number[]} bbox - バウンディングボックスの位置とサイズ `[x, y, width, height]`。
 * @property {string} class - 検出されたオブジェクトのクラス名。
 * @property {number} score - 検出の信頼度スコア。
 */

/** @type {number} - FPSの最終更新時刻を記録するタイムスタンプ。 */
let lastFpsUpdateTime = 0;

/**
 * FPS（Frames Per Second）を計算し、UIを更新します。
 * @sideEffects `state.lastFrameTime`を更新し、`updateFpsCounter`を呼び出してUIを更新する場合があります。
 */
function calculateFPS() {
  const now = performance.now();
  if (!state.lastFrameTime) {
    state.lastFrameTime = now;
  }
  const delta = now - state.lastFrameTime;
  state.lastFrameTime = now;
  const fps = 1000 / delta;

  if (now - lastFpsUpdateTime > FPS_UPDATE_INTERVAL) {
    updateFpsCounter(fps);
    lastFpsUpdateTime = now;
  }
}

/**
 * メインのゲームループ。ビデオフレームを取得し、Web Workerに送信して物体検出を行います。
 * @returns {Promise<void>}
 * @sideEffects `state.frameCount`をインクリメントし、`state.detectionWorker`にメッセージを送信します。
 */
async function gameLoop() {
  if (!state.isCameraReady || !state.isWorkerReady || elements.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || elements.video.videoWidth <= 0 || elements.video.videoHeight <= 0) {
    calculateFPS();
    return;
  }

  if (state.frameCount % FRAME_SKIP !== 0) {
    state.frameCount++;
    calculateFPS();
    return;
  }

  try {
    const frame = await createImageBitmap(elements.video);
    state.detectionWorker.postMessage({ type: 'predict', payload: frame }, [frame]);
  } catch (e) {
    console.warn("フレーム処理エラー:", e.message, "- フレームをスキップします");
  }

  state.frameCount++;
  calculateFPS();
}

/**
 * 検出結果をキャンバスに描画します。
 * @param {Prediction[]} predictions - 描画する検出結果の配列。
 * @sideEffects キャンバスの内容をクリアし、バウンディングボックスを描画します。
 */
export function renderPredictions(predictions) {
  ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  predictions.forEach(prediction => {
    if (prediction.score < SCORE_THRESHOLD) return;

    const [x, y, width, height] = prediction.bbox;
    const label = `${prediction.class} (${Math.round(prediction.score * 100)}%)`;
    drawBoundingBox(ctx, x, y, width, height, label);
  });
}

/**
 * メインループを開始します。
 * @sideEffects `state.loopController`を新しい`AbortController`で更新し、`requestAnimationFrame`を呼び出します。
 */
export function startLoop() {
  if (state.loopController) state.loopController.abort();
  state.loopController = new AbortController();
  const signal = state.loopController.signal;

  const loop = (timestamp) => {
    if (signal.aborted) return;
    gameLoop(timestamp);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/**
 * メインループを停止します。
 * @sideEffects `state.loopController`を中止して`null`に設定し、キャンバスをクリアします。
 */
export function stopLoop() {
  if (state.loopController) {
    state.loopController.abort();
    state.loopController = null;
  }
  ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
}