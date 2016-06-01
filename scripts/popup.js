$(function() {
  $('#redirect').click(function() {
    chrome.tabs.create({ url: 'http://w1.leisurelink.lcsd.gov.hk/leisurelink/application/checkCode.do?flowId=4&lang=TC' });
  });
});
