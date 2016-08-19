$(function() {
  function init(reminders) {
    /* * * * * * * * * * * * * * * * * * * * *
     * Global Variables
     * * * * * * * * * * * * * * * * * * * * */

    var today    = moment().startOf('day');
    var tomorrow = today.clone().add(1, 'days');

    var events = window.events = _.map(_.range(fastpass.forecastPeriod), function(i) {
      return {
        date: today.clone().add(i, 'days'),
        type: 'checkable'
      };
    }).concat(_.reduce(reminders, function(memo, reminder) {
      if (reminder.type === 'FACILITY_CHECK')
        return memo.concat([{
          date: moment(reminder.extra.targetTimestamp).startOf('day'),
          type: 'facility-check-reminder'
        }]);
    }, []));

    var reminderCalendar = $('#reminder-calendar');

    /* * * * * * * * * * * * * * * * * * * * *
     * Helpers
     * * * * * * * * * * * * * * * * * * * * */

    function updateEvents(target) {
      var hasFacilityCheck = $(target.element).is('.facility-check-reminder');
      if (hasFacilityCheck) {
        _.remove(events, function(event) {
          return event.type === 'facility-check-reminder' && event.date.isSame(target.date);
        });
      }
      else {
        events.push({
          date: target.date,
          type: 'facility-check-reminder'
        });
      }
      reminderCalendar.setEvents(events);
    }

    function updateReminders(target) {
      var hasFacilityCheck = $(target.element).is('.facility-check-reminder');
      var expiry = target.date.clone().subtract(fastpass.forecastPeriod - 1, 'days');
      var targetReminder = {
        type: 'FACILITY_CHECK',
        expiry: expiry.isSameOrBefore(today) ? tomorrow.valueOf() : expiry.valueOf(),
        extra: {
          targetTimestamp: target.date.valueOf()
        }
      };
      if (hasFacilityCheck) {
        _.remove(reminders, function(reminder) {
          return reminder.type === targetReminder.type && reminder.extra.targetTimestamp === targetReminder.extra.targetTimestamp;
        });
      }
      else {
        reminders.push(targetReminder);
      }
      storage.set('reminders', reminders);
    }

    /* * * * * * * * * * * * * * * * * * * * *
     * Page Initialization
     * * * * * * * * * * * * * * * * * * * * */
    $('#redirect').click(function() {
      chrome.tabs.create({ url: fastpass.lcsdFacilityCheckingUrl });
    });

    reminderCalendar = reminderCalendar.clndr({
      template: $('#reminder-calendar-template').html(),
      adjacentDaysChangeMonth: true,
      targets: {
        nextButton: 'next-button',
        previousButton: 'previous-button'
      },
      events: events,
      clickEvents: {
        click: function(target) {
          if (target.date.isSameOrBefore(today))
            return;
          updateReminders(target);
          updateEvents(target);
        }
      }
    });
  }

  /* * * * * * * * * * * * * * * * * * * * *
   * Page Pre-initialization
   * * * * * * * * * * * * * * * * * * * * */
  storage.get('reminders', init);
});
