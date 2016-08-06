$(function() {
  /* * * * * * * * * * * * * * * * * * * * *
   * Global Variables
   * * * * * * * * * * * * * * * * * * * * */

  // Never modify the state object directly for data integrity
  // Update should be done by calling `setState(...)`
  var state = {
    view: {
      search: {
        date: [],
        facility: [],
        facilityType: [],
        session: [],
        area: []
      }
    },
    data: {
      search: {
        date: null,
        facility: null,
        facilityType: null,
        session: null,
        area: null
      },
      venues: []
    }
  }

  var $criteria = {
    date: $('#selectDate'),
    facility: $('#selectFacility'),
    facilityType: $('#selectFacilityType'),
    session: $('#selectSession'),
    area: $('#selectArea')
  };

  var $loading = $('.loading');

  /* * * * * * * * * * * * * * * * * * * * *
   * Helpers
   * * * * * * * * * * * * * * * * * * * * */

  function dispatch(action) {
    chrome.runtime.sendMessage(action);
  }

  function setState(newState) {
    return _.assign(state, newState);
  }

  function updateSearchInput(key, val) {
    var update = _.set({}, key, val);
    setState({
      data: _.defaults({
        search: _.defaults(update, state.data.search)
      }, state.data)
    });
  }

  function aggregateSlots(arrayOfSlots) {
    return _.sortBy(_.union.apply(_, arrayOfSlots));
  }

  /* * * * * * * * * * * * * * * * * * * * *
   * View Update
   * * * * * * * * * * * * * * * * * * * * */

  function updateSearchView() {
    function createOptions($select, options, selectedVal) {
      var $option;
      $select.empty();
      for (var i = 0; i < options.length; i++) {
        $option = $('<option>', {
            value: options[i].value,
            selected: options[i].value === selectedVal
          })
          .text(options[i].display);
        $select.append($option);
      }
    }

    _.forOwn($criteria, function($criterion, field) {
      createOptions($criterion, state.view.search[field], state.data.search[field]);
      var firstValue;
      if (state.view.search[field].length === 1) {
        firstValue = $criterion.children('option:first-of-type').val();
        $criterion.val(firstValue);
        updateSearchInput(field, firstValue);
      }
    });

    $('select.search-criteria').material_select();
  }

  function updateSearchResultView() {
    var venues       = state.data.venues;
    var slots        = aggregateSlots(_.map(venues, function(venue) { return _.keys(venue.slots); }));
    var $panel       = $('#search-result-panel');
    var $panelHeader = $panel.find('.result-table-header');
    var $panelBody   = $panel.find('.result-table-body');
    if (!venues || !venues.length) {
      $panel
        .children('#result-table').hide().end()
        .children('#result-empty').show().end();
    }
    else {
      updateSearchResultTableHeader($panelHeader, slots);
      updateSearchResultTableBody($panelBody, venues, slots);
      $panel
        .children('#result-empty').hide().end()
        .children('#result-table').show().end();
      $panelHeader.stick_in_parent();
    }
  }

  function updateSearchResultTableHeader($header, slots) {
    var $slots = $header.find('.location-row ul.slots').empty();
    _.forEach(slots, function(slot) {
      $slots.append($('<li>').text(slot.split('|')[0]));
    });
  }

  function updateSearchResultTableBody($body, venues, slots) {
    var $list = $body.children('ul.result-table-list').empty();
    _.forEach(venues, function(venue) {
      var $venueRow  = createLocationRow(venue, slots);
      var $courtRows = $('<div class="court-rows"></div>');
      _.forEach(venue.courts, function(court) {
        $courtRows.append(createLocationRow(court, slots));
      });
      $list.append(
        $('<li>')
          .append($('<div class="collapsible-header"></div>').append($venueRow))
          .append($('<div class="collapsible-body"></div>').append($courtRows))
      );
    });
  }

  function createLocationRow(location, slots) {
    var $location = $('<div class="location"></div>').text(location.name);
    var $slots    = $('<ul class="slots"></ul>');
    _.forEach(slots, function(slot) {
      var slotDetail = location.slots[slot];
      if (slotDetail) {
        $slots.append(
          $('<li>', {
            class: slotDetail.isPeak === true ? 'slot-peak' : slotDetail.isPeak === false ? 'slot-non-peak' : 'slot-disabled'
          }).append(
            $('<i>', {
              class: 'fa ' + (slotDetail.status === '' ? 'fa-check slot-available' : 'fa-times slot-unavailable')
            })
          )
        );
      }
      else {
        $slots.append($('<li class="slot-disabled"><i class="fa fa-times slot-unavailable"></i></li>'));
      }
    });
    return $('<div class="location-row"></div>').append($location).append($slots);
  }

  /* * * * * * * * * * * * * * * * * * * * *
   * Process
   * * * * * * * * * * * * * * * * * * * * */

  var processors = {
    updateSearchCriteria: function(options) {
      setState({
        view: _.defaults({
          search: _.defaults(options, state.view.search)
        }, state.view)
      });
      updateSearchView();
    },

    processFacilitiesSearch: function(venues) {
      setState({
        data: _.defaults({
          venues: venues
        }, state.data)
      });
      updateSearchResultView();
      $loading.fadeOut(250);
    }
  };

  /* * * * * * * * * * * * * * * * * * * * *
   * Dispatch
   * * * * * * * * * * * * * * * * * * * * */

  function dispatchSearchInputUpdate(input) {
    dispatch(Action.create(Action.SEARCH_INPUT_UPDATE, input));
  }

  function dispatchFacilitiesSearchRequest() {
    $loading.fadeIn(250, function() {
      dispatch(Action.create(Action.FACILITIES_SEARCH_REQUEST));
    });
  }

  function dispatchSearchCriteriaRequest() {
    dispatch(Action.create(Action.SEARCH_CRITERIA_REQUEST));
  }

  /* * * * * * * * * * * * * * * * * * * * *
   * Initialization
   * * * * * * * * * * * * * * * * * * * * */

  $('select.search-criteria').material_select();

  // Listen to dispatched actions
  chrome.runtime.onMessage.addListener(function(action) {
    if (action.error)
      throw action.error;
    if (processors[action.type])
      return processors[action.type](action.data);
  });

  // bind change listener to all $criteria
  _.forOwn($criteria, function($criterion, field) {
    $criterion.change(function() {
      var value = $(this).val();
      updateSearchInput(field, value);
      dispatchSearchInputUpdate(_.set({}, field, value));
    });
  });

  $('#search').click(function() {
    dispatchFacilitiesSearchRequest();
  });

  dispatchSearchCriteriaRequest();
});
