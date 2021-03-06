var App = (function (my) {

  my.init = function() {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.method == "getLocalStorage")
          sendResponse({data: localStorage[request.key]});
        else
          sendResponse({});
    });
  };

  return my;

})(App || {});


App.init();
