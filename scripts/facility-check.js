$(function() {
  /* * * * * * * * * * * * * * * * * * * * *
   * Initialization
   * * * * * * * * * * * * * * * * * * * * */

  $('select').material_select();

  /* * * * * * * * * * * * * * * * * * * * *
   * Dispatch
   * * * * * * * * * * * * * * * * * * * * */

  function dispatch(action) {
    chrome.runtime.sendMessage(action);
  }

  $('#search').click(function() {
    dispatch({type: 'FACILITIES_SEARCH_REQUEST'});
  });

  /* * * * * * * * * * * * * * * * * * * * *
   * Process
   * * * * * * * * * * * * * * * * * * * * */
   
  function processFacilitiesSearch(action) {
    if (action.error)
      throw action.error;
    console.log('TODO: process the search response')
  }

  chrome.runtime.onMessage.addListener(function(action) {
    switch (action.type) {
    case 'FACILITIES_SEARCH_RESPONSE':
      return processFacilitiesSearch(action);
    }
  });
});
