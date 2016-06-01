/**
 * Long polling until the predicate function returns true
 * @param {Function} execute - the target function to execute
 * @param {Function} predicate - the predicate function
 * @param {Integer} [interval] - the interval between each poll
 * @param {Integer} [maxTrial] - the maximum number of poll
 * @param {Integer} [currTrial] - the current number of trial
 */
function poll(execute, predicate, interval, maxTrial, currTrial) {
  interval  = interval || 100;
  maxTrial  = maxTrial || 50;
  currTrial = currTrial || 1;
  if (predicate())
    return execute();
  if (currTrial < maxTrial)
    return setTimeout(poll.bind(this, execute, predicate, interval, maxTrial, ++currTrial), interval);
  return console.error('[Poll - Max Trial Exceeded] Connection Error / Extension Out-dated');
}

/**
 * Initiation of the extension
 */
function init() {
  var $document     = $('frame[name="main"]').contents();
  var $body         = $document.find('body');
  var $areaDropdown = $body.find('#areaPanel select');
  var $searchResult = $body.find('#searchResult');
  var courtStats    = [];

  var changeEvent = new Event('change');

  var courtObserver = new MutationObserver(function() {
    var $courtStat = $searchResult.find('#searchResultTable').clone().removeAttr('id');
    courtStats.push($courtStat);
    $searchResult.data('last-mutated', (new Date()).getTime());
  });

  function resetCourtStat() {
    $searchResult.find('#searchResultTable').show();
    $searchResult.find('#allResult').remove();
    courtStats.splice(0, courtStats.length);
  }

  function checkAvailability(area) {
    var venues      = [];
    var $venuePrefs = [];
    var $locPrefs   = [];
    var $submit     = $body.find('#searchButtonPanel .actionBtnContinue, #searchButtonPanel .actionBtnContinue_hover');
    $venuePrefs.push($body.find('[id="preference1.venuePanel"] select'));
    $venuePrefs.push($body.find('[id="preference2.venuePanel"] select'));
    $venuePrefs.push($body.find('[id="preference3.venuePanel"] select'));
    $locPrefs.push($body.find('[id="preference1.locationPanel"] select'));
    $locPrefs.push($body.find('[id="preference2.locationPanel"] select'));
    $locPrefs.push($body.find('[id="preference3.locationPanel"] select'));
    $venuePrefs[0].children('option').each(function(i) {
      if (i > 0)
        venues.push($(this).val());
    });

    function checkVenueAvailability() {
      if (!venues.length) {
        var $allResult = $('<div id="allResult"></div>');
        for (var i = 0; i < courtStats.length; i++) {
          $allResult.append(courtStats[i]);
        }
        $searchResult.find('#searchResultTable').hide().after($allResult);
        return;
      };

      var currCourtStatLastMutated = $searchResult.data('last-mutated');
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
      $submit.click();

      poll(checkVenueAvailability, function() {
        var newCourtStatLastMutated = $searchResult.data('last-mutated');
        return (!currCourtStatLastMutated && newCourtStatLastMutated) || newCourtStatLastMutated > currCourtStatLastMutated;
      });
    }

    checkVenueAvailability();
  }

  function onAreaSelected() {
    $areaDropdown.change(function() {
      resetCourtStat();
      poll(checkAvailability.bind(null, $areaDropdown.val()), function() {
        var $p1 = $body.find('[id="preference1.venuePanel"] select > option');
        var $p2 = $body.find('[id="preference2.venuePanel"] select > option');
        var $p3 = $body.find('[id="preference3.venuePanel"] select > option');
        return $p1.length > 1 && $p2.length > 1 && $p3.length > 1;
      });
    });
  }

  courtObserver.observe($searchResult[0], {childList: true, subtree: true});
  onAreaSelected()
}

/**
 * Run the extension
 */
$(function() {
  poll(init, function() {
    var $document = $('frame[name="main"]').contents();
    return $document.length &&
            $document.find('body').length &&
            $document.find('body #areaPanel select').length &&
            $document.find('body #searchResult').length;
  });
});
