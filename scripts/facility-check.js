$(function() {
  /* * * * * * * * * * * * * * * * * * * * *
   * Initialization
   * * * * * * * * * * * * * * * * * * * * */

  var state = {
    view: {
      dates: [],
      facilities: [],
      facilityTypes: [],
      sessions: [],
      areas: []
    },
    input: {
      date: null,
      facility: null,
      facilityType: null,
      session: null,
      area: null
    }
  }

  $('select.search-criteria').material_select();

  $('#selectDate').change(function() { updateSearchInput('date', $(this).val()); });
  $('#selectFacility').change(function() { updateSearchInput('facility', $(this).val()); });
  $('#selectFacilityType').change(function() { updateSearchInput('facilityType', $(this).val()); });
  $('#selectSession').change(function() { updateSearchInput('session', $(this).val()); });
  $('#selectArea').change(function() { updateSearchInput('area', $(this).val()); });

  /* * * * * * * * * * * * * * * * * * * * *
   * Helpers
   * * * * * * * * * * * * * * * * * * * * */
  function setState(newState) {
    return _.assign(state, newState);
  }

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

    createOptions($('#selectDate'), state.view.dates, state.input.date);
    createOptions($('#selectFacility'), state.view.facilities, state.input.facility);
    createOptions($('#selectFacilityType'), state.view.facilityTypes, state.input.facilityType);
    createOptions($('#selectSession'), state.view.sessions, state.input.session);
    createOptions($('#selectArea'), state.view.areas, state.input.area);

    $('select.search-criteria').material_select();
  }

  function updateSearchInput(key, val) {
    var update = {};
    update[key] = val;
    setState({ input: _.defaults(update, state.input) });
  }

  /* * * * * * * * * * * * * * * * * * * * *
   * Process
   * * * * * * * * * * * * * * * * * * * * */

  var processors = {
    updateSearchOptions: function(options) {
      _.assign(state.view, options);
      updateSearchView();
    },

    processFacilitiesSearch: function(venues) {
      console.log('TODO: process facilities search')
      console.log(venues);
    }
  };

  chrome.runtime.onMessage.addListener(function(action) {
    if (action.error)
      throw action.error;
    if (processors[action.type])
      return processors[action.type](action.data);
  });

  /* * * * * * * * * * * * * * * * * * * * *
   * Dispatch
   * * * * * * * * * * * * * * * * * * * * */

  function dispatch(action) {
    chrome.runtime.sendMessage(action);
  }

  $('#search').click(function() {
    dispatch(Action.create(Action.FACILITIES_SEARCH_REQUEST, state.input));
  });

  dispatch(Action.create(Action.SEARCH_OPTIONS_REQUEST));
});
