import { VIDEO_WIDTH, VIDEO_HEIGHT } from './config.js';
import { elements } from './ui.js';

/**
 * ユーザーのカメラにアクセスし、ビデオストリームをセットアップします。
 * 成功すると、ビデオ要素の準備ができたことを示すPromiseを返します。
 * @returns {Promise<HTMLVideoElement>} セットアップが完了したビデオ要素で解決されるPromise。
 * @throws {Error} カメラAPIがサポートされていない場合、またはストリームの取得に失敗した場合にエラーをスローします。
 * @sideEffects ビデオ要素の`srcObject`を設定し、キャンバスのサイズをビデオのサイズに合わせます。
 */
export async function setupCamera() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("このブラウザはカメラAPIをサポートしていません。");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      'audio': false,
      'video': {
        facingMode: 'environment',
        width: { ideal: VIDEO_WIDTH },
        height: { ideal: VIDEO_HEIGHT }
      },
    });

    if (!stream) {
      throw new Error("カメラストリームの取得に失敗しました。");
    }

    elements.video.srcObject = stream;

    return new Promise((resolve, reject) => {
      elements.video.onloadedmetadata = () => {
        if (elements.video.videoWidth === 0 || elements.video.videoHeight === 0) {
          reject(new Error("無効なビデオサイズが検出されました。"));
          return;
        }
        elements.canvas.width = elements.video.videoWidth;
        elements.canvas.height = elements.video.videoHeight;
        resolve(elements.video);
      };
      elements.video.onerror = () => {
        reject(new Error("ビデオの読み込みでエラーが発生しました。"));
      };
    });
  } catch (error) {
    console.error('カメラセットアップでエラーが発生しました:', error);
    throw error;
  }
}