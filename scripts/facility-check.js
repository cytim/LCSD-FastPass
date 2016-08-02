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

  $('select').material_select();

  /* * * * * * * * * * * * * * * * * * * * *
   * Process
   * * * * * * * * * * * * * * * * * * * * */

  var processors = {
    processSearchOptions: function(options) {
      console.log('TODO: process search options')
      console.log(options);
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
