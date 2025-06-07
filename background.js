chrome.runtime.onMessage.addListener((message, sender) => {
    const gesture = message.gesture;

    switch (gesture) {
        case '←':
            chrome.tabs.goBack(sender.tab.id);
            break;
        case '→':
            chrome.tabs.goForward(sender.tab.id);
            break;
        case '↓↑':
            chrome.tabs.reload(sender.tab.id);
            break;
        case '↓→':
            chrome.tabs.create({});
            break;
        case '↓←':
            chrome.tabs.remove(sender.tab.id);
            break;
        default:
            console.log('Unknown gesture:', gesture);
    }
});
