// background.js
const gestureActions = {
    '↓←': { name: 'Back', func: chrome.tabs.goBack },
    '↓→': { name: 'Forward', func: chrome.tabs.goForward },
    '↗': { name: 'Refresh', func: chrome.tabs.reload },
};

chrome.runtime.onMessage.addListener((message, sender) => {
    const gesture = message.gesture;
    const tabId = sender.tab?.id;

    const action = gestureActions[gesture];
    if (action && typeof action.func === 'function' && tabId !== undefined) {
        setTimeout(() => {
            action.func(tabId);
        }, 1000);
    } else {
        console.log('Unknown gesture:', gesture);
    }
});
