var EMPTY_FN = function() {};

/**
 * Resourcec Error
 */
function ResourceError(message) {
  this.name = 'Resource Error';
  this.message = message || 'One or more resources are not ready.';
  this.stack = (new Error()).stack;
}
ResourceError.prototype = Object.create(Error.prototype);
ResourceError.prototype.constructor = ResourceError;

/**
 * Internal Error
 */
function InternalError(message) {
  this.name = 'Internal Error';
  this.message = message || 'Unknown reason.';
  this.stack = (new Error()).stack;
}
InternalError.prototype = Object.create(Error.prototype);
InternalError.prototype.constructor = InternalError;

/**
 * Long polling until the callback of the execute function returns no error.
 * @param {Function} execute - the target function to execute
 * @param {Function} [next] - the next function which is run after the execute function
 * @param {Integer} [interval] - the interval between each poll
 * @param {Integer} [maxTrial] - the maximum number of poll
 * @param {Integer} [currTrial] - the current number of trial
 */
function poll(execute, next, interval, maxTrial, currTrial) {
  next      = next || EMPTY_FN;
  interval  = interval || 100;
  maxTrial  = maxTrial || 50;
  currTrial = currTrial || 1;
  var _this = this;
  execute(function(err) {
    if (err && err instanceof ResourceError) {
      if (currTrial < maxTrial)
        setTimeout(poll.bind(_this, execute, next, interval, maxTrial, ++currTrial), interval);
      else
        next(err);
    } else {
      next.apply(_this, arguments);
    }
  });
}

/**
 * Dispatch an action
 * @param {Object} action
 */
function dispatch(action) {
  chrome.runtime.sendMessage(action);
};

/**
 * Initiation of the extension
 */
function init(callback) {
  callback = callback || EMPTY_FN;

  var $document      = $('frame[name="main"]').contents();
  var $body          = $document.find('body');
  var $searchResult  = $body.find('#searchResult');
  var $selectDate    = $body.find('#datePanel > select');
  var $selectFac     = $body.find('#facilityPanel > select');
  var $selectFacType = $body.find('#facilityTypePanel > select');
  var $selectSession = $body.find('#sessionTimePanel > select');
  var $selectArea    = $body.find('#areaPanel > select');

  if (!($document.length && $body.length && $searchResult.length && $selectArea.length))
    return callback(new ResourceError('Document is not ready.'));

  /* * * * * * * * * * * * * * * * * * * * *
   * Define variables and functions
   * * * * * * * * * * * * * * * * * * * * */
  var changeEvent = new Event('change');

  function loadFacilityCheckPage() {
    var facilityCheckPage = chrome.extension.getURL('pages/facility-check.html')
    var frame = $('<iframe />', {
      id: 'lcsd-bookable-facility-check',
      src: facilityCheckPage,
      // style: 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; border: none;'
      style: 'width: 100%; height: 100%; border: none;'
    });
    $body.append(frame);
  }

  function getSearchOptions() {
    function parseOptions($options) {
      var options = [];
      var $option;
      for (var i = 0; i < $options.length; i++) {
        $option = $options.eq(i);
        options.push({
          display: $option.text(),
          value: $option.val()
        });
      }
      return options;
    }
    return {
      dates: parseOptions($selectDate.children('option')),
      facilities: parseOptions($selectFac.children('option')),
      facilityTypes: parseOptions($selectFacType.children('option')),
      sessions: parseOptions($selectSession.children('option')),
      areas: parseOptions($selectArea.children('option'))
    };
  }

  function resetSearchResult() {
    $searchResult.data('no-result', -1).data('is-mutated', -1);
    $searchResult.find('#searchResultTable').show();
    if ($searchResult.find('#allResult').length) {
      $searchResult.data('no-result', 1);
      $searchResult.find('#allResult').remove();
    }
  }

  function showSearchResult($courtStats) {
    var $allResult = $('<div id="allResult"></div>');
    for (var i = 0; i < $courtStats.length; i++) {
      $allResult.append($courtStats[i]);
    }
    $searchResult.find('#searchResultTable').hide().after($allResult);
  }

  function parseSearchResults($table) {
    function parseTimeslots($row) {
      var $cols = $row.children('td');
      var slots = [];
      for (var i = 2; i < $cols.length; i++) {
        slots.push($cols.eq(i).children('.gwt-HTML').text())
      }
      return slots;
    }

    function parseVenue($row, slots) {
      var $cols = $row.children('td');
      var $col;
      var venue = { name: $cols.eq(1).text(), slots: {} };
      for (var i = 2; i < $cols.length && i < slots.length; i++) {
        $col = $cols.eq(i);
        venue.slots[slots[i]] = {
          status: $col.children('.gwt-HTML').text().trim(),
          isPeak: $col.is('.timeslotCellPeak') ? true : $col.is('.timeslotCellNonPeak') ? false : null
        };
      }
      return venue;
    }

    function parseCourt($row, slots, venue) {
      var court = parseVenue($row, slots);
      venue.courts = (venue.courts || []).concat([court]);
    }

    var $rows = $table.children('tbody').children('tr');
    var slots;
    var venues = [];
    $rows.each(function(i) {
      var $row = $(this);
      if (i === 0)
        slots = parseTimeslots($row);
      else if ($rows.eq(i).css('display') !== 'none')
        venues.push(parseVenue($row, slots));
      else
        parseCourt($row, slots, _.last(venues));
    });
    return venues;
  }

  function checkVenueAvailability($courtStats, venues, $venuePrefs, $locPrefs, callback) {
    if ($searchResult.data('is-mutated') === 0)
      return callback(new ResourceError('Court statistic is not ready.'));

    if ($searchResult.data('is-mutated') === 1) {
      var $table = $searchResult.find('#searchResultTable > table').first().clone().removeAttr('id');
      console.log(parseSearchResults($table));
      $courtStats.push($table);
    }

    if (!venues.length)
      return callback(null, $courtStats);

    var venue, $locations;
    for (var i = 0; i < $venuePrefs.length; i++) {
      venue = venues.shift();
      $venuePrefs[i].val(venue || '');
      $venuePrefs[i][0].dispatchEvent(changeEvent);
      // Some venues have more than one main buildings
      $locations = $locPrefs[i].children('option');
      if ($locations.length > 1) {
        $locPrefs[i].val($locations.eq(1).val());
        $locPrefs[i][0].dispatchEvent(changeEvent);
      }
    }
    $searchResult.data('is-mutated', 0);
    $body.find('#searchButtonPanel .actionBtnContinue, #searchButtonPanel .actionBtnContinue_hover').click();

    poll(checkVenueAvailability.bind(this, $courtStats, venues, $venuePrefs, $locPrefs), callback);
  }

  function checkAvailability(callback) {
    var venues      = [];
    var $venuePrefs = [];
    var $locPrefs   = [];
    $venuePrefs.push($body.find('[id="preference1.venuePanel"] select'));
    $venuePrefs.push($body.find('[id="preference2.venuePanel"] select'));
    $venuePrefs.push($body.find('[id="preference3.venuePanel"] select'));
    $locPrefs.push($body.find('[id="preference1.locationPanel"] select'));
    $locPrefs.push($body.find('[id="preference2.locationPanel"] select'));
    $locPrefs.push($body.find('[id="preference3.locationPanel"] select'));

    if ($venuePrefs[0].children('option').length <= 1 ||
        $venuePrefs[1].children('option').length <= 1 ||
        $venuePrefs[2].children('option').length <= 1 ||
        $venuePrefs[0].data('first-option') === $venuePrefs[0].children('option').eq(1).val()) {
      return callback(new ResourceError('Venue list is not ready.'));
    }

    // extract the venue list
    $venuePrefs[0].children('option').each(function(i) {
      if (i > 0)
        venues.push($(this).val());
    });
    // for determining if the list is updated
    $venuePrefs[0].data('first-option', venues[1]);

    checkVenueAvailability([], venues, $venuePrefs, $locPrefs, callback);
  }

  function search(callback) {
    resetSearchResult();
    poll(checkAvailability, function(err, $courtStats) {
      if (err) throw err;
      showSearchResult($courtStats);
      callback(err, $courtStats);
    });
  }

  /* * * * * * * * * * * * * * * * * * * * *
   * Setup the page
   * * * * * * * * * * * * * * * * * * * * */
  loadFacilityCheckPage();

  var courtObserver = new MutationObserver(function(mutations) {
    if ($searchResult.data('no-result') === 1) {
      $searchResult.data('no-result', 0);
    } else {
      $searchResult.data('is-mutated', 1);
    }
  });

  var optionsObserver = new MutationObserver(function(mutations) {
    dispatch(Action.create(Action.SEARCH_OPTIONS_REQUEST));
  });

  courtObserver.observe($searchResult[0], {childList: true, subtree: true});
  optionsObserver.observe($selectDate[0], {childList: true});
  optionsObserver.observe($selectFac[0], {childList: true});
  optionsObserver.observe($selectFacType[0], {childList: true});
  optionsObserver.observe($selectSession[0], {childList: true});
  optionsObserver.observe($selectArea[0], {childList: true});

  var processors = {
    requestSearchOptions: function() {
      var searchOptions = getSearchOptions();
      dispatch(Action.create(Action.SEARCH_OPTIONS_UPDATE, searchOptions));
    },

    requestFacilitiesSearch: function(input) {
      search(function(err, data) {
        dispatch(Action.create(Action.FACILITIES_SEARCH_RESPONSE, data, err));
      });
    }
  };

  chrome.runtime.onMessage.addListener(function(action) {
    if (action.error)
      throw action.error;
    if (processors[action.type])
      return processors[action.type](action.data);
  });

  // everything is ready
  callback(null);
}

/**
 * Run the extension
 */
$(function() {
  poll(init);
});
