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
 * Initiation of the extension
 */
function init(callback) {
  callback = callback || EMPTY_FN;

  var $document     = $('frame[name="main"]').contents();
  var $body         = $document.find('body');
  var $areaDropdown = $body.find('#areaPanel select');
  var $searchResult = $body.find('#searchResult');

  if (!($document.length && $body.length && $areaDropdown.length && $searchResult.length))
    return callback(new ResourceError('Document is not ready.'));

  var cssPath = chrome.extension.getURL('css/inject.css');
  $document.find('head')
      .append($('<link>')
      .attr("rel","stylesheet")
      .attr("type","text/css")
      .attr("href", cssPath));

  var $loading = $('<div id="lcsd-bookable-loading"></div>').hide().appendTo($body);

  var changeEvent = new Event('change');

  var courtObserver = new MutationObserver(function(mutations) {
    if ($searchResult.data('no-result') === 1) {
      $searchResult.data('no-result', 0);
    } else {
      $searchResult.data('is-mutated', 1);
    }
  });

  function showLoading(callback) {
    callback = callback || EMPTY_FN;
    $body.addClass('lcsd-overflow-lock');
    $loading.fadeIn(250, function() {
      callback(hideLoading);
    });
  }

  function hideLoading(callback) {
    callback = callback || EMPTY_FN;
    $loading.fadeOut(250, function() {
      $body.removeClass('lcsd-overflow-lock');
      callback();
    });
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

  function checkVenueAvailability($courtStats, venues, $venuePrefs, $locPrefs, callback) {
    if ($searchResult.data('is-mutated') === 0)
      return callback(new ResourceError('Court statistic is not ready.'));

    if ($searchResult.data('is-mutated') === 1) {
      var $courtStat = $searchResult.find('#searchResultTable').clone().removeAttr('id');
      $courtStats.push($courtStat);
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

  function checkAvailability(area, callback) {
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

  function onAreaSelected() {
    $areaDropdown.change(function() {
      showLoading(function(done) {
        resetSearchResult();
        poll(checkAvailability.bind(null, $areaDropdown.val()), function(err, $courtStats) {
          if (err) throw err;
          showSearchResult($courtStats);
          done();
        });
      });
    });
  }

  courtObserver.observe($searchResult[0], {childList: true, subtree: true});
  onAreaSelected();

  // everything is ready
  callback(null);
}

/**
 * Run the extension
 */
$(function() {
  poll(init);
});
