// content.js
const gestureActions = {
    '↓←': { name: 'Back' },
    '↓→': { name: 'Forward' },
    '↗': { name: 'Refresh' },
};

function simplifyPath(points) {
    if (points.length < 2) return '';
    const start = points[0];
    const end = points[points.length - 1];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const getDir = (a) => {
        if (a >= -30 && a < 30) return '→';
        if (a >= 30 && a < 60) return '↘';
        if (a >= 60 && a < 120) return '↓';
        if (a >= 120 && a < 150) return '↙';
        if (a >= 150 || a < -150) return '←';
        if (a >= -150 && a < -120) return '↖';
        if (a >= -120 && a < -60) return '↑';
        if (a >= -60 && a < -30) return '↗';
        return '';
    };

    const firstDir = getDir(angle);

    let maxDist = 0;
    let cornerIndex = -1;
    for (let i = 1; i < points.length - 1; i++) {
        const [x0, y0] = start;
        const [x1, y1] = end;
        const [px, py] = points[i];
        const dist = Math.abs((y1 - y0) * px - (x1 - x0) * py + x1 * y0 - y1 * x0) / Math.hypot(y1 - y0, x1 - x0);
        if (dist > maxDist) {
            maxDist = dist;
            cornerIndex = i;
        }
    }

    if (maxDist > 30 && cornerIndex > 2 && cornerIndex < points.length - 3) {
        const mid = points[cornerIndex];
        const angle1 = Math.atan2(mid[1] - start[1], mid[0] - start[0]) * (180 / Math.PI);
        const angle2 = Math.atan2(end[1] - mid[1], end[0] - mid[0]) * (180 / Math.PI);
        return getDir(angle1) + getDir(angle2);
    } else {
        return firstDir;
    }
}

function pathToSvgD(points) {
    if (points.length === 0) return '';
    return points.map(([x, y], i) => (i === 0 ? `M${x} ${y}` : `L${x} ${y}`)).join(' ');
}

let isRightMouseDown = false;
let path = [];
let shouldPreventMenu = false;
let trailCanvas, trailCtx;
let trailTimeout = null;

function createTrailCanvas() {
    trailCanvas = document.createElement('canvas');
    Object.assign(trailCanvas.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: '999999',
    });
    trailCanvas.width = window.innerWidth;
    trailCanvas.height = window.innerHeight;
    document.documentElement.appendChild(trailCanvas);
    trailCtx = trailCanvas.getContext('2d');
    trailCtx.lineWidth = 2;
}

function clearTrailCanvas() {
    trailCanvas?.remove();
    trailCanvas = null;
    trailCtx = null;
}

function drawTrail(points, strokeStyle = 'red') {
    if (!trailCtx || points.length < 2) return;
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    trailCtx.strokeStyle = strokeStyle;
    trailCtx.beginPath();
    trailCtx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        trailCtx.lineTo(points[i][0], points[i][1]);
    }
    trailCtx.stroke();
}

function isShortGesture(points) {
    if (points.length < 2) return true;
    let distance = 0;
    for (let i = 1; i < points.length; i++) {
        const dx = points[i][0] - points[i - 1][0];
        const dy = points[i][1] - points[i - 1][1];
        distance += Math.hypot(dx, dy);
    }
    return distance < 30;
}

function fadeOutTrailCanvas() {
    if (!trailCanvas) return;
    trailCanvas.style.transition = 'opacity 0.8s ease';
    trailCanvas.style.opacity = '0';
    setTimeout(() => clearTrailCanvas(), 800);
}

function showToastAt(x, y, gesture) {
    // 기존 toast 제거
    document.querySelectorAll('[data-gesture-toast]').forEach(el => el.remove());

    const action = gestureActions[gesture];
    const isKnown = typeof action?.name === 'string';
    const label = isKnown ? action.name : 'Unknown';

    if (!isKnown) {
        console.log('path:', pathToSvgD(path));
        console.log('gesture:', gesture);
        console.log('label:', label);
    }

    const toast = document.createElement('div');
    toast.textContent = label;
    toast.setAttribute('data-gesture-toast', 'true'); // ✅ 고유 식별자

    Object.assign(toast.style, {
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -50%)', // ✅ 중앙 정렬
        fontWeight: 'bold',
        fontSize: '24px',
        zIndex: '1000000',
        pointerEvents: 'none',
        opacity: '0',
        color: isKnown ? 'red' : 'gray',
        transition: 'opacity 0.3s ease',
    });

    document.body.appendChild(toast);
    requestAnimationFrame(() => (toast.style.opacity = '1'));
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 1500);
}

function forceGestureEnd() {
    isRightMouseDown = false;
    clearTimeout(trailTimeout);

    if (!isShortGesture(path)) {
        const gesture = simplifyPath(path);
        const isKnown = gesture in gestureActions;

        if (!isKnown && trailCtx) {
            trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
            drawTrail(path, 'gray');
        }

        const start = path[0];
        const end = path[path.length - 1];
        const toastX = (start[0] + end[0]) / 2;
        const toastY = (start[1] + end[1]) / 2;
        showToastAt(toastX, toastY, gesture);
        chrome.runtime.sendMessage({ gesture });
    }

    fadeOutTrailCanvas();
    path = [];
    shouldPreventMenu = false;
}

document.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
        isRightMouseDown = true;
        path = [[e.clientX, e.clientY]];
        shouldPreventMenu = false;
        createTrailCanvas();
    }
    if (e.button === 0 && isRightMouseDown) {
        isRightMouseDown = false;
        path = [];
        shouldPreventMenu = false;
        clearTrailCanvas();
        clearTimeout(trailTimeout);
    }
});

document.addEventListener('mousemove', (e) => {
    if (!isRightMouseDown) return;
    path.push([e.clientX, e.clientY]);
    drawTrail(path); // 기본 빨간색
    if (!shouldPreventMenu && !isShortGesture(path)) {
        shouldPreventMenu = true;
    }
    clearTimeout(trailTimeout);
    trailTimeout = setTimeout(() => {
        if (isRightMouseDown) forceGestureEnd();
    }, 500);
});

document.addEventListener('contextmenu', (e) => {
    if (isRightMouseDown || shouldPreventMenu) {
        if (!shouldPreventMenu && isShortGesture(path)) {
            isRightMouseDown = false;
            path = [];
            shouldPreventMenu = false;
            clearTrailCanvas();
        } else {
            e.preventDefault();
            forceGestureEnd();
        }
    }
});

window.addEventListener('unload', () => {
    document.querySelectorAll('[data-gesture-toast]').forEach(el => el.remove());
});
