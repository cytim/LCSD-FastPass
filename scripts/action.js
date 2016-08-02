(function(win) {
  var Action = win.Action = {};

  Object.defineProperties(Action, {
    FACILITIES_SEARCH_REQUEST:  { enumerable: true, value: 'requestFacilitiesSearch' },
    FACILITIES_SEARCH_RESPONSE: { enumerable: true, value: 'processFacilitiesSearch' },
    SEARCH_OPTIONS_REQUEST:     { enumerable: true, value: 'requestSearchOptions' },
    SEARCH_OPTIONS_RESPONSE:    { enumerable: true, value: 'processSearchOptions' },

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
