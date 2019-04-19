class TMHtmlTemplate {

    /**
     * @param {string} resourceName - TamperMonkey resource label
     */
    constructor(resourceName) {

        this.resourceText = GM_getResourceText(resourceName);

        this.elResource = document.createElement('div');
        this.elResource.innerHTML = this.resourceText;

        this.elTemplateLst = [];
    }

    /**
     * Get HTML template
     * @param {string} templateName - template class name
     * @returns {HTMLCollection/Element} - template content
     */
    elTemplate(templateName) {

        // Check cache
        if (!this.elTemplateLst.hasOwnProperty(templateName)) {

            // Pull template from resource
            let elTemplate = this.elResource.querySelector(`template.${templateName}`);

            // If not extist...or browser not support <template>
            if (!elTemplate || !('content' in elTemplate)) return false;

            // Get template content
            elTemplate = elTemplate.content;

            // Return single Element or NodeList
            this.elTemplateLst[templateName] = elTemplate.childElementCount >= 2 ? elTemplate.children : elTemplate.firstElementChild;
        }

        return this.elTemplateLst[templateName];
    }
}

class TMPWWidget {
    /**
     * @param {TMHtmlTemplate} objTemplate
     * @param {string} selectorParent - waited html element
     */
    constructor(objTemplate, parentSelector) {

        let self = this;
        self.objTemplate = objTemplate;

        document.arrive(parentSelector, { onceOnly: true }, function() {

            self.$parent = $(this);

            const knockoutLibName = require.defined('knockout') ? 'knockout' : 'ko';

            requirejs([knockoutLibName], (ko) => {
                self.onReady(ko);
                ko.computed(() => { self.onDataKoUpdate(ko); });
            });
        });
    }

    /**
     * Fired on Parent avvailable
     */
    onReady() {

        //console.log('[TMPWWidget] onReady');
    }

    /**
     * Fired on knockout updated variables
     * note: must use some ko binded functions to trigger
     */
    onDataKoUpdate(ko) {

        //console.log('[TMPWWidget] onUpdate');
    }
}

class TMPQuery {
    /**
     * Include the needed libs (by requirejs)
     */
    init() {
        return new Promise((resolve, reject) => {

            if (this.app) resolve();
            else {

                requirejs(['jsonUtils', 'runtime', 'cartellino/url', 'tw'],
                    (jsonUtils, runtime, internalUrl, tw) => {

                        this.app = runtime.newApp();
                        this.currentUser = this.app.currentUser();
                        this.jsonUtils = jsonUtils;
                        this.internalUrl = internalUrl;
                        this.tw = tw;

                        resolve({ jsonUtils, runtime, internalUrl, tw });
                    });
            }
        });
    }

    /**
     * Make a REST call to retrive Cartellino informantion (by day)
     * @param {TMHtmlTemplate} objTemplate
     * @param {string} selectorParent - waited html element
     */
    async post(queryParams = {}, url = null) {

        await this.init();

        if (!url) url = this.internalUrl.ConsultaCartellino(this.currentUser.iddip)

        queryParams = Object.assign({
            tiporichiesta: this.tw.defs.tTipoRichiestaCartellino.trcSingoloDipendente,
            tipoconsultazione: this.tw.defs.tTipoConsultazioneCartellino.tccConsultazione
        }, queryParams);

        if (queryParams instanceof Object) queryParams = this.jsonUtils.toJset(this.app.fromObservable(queryParams));

        return new Promise((resolve, reject) => {

            const postCallback = function(retData, textStatus, jqXhr) {

                retData = retData || '';
                const jsonobj = $.isPlainObject(retData) || $.isArray(retData) || retData == '' ? retData : JSON.parse(retData);

                if (jsonobj.__rpc_error) reject(jsonobj.__rpc_error);
                else resolve(jsonobj);
            };

            $.post(url, queryParams, postCallback, 'json')
                .error(function(jqXhr, textStatus) {

                    const jsonobj = this.jsonUtils.normalizza(jqXhr.responseText);
                    const message = jsonobj.__rpc_error || textStatus;

                    reject(message);
                });
        });
    }
}

/**
 * Format a Date object to HH:MM
 * @return {string} - formatted time
 */
function TMPWFormatTime(time = new Date()) {
    return ('0' + time.getHours()).slice(-2) + ':' + ('0' + time.getMinutes()).slice(-2);
}