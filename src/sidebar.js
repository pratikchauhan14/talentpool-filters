import RangeSlider from "./range_slider.js";
import { popupButton } from "./popup_data.js";
export default class TalentPoolSidebar {
    constructor(options) {
        this.container = options.container;
        this.talentPool = options.talentPool;
        this.parent = options.parent;
        this.storedValue = {};
        this.counter = options.counter;
        this.normalize = this.parent.normalize;
        this.labels = options.labels;
        this.popupTitle = options.popupTitle;
        this._events = {};
        this.filterSidebar();
        this.reset();
    }
    // Event System
    on(event, handler) {
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(handler);
    }
    emit(event, data) {
        if (this._events[event]) {
            this._events[event].forEach(handler => handler(data));
        }
    }
    triggerChange() {
        this.emit("onChange", this.storedValue);
    }
    // Sidebar UI Setup
    filterSidebar() {
        const maindiv = document.createElement("div");
        maindiv.classList.add("talent-pool-filter-sidebar");
        const titleDiv = document.createElement("div");
        titleDiv.classList.add("talent-pool-contain");
        titleDiv.innerHTML = `<div class="talent-pool-counter"><div class="counter-loading"></div><h4 class="total-count"></h4></div>`;
        const resetHtml = document.createElement("div");
        resetHtml.classList.add("talent-pool-reset");
        resetHtml.innerHTML = `${this.labels.resetLabel}`;
        titleDiv.appendChild(resetHtml);

        maindiv.appendChild(titleDiv);
        this.container.appendChild(maindiv);
        this.sidebar = maindiv;

        const cobalt_search = document.createElement("div");
        cobalt_search.classList.add("cobalt_search");
        cobalt_search.innerHTML = `<input type="text" id="search" placeholder="${this.labels.searchPlaceholder}"></input>`;
        cobalt_search.innerHTML += ` <span><svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><g id="Search1_layer"><path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z"></path></g></svg></span>`;
        this.sidebar.appendChild(cobalt_search);

        const popupTitle = document.createElement("div");
        popupTitle.classList.add("talent-pool-popup-title");
        popupTitle.innerHTML = `<h4>${this.popupTitle}</h4>`;
        this.sidebar.appendChild(popupTitle);

    }
    updateData(talentPool) {
        const prevStoredValue = JSON.parse(JSON.stringify(this.storedValue));
        this.talentPool = talentPool;
        while (this.sidebar.children.length > 3) {
            this.sidebar.removeChild(this.sidebar.lastChild);
        }
        if (this.parent) {
            this.parent.talentPool = talentPool;
            if (typeof this.parent.renderSidebar === "function") {
                this.parent.renderSidebar();
            }
        }
        this.storedValue = prevStoredValue;
        setTimeout(() => {
            for (const key in prevStoredValue) {
                const value = prevStoredValue[key];
                if (typeof value === "object" && !Array.isArray(value)) {
                    for (const groupKey in value) {
                        const groupValue = value[groupKey];
                        if (typeof groupValue === "object" && !Array.isArray(groupValue)) {
                            for (const subGroupKey in groupValue) {
                                const selectedValues = groupValue[subGroupKey];
                                if (Array.isArray(selectedValues)) {
                                    if (selectedValues.length === 1 && selectedValues[0] === "selected") {
                                        const subGroupCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}`);
                                        if (subGroupCheckbox) subGroupCheckbox.checked = true;
                                    } else if (selectedValues.length === 1 && selectedValues[0] === subGroupKey) {
                                        const subGroupCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}`);
                                        if (subGroupCheckbox) subGroupCheckbox.checked = true;
                                    } else {
                                        selectedValues.forEach(val => {
                                            const input = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}-${val}`);
                                            if (input) input.checked = true;
                                        });
                                        const nestedGroup = this.parent.custom_talent_category.group[groupKey]?.group?.[subGroupKey];
                                        if (nestedGroup && nestedGroup.type !== "simple") {
                                            const allCount = nestedGroup ? this.getSimpleOptionsData(nestedGroup.values || []).length : 0;
                                            const selectedCount = selectedValues.length;
                                            const subGroupCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}`);
                                            if (subGroupCheckbox && allCount > 0) {
                                                subGroupCheckbox.checked = selectedCount === allCount;
                                                subGroupCheckbox.indeterminate = selectedCount > 0 && selectedCount < allCount;
                                                subGroupCheckbox.classList.toggle("indeterminate", subGroupCheckbox.indeterminate);
                                            }
                                        }
                                    }
                                }
                            }
                        } else if (Array.isArray(groupValue)) {
                            groupValue.forEach(val => {
                                const input = document.getElementById(`talent-pool-${key}-${val}`);
                                if (input) input.checked = true;
                            });
                            const allCount = this.getSimpleOptionsData(this.parent.custom_talent_category.group[groupKey]?.values || []).length;
                            const selectedCount = groupValue.length;
                            const groupCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}`);
                            if (groupCheckbox) {
                                groupCheckbox.checked = selectedCount === allCount;
                                groupCheckbox.indeterminate = selectedCount > 0 && selectedCount < allCount;
                                groupCheckbox.classList.toggle("indeterminate", groupCheckbox.indeterminate);
                            }
                        }
                    }
                } else if (Array.isArray(value)) {
                    value.forEach(val => {
                        const input = document.getElementById(`talent-pool-${key}-${val}`);
                        if (input) input.checked = true;
                    });
                }
            }
            for (const key in prevStoredValue) {
                const value = prevStoredValue[key];
                if (typeof value === "object" && !Array.isArray(value)) {
                    for (const groupKey in value) {
                        const groupValue = value[groupKey];
                        if (typeof groupValue === "object" && !Array.isArray(groupValue)) {
                            this.updateParentCheckboxState(key, groupKey);
                        }
                    }
                }
            }
            this.triggerChange();
        }, 0);
    }
    // rangeslider 
    rangeSlider(option) {
        this.rangeSliderOption = option;
        const rangeSlider = new RangeSlider({
            ...option,
            formateCurrency: this.parent.formateCurrency.bind(this.parent)
        });
        const element = rangeSlider.initialize();
        this.sidebar.appendChild(element);
        // Initial filter
        const initialData = rangeSlider.getValue();
        this.filterBySalary(initialData);
        rangeSlider.on("change", (data) => {
            this.filterBySalary(data);
        });
        popupButton(this);
    }

    filterBySalary({ minValue, maxValue }) {
        this.storedValue.t_desired_salary = { minValue, maxValue };
        this.triggerChange();
    }
    // getOptionsData(key = null, exclude = []) {
    //     if (!key) return console.error("Key is required to get options data");
    //     const uniqueValues = new Set();
    //     this.talentPool.forEach(item => {
    //         if (item.properties[key] && !exclude.includes(item.properties[key])) {
    //             uniqueValues.add(item.properties[key]);
    //         }
    //     });
    //     return Array.from(uniqueValues).map(value => ({ label: value, value }));
    // }
    getOptionsData(key = null, exclude = []) {
        if (!key) return console.error("Key is required to get options data");
        const uniqueValues = new Set();
        const keys = Array.isArray(key) ? key : [key];
        this.talentPool.forEach(item => {
            keys.forEach(k => {
                const val = item.properties[k];
                if (val && !exclude.includes(val)) {
                    uniqueValues.add(val);
                }
            });
        });
        const options = Array.from(uniqueValues).map(value => ({
            label: value,
            value
        }));
        options.sort((a, b) => a.label.localeCompare(b.label));
        return options;
    }
    

    getSimpleOptionsData(value = null) {
        if (!value) return console.error("Value is required to get simple options data");
        return value.map(val => ({ label: val, value: val }));
    }

    addRemoveValueInStoredValue({ key = null, value = null, groupKey = null }) {
        if (!key || value === null) return;
        const previousState = JSON.parse(JSON.stringify(this.storedValue));
        if (groupKey) {
            this.storedValue[groupKey] = this.storedValue[groupKey] || {};
            this.storedValue[groupKey][key] = this.storedValue[groupKey][key] || [];
            const group = this.storedValue[groupKey][key];
            const index = group.indexOf(value);
            if (index > -1) {
                group.splice(index, 1);
            } else {
                group.push(value);
            }
            if (key.startsWith('t_desired_region_')) {
                for (let i = 1; i <= 3; i++) {
                    const regionKey = `t_desired_region_${i}`;
                    if (regionKey !== key) {
                        this.storedValue[groupKey][regionKey] = this.storedValue[groupKey][regionKey] || [];
                        const regionIndex = this.storedValue[groupKey][regionKey].indexOf(value);
                        if (regionIndex > -1) {
                            this.storedValue[groupKey][regionKey].splice(regionIndex, 1);
                        }
                    }
                }
            }
        } else {
            this.storedValue[key] = this.storedValue[key] || [];
            const index = this.storedValue[key].indexOf(value);
            index > -1 ? this.storedValue[key].splice(index, 1) : this.storedValue[key].push(value);
        }
        if (JSON.stringify(previousState) !== JSON.stringify(this.storedValue)) {
            this.triggerChange();
        }
    }

    buildOptionsDataGroup({ title = "", key = null, group = { filteredGroup } }) {
        if (!key) return console.error("Key is required to build options data group");
        
        const hasNestedGroups = Object.values(group).some(item => item.type === "group" && item.group);
        if (hasNestedGroups) {
            this.buildNestedOptionsDataGroup({ title, key, group });
        } else {
            if (title) {
                const titleElement = document.createElement("h3");
                titleElement.textContent = title;
                this.sidebar.appendChild(titleElement);
            }
            this.storedValue[key] = {};
            Object.keys(group).forEach(groupKey => {
                const item = group[groupKey];
                this.storedValue[key][groupKey] = [];
                this.buildOptionsData({
                    isCustom: true,
                    values: item.values || [],
                    type: item.type || "checkbox",
                    key,
                    groupKey,
                    exclude: item.exclude || [],
                    placeholder: item.placeholder || "",
                    title: item.name || groupKey
                });
            });
        }
    }

    dropdownButtonHandler(e) {
        const wrapper = e.target.closest(".talent-pool-checkboxes");
        wrapper.classList.toggle("active");
    }

    buildOptionsData({ isCustom = false, values = [], type = "checkbox", key = null, exclude = [], placeholder = "", title = "", groupKey = null , replace = null }) {
        if (!key) return console.error("Key is required to build options data");
        const options = isCustom ? this.getSimpleOptionsData(values) : this.getOptionsData(key, exclude);
        const checkboxContainer = document.createElement("div");
        checkboxContainer.classList.add("talent-pool-checkboxes");
        checkboxContainer.setAttribute("data-key", key);
        if (isCustom && groupKey) {
            checkboxContainer.setAttribute("data-group-key", groupKey);
        }
        if (title && !isCustom) {
            const titleElement = document.createElement("h3");
            titleElement.textContent = title;
            checkboxContainer.appendChild(titleElement);
            this.storedValue[key] = [];
        }
        if (title && isCustom) {
            const dropdownButton = document.createElement("div");
            dropdownButton.classList.add("talent-pool-dropdown-button");
            dropdownButton.textContent = "";
            dropdownButton.addEventListener("click", (e) => {
                this.dropdownButtonHandler(e);
            });
            checkboxContainer.appendChild(dropdownButton);

            const checkboxInput = document.createElement("input");
            checkboxInput.type = "checkbox";
            checkboxInput.id = `talent-pool-${key}-${groupKey}`;
            checkboxInput.classList.add("talent-pool-checkbox-input");

            const checkboxLabel = document.createElement("label");
            checkboxLabel.htmlFor = checkboxInput.id;
            checkboxLabel.textContent = title;

            checkboxContainer.appendChild(checkboxInput);
            checkboxContainer.appendChild(checkboxLabel);

            checkboxInput.addEventListener("change", (event) => {
                if (!this.storedValue[key]) this.storedValue[key] = {};
                if (!this.storedValue[key][groupKey]) this.storedValue[key][groupKey] = [];
                if (event.target.checked) {
                    //console.log("test", options);
                    this.storedValue[key][groupKey] = options.map(option => option.value);
                    options.forEach(option => {
                        const input = document.getElementById(`talent-pool-${key}-${option.value}`);
                        if (input) input.checked = true;
                    });
                } else {
                    this.storedValue[key][groupKey] = [];
                    options.forEach(option => {
                        const input = document.getElementById(`talent-pool-${key}-${option.value}`);
                        if (input) input.checked = false;
                    });
                }
                event.target.indeterminate = false;
                event.target.classList.remove("indeterminate");

                // Trigger filtering
                this.triggerChange();
            });
        }

        if (type === "checkbox") {
            const checkboxGroupWrapper = document.createElement("div");
            checkboxGroupWrapper.classList.add("talent-pool-checkbox-group-wrapper");
            if (title && isCustom) checkboxGroupWrapper.classList.add("dropdown-container");
            
            options.forEach(option => {
                const div = document.createElement("div");
                div.classList.add("talent-pool-checkbox");

                // const input = document.createElement("input");
                // input.type = "checkbox";
                // input.value = option.value;
                // input.id = `talent-pool-${key}-${option.value}`;
                const input = document.createElement("input");
                input.type = "checkbox";
                input.value = option.value;
                if (groupKey && key === "custom_talent_category") {
                    input.id = `talent-pool-${key}-${groupKey}-${option.value}`;
                } else {
                    input.id = `talent-pool-${key}-${option.value}`;
                }
            

                const label = document.createElement("label");
                label.htmlFor = input.id;
                // label.textContent = `${option.label}`;
                if(replace){
                    const val = replace[option.label] || option.label;
                    label.textContent = val;
                }else{
                    label.textContent = `${option.label}`;
                }

                div.appendChild(input);
                div.appendChild(label);

                if (key !== "custom_talent_category") {
                    input.addEventListener("change", () => {
                        this.addRemoveValueInStoredValue({ key, value: option.value });
                        this.triggerChange();
                    });
                } else {
                    input.addEventListener("change", () => {
                        this.addRemoveValueInStoredValue({ groupKey: key, key: groupKey, value: option.value });
                        const total = options.length;
                        const selected = this.storedValue[key][groupKey].length;
                        const mainCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}`);
                        if (mainCheckbox) {
                            mainCheckbox.checked = total === selected;
                            mainCheckbox.classList.toggle("indeterminate", selected > 0 && selected < total);
                            mainCheckbox.indeterminate = selected > 0 && selected < total;
                        }
                        this.triggerChange();
                    });
                }
                checkboxGroupWrapper.appendChild(div);
            });
            checkboxContainer.appendChild(checkboxGroupWrapper);
        } else {
            const select = document.createElement("select");
            select.classList.add("talent-pool-select");
            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = placeholder || "Select an option";
            select.appendChild(defaultOption);
            options.forEach(option => {
                const optionElement = document.createElement("option");
                optionElement.value = option.value;
                optionElement.textContent = option.label;
                select.appendChild(optionElement);
            });
            checkboxContainer.appendChild(select);
        }
        this.sidebar.appendChild(checkboxContainer);
    }

    buildNestedOptionsData({ isCustom = false, values = [], type = "checkbox", key = null, exclude = [], placeholder = "", title = "", groupKey = null, subGroupKey = null, container = null }) {
        if (!key) return console.error("Key is required to build nested options data");

        const options = isCustom ? this.getSimpleOptionsData(values) : this.getOptionsData(key, exclude);
        const checkboxContainer = container || document.createElement("div");
        checkboxContainer.classList.add("talent-pool-checkboxes", "nested");
        checkboxContainer.setAttribute("data-key", key);

        if (isCustom && groupKey) {
            checkboxContainer.setAttribute("data-group-key", groupKey);
        }
        if (subGroupKey) {
            checkboxContainer.setAttribute("data-subgroup-key", subGroupKey);
        }

        if (title && isCustom) {
            const dropdownButton = document.createElement("div");
            dropdownButton.classList.add("talent-pool-dropdown-button", "nested");
            dropdownButton.textContent = "";
            dropdownButton.addEventListener("click", (e) => {
                this.dropdownButtonHandler(e);
            });
            checkboxContainer.appendChild(dropdownButton);

            const checkboxInput = document.createElement("input");
            checkboxInput.type = "checkbox";
            checkboxInput.id = subGroupKey ?
                `talent-pool-${key}-${groupKey}-${subGroupKey}` :
                `talent-pool-${key}-${groupKey}`;
            checkboxInput.classList.add("talent-pool-checkbox-input", "nested");

            const checkboxLabel = document.createElement("label");
            checkboxLabel.htmlFor = checkboxInput.id;
            checkboxLabel.textContent = title;
            checkboxLabel.classList.add("nested");

            checkboxContainer.appendChild(checkboxInput);
            checkboxContainer.appendChild(checkboxLabel);

            checkboxInput.addEventListener("change", (event) => {
                if (subGroupKey) {
                    if (!this.storedValue[key]) this.storedValue[key] = {};
                    if (!this.storedValue[key][groupKey]) this.storedValue[key][groupKey] = {};
                    if (!this.storedValue[key][groupKey][subGroupKey]) this.storedValue[key][groupKey][subGroupKey] = [];

                    if (event.target.checked) {
                        this.storedValue[key][groupKey][subGroupKey] = options.map(option => option.value);
                        options.forEach(option => {
                            const input = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}-${option.value}`);
                            if (input) input.checked = true;
                        });
                    } else {
                        this.storedValue[key][groupKey][subGroupKey] = [];
                        options.forEach(option => {
                            const input = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}-${option.value}`);
                            if (input) input.checked = false;
                        });
                    }
                    this.updateParentCheckboxState(key, groupKey);
                    setTimeout(() => this.updateParentCheckboxState(key, groupKey), 10);
                } else {
                    if (!this.storedValue[key]) this.storedValue[key] = {};
                    if (!this.storedValue[key][groupKey]) this.storedValue[key][groupKey] = [];

                    if (event.target.checked) {
                        this.storedValue[key][groupKey] = options.map(option => option.value);
                        options.forEach(option => {
                            const input = document.getElementById(`talent-pool-${key}-${option.value}`);
                            if (input) input.checked = true;
                        });
                    } else {
                        this.storedValue[key][groupKey] = [];
                        options.forEach(option => {
                            const input = document.getElementById(`talent-pool-${key}-${option.value}`);
                            if (input) input.checked = false;
                        });
                    }
                }
                event.target.indeterminate = false;
                event.target.classList.remove("indeterminate");
                this.triggerChange();
            });
        }
        if (type === "checkbox") {
            const checkboxGroupWrapper = document.createElement("div");
            checkboxGroupWrapper.classList.add("talent-pool-checkbox-group-wrapper", "nested");
            if (title && isCustom) checkboxGroupWrapper.classList.add("dropdown-container");

            options.forEach(option => {
                const div = document.createElement("div");
                div.classList.add("talent-pool-checkbox", "nested");

                const input = document.createElement("input");
                input.type = "checkbox";
                input.value = option.value;
                input.id = subGroupKey ?
                    `talent-pool-${key}-${groupKey}-${subGroupKey}-${option.value}` :
                    `talent-pool-${key}-${groupKey}-${option.value}`;
                input.classList.add("nested");

                const label = document.createElement("label");
                label.htmlFor = input.id;
                label.textContent = option.label;
                label.classList.add("nested");

                div.appendChild(input);
                div.appendChild(label);

                if (subGroupKey) {
                    input.addEventListener("change", () => {
                        this.addRemoveValueInNestedGroup({
                            key,
                            groupKey,
                            subGroupKey,
                            value: option.value
                        });

                        const total = options.length;
                        const selected = this.storedValue[key][groupKey][subGroupKey].length;
                        const mainCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}`);
                        if (mainCheckbox) {
                            mainCheckbox.checked = total === selected;
                            mainCheckbox.classList.toggle("indeterminate", selected > 0 && selected < total);
                            mainCheckbox.indeterminate = selected > 0 && selected < total;
                        }
                        this.updateParentCheckboxState(key, groupKey);
                        setTimeout(() => this.updateParentCheckboxState(key, groupKey), 10);
                        this.triggerChange();
                    });
                } else {
                    input.addEventListener("change", () => {
                        this.addRemoveValueInStoredValue({ groupKey: key, key: groupKey, value: option.value });
                        const total = options.length;
                        const selected = this.storedValue[key][groupKey].length;
                        const mainCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}`);
                        if (mainCheckbox) {
                            mainCheckbox.checked = total === selected;
                            mainCheckbox.classList.toggle("indeterminate", selected > 0 && selected < total);
                            mainCheckbox.indeterminate = selected > 0 && selected < total;
                        }
                        this.triggerChange();
                    });
                }
                checkboxGroupWrapper.appendChild(div);
            });
            checkboxContainer.appendChild(checkboxGroupWrapper);
        }
        if (!container) {
            this.sidebar.appendChild(checkboxContainer);
        }
    }

    addRemoveValueInNestedGroup({ key = null, groupKey = null, subGroupKey = null, value = null }) {
        if (!key || !groupKey || !subGroupKey || !value) {
            return console.error("Key, groupKey, subGroupKey and value are required for nested groups");
        }
        if (!this.storedValue[key]) this.storedValue[key] = {};
        if (!this.storedValue[key][groupKey]) this.storedValue[key][groupKey] = {};
        if (!this.storedValue[key][groupKey][subGroupKey]) this.storedValue[key][groupKey][subGroupKey] = [];

        const nestedGroup = this.storedValue[key][groupKey][subGroupKey];
        const index = nestedGroup.indexOf(value);

        if (index > -1) {
            nestedGroup.splice(index, 1);
        } else {
            nestedGroup.push(value);
        }

        this.triggerChange();
    }

    buildNestedOptionsDataGroup({ title = "", key = null, group = {} }) {
        if (!key) return console.error("Key is required to build nested options data group");
        if (title) {
            const titleElement = document.createElement("h3");
            titleElement.classList.add("custom_talent");
            titleElement.textContent = title;
            this.sidebar.appendChild(titleElement);
        }
        this.storedValue[key] = {};
        Object.keys(group).forEach(groupKey => {
            const item = group[groupKey];
            // Check if this group has nested groups
            if (item.type === "group" && item.group) {
                // Create main nested group container with dropdown and checkbox
                const nestedGroupContainer = document.createElement("div");
                nestedGroupContainer.classList.add("talent-pool-checkboxes", "talent-pool-nested-group", "nested");
                nestedGroupContainer.setAttribute("data-key", key);
                nestedGroupContainer.setAttribute("data-group-key", groupKey);
                // dropdown  main group
                const dropdownButton = document.createElement("div");
                dropdownButton.classList.add("talent-pool-dropdown-button", "nested");
                dropdownButton.textContent = "";
                dropdownButton.addEventListener("click", (e) => {
                    this.dropdownButtonHandler(e);
                });
                nestedGroupContainer.appendChild(dropdownButton);
                // Add main group checkbox
                const mainCheckboxInput = document.createElement("input");
                mainCheckboxInput.type = "checkbox";
                mainCheckboxInput.id = `talent-pool-${key}-${groupKey}`;
                mainCheckboxInput.classList.add("talent-pool-checkbox-input", "nested");

                const mainCheckboxLabel = document.createElement("label");
                mainCheckboxLabel.htmlFor = mainCheckboxInput.id;
                mainCheckboxLabel.textContent = item.name || groupKey;
                mainCheckboxLabel.classList.add("nested");

                nestedGroupContainer.appendChild(mainCheckboxInput);
                nestedGroupContainer.appendChild(mainCheckboxLabel);

                //dropdown subgroups
                const dropdownContainer = document.createElement("div");
                dropdownContainer.classList.add("talent-pool-checkbox-group-wrapper", "dropdown-container", "nested");
                //initialize stored value for this group
                this.storedValue[key][groupKey] = {};

                // Add main group checkbox event listener
                mainCheckboxInput.addEventListener("change", (event) => {
                    const allSubGroups = Object.keys(item.group);
                    if (event.target.checked) {
                        // Check all subgroups and their options
                        allSubGroups.forEach(subGroupKey => {
                            const subItem = item.group[subGroupKey];
                            const subGroupCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}`);
                            if (subGroupCheckbox) subGroupCheckbox.checked = true;

                            if (subItem.type === "simple") {
                                this.storedValue[key][groupKey][subGroupKey] = subItem.values || [subGroupKey];
                            } else if (subItem.values && subItem.values.length > 0) {
                                this.storedValue[key][groupKey][subGroupKey] = [...subItem.values];
                                subItem.values.forEach(val => {
                                    const input = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}-${val}`);
                                    if (input) input.checked = true;
                                });
                            } else {
                                // For empty values, just mark as selected
                                this.storedValue[key][groupKey][subGroupKey] = ["selected"];
                            }
                        });
                    } else {
                        // Uncheck all subgroups and their options
                        allSubGroups.forEach(subGroupKey => {
                            const subItem = item.group[subGroupKey];
                            const subGroupCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}`);
                            if (subGroupCheckbox) subGroupCheckbox.checked = false;

                            this.storedValue[key][groupKey][subGroupKey] = [];
                            if (subItem.values && subItem.values.length > 0) {
                                subItem.values.forEach(val => {
                                    const input = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}-${val}`);
                                    if (input) input.checked = false;
                                });
                            }
                        });
                    }
                    event.target.indeterminate = false;
                    event.target.classList.remove("indeterminate");
                    this.triggerChange();
                });
                // Process ALL subgroups inside the dropdown container
                Object.keys(item.group).forEach(subGroupKey => {
                    const subItem = item.group[subGroupKey];
                    this.storedValue[key][groupKey][subGroupKey] = [];
                    // Create nested subgroup
                    const nestedSubContainer = document.createElement("div");
                    nestedSubContainer.classList.add("talent-pool-nested-subgroup", "nested");
                    // Handle different types of subgroups
                    if (subItem.type === "simple") {
                        // Handle simple categories (like "Leitungsfunktionen", "Sonstige")
                        this.buildSimpleNestedCategory({
                            key,
                            groupKey,
                            subGroupKey,
                            title: subItem.name || subGroupKey,
                            container: nestedSubContainer
                        });
                    } else if (!subItem.values || subItem.values.length === 0) {
                        // Handle empty groups
                        this.buildEmptyNestedGroup({
                            key,
                            groupKey,
                            subGroupKey,
                            title: subItem.name || subGroupKey,
                            container: nestedSubContainer
                        });
                    } else {
                        // Handle complex groups with values
                        this.buildNestedOptionsData({
                            isCustom: true,
                            values: subItem.values || [],
                            type: subItem.type || "checkbox",
                            key,
                            groupKey,
                            subGroupKey,
                            exclude: subItem.exclude || [],
                            placeholder: subItem.placeholder || "",
                            title: subItem.name || subGroupKey,
                            container: nestedSubContainer
                        });
                    }
                    dropdownContainer.appendChild(nestedSubContainer);
                });
                // Make the dropdown active/expanded by default
                nestedGroupContainer.appendChild(dropdownContainer);
                this.sidebar.appendChild(nestedGroupContainer);
            } else {
                // Handle regular groups (existing functionality)
                this.storedValue[key][groupKey] = [];
                this.buildOptionsData({
                    isCustom: true,
                    values: item.values || [],
                    type: item.type || "checkbox",
                    key,
                    groupKey,
                    exclude: item.exclude || [],
                    placeholder: item.placeholder || "",
                    title: item.name || groupKey
                });
            }
        });
    }

    buildSimpleNestedCategory({ key = null, groupKey = null, subGroupKey = null, title = "", container = null }) {
        if (!key || !groupKey || !subGroupKey) {
            return console.error("Key, groupKey, and subGroupKey are required for simple nested categories");
        }
        const checkboxDiv = document.createElement("div");
        checkboxDiv.classList.add("talent-pool-checkbox", "nested", "simple-category");

        const checkboxInput = document.createElement("input");
        checkboxInput.type = "checkbox";
        checkboxInput.id = `talent-pool-${key}-${groupKey}-${subGroupKey}`;
        checkboxInput.classList.add("talent-pool-checkbox-input", "nested");
        checkboxInput.value = subGroupKey;

        const checkboxLabel = document.createElement("label");
        checkboxLabel.htmlFor = checkboxInput.id;
        checkboxLabel.textContent = title;
        checkboxLabel.classList.add("nested");

        checkboxDiv.appendChild(checkboxInput);
        checkboxDiv.appendChild(checkboxLabel);

        checkboxInput.addEventListener("change", (event) => {
            if (!this.storedValue[key]) this.storedValue[key] = {};
            if (!this.storedValue[key][groupKey]) this.storedValue[key][groupKey] = {};
            if (!this.storedValue[key][groupKey][subGroupKey]) this.storedValue[key][groupKey][subGroupKey] = [];

            if (event.target.checked) {
                // For simple categories, use the actual values from the configuration
                const groupConfig = this.parent.custom_talent_category.group[groupKey];
                const subGroupConfig = groupConfig?.group?.[subGroupKey];
                const actualValues = subGroupConfig?.values || [subGroupKey];
                this.storedValue[key][groupKey][subGroupKey] = [...actualValues];
            } else {
                this.storedValue[key][groupKey][subGroupKey] = [];
            }

            // Update parent group checkbox state immediately and with timeout for safety
            this.updateParentCheckboxState(key, groupKey);
            setTimeout(() => this.updateParentCheckboxState(key, groupKey), 10);

            // Trigger filtering
            this.triggerChange();
        });

        if (container) {
            container.appendChild(checkboxDiv);
        } else {
            const checkboxContainer = document.createElement("div");
            checkboxContainer.classList.add("talent-pool-simple-nested-category", "nested");
            checkboxContainer.setAttribute("data-key", key);
            checkboxContainer.setAttribute("data-group-key", groupKey);
            checkboxContainer.setAttribute("data-subgroup-key", subGroupKey);
            checkboxContainer.appendChild(checkboxDiv);
            this.sidebar.appendChild(checkboxContainer);
        }
    }

    buildEmptyNestedGroup({ key = null, groupKey = null, subGroupKey = null, title = "", container = null }) {
        if (!key || !groupKey || !subGroupKey) {
            return console.error("Key, groupKey, and subGroupKey are required for empty nested groups");
        }
        const checkboxContainer = container || document.createElement("div");
        checkboxContainer.classList.add("talent-pool-checkboxes", "nested", "empty-group");
        checkboxContainer.setAttribute("data-key", key);
        checkboxContainer.setAttribute("data-group-key", groupKey);
        checkboxContainer.setAttribute("data-subgroup-key", subGroupKey);
        const dropdownButton = document.createElement("div");
        dropdownButton.classList.add("talent-pool-dropdown-button", "nested");
        dropdownButton.textContent = "";
        dropdownButton.addEventListener("click", (e) => {
            this.dropdownButtonHandler(e);
        });
        checkboxContainer.appendChild(dropdownButton);
        const checkboxInput = document.createElement("input");
        checkboxInput.type = "checkbox";
        checkboxInput.id = `talent-pool-${key}-${groupKey}-${subGroupKey}`;
        checkboxInput.classList.add("talent-pool-checkbox-input", "nested");
        const checkboxLabel = document.createElement("label");
        checkboxLabel.htmlFor = checkboxInput.id;
        checkboxLabel.textContent = title;
        checkboxLabel.classList.add("nested");
        checkboxContainer.appendChild(checkboxInput);
        checkboxContainer.appendChild(checkboxLabel);
        checkboxInput.addEventListener("change", (event) => {
            if (!this.storedValue[key]) this.storedValue[key] = {};
            if (!this.storedValue[key][groupKey]) this.storedValue[key][groupKey] = {};
            if (!this.storedValue[key][groupKey][subGroupKey]) this.storedValue[key][groupKey][subGroupKey] = [];

            if (event.target.checked) {
                this.storedValue[key][groupKey][subGroupKey] = ["selected"];
            } else {
                this.storedValue[key][groupKey][subGroupKey] = [];
            }
            this.updateParentCheckboxState(key, groupKey);
            // Trigger filtering
            this.triggerChange();
        });

        const emptyWrapper = document.createElement("div");
        emptyWrapper.classList.add("talent-pool-checkbox-group-wrapper", "dropdown-container", "nested", "empty");
        emptyWrapper.innerHTML = '<div class="empty-group-placeholder nested">No specific options</div>';
        checkboxContainer.appendChild(emptyWrapper);
        if (!container) {
            this.sidebar.appendChild(checkboxContainer);
        }
    }

    updateParentCheckboxState(key, groupKey) {
        const parentCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}`);
        if (!parentCheckbox) return;
        const groupConfig = this.parent.custom_talent_category.group[groupKey];
        if (!groupConfig || !groupConfig.group) return;

        // Ensure the nested structure exists
        if (!this.storedValue[key]) {
            this.storedValue[key] = {};
        }
        if (!this.storedValue[key][groupKey]) {
            this.storedValue[key][groupKey] = {};
        }

        const allSubGroupsFromConfig = Object.keys(groupConfig.group);
        const storedSubGroups = this.storedValue[key][groupKey] || {};
        let fullySelectedSubGroups = 0;
        let partiallySelectedSubGroups = 0;
        let unselectedSubGroups = 0;
        let totalSubGroups = allSubGroupsFromConfig.length;
        allSubGroupsFromConfig.forEach(subGroupKey => {
            const subGroupValues = storedSubGroups[subGroupKey] || [];
            const subGroupConfig = groupConfig.group[subGroupKey];
            const subGroupCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}`);
            if (subGroupValues.length === 0) {
                unselectedSubGroups++;
                return;
            }

            if (subGroupConfig.type === "simple") {
                fullySelectedSubGroups++;
            } else if (subGroupConfig.values && subGroupConfig.values.length > 0) {
                const expectedCount = subGroupConfig.values.length;
                const selectedCount = subGroupValues.length;
                if (selectedCount === expectedCount) {
                    fullySelectedSubGroups++;
                } else if (selectedCount > 0) {
                    partiallySelectedSubGroups++;
                }
            } else {
                fullySelectedSubGroups++;
            }
        });

        const allFullySelected = fullySelectedSubGroups === totalSubGroups && totalSubGroups > 0;
        const allUnselected = unselectedSubGroups === totalSubGroups;
        const hasAnyPartialOrMixed = partiallySelectedSubGroups > 0 || (fullySelectedSubGroups > 0 && unselectedSubGroups > 0);

        if (allFullySelected) {
            parentCheckbox.checked = true;
            parentCheckbox.indeterminate = false;
            parentCheckbox.classList.remove("indeterminate");
        } else if (allUnselected) {
            parentCheckbox.checked = false;
            parentCheckbox.indeterminate = false;
            parentCheckbox.classList.remove("indeterminate");
        } else if (hasAnyPartialOrMixed) {
            parentCheckbox.checked = false;
            parentCheckbox.indeterminate = true;
            parentCheckbox.classList.add("indeterminate");
        }
        parentCheckbox.classList.toggle("indeterminate", parentCheckbox.indeterminate);
        // Update parent group counter with sum of checked children
        this.updateParentGroupCounter(key, groupKey);
    }

    updateAllParentGroupCounters() {
        if (!this.parent || !this.parent.custom_talent_category) return;
        const customGroups = this.parent.custom_talent_category.group;
        for (const groupKey in customGroups) {
            const groupConfig = customGroups[groupKey];
            if (groupConfig.type === 'group' && groupConfig.group) {
                this.updateParentGroupCounter('custom_talent_category', groupKey);
            }
        }
    }

    updateParentGroupCounter(key, groupKey) {
        if (key !== 'custom_talent_category') return;

        const parentCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}`);
        if (!parentCheckbox) return;

        const parentLabel = parentCheckbox.nextElementSibling;
        if (!parentLabel) return;

        const parentCounterSpan = parentLabel.querySelector('.talent-pool-counter-label');
        if (!parentCounterSpan) return;

        // Ensure the nested structure exists
        if (!this.storedValue[key]) {
            this.storedValue[key] = {};
        }
        if (!this.storedValue[key][groupKey]) {
            this.storedValue[key][groupKey] = {};
        }

        const storedSubGroups = this.storedValue[key][groupKey] || {};
        let totalSelectedCount = 0;
        let hasAnyCheckedSubGroups = false;

        // Sum up counts from all checked children
        Object.keys(storedSubGroups).forEach(subGroupKey => {
            const subGroupValues = storedSubGroups[subGroupKey] || [];
            if (subGroupValues.length > 0) {
                hasAnyCheckedSubGroups = true;
                const subGroupCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}`);
                if (subGroupCheckbox) {
                    const subGroupLabel = subGroupCheckbox.nextElementSibling;
                    const subGroupCounterSpan = subGroupLabel?.querySelector('.talent-pool-counter-label');
                    if (subGroupCounterSpan) {
                        const match = subGroupCounterSpan.textContent.match(/\((\d+)\)/);
                        const count = match ? parseInt(match[1]) : 0;
                        totalSelectedCount += count;
                    }
                }
            }
        });

        // If no subgroups are checked, show total available count, otherwise show sum of checked children
        if (!hasAnyCheckedSubGroups) {
            // Calculate total available count for all subgroups when none are selected
            totalSelectedCount = 0;
            const groupConfig = this.parent.custom_talent_category.group[groupKey];
            if (groupConfig && groupConfig.group) {
                Object.keys(groupConfig.group).forEach(subGroupKey => {
                    const subGroupCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}`);
                    if (subGroupCheckbox) {
                        const subGroupLabel = subGroupCheckbox.nextElementSibling;
                        const subGroupCounterSpan = subGroupLabel?.querySelector('.talent-pool-counter-label');
                        if (subGroupCounterSpan) {
                            const match = subGroupCounterSpan.textContent.match(/\((\d+)\)/);
                            const count = match ? parseInt(match[1]) : 0;
                            totalSelectedCount += count;
                        }
                    }
                });
            }
        }
        parentCounterSpan.textContent = ` (${totalSelectedCount})`;
    }
    reset(){
        const checkedBoxes = document.querySelectorAll('.talent-pool-filter-sidebar input[type="checkbox"]:checked');
        checkedBoxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    }
}

