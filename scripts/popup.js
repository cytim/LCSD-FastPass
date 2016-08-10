$(function() {
  $('#redirect').click(function() {
    chrome.tabs.create({ url: fastpass.lcsdFacilityCheckingUrl });
  });
});
