// Canvas 高清屏适配工具类
export class CanvasHelper {
    static setupHighDPICanvas(canvas, ctx, canvasWidth, canvasHeight, computeHeightFunc) {
        // 获取设备像素比
        const dpr = window.devicePixelRatio || 1;
        
        // 以左侧面板实际内容高度为目标高度（图片展示区 + 控制区 + 间距），至少500px
        const targetDisplayHeight = Math.max(500, computeHeightFunc ? computeHeightFunc() : 500);
        const displayWidth = canvasWidth || 600;
        const displayHeight = targetDisplayHeight;
        
        // 设置Canvas的实际像素尺寸（同时会重置变换矩阵）
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        
        // 设置Canvas的CSS显示尺寸
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        // 缩放绘图上下文以匹配设备像素比
        ctx.scale(dpr, dpr);
        
        // 启用更好的图像平滑
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        return {
            displayWidth,
            displayHeight,
            dpr
        };
    }

    static setupHighDPICanvasWith(canvas, ctx, displayWidth, displayHeight) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        // 重置scale（设置width/height已重置变换，这里再次设置）
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    }

    // 计算左侧面板实际内容高度（避免被右侧列撑高）
    static computeLeftPanelContentHeight() {
        const lp = document.querySelector('.left-panel');
        if (!lp) return 500;
        const img = lp.querySelector('.image-showcase');
        const ctrl = lp.querySelector('.game-controls');
        const styles = window.getComputedStyle(lp);
        const gap = parseFloat(styles.gap || '0') || 0;
        const imgH = img ? img.offsetHeight : 0;
        const ctrlH = ctrl ? ctrl.offsetHeight : 0;
        const paddingTop = parseFloat(styles.paddingTop || '0') || 0;
        const paddingBottom = parseFloat(styles.paddingBottom || '0') || 0;
        return imgH + ctrlH + gap + paddingTop + paddingBottom;
    }
}

