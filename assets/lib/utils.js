class TMHtmlTemplate {

    // @param: TamperMonkey resource label
    constructor(resourceName) {

        this.resourceText = GM_getResourceText(resourceName);

        this.elResource = document.createElement('div');
        this.elResource.innerHTML = this.resourceText;

        this.elTemplateLst = [];
    }

    // @param: template class name
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
