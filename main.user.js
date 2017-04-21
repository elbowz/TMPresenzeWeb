// ==UserScript==
// @name         PresenzeWeb
// @namespace    https://github.com/elbowz/TMPresenzeWeb
// @version      0.9.9
// @description  TamperMonkey script for extend PresenzeWeb
// @author       muttley (elbowz), mtucci
// @require      https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min.js
// @require      https://unpkg.com/vue@2.2.6/dist/vue.min.js
// @require      https://rawgit.com/elbowz/TMPresenzeWeb/master/assets/lib/bootstrap/bootstrap.min.js
// @require      https://rawgit.com/uzairfarooq/arrive/dff5333a3ef0082e727dafd3b553e603c23812d7/src/arrive.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/flipclock/0.7.8/flipclock.min.js
// @require      https://rawgit.com/elbowz/TMPresenzeWeb/master/assets/lib/utils.js
// @resource     rsMainHtmlTpl https://rawgit.com/elbowz/TMPresenzeWeb/master/assets/template/main.html
// @match        https://presenzeweb.univaq.it/StartWeb/default.aspx
// @grant        GM_notification
// @grant        GM_getResourceText
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://rawgit.com/elbowz/TMPresenzeWeb/master/main.user.js
// @downloadURL  https://rawgit.com/elbowz/TMPresenzeWeb/master/main.user.js
// ==/UserScript==

/* DevMode
 Swap resource allow to work with pastebin
 https://rawgit.com/elbowz/TMPresenzeWeb/master/assets/template/main.html => https://pastebin.com/raw/PR96A6Kj
 https://rawgit.com/elbowz/TMPresenzeWeb/master/assets/lib/utils.js => https://pastebin.com/raw/JusvSwH0 */

/* Global Config */
let TMPWCfg = {
    maxMinutesAtDay: 555,          // 9:15
    minutesThreshold: 432,         // 7:12
    countdown: {
        plus: true,
        endDay: true
    },
    notify: {
        plus: { enabled: true, timeout: 0, minutesAhead: 12 },
        endDay: { enabled: true, timeout: 0, minutesAhead: 12 }
    }
};

class TMPWMyTyme extends TMPWWidget {

    onReady() {

        // Create jQuery info/label from template
        this.$plusOrMinus = $(this.objTemplate.elTemplate('label-plus-minus'));
        this.$minutesLeft = $(this.objTemplate.elTemplate('label-minutes-left'));
        this.$mealVoucher = $(this.objTemplate.elTemplate('label-meal-voucher'));

        // Add to interface panel (surrounded by a <span>)
        this.$parent.append($(document.createElement('span')).append(this.$plusOrMinus).append(' '));
        this.$parent.append($(document.createElement('span')).append(this.$minutesLeft));
        this.$parent.append($(document.createElement('span')).append(this.$mealVoucher));

        // Init popover ('placement' as tag attr not works)
        this.$parent
            .find('[data-toggle="tmpw-popover"]')
            .popover({ container: 'body', placement: 'bottom', html: true });

        // Append template
        const plusCountdownTpl = this.objTemplate.elTemplate('countdown-plus');
        const endDayCountdownTpl = this.objTemplate.elTemplate('countdown-end-day');
        this.$parent.closest('#mytime').append(plusCountdownTpl).append(endDayCountdownTpl);

        const self = this;

        // Template Plus Countdown
        this.plusCountdownVue = new Vue({
            el: plusCountdownTpl,
            data: TMPWCfg,
            created: function() {

                // Resize FlipClock on browser resize
                $(window).resize(() => this.responsiveFlipClock());
            },
            mounted: function() {

                this.initFlipClock();
                this.responsiveFlipClock();
            },
            updated: function() {               // Called on show/hide by config

                this.initFlipClock(this._flipClock.getTime().time);
                this.responsiveFlipClock();
            },
            methods: {
                initFlipClock: function(minutes = 21966) {

                    this._flipClock = $(this.$el).find('.tmpw-countdown-plus').FlipClock(minutes, {
                        countdown: true,
                        language: 'it-it',
                    });

                    $(this.$el)
                        .find('[data-toggle="tmpw-popover"]')
                        .popover({ container: 'body', placement: 'bottom', html: true });
                },
                responsiveFlipClock: function() {

                    $(this.$el)
                        .find('.tmpw-countdown-plus')
                        .css({ transform: `scale(${self.$parent.width() / 568})` });
                }
            }
        });

        // Template EndDay Countdown
        // TODO: I guess could be extend by plusCountdownVue
        this.endDayCountdownVue = new Vue({
            el: endDayCountdownTpl,
            data: TMPWCfg,
            created: function() {

                // Resize FlipClock on browser resize
                $(window).resize(() => this.responsiveFlipClock());
            },
            mounted: function() {

                this.initFlipClock();
                this.responsiveFlipClock();
            },
            updated: function() {               // Called on show/hide by config

                this.initFlipClock(this._flipClock.getTime().time);
                this.responsiveFlipClock();
            },
            methods: {
                initFlipClock: function(minutes = 21966) {

                    this._flipClock = $(this.$el).find('.tmpw-countdown-end-day').FlipClock(minutes, {
                        countdown: true,
                        language: 'it-it',
                    });

                    $(this.$el)
                        .find('[data-toggle="tmpw-popover"]')
                        .popover({ container: 'body', placement: 'bottom', html: true });
                },
                responsiveFlipClock: function() {

                    $(this.$el)
                        .find('.tmpw-countdown-end-day')
                        .css({ transform: `scale(${self.$parent.width() / 568})` });
                }
            }
        });
    }

    onDataKoUpdate(ko) {

        const modelUtils = requirejs('modelUtils');
        const koDataBind = ko.dataFor(this.$parent[0]);

        // Get Prestazioni Totali (minutesDone)
        const minutesDone = koDataBind.prestazioniTot();

        this.updatePlusOrMinusLabel(minutesDone, modelUtils);
        this.updateMinutesLeftLabel(minutesDone, modelUtils);
        this.updateMealVoucherLabel(minutesDone, koDataBind);

        this.updateLabelClass(minutesDone);

        const secondsThresholdDiff = (TMPWCfg.minutesThreshold - minutesDone) * 60;
        this.plusCountdownVue._flipClock.setTime(secondsThresholdDiff >= 0 ? secondsThresholdDiff : 0);

        const secondsLeft = (TMPWCfg.maxMinutesAtDay - minutesDone) * 60;
        this.endDayCountdownVue._flipClock.setTime(secondsLeft >= 0 ? secondsLeft : 0);
    }

    updatePlusOrMinusLabel(minutesDone, modelUtils) {

        // Minus or plus
        const thresholdDiff = TMPWCfg.minutesThreshold - minutesDone;

        this.$plusOrMinus[0].innerHTML =
            thresholdDiff > 0 ?
                `<i class="fa fa-minus" aria-hidden="true"></i> Minus ${modelUtils.minToStringNB(thresholdDiff, '.')}` :
                `<i class="fa fa-plus" aria-hidden="true"></i> Plus ${modelUtils.minToStringNB(thresholdDiff * -1, '.')}`;

        // Calc time to Ordinary time
        const endThreshold = new Date((new Date()).getTime() + thresholdDiff * 60000);

        // ...and update popover content
        this.$plusOrMinus.data('bs.popover').options.content = `Fine della giornata (7.12) alle <strong>${TMPWFormatTime(endThreshold)}</strong>`;
    }

    updateMinutesLeftLabel(minutesDone, modelUtils) {

        // Calc minutes left
        const minutesLeft = TMPWCfg.maxMinutesAtDay - minutesDone;
        const minutesLeftStr = modelUtils.minToStringNB(Math.abs(minutesLeft), '.');

        // ...and update label content
        this.$minutesLeft[0].innerHTML = `<i class="fa fa-clock-o" aria-hidden="true"></i> ${(minutesLeft > 0 ? '-' : '+')} ${minutesLeftStr}`;

        // Calc time to go away
        const endDay = new Date((new Date()).getTime() + (TMPWCfg.maxMinutesAtDay * 60000) - (minutesDone * 60000));

        // ...and update popover content
        this.$minutesLeft.data('bs.popover').options.content = `Fine della giornata (9.15) alle <strong>${TMPWFormatTime(endDay)}</strong>`;
    }

    updateMealVoucherLabel(minutesDone, koDataBind) {

        if (minutesDone >= 420) {    // >= 7:00
            const clocks = koDataBind.listatimboriginali();
            for (let i = 0; i < clocks.length; i++) {
                if (clocks[i].minutiv >= 780 &&                            // clock out >= 13:00
                    clocks[i].minutiv <= 870 &&                            // clock out <= 14:30
                    clocks[i].versovdescr == 'Uscita' &&                   // clock out
                    clocks[i + 1] !== undefined &&                         // there is a clock in
                    clocks[i + 1].minutiv <= 870 &&                        // clock in <= 14:30
                    clocks[i + 1].versovdescr == 'Entrata' &&              // clock in
                    clocks[i + 1].minutiv - clocks[i].minutiv >= 10) {     // clock in at least 10 minutes since clock out
                    this.$mealVoucher.show();
                    break;
                }
            }
        } else this.$mealVoucher.hide();
    }

    updateLabelClass(minutesDone) {

        // Minus or plus
        const thresholdDiff = TMPWCfg.minutesThreshold - minutesDone;

        // Change label class by thresold
        if (thresholdDiff > 0) {

            // Minus
            this.$plusOrMinus.removeClass('label-warning label-important');
            this.$minutesLeft.removeClass('label-warning label-important');

        } else if (-(TMPWCfg.maxMinutesAtDay - TMPWCfg.minutesThreshold) < thresholdDiff) {

            // Plus
            this.$plusOrMinus.removeClass('label-important').addClass('label-warning');
            this.$minutesLeft.removeClass('label-important').addClass('label-warning');
        } else {

            // Out of time
            this.$plusOrMinus.removeClass('label-warning').addClass('label-important');
            this.$minutesLeft.removeClass('label-warning').addClass('label-important');
        }
    }
}

class TMPWNotify extends TMPWWidget {

    constructor(objTemplate, parentSelector) {

        super(objTemplate, parentSelector);

        this.lastDatePlusNotify = null;
        this.lastDateEndDayNotify = null;
    }

    onDataKoUpdate(ko) {

        const modelUtils = requirejs('modelUtils');
        const koDataBind = ko.dataFor(this.$parent[0]);

        const now = new Date();

        // Get Prestazioni Totali (minutesDone)
        const minutesDone = koDataBind.prestazioniTot();

        /* Plus Threshold */
        // Calc minutes left (at plus threshold)
        let minutesLeft = TMPWCfg.minutesThreshold - minutesDone;

        // Notify
        // Check if already triggered along current day
        if ((!this.lastDatePlusNotify || this.lastDatePlusNotify.getDate() !== now.getDate()) &&
            TMPWCfg.notify.plus.enabled && minutesLeft <= TMPWCfg.notify.plus.minutesAhead) {

            this.lastDatePlusNotify = new Date();

            // Display HTML5 notification
            GM_notification({
                text: 'Plus raggiunto.\nHai fatto ' + modelUtils.minToStringNB(minutesDone, '.') + ' ore!',
                title: 'Presenze web',
                highlight: false,
                timeout: TMPWCfg.notify.plus.timeout,
                image: 'https://raw.githubusercontent.com/elbowz/TMPresenzeWeb/master/assets/img/icon-timer.png',
                onclick: () => { GM_notification({ highlight: true }); }                   // Highlight browser tab on notification click
            });
        }

        /* End of day */
        // Calc minutes left (at end of day)
        minutesLeft = TMPWCfg.maxMinutesAtDay - minutesDone;

        // Notify (same of above with different threshold)
        if ((!this.lastDateEndDayNotify || this.lastDateEndDayNotify.getDate() !== now.getDate()) &&
            TMPWCfg.notify.endDay.enabled && minutesLeft <= TMPWCfg.notify.endDay.minutesAhead) {

            this.lastDateEndDayNotify = new Date();

            // Display HTML5 notification
            GM_notification({
                text: 'Fine giornata raggiunta.\nHai fatto ' + modelUtils.minToStringNB(minutesDone, '.') + ' ore!',
                title: 'Presenze web',
                highlight: false,
                timeout: TMPWCfg.notify.endDay.timeout,
                image: 'https://raw.githubusercontent.com/elbowz/TMPresenzeWeb/master/assets/img/icon-run.png',
                onclick: () => { GM_notification({ highlight: true }); }                   // Highlight browser tab on notification click
            });
        }
    }
}

class TMPWConfig extends TMPWWidget {

    onReady() {

        // Add modal config
        const configModalTpl = this.objTemplate.elTemplate('config-modal');
        document.body.appendChild(configModalTpl);

        //$('.tamper-config').modal({ show: false });

        // Template config modal
        const configModalVue = new Vue({
            el: '.tmpw-config',
            data: TMPWCfg,
            mounted: function() {
                // Enable modal config tooltips
                $(this.$el).find('[data-toggle="tooltip"]').tooltip();
            },
            methods: {
                // Update config on persistent storage
                change: () => { GM_setValue('TMPWCfg', TMPWCfg); }
            }
        });

        // Add config button to navbar
        const buttonConfig = this.objTemplate.elTemplate('config-button');
        this.$parent.prepend(buttonConfig);
    }
}

/* Main */
$(document).ready(function() {

    // Add resources to main page
    $('head')
        .append('<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">')
        // Minified version have a bug: https://github.com/objectivehtml/FlipClock/issues/289
        .append('<link href="https://cdnjs.cloudflare.com/ajax/libs/flipclock/0.7.8/flipclock.css" rel="stylesheet">')
        .append('<link href="https://rawgit.com/elbowz/TMPresenzeWeb/master/assets/css/main.css" rel="stylesheet">');
});

{
    // Load config from persistence storage
    _.extend(TMPWCfg, GM_getValue('TMPWCfg', TMPWCfg));

    // Add TM Info
    Object.assign(TMPWCfg, { GMInfo: GM_info });

    // Init object template
    const mainHtmlTp = new TMHtmlTemplate('rsMainHtmlTpl');

    // Init objects widget
    new TMPWConfig(mainHtmlTp, '#dashboard .nav.nav-pills.pull-right');
    new TMPWMyTyme(mainHtmlTp, '#mytime .row-fluid.margin-top-10 .span12');
    new TMPWNotify(mainHtmlTp, '#mytime .row-fluid.margin-top-10 .span12');
}