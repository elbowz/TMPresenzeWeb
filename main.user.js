// ==UserScript==
// @name         PresenzeWeb
// @namespace    https://github.com/elbowz/TMPresenzeWeb
// @version      0.9.2
// @description  TamperMonkey script for extend PresenzeWeb
// @author       muttley (elbowz), mtucci
// @require      https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js
// @require      https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @require      https://raw.githubusercontent.com/elbowz/TMPresenzeWeb/master/assets/lib/utils.js
// @resource     rsHtmlTemplate https://raw.githubusercontent.com/elbowz/TMPresenzeWeb/master/assets/template/main.html
// @match        https://presenzeweb.univaq.it/StartWeb/default.aspx
// @grant        GM_notification
// @grant        GM_getResourceText
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://raw.githubusercontent.com/elbowz/TMPresenzeWeb/master/main.user.js
// @downloadURL  https://raw.githubusercontent.com/elbowz/TMPresenzeWeb/master/main.user.js
// ==/UserScript==

// CONFIG
var notifyTimeout = 0;
var notifyOnMinutes = 12;
var maxMinutesAtDay = 555;          // 9:15
var minutesThreshold = 432;         // 7:12
var appendTagSelector = '#mytime .row-fluid.margin-top-10 .span12';

// CORE
$(document).ready(function() { });

// Add resources
$('head').append('<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">');

// Wait the appendTag is visible
waitForKeyElements(appendTagSelector, function() {

    initConfig();

    var $appendTag = $(appendTagSelector);

    // Add info/label to interface panel
    var $plusOrMinus = $('<span class="label" data-toggle="tm-popover" data-trigger="hover" data-placement="bottom" style="margin-right: 3px;">init</span>');
    var $minutesRemain = $('<span class="label" data-toggle="tm-popover" data-trigger="hover" data-placement="bottom" style="margin-right: 3px;">init</span>');
    var $mealVoucher = $('<span class="label" style="display: none;"><i class="icon-food" aria-hidden="true"></i> Buono pasto</span>');

    $appendTag.append($(document.createElement('span')).append($plusOrMinus));
    $appendTag.append($(document.createElement('span')).append($minutesRemain));
    $appendTag.append($(document.createElement('span')).append($mealVoucher));

    // Init popover (placement as tag attr not works)
    $('[data-toggle="tm-popover"]').popover({ container: 'body', placement: 'bottom', html: true });

    var ko = require('knockout');
    var modelUtils = require('modelUtils');

    // Fired on knockout updated variables
    ko.computed(function() {

        var koDataBind = ko.dataFor($appendTag[0]);

        // Get Prestazioni Totali (minutesDone)
        var minutesDone = koDataBind.prestazioniTot();

        // Minus or plus
        var thresholdDiff = minutesThreshold - minutesDone;
        $plusOrMinus[0].innerHTML = (thresholdDiff > 0 ? '<i class="fa fa-minus" aria-hidden="true"></i> Minus ' + modelUtils.minToStringNB(thresholdDiff, '.') : '<i class="fa fa-plus" aria-hidden="true"></i> Plus ' + modelUtils.minToStringNB(thresholdDiff * -1, '.'));
        // Calc time to Ordinary time
        var endThreshold = new Date((new Date()).getTime() + thresholdDiff * 60000);
        // ...and update popover content
        $plusOrMinus.data("bs.popover").options.content = 'Fine della giornata (7.12) alle <strong>' + ('0' + endThreshold.getHours()).slice(-2) + ':' + ('0' + endThreshold.getMinutes()).slice(-2) + '</strong>';

        // Calc remain minutes
        var minutesRemain = maxMinutesAtDay - minutesDone;
        var minutesRemainStr = modelUtils.minToStringNB(Math.abs(minutesRemain), '.');
        $minutesRemain[0].innerHTML = '<i class="fa fa-clock-o" aria-hidden="true"></i> ' + ( minutesRemain > 0 ? '-' : '+') + minutesRemainStr;

        // Calc time to go away
        var endDay = new Date((new Date()).getTime() + (maxMinutesAtDay * 60000) - (minutesDone * 60000));
        // ...and update popover content
        $minutesRemain.data("bs.popover").options.content = 'Fine della giornata (9.15) alle <strong>' + ('0' + endDay.getHours()).slice(-2) + ':' + ('0' + endDay.getMinutes()).slice(-2) + '</strong>';

        // Meal voucher
        if (minutesDone >= 420) {    // >= 7:00
            var clocks = koDataBind.listatimboriginali();
            for (var i = 0; i < clocks.length; i++) {
                if (clocks[i].minutiv >= 780 &&                            // clock out >= 13:00
                    clocks[i].minutiv <= 870 &&                            // clock out <= 14:30
                    clocks[i].versovdescr == "Uscita" &&                   // clock out
                    clocks[i + 1] !== undefined &&                           // there is a clock in
                    clocks[i + 1].minutiv <= 870 &&                          // clock in <= 14:30
                    clocks[i + 1].versovdescr == "Entrata" &&                // clock in
                    clocks[i + 1].minutiv - clocks[i].minutiv >= 10) {      // clock in at least 10 minutes since clock out
                    $mealVoucher.show();
                    break;
                }
            }
        } else $mealVoucher.hide();

        // Change label class by thresold
        if (thresholdDiff > 0) {

            // Minus
            $plusOrMinus.removeClass('label-warning label-important');
            $minutesRemain.removeClass('label-warning label-important');

        } else if (-(maxMinutesAtDay - minutesThreshold) < thresholdDiff) {

            // Plus
            $plusOrMinus.removeClass('label-important').addClass('label-warning');
            $minutesRemain.removeClass('label-important').addClass('label-warning');
        } else {

            // Out of time
            $plusOrMinus.removeClass('label-warning').addClass('label-important');
            $minutesRemain.removeClass('label-warning').addClass('label-important');
        }

        // Notify
        if (minutesRemain < notifyOnMinutes) {

            // Display HTML5 notification
            GM_notification({
                text: 'Hai fatto ' + modelUtils.minToStringNB(minutesDone, '.') + ' ore!',
                title: 'Presenze web',
                highlight: false,
                timeout: notifyTimeout,
                image: 'https://d30y9cdsu7xlg0.cloudfront.net/png/104777-200.png',
                onclick: function() {
                    // Highlight browser tab on notification click
                    GM_notification({ highlight: true });
                }
            });
        }
    });
});

function initConfig() {

    let template = new TMHtmlTemplate('rsHtmlTemplate');

    let modalConfig = template.elTemplate('modal-config');
    if (modalConfig instanceof HTMLCollection) Array.from(modalConfig).forEach(element => document.body.appendChild(element));
    else document.body.appendChild(modalConfig);

    let buttonConfig = template.elTemplate('button-config');
    $('#dashboard .nav.nav-pills.pull-right').prepend(buttonConfig);
    $('.tamper-config').modal({ show: false });
}
