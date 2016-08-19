/* * * * * * * * * * * * * * * * * * * * *
 * Helpers
 * * * * * * * * * * * * * * * * * * * * */

function createReminderNotification() {
  storage.get('reminders', function(reminders) {
    var begin          = moment().endOf('day');
    var end            = begin.clone().add(fastpass.forecastPeriod - 1, 'days');
    var facilityChecks = _.remove(reminders, function(reminder) {
      return reminder.type === 'FACILITY_CHECK' && begin.isSameOrAfter(reminder.expiry);
    });
    if (!facilityChecks.length)
      return;
    storage.set('reminders', reminders);
    chrome.notifications.create('FACILITY_CHECK', {
      type: 'basic',
      iconUrl: 'icons/48.png',
      title: 'LCSD FastPass',
      message: '點擊查詢今日起至 '+end.format('D/M (dddd)')+' 的場地',
      requireInteraction: true
    });
  });
}

/* * * * * * * * * * * * * * * * * * * * *
 * Event Handlers
 * * * * * * * * * * * * * * * * * * * * */

chrome.runtime.onInstalled.addListener(function() {
  // register an alarm to run background tasks
  chrome.alarms.create({periodInMinutes: 0.05});

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

chrome.notifications.onClicked.addListener(function(nid) {
  chrome.notifications.clear(nid);
  if (nid === 'FACILITY_CHECK')
    chrome.tabs.create({ url: fastpass.lcsdFacilityCheckingUrl });
});
