// --- DOM要素の取得 ---
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const loadingStatus = document.getElementById('loading');
const mainContent = document.getElementById('main');
const errorMessage = document.getElementById('error-message');
const fpsCounter = document.getElementById('fps-counter');
const detectionToggle = document.getElementById('detection-toggle');
const progressBar = document.getElementById('progress-bar');

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
    console.error("Initialization failed:", error);
    showError("初期化に失敗しました。カメラのアクセス権限を確認するか、ページをリフレッシュしてください。");
  }
}

// --- Workerからのメッセージを処理 ---
detectionWorker.onmessage = (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'ready':
      isWorkerReady = true;
      loadingStatus.classList.add('hidden');
      mainContent.classList.remove('hidden');
      break;
    case 'detectionResult':
      renderPredictions(payload.predictions);
      break;
    case 'error':
      showError(payload.message);
      break;
  }
};

// --- エラー表示 ---
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
  loadingStatus.classList.add('hidden');
  mainContent.classList.add('hidden');
}

// --- カメラのセットアップ ---
async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("このブラウザはカメラAPIをサポートしていません。");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'environment',
      width: { ideal: 640 },
      height: { ideal: 480 }
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      resolve(video);
    };
  });
}

// --- UIイベントリスナー ---
function setupEventListeners() {
  detectionToggle.addEventListener('change', (e) => {
    isDetectionActive = e.target.checked;
    if (!isDetectionActive) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });
}

// --- ループ関数 ---
async function gameLoop() {
  // すべての準備が整っているか、より厳密にチェック
  const canDetect =
    isCameraReady &&
    isWorkerReady &&
    isDetectionActive &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0;

  if (canDetect && frameCount % frameSkip === 0) {
    try {
      const frame = await createImageBitmap(video);
      detectionWorker.postMessage({ type: 'detect', payload: { frame } }, [frame]);
    } catch (e) {
      // このエラーはタブが非アクティブな場合などに発生するため、警告としてログ出力
      console.warn("Frame creation failed, skipping this frame:", e.message);
    }
  }

  frameCount++;
  calculateFPS();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// --- 検出結果の描画 ---
function renderPredictions(predictions) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '16px Arial';
  ctx.textBaseline = 'top';

  predictions.forEach(prediction => {
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
  fpsCounter.textContent = (1 / delta).toFixed(1);
}

// --- アプリケーションの開始 ---
initialize();