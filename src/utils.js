// src/utils.js

/**
 * Canvasにバウンディングボックスとラベルを描画する
 * @param {CanvasRenderingContext2D} ctx - Canvasの2Dコンテキスト
 * @param {number} x - ボックスのx座標
 * @param {number} y - ボックスのy座標
 * @param {number} width - ボックスの幅
 * @param {number} height - ボックスの高さ
 * @param {string} text - 表示するラベルテキスト
 * @param {string} color - 描画色
 */
export function drawBoundingBox(ctx, x, y, width, height, text, color = '#00FFFF') {
  // スタイルを設定
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.fillStyle = color;
  ctx.font = '16px Arial';
  ctx.textBaseline = 'top';

  // バウンディングボックスを描画
  ctx.strokeRect(x, y, width, height);

  // ラベルの背景を描画
  const textWidth = ctx.measureText(text).width;
  ctx.fillRect(x, y, textWidth + 8, 20);

  // ラベルテキストを描画
  ctx.fillStyle = '#000000';
  ctx.fillText(text, x + 4, y + 2);
}