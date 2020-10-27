// ==UserScript==
// @name         PresenzeWeb
// @namespace    https://github.com/elbowz/TMPresenzeWeb
// @version      1.2.9
// @description  TamperMonkey script for extend PresenzeWeb
// @author       Emanuele Palombo (elbowz)
// @require      https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.20/lodash.min.js
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
 https://rawgit.com/elbowz/TMPresenzeWeb/master/assets/template/main.html => file:///.../source/main/assets/template/main.html
 https://rawgit.com/elbowz/TMPresenzeWeb/master/assets/lib/utils.js => file:///.../source/main/assets/lib/utils.js
 https://rawgit.com/elbowz/TMPresenzeWeb/master/assets/css/main.css => file:///.../source/main/assets/css/main.css */

/* Global Config */
let TMPWCfg = {
    maxMinutesAtDay: 555,          // 9:15
    minutesThreshold: 432,         // 7:12
    minutesMealVoucher: 420,       // 7:00
    sessionKeepAlive: true,
    countdown: {
        mealVoucher: true,
        plus: true,
        endDay: true
    },
    notify: {
        mealVoucher: { enabled: true, timeout: 0, minutesAhead: 12 },
        plus: { enabled: true, timeout: 0, minutesAhead: 12 },
        endDay: { enabled: true, timeout: 0, minutesAhead: 12 }
    }
};

class TMPWMyTime extends TMPWWidget {

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

        this.initCountDowns();
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

        // Update countdown
        const mealVoucherDiff = (TMPWCfg.minutesMealVoucher - minutesDone) * 60;
        this.mealVoucherCountdownVue._flipClock.setTime(mealVoucherDiff >= 0 ? mealVoucherDiff : 0);

        const secondsThresholdDiff = (TMPWCfg.minutesThreshold - minutesDone) * 60;
        this.plusCountdownVue._flipClock.setTime(secondsThresholdDiff >= 0 ? secondsThresholdDiff : 0);

        const secondsLeft = (TMPWCfg.maxMinutesAtDay - minutesDone) * 60;
        this.endDayCountdownVue._flipClock.setTime(secondsLeft >= 0 ? secondsLeft : 0);
    }

    intVueCountDown(elTpl, selector) {

        const self = this;

        return new Vue({
            el: elTpl,
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

                    this._flipClock = $(this.$el).find(selector).FlipClock(minutes, {
                        countdown: true,
                        language: 'it-it',
                    });

                    $(this.$el)
                        .find('[data-toggle="tmpw-popover"]')
                        .popover({ container: 'body', placement: 'bottom', html: true });
                },
                responsiveFlipClock: function() {

                    $(this.$el)
                        .find(selector)
                        .css({ transform: `scale(${self.$parent.width() / 568})` });
                }
            }
        });
    }

    initCountDowns() {

        // Append template
        const mealVoucherCountdownTpl = this.objTemplate.elTemplate('countdown-meal-voucher');
        const plusCountdownTpl = this.objTemplate.elTemplate('countdown-plus');
        const endDayCountdownTpl = this.objTemplate.elTemplate('countdown-end-day');
        this.$parent.closest('#mytime').append(mealVoucherCountdownTpl).append(plusCountdownTpl).append(endDayCountdownTpl);

        this.mealVoucherCountdownVue = this.intVueCountDown(mealVoucherCountdownTpl, '.tmpw-countdown-meal-voucher');
        this.plusCountdownVue = this.intVueCountDown(plusCountdownTpl, '.tmpw-countdown-plus');
        this.endDayCountdownVue =  this.intVueCountDown(endDayCountdownTpl, '.tmpw-countdown-end-day');
    }

    updatePlusOrMinusLabel(minutesDone, modelUtils) {

        // Minus or plus
        const thresholdDiff = TMPWCfg.minutesThreshold - minutesDone;

        // Calc time to Ordinary time
        const endThreshold = new Date((new Date()).getTime() + thresholdDiff * 60000);

        // Update label
        this.$plusOrMinus[0].innerHTML =
            (thresholdDiff > 0 ?
                '<i class="fa fa-fw fa-minus-circle" aria-hidden="true"></i> ' :
                '<i class="fa fa-fw fa-plus-circle" aria-hidden="true"></i> ') +
            TMPWFormatTime(endThreshold);

        // ...and popover content
        this.$plusOrMinus.data('bs.popover').options.content =
            thresholdDiff > 0 ?
                `Mancano <strong>${modelUtils.minToStringNB(thresholdDiff, '.')}h</strong> alla fine della giornata (7.12)` :
                `Hai superato di <strong>${modelUtils.minToStringNB(thresholdDiff * -1, '.')}h</strong> la fine della giornata (7.12)`;
    }

    updateMinutesLeftLabel(minutesDone, modelUtils) {

        // Calc minutes left
        const minutesLeft = TMPWCfg.maxMinutesAtDay - minutesDone;
        const minutesLeftStr = modelUtils.minToStringNB(Math.abs(minutesLeft), '.');

        // Calc time to go away
        const endDay = new Date((new Date()).getTime() + (TMPWCfg.maxMinutesAtDay * 60000) - (minutesDone * 60000));

        // Update label content
        this.$minutesLeft[0].innerHTML = `<i class="fa fa-clock-o" aria-hidden="true"></i> ${(minutesLeft > 0 ? '-' : '+')} ${minutesLeftStr}`;
        this.$minutesLeft[0].innerHTML = `<i class="fa fa-fw fa-clock-o" aria-hidden="true"></i> ${TMPWFormatTime(endDay)}`;

        // ...and popover content
        this.$minutesLeft.data('bs.popover').options.content =
            minutesLeft > 0 ?
                `Mancano <strong>${minutesLeftStr}h</strong> al massimo ore giornaliere (9.15)` :
                `Hai superato di <strong>${minutesLeftStr}h</strong> il massimo ore giornaliere (9.15)`;
    }

    updateMealVoucherLabel(minutesDone, koDataBind) {

        if (minutesDone >= TMPWCfg.minutesMealVoucher) {
            const clocks = koDataBind.listatimboriginali();

            for (let i = 2; i < clocks.length; i += 2) {

                if (clocks[i].versovdescr == 'Entrata' && clocks[i].minutiv >= 790 &&          // clock in  >= 13:10
                    clocks[i - 1].versovdescr == 'Uscita' && clocks[i - 1].minutiv <= 890 &&   // clock out <= 14:50
                    clocks[i].minutiv - clocks[i - 1].minutiv >= 10) {                         // clock in at least 10 minutes since clock out

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

class TMPWCartellino extends TMPWWidget {

    onReady(ko) {

        this.query = new TMPQuery();
        this.koDataBind = ko.dataFor(this.$parent.closest('#widget-body-cartellino')[0]);

        this.$countMealVoucher = $(this.objTemplate.elTemplate('label-count-meal-voucher'));
        this.$countAnomalies = $(this.objTemplate.elTemplate('label-count-anomalies'));

        // Add to interface panel (surrounded by a <span>)
        this.$parent.append($(document.createElement('span')).append(this.$countMealVoucher));
        this.$parent.append($(document.createElement('span')).append(this.$countAnomalies));

        this.$parent.addClass('flex-center');

        // Subscribe to Calendar (cartellino) on change (arrows click)
        this.koDataBind.viewModel.datafine.subscribe(_.debounce(this.computeCartellino.bind(this), 350, false));

        this.computeCartellino()
    }

    computeCartellino() {
        const viewModel = this.koDataBind.viewModel;

        // Compute mealVoucher on current month
        this.query.post({
            datainizio: viewModel.datainizio(),
            datafine: viewModel.datafine()
        }).then(response => {
            const sintensi = this.query.jsonUtils.normalizza(response.result.sintesi);

            let countAnomalies = 0;
            let countMealVoucher = 0;

            // Count mealvouchers and anomlaies
            for (let day of sintensi) {
                countAnomalies += day.listaanomalie.length
                if (day.listavbdescrestesa.find((element) => element.valore == 60)) countMealVoucher++;
            }

            // Set values
            this.$countAnomalies[0].children[1].innerHTML = countAnomalies;

            if (countAnomalies) this.$countAnomalies.addClass('label-warning');
            else this.$countAnomalies.removeClass('label-warning')

            this.$countMealVoucher[0].children[1].innerHTML = countMealVoucher;
            this.$countMealVoucher[0].children[2].innerHTML = '/' + sintensi.length;
        })
    }
}

class TMPWNotify extends TMPWWidget {

    constructor(objTemplate, parentSelector) {

        super(objTemplate, parentSelector);

        this.lastDateMealVoucherNotify = null;
        this.lastDatePlusNotify = null;
        this.lastDateEndDayNotify = null;
    }

    onDataKoUpdate(ko) {

        const modelUtils = requirejs('modelUtils');
        const koDataBind = ko.dataFor(this.$parent[0]);

        const now = new Date();

        // Get Prestazioni Totali (minutesDone)
        const minutesDone = koDataBind.prestazioniTot();

        /* Meal voucher */
        // Calc minutes left (at meal vaucher)
        let minutesLeft = TMPWCfg.minutesMealVoucher - minutesDone;

        // Notify
        // Check if already triggered along current day
        if ((!this.lastDateMealVoucherNotify || this.lastDateMealVoucherNotify.getDate() !== now.getDate()) &&
            TMPWCfg.notify.mealVoucher.enabled && minutesLeft <= TMPWCfg.notify.mealVoucher.minutesAhead) {

            this.lastDateMealVoucherNotify = new Date();

            // Display HTML5 notification
            GM_notification({
                text: 'Buono pasto raggiunto.\nHai fatto ' + modelUtils.minToStringNB(minutesDone, '.') + ' (su ' + modelUtils.minToStringNB(TMPWCfg.minutesMealVoucher, '.') + ') ore !',
                title: 'Presenze web',
                highlight: false,
                timeout: TMPWCfg.notify.mealVoucher.timeout,
                image: 'https://raw.githubusercontent.com/elbowz/TMPresenzeWeb/master/assets/img/icon-meal-voucher.png',
                onclick: () => { GM_notification({ highlight: true }); }                   // Highlight browser tab on notification click
            });
        }

        /* Plus Threshold */
        // Calc minutes left (at plus threshold)
        minutesLeft = TMPWCfg.minutesThreshold - minutesDone;

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

    constructor(objTemplate, parentSelector) {

        super(objTemplate, parentSelector);

        this.sessionKeepAliveTimer = null;
    }

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
                change: () => {
                    GM_setValue('TMPWCfg', TMPWCfg);

                    // Start SessionKeepAlive (if set in config)
                    this.sessionKeepAlive(TMPWCfg.sessionKeepAlive);
                }
            }
        });

        // Add config button to navbar
        const buttonConfig = this.objTemplate.elTemplate('config-button');
        this.$parent.prepend(buttonConfig);

        // Start SessionKeepAlive (if set in config)
        this.sessionKeepAlive(TMPWCfg.sessionKeepAlive);
    }

    sessionKeepAlive(start = true) {

        if (this.sessionKeepAliveTimer) clearInterval(this.sessionKeepAliveTimer);

        if (start) {
            this.sessionKeepAliveTimer = setInterval(() =>
                    fetch('/StartWeb/default.aspx')
                        .then(() => { console.log('Session KeepAlive:', TMPWFormatTime())}
                        )
                , 1000 * 60 * 10);
        }
    }
}

class TMPWAnalytics extends TMPWWidget {

    onReady() {

        // Add resources to main page
        $('head').append(`<script async src="https://www.googletagmanager.com/gtag/js?id=G-EKNP1X1LN3"></script>
                <script>
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());

                  gtag('config', 'G-EKNP1X1LN3');
                </script>
        `);

        this.collectInfoOnce = _.once(this.collectInfo);
    }

    onDataKoUpdate(ko) {

        const koDataBind = ko.dataFor(this.$parent[0]);
        this.collectInfoOnce(koDataBind);
    }

    collectInfo(koDataBind) {

        gtag('event', 'tmpw-users', {'full_name': koDataBind.currentUser().nominativo});
    }
}

/* Main */
$(document).ready(function() {

    // Add resources to main page
    $('head')
        .append('<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">')
        // Minified version have a bug: https://github.com/objectivehtml/FlipClock/issues/289
        .append('<link href="https://cdnjs.cloudflare.com/ajax/libs/flipclock/0.7.8/flipclock.css" rel="stylesheet">')
        .append('<link href="https://rawgit.com/elbowz/TMPresenzeWeb/master/assets/css/main.css" rel="stylesheet">')
});

{
    // Load config from persistence storage
    _.merge(TMPWCfg, GM_getValue('TMPWCfg', TMPWCfg));

    // Add TM Info
    Object.assign(TMPWCfg, { GMInfo: GM_info });

    // Init object template
    const mainHtmlTp = new TMHtmlTemplate('rsMainHtmlTpl');

    // Init objects widget
    new TMPWConfig(mainHtmlTp, '#dashboard .nav.nav-pills.pull-right');
    new TMPWMyTime(mainHtmlTp, '#mytime .row-fluid.margin-top-10 .span12');
    new TMPWNotify(mainHtmlTp, '#mytime .row-fluid.margin-top-10 .span12');
    new TMPWCartellino(mainHtmlTp, '#calendar-cartellino > div.fc-toolbar > div.fc-left');
    new TMPWAnalytics(mainHtmlTp, '#mytime .row-fluid.margin-top-10 .span12');
}