import { state } from './state.js';
import { startLoop, stopLoop } from './loop.js';

/**
 * アプリケーションで使用される主要なDOM要素のコレクション。
 * @type {{
 *   video: HTMLVideoElement,
 *   canvas: HTMLCanvasElement,
 *   loading: HTMLElement,
 *   main: HTMLElement,
 *   errorMessage: HTMLElement,
 *   fpsCounter: HTMLElement,
 *   detection: HTMLInputElement,
 *   progressBar: HTMLElement
 * }}
 */
export const elements = {
  video: document.getElementById('webcam'),
  canvas: document.getElementById('canvas'),
  loading: document.getElementById('loading'),
  main: document.getElementById('main'),
  errorMessage: document.getElementById('error-message'),
  fpsCounter: document.getElementById('fps-counter'),
  detection: document.getElementById('detection-toggle'),
  progressBar: document.getElementById('progress-bar')
};

/**
 * 検出結果を描画するためのCanvas 2Dコンテキスト。
 * @type {CanvasRenderingContext2D}
 */
export const ctx = elements.canvas.getContext('2d');

/**
 * UI要素にイベントリスナーを設定します。
 * @sideEffects DOMにイベントリスナーを追加します。
 */
export function setupEventListeners() {
  elements.detection.addEventListener('change', (event) => {
    state.isDetectionEnabled = event.target.checked;
    if (state.isDetectionEnabled) {
      startLoop();
    } else {
      stopLoop();
    }
  });
}

/**
 * エラーメッセージを表示し、メインコンテンツを非表示にします。
 * @param {string} message - 表示するエラーメッセージ。
 * @sideEffects DOMのクラスリストとテキストコンテンツを変更します。
 */
export function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.classList.remove('hidden');
  elements.loading.classList.add('hidden');
  elements.main.classList.add('hidden');
}

/**
 * FPSカウンターの表示を更新します。
 * @param {number} fps - 表示するFPS値。
 * @sideEffects DOMのテキストコンテンツを変更します。
 */
export function updateFpsCounter(fps) {
  elements.fpsCounter.textContent = fps.toFixed(1);
}

/**
 * ローディングインジケーターを表示します。
 * @sideEffects DOMのクラスリストを変更します。
 */
export function showLoading() {
  elements.loading.classList.remove('hidden');
  elements.main.classList.add('hidden');
}

/**
 * メインコンテンツを表示します。
 * @sideEffects DOMのクラスリストを変更します。
 */
export function showMain() {
  elements.loading.classList.add('hidden');
  elements.main.classList.remove('hidden');
}