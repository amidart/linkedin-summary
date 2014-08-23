var Module = (function(my){

  var keywords = [];

  my.init = function() {
    getKeywords(getProfileInfo);
  };


  /**
   * Get keywords from localStorage
   * @param  {function} startParser - callback to run the profile parser
   */
  var getKeywords = function( startParser ) {
    chrome.runtime.sendMessage({method: "getLocalStorage", key: "keywords"}, function(response) {
      keywordsStr = response.data;
      if (keywordsStr) {
        keywords = keywordsStr.split(';');
      }
      startParser();
    });
  };

  var getProfileInfo = function() {
    var workResult = getWorkingYears();
    var eduResult = processEducation();
    var foundKeywords = processKeywords(keywords);
    showResults(workResult, eduResult, foundKeywords);
    //console.log(workResult, eduResult, foundKeywords);
  };

  /**
   * process working years
   * @return {object} see result
   */
  var getWorkingYears = function () {
    var sumYears = 0,
        sumMonths = 0,
        minYear = new Date().getFullYear(),
        jobsUnder18 = 0,
        yearsByCompany = {},
        previousJob = {};

    $('#background-experience .section-item').each(function(i, node){
      var $node = $(node);
      var yearsStr = $node.find('.experience-date-locale').text();

      var company = $node.find('h5 strong').text();
      if (!company) company = $node.find('h5 a[name=company]').text();

      var title = $node.find('h4 a[name=title]').text();
      var years = parseYears(yearsStr);
      years.title = title;
      if (years.inMonths) sumMonths += years.inMonths;
      if (years.start < minYear) minYear = years.start;

      if (yearsByCompany[company]) yearsByCompany[company].push(years);
      else yearsByCompany[company] = [years];
    });

    sumYears = Math.floor(sumMonths/12);
    sumMonths = sumMonths % 12;
    var duration = '-';
    if (sumYears || sumMonths) duration = sumYears + ' years ' + sumMonths + ' months';

    jobsUnder18 = findUnder18(yearsByCompany);

    var result = {
      duration: duration,
      diff: new Date().getFullYear() - minYear,
      under18: jobsUnder18
    };
    return result;
  };

  /**
   * Get start and stop year and duration in months from LinkedIn string
   * @param  {string} txt record from linkedin
   * @return {object}     {start, stop, inMonths}
   */
  var parseYears = function (txt) {
    var start, stop, years, months;

    var yearsMatches = txt.match(/(\d{4}).*(Present|\d{4})/i);
    if (yearsMatches) {
      start = yearsMatches[1];
      stop = yearsMatches[2];
    }

    try {
      duration = txt.match(/\((.*)\)/)[1];
    } catch(e) { duration = '';}
    if (duration) {
      try {
        years = parseInt( duration.match(/(\d+)\s+year/)[1] );
      } catch (e) { years = 0;}
      try {
        months = parseInt( duration.match(/(\d+)\s+month/)[1] );
      } catch (e) { months = 0;}
    }

    var inMonths;
    if (years !== undefined && months !== undefined) inMonths = years * 12 + months;

    var result = {
      start: start,
      stop: stop,
      inMonths: inMonths
    };
    return result;
  };


  var findUnder18 = function (yearsByCompany) {
    var res = 0,
        list = '';
    $.each(yearsByCompany, function (company, arrYears) {
      var present = false,
          sum = 0,
          lastTitle;
      for (var i = 0, len = arrYears.length; i < len; i++) {
        var years = arrYears[i];
        if (years.inMonths) sum += years.inMonths;
        if (!lastTitle) lastTitle = years.title;
        if (years.stop === 'Present') present = true;
      }
      if (sum < 18 && !present) {
        list += '<p>' + lastTitle + '; ' + company + ' - <strong>' + sum + ' months</strong></p>';
        res++;
      }
    });
    list = '<div class="extension-under18-list hidden">' + list + '</div>';
    return {count: res, list: list};
  };


  /**
   * Extract degrees and approximate age
   * @return {object} see result
   */
  var processEducation = function () {
    var degrees = [];
    var age,
        firstFinishedYear = new Date().getFullYear();
    $('#background-education .section-item').each(function(i, node){
      var school = $(node).find('h4.summary').text();
      var degree = $(node).find('.degree').text();
      var years = $(node).find('.education-date').text();
      // get degrees
      if (degree) {
        degree =  $(node).find('h5').text();
        degrees.push(degree + ' (' + school + ')');
      }
      // get approximate age
      if (years) {
        var finishedYear;
        try {
          finishedYear = parseInt(years.match(/\d{4}.*(\d{4})/)[1]);
        } catch (e) {finishedYear = undefined;}
        if (finishedYear && finishedYear < firstFinishedYear) {
          firstFinishedYear = finishedYear;
          var bornYear = firstFinishedYear - 22;
          age = new Date().getFullYear() - bornYear;
        }
      }
    });
    var result = {
      degrees: degrees,
      age: age
    };
    return result;
  };


  var processKeywords = function (keywords) {
    var found = {};
    var profileText = $('#profile')[0].innerText;

    $.each(keywords, function (i, keyword) {
      var regexp = new RegExp(keyword, 'ig');
      if (profileText.match(regexp)) {
        found[keyword] = true;
      }
    });
    return found;
  };


  var showResults = function (work, edu, foundKeys) {
    var html = '';
    var under18str = work.under18.count + '<a class="extension-show">show</a>' + work.under18.list;
    html += addTableItem('Years of work experience (sum)', work.duration);
    html += addTableItem('Years of work experience (last - first)', work.diff);
    html += addTableItem('Number of jobs under 1.5 years length', under18str);
    html += addTableItem('Approximate age', edu.age);
    html += addTableItem('Degrees', edu.degrees.join(',<br/>'));

    var notfound = $.grep(keywords, function (value, index) {
      if (foundKeys[value]) return false;
      else return true;
    });

    html += addTableItem('Found keywords', Object.keys(foundKeys).join(', '), 'found');
    html += addTableItem('Not found keywords', notfound.join(', '), 'notfound');
    $('<table id="extension-results"/>')
      .appendTo('.profile-overview-content')
      .html(html)
      .find('.extension-show').click(function () {
        var $this = $(this);
        if ($this.html() === 'show')
          $this.html('hide').next().show();
        else {
          $this.html('show').next().hide();
        }
      });
  };

  var addTableItem = function (title, content, className) {
    if (!content) return '';
    var classAttr = '';
    if (className) classAttr = ' class="' + className + '"';
    return '<tr><th>' + title + '</th><td' + classAttr + '>' + content + '</td></tr>';
  };


  return my;

})(Module || {});



Module.init();
