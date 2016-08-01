// act as a message channel between different parts of the extension
chrome.extension.onMessage.addListener(function(action, sender) {
    chrome.tabs.sendMessage(sender.tab.id, action);
});
