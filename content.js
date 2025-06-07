let isRightMouseDown = false;
let path = [];

document.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
        isRightMouseDown = true;
        path = [[e.clientX, e.clientY]];
    }
});

document.addEventListener('mousemove', (e) => {
    if (isRightMouseDown) {
        path.push([e.clientX, e.clientY]);
    }
});

document.addEventListener('mouseup', (e) => {
    if (e.button === 2 && isRightMouseDown) {
        isRightMouseDown = false;
        const gesture = simplifyPath(path);
        if (!isShortGesture(path)) {
            chrome.runtime.sendMessage({ gesture });
        }
    }
});

document.addEventListener('contextmenu', (e) => {
    if (isRightMouseDown && !isShortGesture(path)) {
        e.preventDefault(); // 긴 제스처일 경우 메뉴 막기
    }
});

function simplifyPath(points) {
    const directions = [];
    for (let i = 1; i < points.length; i++) {
        const dx = points[i][0] - points[i - 1][0];
        const dy = points[i][1] - points[i - 1][1];
        if (Math.abs(dx) > Math.abs(dy)) {
            directions.push(dx > 0 ? '→' : '←');
        } else {
            directions.push(dy > 0 ? '↓' : '↑');
        }
    }
    return [...new Set(directions)].join('');
}

function isShortGesture(points) {
    if (points.length < 2) return true;
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
        const dx = points[i][0] - points[i - 1][0];
        const dy = points[i][1] - points[i - 1][1];
        totalDistance += Math.sqrt(dx * dx + dy * dy);
    }
    return totalDistance < 30; // px 기준
}
