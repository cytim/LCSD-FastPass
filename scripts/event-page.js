/* * * * * * * * * * * * * * * * * * * * *
 * Helpers
 * * * * * * * * * * * * * * * * * * * * */

function createReminderNotification() {
  storage.get('reminders', function(reminders) {
    var begin    = moment();
    var end      = begin.clone().add(fastpass.forecastPeriod - 1, 'days');
    var toRemind = false;
    _.forEach(reminders, function(reminder) {
      if (reminder.type === 'FACILITY_CHECK' && reminder.isActive && begin.isSameOrAfter(reminder.expiry)) {
        toRemind = true;
        reminder.isActive = false;
      }
    });
    if (!toRemind) return;
    storage.set('reminders', reminders);
    chrome.notifications.create('FACILITY_CHECK', {
      type: 'basic',
      iconUrl: 'icons/48.png',
      title: 'LCSD FastPass',
      message: '點擊查詢今日起至 '+end.format('D/M (dddd)')+' 的場地',
      buttons: [{title: '3小時後再提醒'}, {title: '明天再提醒'}],
      requireInteraction: true
    });
  });
}

/* * * * * * * * * * * * * * * * * * * * *
 * Event Handlers
 * * * * * * * * * * * * * * * * * * * * */

chrome.runtime.onInstalled.addListener(function() {
  // register an alarm to run background tasks
  chrome.alarms.create({periodInMinutes: 10});

  // initialize the app with default configurations
  storage.source.get(function(store) {
    var update = {
      reminders: store.reminders || []
    };
    storage.source.set(update);
  });
});

// act as a message channel between different parts of the extension
chrome.runtime.onMessage.addListener(function(action, sender) {
  chrome.tabs.sendMessage(sender.tab.id, action);
});

// run background tasks
chrome.alarms.onAlarm.addListener(function() {
  createReminderNotification();
});

chrome.notifications.onClicked.addListener(function(nId) {
  chrome.notifications.clear(nId);
  if (nId === 'FACILITY_CHECK') {
    storage.get('reminders', function(reminders) {
      _.remove(reminders, function(reminder) {
        return reminder.type === 'FACILITY_CHECK' && !reminder.isActive;
      });
      storage.set('reminders', reminders);
      chrome.tabs.create({ url: fastpass.lcsdFacilityCheckingUrl });
    });
  }
});

chrome.notifications.onButtonClicked.addListener(function(nId, btnId) {
  chrome.notifications.clear(nId);
  if (nId === 'FACILITY_CHECK') {
    storage.get('reminders', function(reminders) {
      var update = {
        expiry: btnId === 0 ? moment().add(3, 'hours').valueOf() : moment().startOf('day').add(1, 'days').valueOf(),
        isActive: true
      };
      _.forEach(reminders, function(reminder) {
        if (reminder.type === 'FACILITY_CHECK' && !reminder.isActive)
          _.extend(reminder, update);
      });
      storage.set('reminders', reminders);
    });
  }
});
