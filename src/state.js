/**
 * @typedef {object} AppState
 * @property {boolean} isDetectionEnabled - 物体検出が有効かどうかを示すフラグ。
 * @property {AbortController | null} loopController - メインループを制御するためのAbortController。
 * @property {number} lastFrameTime - 最後のフレームが処理されたタイムスタンプ。
 * @property {number} frameCount - 処理されたフレームの総数。
 * @property {boolean} isCameraReady - カメラの準備が完了したかどうかを示すフラグ。
 * @property {boolean} isWorkerReady - Web Workerの準備が完了したかどうかを示すフラグ。
 * @property {Worker | null} detectionWorker - 物体検出を実行するWeb Workerのインスタンス。
 */

/**
 * アプリケーション全体の状態を管理するオブジェクト。
 * @type {AppState}
 */
export const state = {
  isDetectionEnabled: true,
  loopController: null,
  lastFrameTime: 0,
  frameCount: 0,
  isCameraReady: false,
  isWorkerReady: false,
  detectionWorker: null,
};