import Filter from './filter.js';
import TalentPoolSidebar from './sidebar.js';
import Counter from './counter.js';
import dataSort from './sorting.js';
import RangeSlider from './range_slider.js';
export class TalentPool {
    constructor(options = {}) {
        this.options = options;
        this.custom_talent_category = options.custom_talent_category;
        this.container = document.querySelector(options.container);
        this.talentPool = options.data || [];
        this.sidebar = new TalentPoolSidebar({
            container: this.container,
            talentPool: this.talentPool,
            parent: this,
            labels: this.options.labels,
            popupTitle: this.options.popupTitle,
        });
        this.sidebar.Filter = this.Filter;
        this.Filter = new Filter({
            container: this.container,
            sidebar: this.sidebar,
            talentPool: this.talentPool,
            normalize: this.normalize.bind(this),
            getSplitPattern: this.getSplitPattern.bind(this),
            labels: this.options.labels,
            itemsPerPageShow: this.options.itemsPerPageShow,
            loadingText: this.options.loadingText,
            InnerPageLink: this.options.InnerPageLink,
            formateCurrency: this.formateCurrency.bind(this)
        });
        this.sidebar.Filter = this.Filter;
        this.counter = new Counter({
            sidebar: this.sidebar,
            Filter: this.Filter,
            talentPool: this.talentPool,
            normalize: this.normalize.bind(this),
            getSplitPattern: this.getSplitPattern.bind(this),
            labels: this.options.labels
        }, {
            container: this.container,
            Filter: this.Filter,
        });
        this.Filter.Counter = this.counter;
        this.dataSort = new dataSort({
            sidebar: this.sidebar,
            Filter: this.Filter,
            Counter: this.counter,
            talentPool: this.talentPool,
            normalize: this.normalize.bind(this),
            getSplitPattern: this.getSplitPattern.bind(this),
            labels: this.options.labels
        }, {
            container: this.container,
            Filter: this.Filter,
            Counter: this.counter,
        });
        this.RangeSlider = new RangeSlider({
            sidebar: this.sidebar,
            slider: this.sidebar.rangeSlider
        });
        this.initializeLoading();
    }
    renderSidebar() {
        const categoriesList = this.talentPool.map(item => (item.properties.custom_talent_category || '').trim().toLowerCase());
        const availableCategories = new Set(categoriesList.filter(Boolean));
        const group = this.custom_talent_category.group;
        const fullGroup = {};
        for (const [key, groupObj] of Object.entries(group)) {
            fullGroup[key] = {
                ...groupObj,
                ...(groupObj.values && { values: [...groupObj.values] })
            };
        }
        this.sidebar.buildOptionsData({
            ...this.options.t_procedure_txt,
        });
        this.sidebar.buildOptionsDataGroup({
            ...this.custom_talent_category,
        });
        this.sidebar.buildOptionsData({
            ...this.options.t_experience_level
        });
        this.sidebar.buildOptionsData({
            ...this.options.t_desired_region_1,
        });

        this.sidebar.rangeSlider({
            ...this.options.t_desired_salary,
        });
    }
    // normalize(str) {
    //     return String(str || "")
    //         .normalize("NFKC")
    //         .replace(/[^\x20-\x7E]/g, "")
    //         .toLowerCase()
    //         .replace(/[_\s]+/g, " ")
    //         .replace(/\b_[a-z]$/i, "")
    //         .trim();
    // }
    normalize(str) {
        return String(str || "")
            .normalize("NFKC")
            .replace(/[^\x20-\x7E]/g, "")
            .toLowerCase()
            .replace(/[_\s]+/g, " ")
            .replace(/\s*&\s*/g, ' and ') 
            .replace(/\s+and\s+/g, ' and ') 
            .replace(/\b_[a-z]$/i, "")
            .trim();
    }
    getSplitPattern(value) {
        if (value.includes(";")) return /[;]/;
        const commaCount = (value.match(/,/g) || []).length;
        return commaCount > 1 || value.length < 100 ? /[;,]/ : /[;]/;
    }
    formateCurrency(value, end = '€') {
        const numberValue = parseFloat(value);
        if (isNaN(numberValue)) return value;
        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(numberValue).replace('€', end);
    }
    initializeLoading() {
        const loadingElement = document.querySelector('.talent-pool-loading-text');
        if (loadingElement && this.options.loadingText) {
            if (!loadingElement.querySelector('h4')) {
                const h4 = document.createElement('h4');
                h4.textContent = this.options.loadingText;
                loadingElement.appendChild(h4);
            }
            loadingElement.style.display = 'block';
        }
    }
    toggleLoading(show) {
        const displayMap = {
            loading: show ? 'flex' : 'none',
            box: show ? 'none' : 'flex',
            pagination: show ? 'none' : 'flex',
            sidebar: show ? 'none' : 'block',
            sorting: show ? 'none' : 'block'
        };
        const elements = {
            loading: document.querySelector('.talent-pool-loading-text'),
            box: document.querySelector('.talent-pool-filter-box'),
            pagination: document.querySelector('.pagination_contain'),
            sidebar: document.querySelector('.talent-pool-filter-sidebar'),
            sorting: document.querySelector('.talent-pool-sorting-container'),
            main: document.getElementById('TalentPool')
        };
        elements.loading && (elements.loading.style.display = displayMap.loading);
        elements.box && (elements.box.style.display = displayMap.box);
        elements.pagination && (elements.pagination.style.display = displayMap.pagination);
        elements.sidebar && (elements.sidebar.style.display = displayMap.sidebar);
        elements.sorting && (elements.sorting.style.display = displayMap.sorting);
        if (elements.main) {
            elements.main.classList.toggle('add_id', show);
        }
    }
    counterLoading(loading = true) {
        const counterContainer = this.container.querySelector('.talent-pool-counter');
        //console.log("test",counterContainer);
        if (!counterContainer) return;

        const spinner = counterContainer.querySelector('.counter-loading');

        if (loading) {
            if (spinner) spinner.style.display = 'block';
        } else {
            if (spinner) spinner.style.display = 'none';
        }
    }
    counerShowLoading() {
        this.counterLoading(true);
    }
    counerHideLoading() {
        this.counterLoading(false);
    }
    showLoading() {
        this.toggleLoading(true);
    }
    hideLoading() {
        this.toggleLoading(false);
    }
    popupClose() {
        const popup = document.querySelector(".talent-pool-popup-container");
        if (popup) {
            popup.remove();
            document.body.classList.remove("open-popup");
            document.dispatchEvent(new CustomEvent("model-close"));
        }
    }
    createCloseButton(onClose = () => {}) {
        const button = document.createElement("button");
        button.classList.add("talent-pool-close-button");
        button.innerHTML = `<svg height="512px" id="Layer_1" style="enable-background:new 0 0 512 512;" version="1.1" viewBox="0 0 512 512" width="512px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M443.6,387.1L312.4,255.4l131.5-130c5.4-5.4,5.4-14.2,0-19.6l-37.4-37.6c-2.6-2.6-6.1-4-9.8-4c-3.7,0-7.2,1.5-9.8,4  L256,197.8L124.9,68.3c-2.6-2.6-6.1-4-9.8-4c-3.7,0-7.2,1.5-9.8,4L68,105.9c-5.4,5.4-5.4,14.2,0,19.6l131.5,130L68.4,387.1  c-2.6,2.6-4.1,6.1-4.1,9.8c0,3.7,1.4,7.2,4.1,9.8l37.4,37.6c2.7,2.7,6.2,4.1,9.8,4.1c3.5,0,7.1-1.3,9.8-4.1L256,313.1l130.7,131.1  c2.7,2.7,6.2,4.1,9.8,4.1c3.5,0,7.1-1.3,9.8-4.1l37.4-37.6c2.6-2.6,4.1-6.1,4.1-9.8C447.7,393.2,446.2,389.7,443.6,387.1z"></path></svg>`;
        button.addEventListener("click", () => {
            this.popupClose();
            onClose();
        });
        return button;
    }
}
window.TalentPool = TalentPool;
