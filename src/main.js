// --- DOM要素の取得 ---
const elements = {
  video: document.getElementById('webcam'),
  canvas: document.getElementById('canvas'),
  loading: document.getElementById('loading'),
  main: document.getElementById('main'),
  errorMessage: document.getElementById('error-message'),
  fpsCounter: document.getElementById('fps-counter'),
  detectionToggle: document.getElementById('detection-toggle'),
  progressBar: document.getElementById('progress-bar')
};
const ctx = elements.canvas.getContext('2d');

// --- グローバル変数 ---
let isDetectionActive = true;
let animationFrameId = null;
let lastFrameTime = 0;
const frameSkip = 2;
let frameCount = 0;

// 状態管理フラグ
let isCameraReady = false;
let isWorkerReady = false;

// Web Workerを初期化
const detectionWorker = new Worker(new URL('./detection.worker.js', import.meta.url), {
  type: 'module'
});

// --- メイン初期化処理 ---
async function initialize() {
  try {
    // UIイベントリスナーを先に設定
    setupEventListeners();

    // Workerに初期化メッセージを送信
    detectionWorker.postMessage({ type: 'init', payload: { backend: 'webgl' } });

    // カメラのセットアップ
    await setupCamera();
    isCameraReady = true;

    // requestAnimationFrame は常に動かし続ける
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);

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
detectionWorker.onmessage = (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'ready':
      isWorkerReady = true;
      elements.loading.classList.add('hidden');
      elements.main.classList.remove('hidden');
      break;
    case 'detectionResult':
      renderPredictions(payload.predictions);
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
  elements.detectionToggle.addEventListener('change', (e) => {
    isDetectionActive = e.target.checked;
    if (!isDetectionActive) {
      ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    }
  });
}

// --- ループ関数 ---
async function gameLoop() {
  // 早期return による条件チェック（ガード節）
  if (!isCameraReady) {
    frameCount++;
    calculateFPS();
    animationFrameId = requestAnimationFrame(gameLoop);
    return;
  }
  
  if (!isWorkerReady) {
    frameCount++;
    calculateFPS();
    animationFrameId = requestAnimationFrame(gameLoop);
    return;
  }
  
  if (!isDetectionActive) {
    frameCount++;
    calculateFPS();
    animationFrameId = requestAnimationFrame(gameLoop);
    return;
  }
  
  if (elements.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    frameCount++;
    calculateFPS();
    animationFrameId = requestAnimationFrame(gameLoop);
    return;
  }
  
  if (elements.video.videoWidth <= 0 || elements.video.videoHeight <= 0) {
    frameCount++;
    calculateFPS();
    animationFrameId = requestAnimationFrame(gameLoop);
    return;
  }
  
  if (frameCount % frameSkip !== 0) {
    frameCount++;
    calculateFPS();
    animationFrameId = requestAnimationFrame(gameLoop);
    return;
  }

  // メインの検出処理（ネストなし）
  try {
    const frame = await createImageBitmap(elements.video);
    detectionWorker.postMessage({ type: 'detect', payload: { frame } }, [frame]);
  } catch (e) {
    // このエラーはタブが非アクティブな場合などに発生するため、警告としてログ出力
    console.warn("フレーム処理エラー:", e.message, "- フレームをスキップします");
  }

  frameCount++;
  calculateFPS();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// --- 検出結果の描画 ---
function renderPredictions(predictions) {
  ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  ctx.font = '16px Arial';
  ctx.textBaseline = 'top';

  predictions.forEach(prediction => {
    // 早期return によるスコア閾値チェック
    if (prediction.score < 0.5) return;

    const [x, y, width, height] = prediction.bbox;
    const label = `${prediction.class} (${Math.round(prediction.score * 100)}%)`;

    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = '#00FFFF';
    const textWidth = ctx.measureText(label).width;
    ctx.fillRect(x, y, textWidth + 8, 20);

    ctx.fillStyle = '#000000';
    ctx.fillText(label, x + 4, y + 2);
  });
}

// --- FPSカウンター ---
function calculateFPS() {
  const now = performance.now();
  const delta = (now - lastFrameTime) / 1000;
  lastFrameTime = now;
  elements.fpsCounter.textContent = (1 / delta).toFixed(1);
}

// --- アプリケーションの開始 ---
initialize();