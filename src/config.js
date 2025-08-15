/**
 * 検出結果の信頼度の閾値。この値未満のスコアの検出結果は無視されます。
 * @type {number}
 */
export const SCORE_THRESHOLD = 0.5;

/**
 * TensorFlow.jsのCOCO-SSDモデルの設定オブジェクト。
 * @type {object}
 */
export const MODEL_CONFIG = {
  // coco-ssdのデフォルト設定を使用するため、空オブジェクトまたは具体的な設定
};

/**
 * FPSカウンターの更新間隔（ミリ秒）。
 * @type {number}
 */
export const FPS_UPDATE_INTERVAL = 1000; // ms

/**
 * カメラ映像の理想的な幅。
 * @type {number}
 */
export const VIDEO_WIDTH = 640;

/**
 * カメラ映像の理想的な高さ。
 * @type {number}
 */
export const VIDEO_HEIGHT = 480;

/**
 * 物体検出を実行するフレームの間隔。
 * 例えば、2の場合、1フレームおきに検出が実行されます。
 * @type {number}
 */
export const FRAME_SKIP = 2;