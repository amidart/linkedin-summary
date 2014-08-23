(function(){

var keywordsId = 'keywords';


/**
 * Get list of keywords from textarea and make string of them for localStorage
 * @param  {string} id id of the textarea
 * @return {string}    joined list of keywords
 */
function processTextarea (id) {
    var list = document.getElementById(id).value.split(/\n+/g).join(';').replace(/;+/, ';');
    return list;
}


/**
 * Save to localStorage
 */
function save_options() {

    localStorage[keywordsId] = processTextarea(keywordsId);

    var status = document.getElementById("status");
    status.innerHTML = "Saved";
    setTimeout(function() {
        status.innerHTML = "";
    }, 1000);
}

/**
 * Restore from localStorage
 */
function restore_options() {
    document.getElementById(keywordsId).value = (localStorage[keywordsId] || '').replace(/;/g, '\n');
}


window.onload = function () {
    restore_options();
    document.getElementById('save').onclick = function () {
        save_options();
        var bg = chrome.extension.getBackgroundPage();
        bg.main.init();
    };
    document.getElementById('close').onclick = function () {
      window.close();
    };
};

})();
