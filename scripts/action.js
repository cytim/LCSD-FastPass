(function(win) {
  var Action = win.Action = {};

  Object.defineProperties(Action, {
    FACILITIES_SEARCH_REQUEST:  { enumerable: true, value: 'requestFacilitiesSearch' },
    FACILITIES_SEARCH_RESPONSE: { enumerable: true, value: 'processFacilitiesSearch' },
    SEARCH_CRITERIA_REQUEST:    { enumerable: true, value: 'requestSearchCriteria' },
    SEARCH_CRITERIA_UPDATE:     { enumerable: true, value: 'updateSearchCriteria' },
    SEARCH_INPUT_UPDATE:        { enumerable: true, value: 'updateSearchInput' },

    create: {
      value: function(type, data, err) {
        if (!type)
          throw new Error('Action type is undefined');
        return {
          type: type,
          data: data,
          err: err
        };
      }
    }
  });
}(window));
