const gestureActions = {
    '↓←': {
        name: 'Back',
        execute: () => {
            if (history.length > 1) {
                history.back();
            } else {
                showToast('No previous page');
            }
        }
    },
    '↓→': {
        name: 'Forward',
        execute: () => {
            history.forward();
            setTimeout(() => {
                showToast('No next page');
            }, 500);
        }
    },
    '↗': {
        name: 'Refresh',
        execute: () => location.reload()
    },
};

let isRightMouseDown = false;
let gesturePath = [];
let shouldSuppressMenu = false;
let trailCanvas = null;
let trailContext = null;
let gestureTimeout = null;

function getDirection(angle) {
    if (angle >= -30 && angle < 30) return '→';
    if (angle >= 30 && angle < 60) return '↘';
    if (angle >= 60 && angle < 120) return '↓';
    if (angle >= 120 && angle < 150) return '↙';
    if (angle >= 150 || angle < -150) return '←';
    if (angle >= -150 && angle < -120) return '↖';
    if (angle >= -120 && angle < -60) return '↑';
    if (angle >= -60 && angle < -30) return '↗';
    return '';
}

function simplifyGesturePath(points) {
    if (points.length < 2) return '';
    const [startX, startY] = points[0];
    const [endX, endY] = points[points.length - 1];
    const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
    const initialDirection = getDirection(angle);

    let maxDeviation = 0;
    let cornerIndex = -1;
    const lineLength = Math.hypot(endY - startY, endX - startX);

    for (let i = 1; i < points.length - 1; i++) {
        const [px, py] = points[i];
        const dist = Math.abs((endY - startY) * px - (endX - startX) * py + endX * startY - endY * startX) / lineLength;
        if (dist > maxDeviation) {
            maxDeviation = dist;
            cornerIndex = i;
        }
    }

    if (maxDeviation > 30 && cornerIndex > 2 && cornerIndex < points.length - 3) {
        const [midX, midY] = points[cornerIndex];
        const angle1 = Math.atan2(midY - startY, midX - startX) * 180 / Math.PI;
        const angle2 = Math.atan2(endY - midY, endX - midX) * 180 / Math.PI;
        return getDirection(angle1) + getDirection(angle2);
    }

    return initialDirection;
}

function createTrailCanvas() {
    trailCanvas = document.createElement('canvas');
    Object.assign(trailCanvas.style, {
        position: 'fixed', top: '0', left: '0',
        width: '100vw', height: '100vh',
        pointerEvents: 'none', zIndex: '999999'
    });
    trailCanvas.width = window.innerWidth;
    trailCanvas.height = window.innerHeight;
    document.documentElement.appendChild(trailCanvas);
    trailContext = trailCanvas.getContext('2d');
    trailContext.lineWidth = 2;
}

function clearTrailCanvas() {
    trailCanvas?.remove();
    trailCanvas = trailContext = null;
}

function drawTrail(points, color = 'red') {
    if (!trailContext || points.length < 2) return;
    trailContext.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    trailContext.strokeStyle = color;
    trailContext.beginPath();
    trailContext.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        trailContext.lineTo(points[i][0], points[i][1]);
    }
    trailContext.stroke();
}

function isShortPath(points) {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
        const dx = points[i][0] - points[i - 1][0];
        const dy = points[i][1] - points[i - 1][1];
        length += Math.hypot(dx, dy);
    }
    return length < 30;
}

function fadeOutTrail() {
    if (!trailCanvas) return;
    trailCanvas.style.transition = 'opacity 0.8s ease';
    trailCanvas.style.opacity = '0';
    setTimeout(clearTrailCanvas, 800);
}

function showToast(message) {
    document.querySelectorAll('[data-gesture-toast]').forEach(el => el.remove());

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.setAttribute('data-gesture-toast', 'true');
    Object.assign(toast.style, {
        position: 'fixed', left: '50%', bottom: '50px',
        transform: 'translateX(-50%)',
        fontSize: '18px', fontWeight: 'bold',
        background: 'rgba(0,0,0,0.8)', color: 'white',
        padding: '8px 16px', borderRadius: '6px',
        zIndex: '1000000', pointerEvents: 'none',
        opacity: '0', transition: 'opacity 0.3s ease'
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => (toast.style.opacity = '1'));
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.addEventListener('transitionend', () => toast.remove());
    }, 1500);
}

function showToastAt(x, y, message, known) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.setAttribute('data-gesture-toast', 'true');
    Object.assign(toast.style, {
        position: 'fixed', left: `${x}px`, top: `${y}px`,
        transform: 'translate(-50%, -50%)',
        fontSize: '24px', fontWeight: 'bold',
        color: known ? 'red' : 'gray',
        background: 'transparent',
        pointerEvents: 'none', zIndex: '1000000',
        opacity: '0', transition: 'opacity 0.3s ease'
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => (toast.style.opacity = '1'));
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.addEventListener('transitionend', () => toast.remove());
    }, 1500);
}

function finalizeGesture() {
    isRightMouseDown = false;
    clearTimeout(gestureTimeout);

    if (!isShortPath(gesturePath)) {
        const gesture = simplifyGesturePath(gesturePath);
        const action = gestureActions[gesture];
        const known = Boolean(action);
        const label = known ? action.name : 'Unknown';

        const [sx, sy] = gesturePath[0];
        const [ex, ey] = gesturePath[gesturePath.length - 1];
        const cx = (sx + ex) / 2;
        const cy = (sy + ey) / 2;

        if (!known) drawTrail(gesturePath, 'gray');
        showToastAt(cx, cy, label, known);
        if (known) action.execute();
    }

    fadeOutTrail();
    gesturePath = [];
    shouldSuppressMenu = false;
}

document.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
        isRightMouseDown = true;
        gesturePath = [[e.clientX, e.clientY]];
        shouldSuppressMenu = false;
        createTrailCanvas();
    }
    if (e.button === 0 && isRightMouseDown) {
        isRightMouseDown = false;
        gesturePath = [];
        shouldSuppressMenu = false;
        clearTrailCanvas();
        clearTimeout(gestureTimeout);
    }
});

document.addEventListener('mousemove', (e) => {
    if (!isRightMouseDown) return;
    gesturePath.push([e.clientX, e.clientY]);
    drawTrail(gesturePath);
    if (!shouldSuppressMenu && !isShortPath(gesturePath)) {
        shouldSuppressMenu = true;
    }
    clearTimeout(gestureTimeout);
    gestureTimeout = setTimeout(() => {
        if (isRightMouseDown) finalizeGesture();
    }, 500);
});

document.addEventListener('contextmenu', (e) => {
    if (isRightMouseDown || shouldSuppressMenu) {
        if (!shouldSuppressMenu && isShortPath(gesturePath)) {
            isRightMouseDown = false;
            gesturePath = [];
            clearTrailCanvas();
        } else {
            e.preventDefault();
            finalizeGesture();
        }
    }
});

window.addEventListener('unload', () => {
    document.querySelectorAll('[data-gesture-toast]').forEach(el => el.remove());
});
