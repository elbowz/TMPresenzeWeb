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
            self.onReady();
            requirejs(['knockout'], (ko) => { ko.computed(() => { self.onDataKoUpdate(ko); }); });
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

/**
 * Format a Date object to HH:MM
 * @return {string} - formatted time
 */
function TMPWFormatTime(time = new Date()) {
    return ('0' + time.getHours()).slice(-2) + ':' + ('0' + time.getMinutes()).slice(-2);
}