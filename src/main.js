import { FPS_UPDATE_INTERVAL } from './config.js';
import { drawBoundingBox } from './utils.js';

// --- DOM要素の取得 ---
const elements = {
  video: document.getElementById('webcam'),
  canvas: document.getElementById('canvas'),
  loading: document.getElementById('loading'),
  main: document.getElementById('main'),
  errorMessage: document.getElementById('error-message'),
  fpsCounter: document.getElementById('fps-counter'),
  detection: document.getElementById('detection-toggle'),
  progressBar: document.getElementById('progress-bar')
};
const ctx = elements.canvas.getContext('2d');

// --- 状態管理 ---
const state = {
  isDetectionEnabled: true,
  loopController: null,
  lastFrameTime: 0,
  frameCount: 0,
  isCameraReady: false,
  isWorkerReady: false,
  detectionWorker: null,
};

const frameSkip = 2; // フレームスキップは定数として維持

// Web Workerを初期化
state.detectionWorker = new Worker(new URL('./detection.worker.js', import.meta.url), {
  type: 'module'
});

// --- メイン初期化処理 ---
async function initialize() {
  try {
    // UIイベントリスナーを先に設定
    setupEventListeners();

    // Workerに初期化メッセージを送信
    state.detectionWorker.postMessage({ type: 'init' });

    // カメラのセットアップ
    await setupCamera();
    state.isCameraReady = true;

    // ループを開始
    startLoop();

  } catch (error) {
    // 具体的なエラーメッセージを提供
    const errorMessage = error.message.includes('MediaDevices') || error.message.includes('getUserMedia')
      ? '初期化に失敗しました。カメラのアクセス権限を確認するか、ページをリフレッシュしてください。'
      : error.message;
    showError(errorMessage);
    console.error('初期化エラー:', error);
  }
}

// --- Workerからのメッセージを処理 ---
state.detectionWorker.onmessage = (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'ready':
      state.isWorkerReady = true;
      elements.loading.classList.add('hidden');
      elements.main.classList.remove('hidden');
      break;
    case 'result':
      renderPredictions(payload);
      break;
    case 'error':
      showError(payload.message);
      break;
  }
};

// --- 共通エラーハンドラー ---
function handleError(error, context = 'アプリケーション') {
  console.error(`${context}エラー:`, error);
  const message = error.message || 'エラーが発生しました';
  showError(`エラー: ${message}`);
}

// --- エラー表示 ---
function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.classList.remove('hidden');
  elements.loading.classList.add('hidden');
  elements.main.classList.add('hidden');
}

// --- カメラのセットアップ ---
async function setupCamera() {
  try {
    // 早期return によるブラウザサポートチェック
    if (!navigator.mediaDevices) {
      throw new Error("このブラウザはMediaDevices APIをサポートしていません。");
    }
    
    if (!navigator.mediaDevices.getUserMedia) {
      throw new Error("このブラウザはgetUserMedia APIをサポートしていません。");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      'audio': false,
      'video': {
        facingMode: 'environment',
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
    });
    
    // ストリーム取得の早期チェック
    if (!stream) {
      throw new Error("カメラストリームの取得に失敗しました。");
    }
    
    elements.video.srcObject = stream;

    return new Promise((resolve, reject) => {
      elements.video.onloadedmetadata = () => {
        // ビデオサイズの早期チェック
        if (elements.video.videoWidth === 0 || elements.video.videoHeight === 0) {
          reject(new Error("無効なビデオサイズが検出されました。"));
          return;
        }
        
        elements.canvas.width = elements.video.videoWidth;
        elements.canvas.height = elements.video.videoHeight;
        resolve(elements.video);
      };
      
      // タイムアウト処理を追加
      elements.video.onerror = () => {
        reject(new Error("ビデオの読み込みでエラーが発生しました。"));
      };
    });
  } catch (error) {
    handleError(error, 'カメラセットアップ');
    throw error; // 上位のinitialize()でキャッチされるため再スロー
  }
}

// --- UIイベントリスナー ---
function setupEventListeners() {
  elements.detection.addEventListener('change', (event) => {
    state.isDetectionEnabled = event.target.checked;
    if (state.isDetectionEnabled) {
      startLoop();
    } else {
      stopLoop();
    }
  });
}

// --- ループ制御 ---
function startLoop() {
  if (state.loopController) state.loopController.abort(); // 既存のループを停止
  state.loopController = new AbortController();
  const signal = state.loopController.signal;

  const loop = (timestamp) => {
    if (signal.aborted) return;
    gameLoop(timestamp);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function stopLoop() {
  if (state.loopController) {
    state.loopController.abort();
    state.loopController = null;
  }
  // キャンバスをクリア
  ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
}

// --- ループ関数 ---
async function gameLoop() {
  // 早期return による条件チェック（ガード節）
  if (!state.isCameraReady || !state.isWorkerReady || elements.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || elements.video.videoWidth <= 0 || elements.video.videoHeight <= 0) {
    calculateFPS();
    return;
  }

  if (state.frameCount % frameSkip !== 0) {
    state.frameCount++;
    calculateFPS();
    return;
  }

  // メインの検出処理（ネストなし）
  try {
    const frame = await createImageBitmap(elements.video);
    state.detectionWorker.postMessage({ type: 'predict', payload: frame }, [frame]);
  } catch (e) {
    // このエラーはタブが非アクティブな場合などに発生するため、警告としてログ出力
    console.warn("フレーム処理エラー:", e.message, "- フレームをスキップします");
  }

  state.frameCount++;
  calculateFPS();
}

// --- 検出結果の描画 ---
function renderPredictions(predictions) {
  ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  predictions.forEach(prediction => {
    // 早期return によるスコア閾値チェック
    if (prediction.score < 0.5) return;

    const [x, y, width, height] = prediction.bbox;
    const label = `${prediction.class} (${Math.round(prediction.score * 100)}%)`;
    drawBoundingBox(ctx, x, y, width, height, label);
  });
}

// --- FPSカウンター ---
let lastFpsUpdateTime = 0;
function calculateFPS() {
  const now = performance.now();
  if (!state.lastFrameTime) {
    state.lastFrameTime = now;
  }
  const delta = now - state.lastFrameTime;
  state.lastFrameTime = now;
  const fps = 1000 / delta;

  // UIの更新を間引く
  if (now - lastFpsUpdateTime > FPS_UPDATE_INTERVAL) {
    elements.fpsCounter.textContent = fps.toFixed(1);
    lastFpsUpdateTime = now;
  }
}

// --- アプリケーションの開始 ---
initialize();