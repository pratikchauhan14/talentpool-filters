import RangeSlider from "./range_slider.js";
let isResettingGroups = false;

export function popupButton(Sidebar) {
    const popupButton = document.createElement("button");
    popupButton.classList.add("talent-pool-popup-button");
    popupButton.textContent = Sidebar.popupTitle || "Subscribe our TalentPool";
    const body = document.body;

    console.log("Sidebar", Sidebar.popupTitle);
      
    function isSubgroupValue(value, Sidebar) {
        const groupMap = Sidebar.parent?.custom_talent_category?.group || {};
        return Object.values(groupMap).some(group => {
            if (group.group) {
                return Object.values(group.group).some(subgroup => subgroup.values?.includes(value));
            }
            return false;
        });
    }

    function uncheckOtherGroups(currentGroup, PopupValueStored) {
        isResettingGroups = true;
        const container = currentGroup.closest(".talent-pool-popup-inner-wrapper") ||
            currentGroup.closest(".talent-pool-sidebar");
        const allGroups = container?.querySelectorAll('.talent-pool-checkboxes[data-key="custom_talent_category"]') || [];
        const currentGroupKey = currentGroup.getAttribute("data-group-key");
        const key = "custom_talent_category";
        allGroups.forEach(group => {
            const groupKey = group.getAttribute("data-group-key");
            if (groupKey === currentGroupKey) return;
            if (group.classList.contains('popup-transformed')) {
                const mainCheckbox = group.querySelector('.talent-pool-checkbox-input');
                if (mainCheckbox) {
                    mainCheckbox.checked = false;
                    mainCheckbox.indeterminate = false;
                    mainCheckbox.classList.remove('indeterminate');
                }
                const subgroupCheckboxes = group.querySelectorAll('.popup-subgroups input[type="checkbox"]');
                subgroupCheckboxes.forEach(cb => cb.checked = false);
            } else {
                const mainCheckbox = group.querySelector('.talent-pool-checkbox-input');
                if (mainCheckbox) {
                    mainCheckbox.checked = false;
                    mainCheckbox.indeterminate = false;
                    mainCheckbox.classList.remove('indeterminate');
                }
                const childCheckboxes = group.querySelectorAll('.talent-pool-checkbox-group-wrapper input[type="checkbox"]');
                childCheckboxes.forEach(cb => cb.checked = false);
            }
            if (PopupValueStored[key]) {
                PopupValueStored[key][groupKey] = [];
            }
        });
        // console.log("PopupValueStored", PopupValueStored);
        const event5 = new CustomEvent("PopupValueStored", { detail: PopupValueStored });
        document.dispatchEvent(event5);
        setTimeout(() => {
            isResettingGroups = false;
        }, 0);
    }

    popupButton.addEventListener("click", () => {
        body.classList.add("open-popup");
        const popupContainer = document.createElement("div");
        popupContainer.classList.add("talent-pool-popup-container");
        popupContainer.classList.add("popup");
        const popupInnerWrapper = document.createElement("div");
        popupInnerWrapper.classList.add("talent-pool-popup-inner-wrapper");
        popupContainer.appendChild(popupInnerWrapper);
        const clonedSidebar = Sidebar.sidebar.cloneNode(true);

       //close button
        const closeButton = Sidebar.parent.createCloseButton();
        popupInnerWrapper.appendChild(closeButton);

        //title counter remove 
        const talentPoolContain = clonedSidebar.querySelector(".talent-pool-contain");
        if (talentPoolContain) {
            talentPoolContain.remove();
        }
        // counter label remove
        const CounterLabel = clonedSidebar.querySelectorAll(".talent-pool-counter-label");
        CounterLabel.forEach(label => {
            label.remove();
        });
        // remove .range-input
        const oldTitle = clonedSidebar.querySelector(".range-title");
        if (oldTitle) {
            oldTitle.remove();
        }
        const rangeInputs = clonedSidebar.querySelectorAll(".range-input , .talent-pool-popup-button");
        rangeInputs.forEach(input => {
            input.remove();
        });
        //remove search
        const searchInput = clonedSidebar.querySelector(".cobalt_search");
        if (searchInput) {
            searchInput.remove();
        }
        const PopupValueStored = {};
        function ensurePopupValue(key, groupKey) {
            PopupValueStored[key] = PopupValueStored[key] || {};
            PopupValueStored[key][groupKey] = PopupValueStored[key][groupKey] || [];
        }
        const checkBoxGroup = clonedSidebar.querySelectorAll(".talent-pool-checkboxes");
        const popupCustomGroups = clonedSidebar.querySelectorAll('.talent-pool-checkboxes[data-key="custom_talent_category"]');
        // Transform nested groups to show only subgroups
        const nestedGroups = clonedSidebar.querySelectorAll('.talent-pool-nested-group');
        nestedGroups.forEach(nestedGroup => {
            const key = nestedGroup.getAttribute("data-key");
            const groupKey = nestedGroup.getAttribute("data-group-key");
            const mainCheckbox = nestedGroup.querySelector('.talent-pool-checkbox-input');
            const mainLabel = nestedGroup.querySelector('label');
            if (mainCheckbox && mainCheckbox.id) {
            mainCheckbox.id = `popup-${mainCheckbox.id}`;
            }
            if (mainLabel && mainLabel.htmlFor) {
            mainLabel.htmlFor = `popup-${mainLabel.htmlFor}`;
            }
            // dropdown button remove
            const subgroupDropdownButtons = nestedGroup.querySelectorAll('.talent-pool-nested-subgroup .talent-pool-dropdown-button');
            subgroupDropdownButtons.forEach(button => {
                button.remove();
            });
            const subgroupDropdownContainers = nestedGroup.querySelectorAll('.talent-pool-nested-subgroup .dropdown-container');
            subgroupDropdownContainers.forEach(container => {
                container.remove();
            });
            const existingSubgroups = nestedGroup.querySelectorAll('.talent-pool-nested-subgroup');
            existingSubgroups.forEach(subgroup => {
                subgroup.remove();
            });
            const newCheckboxWrapper = document.createElement("div");
            newCheckboxWrapper.classList.add("talent-pool-checkbox-group-wrapper", "dropdown-container", "nested", "popup-subgroups");
            if (Sidebar.parent && Sidebar.parent.custom_talent_category && Sidebar.parent.custom_talent_category.group[groupKey]) {
                const groupConfig = Sidebar.parent.custom_talent_category.group[groupKey];
                if (groupConfig.type === 'group' && groupConfig.group) {
                    Object.keys(groupConfig.group).forEach(subGroupKey => {
                        const subGroupConfig = groupConfig.group[subGroupKey];
                        const subGroupDiv = document.createElement("div");
                        subGroupDiv.classList.add("talent-pool-checkbox");
                        subGroupDiv.setAttribute("data-subgroup-key", subGroupKey);
                        const subGroupInput = document.createElement("input");
                        subGroupInput.type = "checkbox";
                        subGroupInput.value = subGroupConfig.name || subGroupKey;
                        subGroupInput.id = `popup-talent-pool-${key}-${groupKey}-${subGroupKey}`;
                        const subGroupLabel = document.createElement("label");
                        subGroupLabel.htmlFor = subGroupInput.id;
                        subGroupLabel.textContent = subGroupConfig.name || subGroupKey;
                        subGroupDiv.appendChild(subGroupInput);
                        subGroupDiv.appendChild(subGroupLabel);
                        newCheckboxWrapper.appendChild(subGroupDiv);
                    });
                }
            }
            //Keep the main group checkbox visible
            if (mainCheckbox) {
                mainCheckbox.style.display = 'block';
            }
            if (mainLabel) {
                mainLabel.style.display = 'block';
            }
            // Add the new checkbox wrapper
            nestedGroup.appendChild(newCheckboxWrapper);
            //  Add event handler for main group checkbox to control all subgroups
            if (mainCheckbox) {
                mainCheckbox.addEventListener('change', () => {
                    if (isResettingGroups) return;
                    const isChecked = mainCheckbox.checked;
                    uncheckOtherGroups(nestedGroup, PopupValueStored);
                    const subGroupCheckboxes = newCheckboxWrapper.querySelectorAll('input[type="checkbox"]');
                    mainCheckbox.classList.remove('indeterminate');
                    mainCheckbox.indeterminate = false;
                    PopupValueStored[key] = PopupValueStored[key] || {};
                    PopupValueStored[key][groupKey] = PopupValueStored[key][groupKey] || [];
                    PopupValueStored[key][groupKey] = [];
                    subGroupCheckboxes.forEach(subCheckbox => {
                        subCheckbox.checked = isChecked;
                        const subGroupKey = subCheckbox.closest('.talent-pool-checkbox')?.getAttribute('data-subgroup-key');
                        if (isChecked) {
                            let subGroupDisplayName = subGroupKey;
                            if (Sidebar.parent && Sidebar.parent.custom_talent_category && Sidebar.parent.custom_talent_category.group[groupKey]) {
                                const groupConfig = Sidebar.parent.custom_talent_category.group[groupKey];
                                const subGroupConfig = groupConfig.group[subGroupKey];
                                if (subGroupConfig && subGroupConfig.name) {
                                    subGroupDisplayName = subGroupConfig.name;
                                }
                            }
                            PopupValueStored[key][groupKey].push(subGroupDisplayName);
                        }
                    });
                   // console.log("PopupValueStored", PopupValueStored);
                   
                });
            }
            nestedGroup.classList.add('popup-transformed');
        });
        /* init rangeslider */
        const rangeSlider = new RangeSlider(Sidebar.rangeSliderOption);
        const element = rangeSlider.initialize();
        clonedSidebar.appendChild(element);
        // console.log("clonedSidebar", clonedSidebar);
        const initialData = rangeSlider.getValue();
        PopupValueStored.t_desired_salary = { minValue: initialData.minValue, maxValue: initialData.maxValue };
        rangeSlider.on("change", (data) => {
            PopupValueStored.t_desired_salary = { minValue: data.minValue, maxValue: data.maxValue };
            
            const event1 = new CustomEvent("PopupValueStored", {detail: PopupValueStored});
            document.dispatchEvent(event1);
            //test123

        });
        const transformedNestedGroups = clonedSidebar.querySelectorAll('.talent-pool-nested-group.popup-transformed');
        transformedNestedGroups.forEach(group => {
            const key = group.getAttribute("data-key");
            const groupKey = group.getAttribute("data-group-key");
            const subGroupCheckboxes = group.querySelectorAll('.popup-subgroups input[type="checkbox"]');
            ensurePopupValue(key, groupKey);
            const originalNestedGroup = Sidebar.sidebar.querySelector(`.talent-pool-nested-group[data-key="${key}"][data-group-key="${groupKey}"]`);
            if (originalNestedGroup) {
                const originalDropdownContainer = originalNestedGroup.querySelector('.dropdown-container');
                const subgroupsWithSelection = new Set();
                const groupConfig = Sidebar.parent?.custom_talent_category?.group?.[groupKey];
                if (groupConfig?.type === 'group' && groupConfig.group) {
                    Object.keys(groupConfig.group).forEach(subGroupKey => {
                        const subGroupConfig = groupConfig.group[subGroupKey];
                        let isChecked = false;
                        if (subGroupConfig.type === "simple") {
                            const expectedValue = subGroupConfig.values?.[0];
                            const selector = `input[type="checkbox"][value="${expectedValue}"]`;
                            const simpleCheckbox = originalNestedGroup.querySelector(selector);

                            if (simpleCheckbox?.checked) {
                                isChecked = true;
                            }
                        } else {
                            const subGroupContainers = originalDropdownContainer?.querySelectorAll(`[data-subgroup-key="${subGroupKey}"]`) || [];
                            subGroupContainers.forEach(container => {
                                const subGroupValues = subGroupConfig.values || [];
                                const checkedValues = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
                                if (checkedValues.some(val => subGroupValues.includes(val))) {
                                    isChecked = true;
                                }
                            });
                        }
                        if (isChecked) {
                            subgroupsWithSelection.add(subGroupKey);
                        }
                    });
                }
                subgroupsWithSelection.forEach(subGroupKey => {
                    const subGroupConfig = Sidebar.parent?.custom_talent_category?.group?.[groupKey]?.group?.[subGroupKey];
                    const subGroupDisplayName = subGroupConfig?.name || subGroupKey;
                    if (!PopupValueStored[key][groupKey].includes(subGroupDisplayName)) {
                        PopupValueStored[key][groupKey].push(subGroupDisplayName);
                    }
                    const popupSubCheckbox = group.querySelector(`[data-subgroup-key="${subGroupKey}"] input[type="checkbox"]`);
                    if (popupSubCheckbox) {
                        popupSubCheckbox.checked = true;
                    }
                });
                // Set indeterminate/checked state on main checkbox
                const mainCheckbox = group.querySelector('.talent-pool-checkbox-input');
                if (mainCheckbox) {
                    const allSub = group.querySelectorAll('.popup-subgroups input[type="checkbox"]');
                    const checkedSub = group.querySelectorAll('.popup-subgroups input[type="checkbox"]:checked');
                    mainCheckbox.checked = checkedSub.length === allSub.length && checkedSub.length > 0;
                    mainCheckbox.indeterminate = checkedSub.length > 0 && checkedSub.length < allSub.length;
                }
            }
            // Update the subGroupCheckboxes event listener in transformedNestedGroups
            subGroupCheckboxes.forEach(subGroupCheckbox => {
                subGroupCheckbox.addEventListener('change', () => {
                    const subGroupKey = subGroupCheckbox.closest('.talent-pool-checkbox')?.getAttribute('data-subgroup-key');
                    const subGroupConfig = Sidebar.parent?.custom_talent_category?.group?.[groupKey]?.group?.[subGroupKey];
                    const subGroupDisplayName = subGroupConfig?.name || subGroupKey;
                    ensurePopupValue(key, groupKey);
                    // Add this check to uncheck other groups when any subgroup is checked
                    if (subGroupCheckbox.checked) {
                        uncheckOtherGroups(group, PopupValueStored);
                    }
                    const index = PopupValueStored[key][groupKey].indexOf(subGroupDisplayName);
                    if (subGroupCheckbox.checked) {
                        if (index === -1) {
                            PopupValueStored[key][groupKey].push(subGroupDisplayName);
                        }
                    } else {
                        if (index > -1) {
                            PopupValueStored[key][groupKey].splice(index, 1);
                        }
                    }
                    const allSub = group.querySelectorAll('.popup-subgroups input[type="checkbox"]');
                    const checkedSub = group.querySelectorAll('.popup-subgroups input[type="checkbox"]:checked');
                    const mainCheckbox = group.querySelector('.talent-pool-checkbox-input');
                    if (mainCheckbox) {
                        // Remove any existing indeterminate class first
                        mainCheckbox.classList.remove('indeterminate');
                        if (checkedSub.length === 0) {
                            // No subgroups checked
                            mainCheckbox.checked = false;
                            mainCheckbox.indeterminate = false;
                        } else if (checkedSub.length === allSub.length) {
                            // All subgroups checked
                            mainCheckbox.checked = true;
                            mainCheckbox.indeterminate = false;
                        } else {
                            // Some subgroups checked - ADD CLASS HERE
                            mainCheckbox.checked = false;
                            mainCheckbox.indeterminate = true;
                            mainCheckbox.classList.add('indeterminate'); // ADD THIS LINE
                        }
                    }
                   // console.log("PopupValueStored", PopupValueStored);
                });
            });
        });
        const nonNestedCustomGroups = Array.from(popupCustomGroups).filter(group => !group.classList.contains('popup-transformed'));
        nonNestedCustomGroups.forEach(group => {
            const parentCheckbox = group.querySelector('.talent-pool-checkbox-input');
            const childCheckboxes = group.querySelectorAll('.talent-pool-checkbox-group-wrapper input[type="checkbox"]');
            const key = group.getAttribute("data-key");
            const groupKey = group.getAttribute("data-group-key");
            transformedNestedGroups.forEach(nestedGroup => {
                const nestedKey = nestedGroup.getAttribute("data-key");
                const nestedGroupKey = nestedGroup.getAttribute("data-group-key");
                const nestedCheckboxes = nestedGroup.querySelectorAll('.popup-subgroups input[type="checkbox"]');
                nestedCheckboxes.forEach(cb => cb.checked = false);
                if (PopupValueStored[nestedKey] && PopupValueStored[nestedKey][nestedGroupKey]) {
                    Object.keys(PopupValueStored[nestedKey][nestedGroupKey]).forEach(subKey => {
                        PopupValueStored[nestedKey][nestedGroupKey][subKey] = [];
                    });
                }
            });
            parentCheckbox.addEventListener('change', () => {
                if (isResettingGroups) return;
                const checked = parentCheckbox.checked;
                uncheckOtherGroups(group, PopupValueStored);
                PopupValueStored[key] = PopupValueStored[key] || {};
                PopupValueStored[key][groupKey] = [];
                childCheckboxes.forEach(child => {
                    child.checked = checked;
                    if (checked && child.value !== "on") {
                        PopupValueStored[key][groupKey].push(child.value);
                    }
                });
            });
            childCheckboxes.forEach(child => {
                child.addEventListener('change', () => {
                    if (isResettingGroups) return;
                    const anyChecked = Array.from(childCheckboxes).some(checkbox => checkbox.checked);
                    const valuesChecked = Array.from(childCheckboxes)
                        .filter(checkbox => checkbox.checked && checkbox.value !== "on")
                        .map(checkbox => checkbox.value);
                    if (anyChecked) {
                        uncheckOtherGroups(group, PopupValueStored);
                    }
                    PopupValueStored[key] = PopupValueStored[key] || {};
                    PopupValueStored[key][groupKey] = valuesChecked;
                    if (anyChecked) {
                        parentCheckbox.checked = true;
                    } else {
                        parentCheckbox.checked = false;
                    }
                });
            });
        });
        const nonNestedCheckBoxGroups = Array.from(checkBoxGroup).filter(group => {
            if (group.classList.contains('popup-transformed')) {
                return false;
            }
            if (group.classList.contains('talent-pool-nested-group')) {
                return false;
            }
            if (group.getAttribute("data-key") === "custom_talent_category") {
                const parentNestedGroup = group.closest('.talent-pool-nested-group');
                if (parentNestedGroup) {
                    return false;
                }
            }
            return true;
        });
        nonNestedCheckBoxGroups.forEach(group => {
            const key = group.getAttribute("data-key");
            const groupKey = group.getAttribute("data-group-key");
            const indeterminateCheckbox = group.querySelector('.indeterminate');
            if (indeterminateCheckbox) {
                indeterminateCheckbox.classList.remove("indeterminate");
                indeterminateCheckbox.indeterminate = false;
            }
            if (key === "custom_talent_category") {
                PopupValueStored[key] = PopupValueStored[key] || {};
                PopupValueStored[key][groupKey] = PopupValueStored[key][groupKey] || [];
            } else {
                PopupValueStored[key] = [];
            }
            const inputs = group.querySelectorAll("input[type='checkbox']");
            inputs.forEach(input => {
                if (input.id) {
                    input.id = `popup-${input.id}`;
                    const isInNestedGroup = input.closest('.talent-pool-nested-group');
                    const isSubgroupInput = input.closest('.popup-subgroups');
                    const isCategoryLevelInput = input.classList.contains('talent-pool-checkbox-input') &&
                        input.closest('.talent-pool-nested-group');
                    const isMainCategoryCheckbox = input.classList.contains('talent-pool-checkbox-input');
                    if (input.checked && !isInNestedGroup && !isCategoryLevelInput && !isMainCategoryCheckbox) {
                        if (key === "custom_talent_category") {
                            const parentGroup = input.closest('.talent-pool-checkboxes');
                            if (parentGroup && !parentGroup.classList.contains('popup-transformed')) {
                                const allGroups = Array.from(group.parentNode.querySelectorAll('.talent-pool-checkboxes[data-key="custom_talent_category"]'));
                                const currentIndex = allGroups.indexOf(group);
                                allGroups.forEach((otherGroup, index) => {
                                    if (index < currentIndex) {
                                        const otherParent = otherGroup.querySelector('.talent-pool-checkbox-input');
                                        const otherChildren = otherGroup.querySelectorAll('.talent-pool-checkbox-group-wrapper input[type="checkbox"]');
                                        if (otherParent) otherParent.checked = false;
                                        otherChildren.forEach(cb => cb.checked = false);
                                        const otherGroupKey = otherGroup.getAttribute("data-group-key");
                                        if (PopupValueStored[key] && PopupValueStored[key][otherGroupKey]) {
                                            PopupValueStored[key][otherGroupKey] = [];
                                        }
                                    }
                                });
                                const groupCheckboxChecked = group.querySelector('.talent-pool-checkbox-input');
                                if (groupCheckboxChecked && !groupCheckboxChecked.checked) {
                                    groupCheckboxChecked.checked = true;
                                }
                                PopupValueStored[key][groupKey] = PopupValueStored[key][groupKey] || [];
                                if (
                                    input.value !== "on" &&
                                    input.value !== groupKey &&
                                    !isSubgroupValue(input.value, Sidebar) &&
                                    !PopupValueStored[key][groupKey].includes(input.value)
                                ) {
                                    PopupValueStored[key][groupKey].push(input.value);
                                }
                            }
                        } else {
                            if (input.value !== "on" && !PopupValueStored[key].includes(input.value)) {
                                PopupValueStored[key].push(input.value);
                            }
                        }
                    }
                    input.addEventListener("change", (event) => {
                        const isInNestedGroup = input.closest('.talent-pool-nested-group') ||
                            input.closest('.popup-transformed') ||
                            group.classList.contains('popup-transformed');
                        const isCategoryLevelInput = input.classList.contains('talent-pool-checkbox-input') &&
                            input.closest('.talent-pool-nested-group');
                        const isMainCategoryCheckbox = input.classList.contains('talent-pool-checkbox-input');
                        if (!isInNestedGroup && !isCategoryLevelInput && !isMainCategoryCheckbox) {
                            const value = event.target.value;
                            if (key === "custom_talent_category") {
                                PopupValueStored[key][groupKey] = PopupValueStored[key][groupKey] || [];
                                if (value !== "on" && value !== groupKey) {
                                    if (event.target.checked) {
                                        if (!PopupValueStored[key][groupKey].includes(value)) {
                                            PopupValueStored[key][groupKey].push(value);
                                        }
                                    } else {
                                        const idx = PopupValueStored[key][groupKey].indexOf(value);
                                        if (idx > -1) PopupValueStored[key][groupKey].splice(idx, 1);
                                    }
                                }
                            } else {
                                if (value !== "on") {
                                    if (event.target.checked) {
                                        PopupValueStored[key].push(value);
                                    } else {
                                        const index = PopupValueStored[key].indexOf(value);
                                        if (index > -1) {
                                            PopupValueStored[key].splice(index, 1);
                                        }
                                    }
                                }
                            }
                            //console.log("PopupValueStored", PopupValueStored);
                            const event2 = new CustomEvent("PopupValueStored", {detail: PopupValueStored});
                            document.dispatchEvent(event2);
                        }
                    });
                    const label = input.nextElementSibling;
                    if (label && label.tagName === 'LABEL' && label.htmlFor) {
                        label.htmlFor = `popup-${label.htmlFor}`;
                    }
                }
            });
        });
        //console.log("PopupValueStored", PopupValueStored);
        const event1 = new CustomEvent("PopupValueStored", {detail: PopupValueStored});
        document.dispatchEvent(event1);
        const dropdownButtons = clonedSidebar.querySelectorAll(".talent-pool-dropdown-button");
        dropdownButtons.forEach(button => {
            button.addEventListener("click", (e) => {
                Sidebar.dropdownButtonHandler(e);
            });
        });

        const formContainer = document.createElement('div');
        formContainer.classList.add('form-container');
        

        popupInnerWrapper.appendChild(clonedSidebar);
        clonedSidebar.appendChild(formContainer);
        document.body.appendChild(popupContainer);

        // popup open trigger event
        const event = new CustomEvent("model-open", { detail: {container:popupContainer , formContainer: formContainer} });
        document.dispatchEvent(event);

    });
    Sidebar.sidebar.appendChild(popupButton);
}