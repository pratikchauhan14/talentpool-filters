(() => {
  // src/counter.js
  var Counter = class {
    constructor(option, { sidebar, container }) {
      this.normalize = option.normalize;
      this.sidebar = option.sidebar;
      this.filter = option.Filter;
      this.getSplitPattern = option.getSplitPattern;
      this.talentPool = option.talentPool || [];
      this.filteredData = this.filter.filteredData;
      this.container = container;
      this.totalCountElement = null;
      this.groupCountsContainer = null;
      this.initUI();
      setTimeout(() => this.appendCounterToSidebar(), 0);
      this.sidebar.on("onChange", (storedValue) => {
        this.storedValue = storedValue;
        this.applyFilters();
      });
      this.labels = option.labels || {};
      this.reset();
    }
    applyFilters() {
      this.updateCounter();
    }
    updateCounter() {
      const normalize = this.normalize.bind(this);
      const keys = ["t_procedure_txt", "custom_talent_category", "t_experience_level", "t_desired_region_1", "t_desired_salary"];
      const filters = this.storedValue || {};
      const prepared = this.filter.prepareFilterValues(filters);
      const filteredData = this.filter.filteredData;
      const baseCounts = this.computeCounts(this.talentPool, keys, normalize);
      const filteredCounts = this.computeCounts(filteredData, keys, normalize, prepared);
      const finalCounts = { ...baseCounts, ...filteredCounts };
      const total = filteredData.length || this.talentPool.length;
      if (this.sidebar?.parent?.counter) {
        this.sidebar.parent.counter.update({ total, groupCounts: finalCounts });
      }
      const flatCounts = {};
      for (const groupKey in finalCounts) {
        Object.assign(flatCounts, finalCounts[groupKey]);
      }
      this.updateGroupCategoryCounts(flatCounts);
      this.updateNestedGroupCounts(flatCounts);
    }
    computeCounts(dataSource, keys, normalize, prepared = {}) {
      const groupCounts = {};
      for (const key of keys) {
        const activeValues = (prepared[key] || []).map(normalize);
        const localGroupCount = {};
        for (const talent of dataSource) {
          const raw = talent.properties[key];
          if (!raw) continue;
          const splitPattern = this.getSplitPattern(raw);
          const talentValues = raw.split(splitPattern).map(normalize).filter(Boolean);
          const fullValue = normalize(raw);
          for (const category of talentValues) {
            let isSimpleCategory = false;
            if (key === "custom_talent_category" && this.sidebar?.parent?.custom_talent_category) {
              const customGroups = this.sidebar.parent.custom_talent_category.group;
              for (const groupKey in customGroups) {
                const groupConfig = customGroups[groupKey];
                if (groupConfig.type === "group" && groupConfig.group) {
                  for (const subGroupKey in groupConfig.group) {
                    const subGroupConfig = groupConfig.group[subGroupKey];
                    if (subGroupConfig.type === "simple" && subGroupConfig.values && subGroupConfig.values.some((val) => normalize(val) === category)) {
                      isSimpleCategory = true;
                      break;
                    }
                  }
                  if (isSimpleCategory) break;
                }
              }
            }
            const normalizedCategory = this.normalize(category);
            if (isSimpleCategory) {
              if (!normalizedCategory.includes("_") && this.shouldCount(normalizedCategory, activeValues, fullValue)) {
                localGroupCount[normalizedCategory] = (localGroupCount[normalizedCategory] || 0) + 1;
              }
            } else if (this.shouldCount(normalizedCategory, activeValues, fullValue)) {
              localGroupCount[normalizedCategory] = (localGroupCount[normalizedCategory] || 0) + 1;
            }
          }
          if (!talentValues.includes(fullValue)) {
            let isSimpleCategory = false;
            if (key === "custom_talent_category" && this.sidebar?.parent?.custom_talent_category) {
              const customGroups = this.sidebar.parent.custom_talent_category.group;
              for (const groupKey in customGroups) {
                const groupConfig = customGroups[groupKey];
                if (groupConfig.type === "group" && groupConfig.group) {
                  for (const subGroupKey in groupConfig.group) {
                    const subGroupConfig = groupConfig.group[subGroupKey];
                    if (subGroupConfig.type === "simple" && subGroupConfig.values && subGroupConfig.values.some((val) => normalize(val) === fullValue)) {
                      isSimpleCategory = true;
                      break;
                    }
                  }
                  if (isSimpleCategory) break;
                }
              }
            }
            if (isSimpleCategory) {
              if (!fullValue.includes("_") && this.shouldCount(fullValue, activeValues, fullValue)) {
                localGroupCount[fullValue] = (localGroupCount[fullValue] || 0) + 1;
              }
            } else if (this.shouldCount(fullValue, activeValues, fullValue)) {
              localGroupCount[fullValue] = (localGroupCount[fullValue] || 0) + 1;
            }
          }
        }
        if (activeValues.length > 0) {
          const checkboxes = this.sidebar.sidebar.querySelectorAll(`[data-key="${key}"] input[type="checkbox"]`);
          checkboxes.forEach((checkbox) => {
            const val = normalize(checkbox.value);
            if (!(val in localGroupCount)) localGroupCount[val] = 0;
          });
          activeValues.forEach((val) => {
            if (!(val in localGroupCount)) localGroupCount[val] = 0;
          });
        }
        if (key === "custom_talent_category" && this.sidebar.parent && this.sidebar.parent.custom_talent_category) {
          const customGroups = this.sidebar.parent.custom_talent_category.group;
          for (const groupKey in customGroups) {
            const groupConfig = customGroups[groupKey];
            if (groupConfig.type === "group" && groupConfig.group) {
              for (const subGroupKey in groupConfig.group) {
                const subGroupConfig = groupConfig.group[subGroupKey];
                if (subGroupConfig.values) {
                  subGroupConfig.values.forEach((value) => {
                    const normalizedValue = normalize(value);
                    if (!(normalizedValue in localGroupCount)) {
                      let count = 0;
                      for (const talent of dataSource) {
                        const raw = talent.properties[key];
                        if (!raw) continue;
                        const splitPattern = this.getSplitPattern(raw);
                        const talentValues = raw.split(splitPattern).map(normalize).filter(Boolean);
                        const fullValue = normalize(raw);
                        if (talentValues.includes(normalizedValue) || fullValue === normalizedValue) {
                          if (this.shouldCount(normalizedValue, activeValues, fullValue)) {
                            count++;
                          }
                        }
                      }
                      localGroupCount[normalizedValue] = count;
                    }
                  });
                } else if (subGroupConfig.type === "simple") {
                  const normalizedValue = normalize(subGroupKey);
                  if (!(normalizedValue in localGroupCount)) {
                    let count = 0;
                    for (const talent of dataSource) {
                      const raw = talent.properties[key];
                      if (!raw) continue;
                      const splitPattern = this.getSplitPattern(raw);
                      const talentValues = raw.split(splitPattern).map(normalize).filter(Boolean);
                      const fullValue = normalize(raw);
                      if (talentValues.includes(normalizedValue) || fullValue === normalizedValue) {
                        if (this.shouldCount(normalizedValue, activeValues, fullValue)) {
                          count++;
                        }
                      }
                    }
                    localGroupCount[normalizedValue] = count;
                  }
                }
              }
            }
          }
        }
        groupCounts[key] = localGroupCount;
      }
      return groupCounts;
    }
    shouldCount(category, activeValues, fullValue) {
      let isSimpleCategory = false;
      if (this.sidebar?.parent?.custom_talent_category) {
        const customGroups = this.sidebar.parent.custom_talent_category.group;
        for (const groupKey in customGroups) {
          const groupConfig = customGroups[groupKey];
          if (groupConfig.type === "group" && groupConfig.group) {
            for (const subGroupKey in groupConfig.group) {
              const subGroupConfig = groupConfig.group[subGroupKey];
              if (subGroupConfig.type === "simple" && subGroupConfig.values && subGroupConfig.values.some((val) => this.normalize(val) === category)) {
                isSimpleCategory = true;
                break;
              }
            }
            if (isSimpleCategory) break;
          }
        }
      }
      if (isSimpleCategory) {
        return activeValues.length === 0 || activeValues.includes(category);
      }
      return activeValues.length === 0 || activeValues.includes(category) || fullValue === category;
    }
    initUI() {
      this.totalCountElement = this.sidebar.sidebar.querySelector(".total-count");
      if (!this.totalCountElement) {
        console.error("Counter element not found in sidebar");
      }
    }
    update({ total = 0, groupCounts = {} }) {
      this.totalCountElement.textContent = `${total} ${this.labels.counterLabel}`;
      const allLabels = this.sidebar.sidebar.querySelectorAll("[data-counter-label]");
      allLabels.forEach((label) => {
        const key = label.getAttribute("data-counter-label");
        let count = 0;
        for (const group in groupCounts) {
          if (groupCounts[group]?.[key] != null) {
            count = groupCounts[group][key];
            break;
          }
        }
        label.textContent = ` (${count})`;
      });
    }
    hideZeroLabelsOnLoad() {
      const groups = this.sidebar.sidebar.querySelectorAll(".talent-pool-checkboxes");
      groups.forEach((group) => {
        const checkboxes = group.querySelectorAll("[data-counter-label]");
        let hasVisible = false;
        checkboxes.forEach((label) => {
          const match = label.textContent.match(/\((\d+)\)/);
          const count = match ? parseInt(match[1]) : 0;
          const labelWrapper = label.closest(".talent-pool-checkbox");
          if (!labelWrapper) return;
          labelWrapper.style.display = count === 0 ? "none" : "";
          if (count > 0) hasVisible = true;
        });
        group.style.display = hasVisible ? "" : "none";
      });
    }
    appendCounterToSidebar() {
      if (!this.sidebar?.sidebar) return;
      const checkboxes = this.sidebar.sidebar.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((checkbox) => {
        const value = checkbox.value;
        const label = checkbox.nextElementSibling;
        if (!label) return;
        if (label.querySelector(".talent-pool-counter-label")) return;
        const countLabel = document.createElement("span");
        countLabel.setAttribute("data-counter-label", this.normalize(value));
        countLabel.classList.add("talent-pool-counter-label");
        label.appendChild(countLabel);
      });
      this.updateCounter();
      this.hideZeroLabelsOnLoad();
      const normalize = this.normalize.bind(this);
      const keys = ["t_procedure_txt", "custom_talent_category", "t_experience_level", "t_desired_region_1", "t_desired_salary"];
      const baseCounts = this.computeCounts(this.talentPool, keys, normalize);
      const flatCounts = {};
      for (const groupKey in baseCounts) {
        Object.assign(flatCounts, baseCounts[groupKey]);
      }
      this.updateGroupCategoryCounts(flatCounts);
      this.updateNestedGroupCounts(flatCounts);
      const allGroupContainers = this.sidebar.sidebar.querySelectorAll(".talent-pool-checkboxes");
      const hasActiveFilters = Object.values(this.storedValue || {}).some((val) => {
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === "object") return Object.values(val).some((arr) => Array.isArray(arr) && arr.length > 0);
        return false;
      });
      allGroupContainers.forEach((container) => {
        const checkboxes2 = container.querySelectorAll(".talent-pool-checkbox");
        let hasVisible = false;
        checkboxes2.forEach((box) => {
          const label = box.querySelector("[data-counter-label]");
          const countMatch = label?.textContent.match(/\((\d+)\)/);
          const count = countMatch ? parseInt(countMatch[1]) : 0;
          if (hasActiveFilters) {
            box.style.display = "";
            hasVisible = true;
          } else {
            box.style.display = count > 0 ? "" : "none";
            if (count > 0) hasVisible = true;
          }
        });
        container.style.display = hasVisible ? "" : "none";
      });
    }
    updateGroupCategoryCounts(filterCounts = {}) {
      const parentCheckboxes = document.querySelectorAll(".talent-pool-checkbox-input");
      parentCheckboxes.forEach((parentCheckbox) => {
        const parentLabel = parentCheckbox.nextElementSibling;
        const container = parentCheckbox.closest(".talent-pool-checkboxes");
        const dropdown = container?.querySelector(".dropdown-container");
        if (!dropdown) return;
        let total = 0;
        const childCheckboxes = dropdown.querySelectorAll('input[type="checkbox"]');
        childCheckboxes.forEach((child) => {
          const value = this.normalize(child.value);
          total += filterCounts[value] || 0;
        });
        const counterSpan = parentLabel.querySelector(".talent-pool-counter-label");
        if (counterSpan) {
          counterSpan.textContent = ` (${total})`;
        }
      });
    }
    updateNestedGroupCounts(filterCounts = {}) {
      if (this.sidebar.parent && this.sidebar.parent.custom_talent_category) {
        const customGroups = this.sidebar.parent.custom_talent_category.group;
        for (const groupKey in customGroups) {
          const groupConfig = customGroups[groupKey];
          if (groupConfig.type === "group" && groupConfig.group) {
            const mainGroupCheckbox = document.getElementById(`talent-pool-custom_talent_category-${groupKey}`);
            if (mainGroupCheckbox) {
              const mainGroupLabel = mainGroupCheckbox.nextElementSibling;
              let totalGroupCount = 0;
              for (const subGroupKey in groupConfig.group) {
                const subGroupConfig = groupConfig.group[subGroupKey];
                let subGroupTotal = 0;
                if (subGroupConfig.values) {
                  subGroupConfig.values.forEach((value) => {
                    const normalizedValue = this.normalize(value);
                    subGroupTotal += filterCounts[normalizedValue] || 0;
                  });
                } else if (subGroupConfig.type === "simple") {
                  const normalizedValue = this.normalize(subGroupKey);
                  subGroupTotal += filterCounts[normalizedValue] || 0;
                }
                totalGroupCount += subGroupTotal;
                const subGroupCheckbox = document.getElementById(`talent-pool-custom_talent_category-${groupKey}-${subGroupKey}`);
                if (subGroupCheckbox) {
                  const subGroupLabel = subGroupCheckbox.nextElementSibling;
                  const subGroupCounterSpan = subGroupLabel.querySelector(".talent-pool-counter-label");
                  if (subGroupCounterSpan) {
                    subGroupCounterSpan.textContent = ` (${subGroupTotal})`;
                  }
                }
                if (subGroupConfig.values && subGroupConfig.type !== "simple") {
                  subGroupConfig.values.forEach((value) => {
                    const normalizedValue = this.normalize(value);
                    const valueCheckbox = document.querySelector(`input[value="${value}"]`);
                    if (valueCheckbox) {
                      const valueLabel = valueCheckbox.nextElementSibling;
                      const valueCounterSpan = valueLabel?.querySelector(".talent-pool-counter-label");
                      if (valueCounterSpan) {
                        valueCounterSpan.textContent = ` (${filterCounts[normalizedValue] || 0})`;
                      }
                    }
                  });
                }
              }
              if (this.sidebar.updateParentGroupCounter) {
                this.sidebar.updateParentGroupCounter("custom_talent_category", groupKey);
              }
            }
          }
        }
      }
      if (this.sidebar.updateAllParentGroupCounters) {
        setTimeout(() => {
          this.sidebar.updateAllParentGroupCounters();
        }, 10);
      }
    }
    setFilteredData(data) {
      this.filteredData = data;
      this.filter.filteredData = data;
      this.updateCounter();
    }
    reset() {
      this.appendCounterToSidebar();
    }
  };

  // src/sorting.js
  var dataSort = class {
    constructor(option, { sidebar, container }) {
      this.normalize = option.normalize;
      this.sidebar = option.sidebar;
      this.filter = option.Filter;
      this.counter = option.Counter;
      this.getSplitPattern = option.getSplitPattern;
      this.talentPool = option.talentPool || [];
      this.filteredData = this.filter.filteredData;
      this.container = container;
      this.searchData = option.searchData;
      this.currentSortValue = "default";
      this.originalOrder = [...this.filter.filteredData];
      this.SortingUI();
      this.attachSortHandler();
      this.reset();
      this.sidebar.on("onChange", () => {
        this.originalOrder = [...this.filter.filteredData];
        this.applySorting();
      });
      if (this.filter && typeof this.filter.applySearch === "function") {
        const originalApplySearch = this.filter.applySearch.bind(this.filter);
        this.filter.applySearch = (searchTerm, onComplete) => {
          originalApplySearch(searchTerm, (result) => {
            this.originalOrder = [...this.filter.filteredData];
            this.applySorting();
            if (typeof onComplete === "function") {
              onComplete(result);
            }
          });
        };
      }
    }
    attachSortHandler() {
      const selectSort = document.getElementById("talent-pool-sort-select");
      if (!selectSort) {
        setTimeout(() => {
          this.attachSortHandler();
        }, 150);
        return;
      }
      selectSort.addEventListener("change", () => {
        this.currentSortValue = selectSort.value;
        this.applySorting();
      });
    }
    applySorting() {
      let data = [];
      switch (this.currentSortValue) {
        case "asc":
          data = [...this.filter.filteredData].sort((a, b) => {
            const aSalary = parseFloat(a.properties.t_desired_salary) || 0;
            const bSalary = parseFloat(b.properties.t_desired_salary) || 0;
            return aSalary - bSalary;
          });
          break;
        case "desc":
          data = [...this.filter.filteredData].sort((a, b) => {
            const aSalary = parseFloat(a.properties.t_desired_salary) || 0;
            const bSalary = parseFloat(b.properties.t_desired_salary) || 0;
            return bSalary - aSalary;
          });
          break;
        default:
          data = [...this.originalOrder];
      }
      this.filter.filteredData = data;
      this.filter.currentPage = 1;
      this.filter.currentChunk = 0;
      this.filter.render();
    }
    SortingUI() {
      const talentPoolFilterRightContent = document.querySelector(".talent-pool-filter-right-content");
      if (!talentPoolFilterRightContent) {
        setTimeout(() => {
          this.SortingUI();
        }, 100);
        return;
      }
      const sortingContainer = document.createElement("div");
      sortingContainer.classList.add("talent-pool-sorting-container");
      const selectSort = document.createElement("select");
      selectSort.classList.add("talent-pool-sort-select");
      selectSort.id = "talent-pool-sort-select";
      const sortingOptions = [
        { value: "default", label: "Standard" },
        { value: "asc", label: "Salary Ascending" },
        { value: "desc", label: "Salary Descending" }
      ];
      sortingOptions.forEach((option) => {
        const opt = document.createElement("option");
        opt.value = option.value;
        opt.textContent = option.label;
        selectSort.appendChild(opt);
      });
      sortingContainer.appendChild(selectSort);
      talentPoolFilterRightContent.insertBefore(sortingContainer, talentPoolFilterRightContent.children[1]);
    }
    reset() {
      const sortingSelect = document.querySelector("#talent-pool-sort-select");
      if (sortingSelect) {
        sortingSelect.value = "default";
        this.currentSortValue = "default";
        this.applySorting();
      }
    }
  };

  // src/filter.js
  var Filter = class {
    constructor(options = {}) {
      this.container = options.container;
      this.sidebar = options.sidebar;
      this.talentPool = options.talentPool || [];
      this.storedValue = options.storedValue || {};
      this.normalize = options.normalize;
      this.getSplitPattern = options.getSplitPattern;
      this.Counter = options.Counter;
      this.dataSort = options.dataSort;
      this.filteredData = [];
      this.labels = options.labels || {};
      this.formateCurrency = options.formateCurrency;
      this.InnerPageLink = options.InnerPageLink;
      this.itemsPerPageShow = options.itemsPerPageShow;
      Object.assign(this, {
        itemsPerPageShow: this.itemsPerPageShow,
        currentPage: 1
      });
      this.paginationUI();
      this.sidebar.on("onChange", (storedValue) => {
        this.storedValue = storedValue;
        this.applyFilters();
      });
      setTimeout(() => {
        this.setupSearchInput();
      }, 200);
      this.reset();
    }
    paginationUI() {
      this.rightContent = this.createElement("div", "talent-pool-filter-right-content", this.container);
      this.loadingTextElement = this.createElement("div", "talent-pool-loading-text", this.rightContent);
      this.boxContainer = this.createElement("div", "talent-pool-filter-box", this.rightContent);
      const paginationWrapper = this.createElement("div", "pagination_contain", this.rightContent);
      this.paginationControls = this.createElement("div", "pagination-controls", paginationWrapper);
    }
    createElement(tag, className, parent) {
      const el = document.createElement(tag);
      if (className) el.classList.add(className);
      if (parent) parent.appendChild(el);
      return el;
    }
    updateData(talentPool) {
      this.talentPool = talentPool;
      this.filteredData = talentPool;
      this.applyFilters();
      this.boxContainer.innerHTML = "";
      setTimeout(() => {
        if (!document.getElementById("search")) {
          this.setupSearchInput();
        }
      }, 100);
    }
    prepareFilterValues(filters) {
      const prepared = {};
      for (const key in filters) {
        const value = filters[key];
        if (key === "t_desired_salary" && typeof value === "object" && value.minValue !== void 0 && value.maxValue !== void 0) {
          continue;
        }
        if (typeof value === "object" && !Array.isArray(value)) {
          const flatValues = [];
          for (const groupKey in value) {
            const groupValue = value[groupKey];
            if (typeof groupValue === "object" && !Array.isArray(groupValue)) {
              for (const subGroupKey in groupValue) {
                const subGroupValues = groupValue[subGroupKey];
                if (Array.isArray(subGroupValues)) {
                  flatValues.push(...subGroupValues);
                }
              }
            } else if (Array.isArray(groupValue)) {
              flatValues.push(...groupValue);
            }
          }
          prepared[key] = flatValues;
        } else {
          prepared[key] = Array.isArray(value) ? [...value] : Object.values(value).flat();
        }
      }
      return prepared;
    }
    applySalaryFilter(data, salaryRange) {
      if (!salaryRange || salaryRange.minValue === void 0 || salaryRange.maxValue === void 0) {
        return data;
      }
      return data.filter((item) => {
        const salary = Number(item.properties?.t_desired_salary);
        return isNaN(salary) || salary >= salaryRange.minValue && salary <= salaryRange.maxValue;
      });
    }
    applyFilters() {
      const filters = this.storedValue;
      if (!filters || typeof filters !== "object") {
        this.filteredData = this.talentPool;
        return;
      }
      let currentData = [...this.talentPool];
      if (this.storedValue.t_desired_salary) {
        currentData = this.applySalaryFilter(currentData, this.storedValue.t_desired_salary);
      }
      const prepared = this.prepareFilterValues(filters);
      const seen = /* @__PURE__ */ new Set();
      const matched = [];
      const hasOtherFilters = Object.values(prepared).some((arr) => Array.isArray(arr) && arr.length > 0);
      if (!hasOtherFilters) {
        this.filteredData = currentData;
      } else {
        for (const key in prepared) {
          const values = prepared[key].map(this.normalize);
          values.forEach((itemValue) => {
            currentData.forEach((talent) => {
              const raw = talent.properties[key];
              if (!raw) return;
              const splitPattern = this.getSplitPattern(raw);
              const talentValues = raw.split(splitPattern).map(this.normalize).filter(Boolean);
              const fullValue = this.normalize(raw);
              let isMatch = false;
              let isSimpleCategory = false;
              if (key === "custom_talent_category" && this.sidebar?.parent?.custom_talent_category) {
                const customGroups = this.sidebar.parent.custom_talent_category.group;
                for (const groupKey in customGroups) {
                  const groupConfig = customGroups[groupKey];
                  if (groupConfig.type === "group" && groupConfig.group) {
                    for (const subGroupKey in groupConfig.group) {
                      const subGroupConfig = groupConfig.group[subGroupKey];
                      if (subGroupConfig.type === "simple" && subGroupConfig.values && subGroupConfig.values.some((val) => this.normalize(val) === itemValue)) {
                        isSimpleCategory = true;
                        break;
                      }
                    }
                    if (isSimpleCategory) break;
                  }
                }
              }
              if (isSimpleCategory) {
                if (fullValue === itemValue) {
                  isMatch = true;
                } else {
                  isMatch = talentValues.some((val) => {
                    const cleanVal = val.replace(/_[a-z]+$/i, "");
                    return cleanVal === itemValue && !val.includes("_");
                  });
                }
              } else {
                isMatch = fullValue === itemValue || talentValues.includes(itemValue);
              }
              const uid = talent.id || JSON.stringify(talent.properties);
              if (isMatch && !seen.has(uid)) {
                matched.push(talent);
                seen.add(uid);
              }
            });
          });
        }
        this.filteredData = matched.length > 0 ? matched : [];
      }
      this.currentPage = 1;
      this.render();
    }
    renderCard(item) {
      const div = document.createElement("div");
      div.classList.add("talent-pool-card-box");
      const { t_current_position, t_maincategory, t_experience_level, t_city, t_desired_salary, t_candidate_id } = item.properties;
      const talentUrl = `${this.InnerPageLink}/${t_candidate_id}`;
      div.innerHTML = `
            <div class="talent-pool-card-inner">
                <div class="talent_box_content">
                    <h5><a target="_blank" href="${talentUrl}" class="position">${t_current_position}</a></h5>
                    <span class="maincategory">${t_maincategory}</span>
                </div>
                <div class="talent_box_inner_content">
                    <div class="talent_box_inner_left">
                        <span>Experience Level: ${t_experience_level}</span>
                        <span>Stadt: ${t_city}</span>
                        <span>Gehaltsvorstellung / Honorar: ${this.formateCurrency(t_desired_salary, "\u20AC pro Jahr")}</span>
                    </div>
                    <div class="talent_box_btn">
                       <a target="_blank" class="btn btn:secondary" href="${talentUrl}">Mehr erfahren</a>
                    </div>
                </div>
            </div>
        `;
      this.boxContainer.appendChild(div);
    }
    render() {
      this.renderPage();
      this.renderPaginationControls();
    }
    renderPage() {
      this.boxContainer.innerHTML = "";
      if (this.filteredData.length === 0) {
        const noResult = document.createElement("h5");
        noResult.classList.add("no-results-message");
        noResult.textContent = `${this.labels.NoDataContent}`;
        this.boxContainer.innerHTML = "";
        this.boxContainer.appendChild(noResult);
      }
      const start = (this.currentPage - 1) * this.itemsPerPageShow;
      const end = start + this.itemsPerPageShow;
      this.filteredData.slice(start, end).forEach((item) => this.renderCard(item));
    }
    getTotalPages() {
      return Math.ceil(this.filteredData.length / this.itemsPerPageShow);
    }
    renderPaginationControls() {
      const totalPages = this.getTotalPages();
      const currentPage = this.currentPage;
      const pagination = this.paginationControls;
      pagination.innerHTML = "";
      if (this.filteredData.length === 0) {
        pagination.style.display = "none";
        return;
      }
      pagination.style.display = "block";
      const createBtn = (text, disabled, onClick, className = "") => {
        const btn = this.createElement("button", className, pagination);
        btn.textContent = text;
        btn.disabled = disabled;
        btn.onclick = onClick;
      };
      createBtn(`\u2039 ${this.labels.prevLabel}`, currentPage === 1, () => {
        this.currentPage--;
        this.render();
      });
      const maxVisiblePages = 5;
      const half = Math.floor(maxVisiblePages / 2);
      let start = Math.max(1, currentPage - half);
      let end = Math.min(totalPages, currentPage + half);
      if (currentPage <= half) {
        end = Math.min(totalPages, maxVisiblePages);
      }
      if (currentPage + half > totalPages) {
        start = Math.max(1, totalPages - maxVisiblePages + 1);
        end = totalPages;
      }
      if (start > 1) {
        this.createElement("span", "ellipsis", pagination).textContent = "\u2026";
      }
      for (let i = start; i <= end; i++) {
        const btn = this.createElement("button", "pagination-btn", pagination);
        btn.textContent = i;
        if (i === currentPage) {
          btn.classList.add("active");
        }
        btn.onclick = () => {
          this.currentPage = i;
          this.render();
        };
      }
      if (end < totalPages) {
        this.createElement("span", "ellipsis", pagination).textContent = "\u2026";
      }
      createBtn(`${this.labels.nextLabel} \u203A`, currentPage === totalPages, () => {
        this.currentPage++;
        this.render();
      });
    }
    createPaginationButton(label, disabled, handler) {
      const btn = this.createElement("button", "", this.paginationControls);
      btn.textContent = label;
      btn.disabled = disabled;
      btn.onclick = handler;
    }
    nextPageGroup() {
      const totalPages = this.getTotalPages();
      if (this.currentPage < totalPages) {
        this.currentPage++;
        const chunkEnd = (this.currentChunk + 1) * this.pageChunkSize;
        if (this.currentPage > chunkEnd) this.currentChunk++;
        this.render();
      }
    }
    prevPageGroup() {
      if (this.currentPage > 1) {
        this.currentPage--;
        const chunkStart = this.currentChunk * this.pageChunkSize + 1;
        if (this.currentPage < chunkStart) this.currentChunk--;
        this.render();
      }
    }
    applySearch(searchTerm, onComplete) {
      const normalizedSearch = this.normalize(searchTerm);
      const keys = ["t_procedure_txt", "custom_talent_category", "t_experience_level", "t_desired_region_1"];
      if (!normalizedSearch) {
        this.filteredData = this.talentPool;
      } else {
        this.filteredData = this.talentPool.filter((talent) => {
          return keys.some((key) => {
            const raw = talent.properties[key];
            if (!raw) return false;
            const splitPattern = this.getSplitPattern(raw);
            const values = raw.split(splitPattern).map((val) => this.normalize(val));
            return values.some((val) => val.includes(normalizedSearch));
          });
        });
      }
      this.currentPage = 1;
      this.currentChunk = 0;
      this.render();
      if (this.Counter) {
        this.Counter.updateCounter();
      }
      if (typeof onComplete === "function") {
        onComplete(this.filteredData);
      }
    }
    setupSearchInput() {
      function debounce(func, delay) {
        let timeout;
        return function(...args) {
          clearTimeout(timeout);
          timeout = setTimeout(() => func.apply(this, args), delay);
        };
      }
      const searchInput = document.getElementById("search");
      if (!searchInput) {
        console.error("Search input not found");
        return;
      }
      const handleSearch = debounce((e) => {
        const searchTerm = e.target.value.trim();
        const checkboxes = document.querySelectorAll('.talent-pool-filter-sidebar input[type="checkbox"]');
        checkboxes.forEach((checkbox) => {
          checkbox.checked = false;
        });
        const indeterminateCheckboxes = document.querySelectorAll('.talent-pool-filter-sidebar input[type="checkbox"].indeterminate');
        indeterminateCheckboxes.forEach((checkbox) => {
          checkbox.classList.remove("indeterminate");
          checkbox.indeterminate = false;
        });
        this.applySearch(searchTerm);
      }, 300);
      searchInput.addEventListener("input", handleSearch);
      const filterSidebar = document.querySelector(".talent-pool-filter-sidebar");
      filterSidebar.addEventListener("change", (e) => {
        if (e.target.type === "checkbox") {
          searchInput.value = "";
        }
      });
      const addDataButton = document.getElementById("add-data");
    }
    reset() {
      this.updateData(this.talentPool);
      this.render();
      const searchInput = document.getElementById("search");
      searchInput.value = "";
    }
  };

  // src/range_slider.js
  var RangeSlider = class {
    constructor(options) {
      this.options = options;
      this.reset();
    }
    on(event, callback) {
      if (event === "change") {
        this.changeCallback = callback;
      }
    }
    emit(event, data) {
      if (event === "change" && this.changeCallback) {
        this.changeCallback(data);
      }
    }
    getValue() {
      return {
        minValue: this.minValue,
        maxValue: this.maxValue
      };
    }
    progressUpdate() {
      const range = this.options.max - this.options.min;
      const startPercent = (this.minValue - this.options.min) / range * 100;
      const endPercent = (this.maxValue - this.options.min) / range * 100;
      this.progress.style.left = `${startPercent}%`;
      this.progress.style.right = `${100 - endPercent}%`;
      this.tooltipMin.style.left = `${startPercent}%`;
      this.tooltipMax.style.left = `${endPercent}%`;
      const formattedMinValue = this.options.formateCurrency ? this.options.formateCurrency(this.minValue) : `${this.minValue}\u20AC`;
      const formattedMaxValue = this.options.formateCurrency ? this.options.formateCurrency(this.maxValue) : `${this.maxValue}\u20AC`;
      this.tooltipMin.innerText = formattedMinValue;
      this.tooltipMax.innerText = formattedMaxValue;
      this.tooltipMin.style.transform = "translateX(-50%)";
      this.tooltipMax.style.transform = "translateX(-50%)";
      const overlapThreshold = 5;
      const distance = Math.abs(startPercent - endPercent);
      if (distance <= overlapThreshold) {
        this.tooltipMin.style.top = "-60px";
        this.tooltipMax.style.top = "-35px";
      } else {
        this.tooltipMin.style.top = "-35px";
        this.tooltipMax.style.top = "-35px";
      }
      if (this.minValue > this.maxValue) {
        this.tooltipMin.style.zIndex = 2;
        this.tooltipMax.style.zIndex = 1;
      } else {
        this.tooltipMin.style.zIndex = 1;
        this.tooltipMax.style.zIndex = 2;
      }
    }
    initialize() {
      const RangeSliderTitle = document.createElement("h3");
      RangeSliderTitle.classList.add("range-title");
      RangeSliderTitle.innerHTML = "Salary Expectations / Fee";
      const container = document.createElement("div");
      container.classList.add("range-input");
      const sliderContainer = document.createElement("div");
      sliderContainer.classList.add("slider");
      const progress = document.createElement("div");
      progress.classList.add("progress");
      this.minValue = this.options.defaultMin;
      this.maxValue = this.options.defaultMax;
      sliderContainer.appendChild(progress);
      container.appendChild(sliderContainer);
      this.progress = progress;
      const rangeLabel = document.createElement("div");
      rangeLabel.classList.add("range-label");
      const formattedMin = this.options.formateCurrency ? this.options.formateCurrency(this.options.min) : `${this.options.min}\u20AC`;
      const formattedMax = this.options.formateCurrency ? this.options.formateCurrency(this.options.max) : `${this.options.max}\u20AC`;
      rangeLabel.innerHTML = `<span class="min">${formattedMin}</span> - <span class="max">${formattedMax}</span>`;
      container.appendChild(rangeLabel);
      const tooltipWrapper = document.createElement("div");
      tooltipWrapper.classList.add("tooltip-wrapper");
      const tooltipMin = document.createElement("span");
      tooltipMin.classList.add("tooltip-min");
      const formattedDefaultMin = this.options.formateCurrency ? this.options.formateCurrency(this.options.defaultMin) : `${this.options.defaultMin}\u20AC`;
      tooltipMin.innerText = formattedDefaultMin;
      tooltipWrapper.appendChild(tooltipMin);
      this.tooltipMin = tooltipMin;
      const tooltipMax = document.createElement("span");
      tooltipMax.classList.add("tooltip-max");
      const formattedDefaultMax = this.options.formateCurrency ? this.options.formateCurrency(this.options.defaultMax) : `${this.options.defaultMax}\u20AC`;
      tooltipMax.innerText = formattedDefaultMax;
      tooltipWrapper.appendChild(tooltipMax);
      this.tooltipMax = tooltipMax;
      container.appendChild(tooltipWrapper);
      const minInput = document.createElement("input");
      minInput.type = "range";
      minInput.classList.add("range-min");
      minInput.min = this.options.min;
      minInput.max = this.options.max;
      minInput.value = this.options.defaultMin;
      container.appendChild(minInput);
      this.minInput = minInput;
      minInput.addEventListener("input", (e) => {
        this.onChange("min", e);
      });
      minInput.addEventListener("change", (e) => {
        this.emit("change", this.getValue());
      });
      const maxInput = document.createElement("input");
      maxInput.type = "range";
      maxInput.classList.add("range-max");
      maxInput.min = this.options.min;
      maxInput.max = this.options.max;
      maxInput.value = this.options.defaultMax;
      container.appendChild(maxInput);
      this.maxInput = maxInput;
      maxInput.addEventListener("input", (e) => {
        this.onChange("max", e);
      });
      maxInput.addEventListener("change", (e) => {
        this.emit("change", this.getValue());
      });
      const RangeSliderWrapper = document.createElement("div");
      RangeSliderWrapper.classList.add("range-slider-wrapper");
      RangeSliderWrapper.appendChild(RangeSliderTitle);
      RangeSliderWrapper.appendChild(container);
      this.container = container;
      this.progressUpdate();
      this.emit("change", this.getValue());
      return RangeSliderWrapper;
    }
    onChange(type, event) {
      const step = this.options.step || 1;
      if (event.target.value % step !== 0) {
        event.target.value = Math.round(event.target.value / step) * step;
      }
      if (type === "min") {
        const newValue = parseInt(event.target.value, 10);
        if (newValue + this.options.gap <= this.maxValue) {
          this.minValue = newValue;
          this.progressUpdate();
        } else {
          event.target.value = this.minValue;
        }
      } else if (type === "max") {
        const newValue = parseInt(event.target.value, 10);
        if (newValue - this.options.gap >= this.minValue) {
          this.maxValue = newValue;
          this.progressUpdate();
        } else {
          event.target.value = this.maxValue;
        }
      }
    }
    reset() {
      this.minValue = this.options.defaultMin ?? this.options.min;
      this.maxValue = this.options.defaultMax ?? this.options.max;
      if (this.minInput) this.minInput.value = this.minValue;
      if (this.maxInput) this.maxInput.value = this.maxValue;
      const format = this.options.formateCurrency || ((val) => `${val}\u20AC`);
      if (this.tooltipMin) this.tooltipMin.innerText = format(this.minValue);
      if (this.tooltipMax) this.tooltipMax.innerText = format(this.maxValue);
      if (this.progress && this.tooltipMin && this.tooltipMax) {
        this.progressUpdate();
      }
      this.emit("change", this.getValue());
    }
  };

  // src/popup_data.js
  var isResettingGroups = false;
  function popupButton(Sidebar) {
    const popupButton2 = document.createElement("button");
    popupButton2.classList.add("talent-pool-popup-button");
    popupButton2.textContent = "Create and Manage Search Requests";
    const body = document.body;
    function isSubgroupValue(value, Sidebar2) {
      const groupMap = Sidebar2.parent?.custom_talent_category?.group || {};
      return Object.values(groupMap).some((group) => {
        if (group.group) {
          return Object.values(group.group).some((subgroup) => subgroup.values?.includes(value));
        }
        return false;
      });
    }
    function uncheckOtherGroups(currentGroup, PopupValueStored) {
      isResettingGroups = true;
      const container = currentGroup.closest(".talent-pool-popup-inner-wrapper") || currentGroup.closest(".talent-pool-sidebar");
      const allGroups = container?.querySelectorAll('.talent-pool-checkboxes[data-key="custom_talent_category"]') || [];
      const currentGroupKey = currentGroup.getAttribute("data-group-key");
      const key = "custom_talent_category";
      allGroups.forEach((group) => {
        const groupKey = group.getAttribute("data-group-key");
        if (groupKey === currentGroupKey) return;
        if (group.classList.contains("popup-transformed")) {
          const mainCheckbox = group.querySelector(".talent-pool-checkbox-input");
          if (mainCheckbox) {
            mainCheckbox.checked = false;
            mainCheckbox.indeterminate = false;
            mainCheckbox.classList.remove("indeterminate");
          }
          const subgroupCheckboxes = group.querySelectorAll('.popup-subgroups input[type="checkbox"]');
          subgroupCheckboxes.forEach((cb) => cb.checked = false);
        } else {
          const mainCheckbox = group.querySelector(".talent-pool-checkbox-input");
          if (mainCheckbox) {
            mainCheckbox.checked = false;
            mainCheckbox.indeterminate = false;
            mainCheckbox.classList.remove("indeterminate");
          }
          const childCheckboxes = group.querySelectorAll('.talent-pool-checkbox-group-wrapper input[type="checkbox"]');
          childCheckboxes.forEach((cb) => cb.checked = false);
        }
        if (PopupValueStored[key]) {
          PopupValueStored[key][groupKey] = [];
        }
      });
      const event5 = new CustomEvent("PopupValueStored", { detail: PopupValueStored });
      document.dispatchEvent(event5);
      setTimeout(() => {
        isResettingGroups = false;
      }, 0);
    }
    popupButton2.addEventListener("click", () => {
      body.classList.add("open-popup");
      const popupContainer = document.createElement("div");
      popupContainer.classList.add("talent-pool-popup-container");
      popupContainer.classList.add("popup");
      const popupInnerWrapper = document.createElement("div");
      popupInnerWrapper.classList.add("talent-pool-popup-inner-wrapper");
      popupContainer.appendChild(popupInnerWrapper);
      const clonedSidebar = Sidebar.sidebar.cloneNode(true);
      const closeButton = Sidebar.parent.createCloseButton();
      popupInnerWrapper.appendChild(closeButton);
      const talentPoolContain = clonedSidebar.querySelector(".talent-pool-contain");
      if (talentPoolContain) {
        talentPoolContain.remove();
      }
      const CounterLabel = clonedSidebar.querySelectorAll(".talent-pool-counter-label");
      CounterLabel.forEach((label) => {
        label.remove();
      });
      const oldTitle = clonedSidebar.querySelector(".range-title");
      if (oldTitle) {
        oldTitle.remove();
      }
      const rangeInputs = clonedSidebar.querySelectorAll(".range-input , .talent-pool-popup-button");
      rangeInputs.forEach((input) => {
        input.remove();
      });
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
      const nestedGroups = clonedSidebar.querySelectorAll(".talent-pool-nested-group");
      nestedGroups.forEach((nestedGroup) => {
        const key = nestedGroup.getAttribute("data-key");
        const groupKey = nestedGroup.getAttribute("data-group-key");
        const mainCheckbox = nestedGroup.querySelector(".talent-pool-checkbox-input");
        const mainLabel = nestedGroup.querySelector("label");
        if (mainCheckbox && mainCheckbox.id) {
          mainCheckbox.id = `popup-${mainCheckbox.id}`;
        }
        if (mainLabel && mainLabel.htmlFor) {
          mainLabel.htmlFor = `popup-${mainLabel.htmlFor}`;
        }
        const subgroupDropdownButtons = nestedGroup.querySelectorAll(".talent-pool-nested-subgroup .talent-pool-dropdown-button");
        subgroupDropdownButtons.forEach((button) => {
          button.remove();
        });
        const subgroupDropdownContainers = nestedGroup.querySelectorAll(".talent-pool-nested-subgroup .dropdown-container");
        subgroupDropdownContainers.forEach((container) => {
          container.remove();
        });
        const existingSubgroups = nestedGroup.querySelectorAll(".talent-pool-nested-subgroup");
        existingSubgroups.forEach((subgroup) => {
          subgroup.remove();
        });
        const newCheckboxWrapper = document.createElement("div");
        newCheckboxWrapper.classList.add("talent-pool-checkbox-group-wrapper", "dropdown-container", "nested", "popup-subgroups");
        if (Sidebar.parent && Sidebar.parent.custom_talent_category && Sidebar.parent.custom_talent_category.group[groupKey]) {
          const groupConfig = Sidebar.parent.custom_talent_category.group[groupKey];
          if (groupConfig.type === "group" && groupConfig.group) {
            Object.keys(groupConfig.group).forEach((subGroupKey) => {
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
        if (mainCheckbox) {
          mainCheckbox.style.display = "block";
        }
        if (mainLabel) {
          mainLabel.style.display = "block";
        }
        nestedGroup.appendChild(newCheckboxWrapper);
        if (mainCheckbox) {
          mainCheckbox.addEventListener("change", () => {
            if (isResettingGroups) return;
            const isChecked = mainCheckbox.checked;
            uncheckOtherGroups(nestedGroup, PopupValueStored);
            const subGroupCheckboxes = newCheckboxWrapper.querySelectorAll('input[type="checkbox"]');
            mainCheckbox.classList.remove("indeterminate");
            mainCheckbox.indeterminate = false;
            PopupValueStored[key] = PopupValueStored[key] || {};
            PopupValueStored[key][groupKey] = PopupValueStored[key][groupKey] || [];
            PopupValueStored[key][groupKey] = [];
            subGroupCheckboxes.forEach((subCheckbox) => {
              subCheckbox.checked = isChecked;
              const subGroupKey = subCheckbox.closest(".talent-pool-checkbox")?.getAttribute("data-subgroup-key");
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
          });
        }
        nestedGroup.classList.add("popup-transformed");
      });
      const rangeSlider = new RangeSlider(Sidebar.rangeSliderOption);
      const element = rangeSlider.initialize();
      clonedSidebar.appendChild(element);
      const initialData = rangeSlider.getValue();
      PopupValueStored.t_desired_salary = { minValue: initialData.minValue, maxValue: initialData.maxValue };
      rangeSlider.on("change", (data) => {
        PopupValueStored.t_desired_salary = { minValue: data.minValue, maxValue: data.maxValue };
        const event12 = new CustomEvent("PopupValueStored", { detail: PopupValueStored });
        document.dispatchEvent(event12);
      });
      const transformedNestedGroups = clonedSidebar.querySelectorAll(".talent-pool-nested-group.popup-transformed");
      transformedNestedGroups.forEach((group) => {
        const key = group.getAttribute("data-key");
        const groupKey = group.getAttribute("data-group-key");
        const subGroupCheckboxes = group.querySelectorAll('.popup-subgroups input[type="checkbox"]');
        ensurePopupValue(key, groupKey);
        const originalNestedGroup = Sidebar.sidebar.querySelector(`.talent-pool-nested-group[data-key="${key}"][data-group-key="${groupKey}"]`);
        if (originalNestedGroup) {
          const originalDropdownContainer = originalNestedGroup.querySelector(".dropdown-container");
          const subgroupsWithSelection = /* @__PURE__ */ new Set();
          const groupConfig = Sidebar.parent?.custom_talent_category?.group?.[groupKey];
          if (groupConfig?.type === "group" && groupConfig.group) {
            Object.keys(groupConfig.group).forEach((subGroupKey) => {
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
                subGroupContainers.forEach((container) => {
                  const subGroupValues = subGroupConfig.values || [];
                  const checkedValues = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value);
                  if (checkedValues.some((val) => subGroupValues.includes(val))) {
                    isChecked = true;
                  }
                });
              }
              if (isChecked) {
                subgroupsWithSelection.add(subGroupKey);
              }
            });
          }
          subgroupsWithSelection.forEach((subGroupKey) => {
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
          const mainCheckbox = group.querySelector(".talent-pool-checkbox-input");
          if (mainCheckbox) {
            const allSub = group.querySelectorAll('.popup-subgroups input[type="checkbox"]');
            const checkedSub = group.querySelectorAll('.popup-subgroups input[type="checkbox"]:checked');
            mainCheckbox.checked = checkedSub.length === allSub.length && checkedSub.length > 0;
            mainCheckbox.indeterminate = checkedSub.length > 0 && checkedSub.length < allSub.length;
          }
        }
        subGroupCheckboxes.forEach((subGroupCheckbox) => {
          subGroupCheckbox.addEventListener("change", () => {
            const subGroupKey = subGroupCheckbox.closest(".talent-pool-checkbox")?.getAttribute("data-subgroup-key");
            const subGroupConfig = Sidebar.parent?.custom_talent_category?.group?.[groupKey]?.group?.[subGroupKey];
            const subGroupDisplayName = subGroupConfig?.name || subGroupKey;
            ensurePopupValue(key, groupKey);
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
            const mainCheckbox = group.querySelector(".talent-pool-checkbox-input");
            if (mainCheckbox) {
              mainCheckbox.classList.remove("indeterminate");
              if (checkedSub.length === 0) {
                mainCheckbox.checked = false;
                mainCheckbox.indeterminate = false;
              } else if (checkedSub.length === allSub.length) {
                mainCheckbox.checked = true;
                mainCheckbox.indeterminate = false;
              } else {
                mainCheckbox.checked = false;
                mainCheckbox.indeterminate = true;
                mainCheckbox.classList.add("indeterminate");
              }
            }
          });
        });
      });
      const nonNestedCustomGroups = Array.from(popupCustomGroups).filter((group) => !group.classList.contains("popup-transformed"));
      nonNestedCustomGroups.forEach((group) => {
        const parentCheckbox = group.querySelector(".talent-pool-checkbox-input");
        const childCheckboxes = group.querySelectorAll('.talent-pool-checkbox-group-wrapper input[type="checkbox"]');
        const key = group.getAttribute("data-key");
        const groupKey = group.getAttribute("data-group-key");
        transformedNestedGroups.forEach((nestedGroup) => {
          const nestedKey = nestedGroup.getAttribute("data-key");
          const nestedGroupKey = nestedGroup.getAttribute("data-group-key");
          const nestedCheckboxes = nestedGroup.querySelectorAll('.popup-subgroups input[type="checkbox"]');
          nestedCheckboxes.forEach((cb) => cb.checked = false);
          if (PopupValueStored[nestedKey] && PopupValueStored[nestedKey][nestedGroupKey]) {
            Object.keys(PopupValueStored[nestedKey][nestedGroupKey]).forEach((subKey) => {
              PopupValueStored[nestedKey][nestedGroupKey][subKey] = [];
            });
          }
        });
        parentCheckbox.addEventListener("change", () => {
          if (isResettingGroups) return;
          const checked = parentCheckbox.checked;
          uncheckOtherGroups(group, PopupValueStored);
          PopupValueStored[key] = PopupValueStored[key] || {};
          PopupValueStored[key][groupKey] = [];
          childCheckboxes.forEach((child) => {
            child.checked = checked;
            if (checked && child.value !== "on") {
              PopupValueStored[key][groupKey].push(child.value);
            }
          });
        });
        childCheckboxes.forEach((child) => {
          child.addEventListener("change", () => {
            if (isResettingGroups) return;
            const anyChecked = Array.from(childCheckboxes).some((checkbox) => checkbox.checked);
            const valuesChecked = Array.from(childCheckboxes).filter((checkbox) => checkbox.checked && checkbox.value !== "on").map((checkbox) => checkbox.value);
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
      const nonNestedCheckBoxGroups = Array.from(checkBoxGroup).filter((group) => {
        if (group.classList.contains("popup-transformed")) {
          return false;
        }
        if (group.classList.contains("talent-pool-nested-group")) {
          return false;
        }
        if (group.getAttribute("data-key") === "custom_talent_category") {
          const parentNestedGroup = group.closest(".talent-pool-nested-group");
          if (parentNestedGroup) {
            return false;
          }
        }
        return true;
      });
      nonNestedCheckBoxGroups.forEach((group) => {
        const key = group.getAttribute("data-key");
        const groupKey = group.getAttribute("data-group-key");
        const indeterminateCheckbox = group.querySelector(".indeterminate");
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
        inputs.forEach((input) => {
          if (input.id) {
            input.id = `popup-${input.id}`;
            const isInNestedGroup = input.closest(".talent-pool-nested-group");
            const isSubgroupInput = input.closest(".popup-subgroups");
            const isCategoryLevelInput = input.classList.contains("talent-pool-checkbox-input") && input.closest(".talent-pool-nested-group");
            const isMainCategoryCheckbox = input.classList.contains("talent-pool-checkbox-input");
            if (input.checked && !isInNestedGroup && !isCategoryLevelInput && !isMainCategoryCheckbox) {
              if (key === "custom_talent_category") {
                const parentGroup = input.closest(".talent-pool-checkboxes");
                if (parentGroup && !parentGroup.classList.contains("popup-transformed")) {
                  const allGroups = Array.from(group.parentNode.querySelectorAll('.talent-pool-checkboxes[data-key="custom_talent_category"]'));
                  const currentIndex = allGroups.indexOf(group);
                  allGroups.forEach((otherGroup, index) => {
                    if (index < currentIndex) {
                      const otherParent = otherGroup.querySelector(".talent-pool-checkbox-input");
                      const otherChildren = otherGroup.querySelectorAll('.talent-pool-checkbox-group-wrapper input[type="checkbox"]');
                      if (otherParent) otherParent.checked = false;
                      otherChildren.forEach((cb) => cb.checked = false);
                      const otherGroupKey = otherGroup.getAttribute("data-group-key");
                      if (PopupValueStored[key] && PopupValueStored[key][otherGroupKey]) {
                        PopupValueStored[key][otherGroupKey] = [];
                      }
                    }
                  });
                  const groupCheckboxChecked = group.querySelector(".talent-pool-checkbox-input");
                  if (groupCheckboxChecked && !groupCheckboxChecked.checked) {
                    groupCheckboxChecked.checked = true;
                  }
                  PopupValueStored[key][groupKey] = PopupValueStored[key][groupKey] || [];
                  if (input.value !== "on" && input.value !== groupKey && !isSubgroupValue(input.value, Sidebar) && !PopupValueStored[key][groupKey].includes(input.value)) {
                    PopupValueStored[key][groupKey].push(input.value);
                  }
                }
              } else {
                if (input.value !== "on" && !PopupValueStored[key].includes(input.value)) {
                  PopupValueStored[key].push(input.value);
                }
              }
            }
            input.addEventListener("change", (event2) => {
              const isInNestedGroup2 = input.closest(".talent-pool-nested-group") || input.closest(".popup-transformed") || group.classList.contains("popup-transformed");
              const isCategoryLevelInput2 = input.classList.contains("talent-pool-checkbox-input") && input.closest(".talent-pool-nested-group");
              const isMainCategoryCheckbox2 = input.classList.contains("talent-pool-checkbox-input");
              if (!isInNestedGroup2 && !isCategoryLevelInput2 && !isMainCategoryCheckbox2) {
                const value = event2.target.value;
                if (key === "custom_talent_category") {
                  PopupValueStored[key][groupKey] = PopupValueStored[key][groupKey] || [];
                  if (value !== "on" && value !== groupKey) {
                    if (event2.target.checked) {
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
                    if (event2.target.checked) {
                      PopupValueStored[key].push(value);
                    } else {
                      const index = PopupValueStored[key].indexOf(value);
                      if (index > -1) {
                        PopupValueStored[key].splice(index, 1);
                      }
                    }
                  }
                }
                const event22 = new CustomEvent("PopupValueStored", { detail: PopupValueStored });
                document.dispatchEvent(event22);
              }
            });
            const label = input.nextElementSibling;
            if (label && label.tagName === "LABEL" && label.htmlFor) {
              label.htmlFor = `popup-${label.htmlFor}`;
            }
          }
        });
      });
      const event1 = new CustomEvent("PopupValueStored", { detail: PopupValueStored });
      document.dispatchEvent(event1);
      const dropdownButtons = clonedSidebar.querySelectorAll(".talent-pool-dropdown-button");
      dropdownButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          Sidebar.dropdownButtonHandler(e);
        });
      });
      const formContainer = document.createElement("div");
      formContainer.classList.add("form-container");
      popupInnerWrapper.appendChild(clonedSidebar);
      clonedSidebar.appendChild(formContainer);
      document.body.appendChild(popupContainer);
      const event = new CustomEvent("model-open", { detail: { container: popupContainer, formContainer } });
      document.dispatchEvent(event);
    });
    Sidebar.sidebar.appendChild(popupButton2);
  }

  // src/sidebar.js
  var TalentPoolSidebar = class {
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
        this._events[event].forEach((handler) => handler(data));
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
                      selectedValues.forEach((val) => {
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
                groupValue.forEach((val) => {
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
            value.forEach((val) => {
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
    getOptionsData(key = null, exclude = []) {
      if (!key) return console.error("Key is required to get options data");
      const uniqueValues = /* @__PURE__ */ new Set();
      this.talentPool.forEach((item) => {
        if (item.properties[key] && !exclude.includes(item.properties[key])) {
          uniqueValues.add(item.properties[key]);
        }
      });
      return Array.from(uniqueValues).map((value) => ({ label: value, value }));
    }
    getSimpleOptionsData(value = null) {
      if (!value) return console.error("Value is required to get simple options data");
      return value.map((val) => ({ label: val, value: val }));
    }
    addRemoveValueInStoredValue({ key = null, value = null, groupKey = null }) {
      if (!key || !value) return console.error("Key and value are required");
      if (groupKey) {
        this.storedValue[groupKey] = this.storedValue[groupKey] || {};
        this.storedValue[groupKey][key] = this.storedValue[groupKey][key] || [];
        const group = this.storedValue[groupKey][key];
        const index = group.indexOf(value);
        index > -1 ? group.splice(index, 1) : group.push(value);
      } else {
        this.storedValue[key] = this.storedValue[key] || [];
        const index = this.storedValue[key].indexOf(value);
        index > -1 ? this.storedValue[key].splice(index, 1) : this.storedValue[key].push(value);
      }
      this.triggerChange();
    }
    buildOptionsDataGroup({ title = "", key = null, group = { filteredGroup } }) {
      if (!key) return console.error("Key is required to build options data group");
      const hasNestedGroups = Object.values(group).some((item) => item.type === "group" && item.group);
      if (hasNestedGroups) {
        this.buildNestedOptionsDataGroup({ title, key, group });
      } else {
        if (title) {
          const titleElement = document.createElement("h3");
          titleElement.textContent = title;
          this.sidebar.appendChild(titleElement);
        }
        this.storedValue[key] = {};
        Object.keys(group).forEach((groupKey) => {
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
    buildOptionsData({ isCustom = false, values = [], type = "checkbox", key = null, exclude = [], placeholder = "", title = "", groupKey = null, replace = null }) {
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
            this.storedValue[key][groupKey] = options.map((option) => option.value);
            options.forEach((option) => {
              const input = document.getElementById(`talent-pool-${key}-${option.value}`);
              if (input) input.checked = true;
            });
          } else {
            this.storedValue[key][groupKey] = [];
            options.forEach((option) => {
              const input = document.getElementById(`talent-pool-${key}-${option.value}`);
              if (input) input.checked = false;
            });
          }
          event.target.indeterminate = false;
          event.target.classList.remove("indeterminate");
          this.triggerChange();
        });
      }
      if (type === "checkbox") {
        const checkboxGroupWrapper = document.createElement("div");
        checkboxGroupWrapper.classList.add("talent-pool-checkbox-group-wrapper");
        if (title && isCustom) checkboxGroupWrapper.classList.add("dropdown-container");
        options.forEach((option) => {
          const div = document.createElement("div");
          div.classList.add("talent-pool-checkbox");
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
          if (replace) {
            const val = replace[option.label] || option.label;
            label.textContent = val;
          } else {
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
        options.forEach((option) => {
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
        checkboxInput.id = subGroupKey ? `talent-pool-${key}-${groupKey}-${subGroupKey}` : `talent-pool-${key}-${groupKey}`;
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
              this.storedValue[key][groupKey][subGroupKey] = options.map((option) => option.value);
              options.forEach((option) => {
                const input = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}-${option.value}`);
                if (input) input.checked = true;
              });
            } else {
              this.storedValue[key][groupKey][subGroupKey] = [];
              options.forEach((option) => {
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
              this.storedValue[key][groupKey] = options.map((option) => option.value);
              options.forEach((option) => {
                const input = document.getElementById(`talent-pool-${key}-${option.value}`);
                if (input) input.checked = true;
              });
            } else {
              this.storedValue[key][groupKey] = [];
              options.forEach((option) => {
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
        options.forEach((option) => {
          const div = document.createElement("div");
          div.classList.add("talent-pool-checkbox", "nested");
          const input = document.createElement("input");
          input.type = "checkbox";
          input.value = option.value;
          input.id = subGroupKey ? `talent-pool-${key}-${groupKey}-${subGroupKey}-${option.value}` : `talent-pool-${key}-${groupKey}-${option.value}`;
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
      Object.keys(group).forEach((groupKey) => {
        const item = group[groupKey];
        if (item.type === "group" && item.group) {
          const nestedGroupContainer = document.createElement("div");
          nestedGroupContainer.classList.add("talent-pool-checkboxes", "talent-pool-nested-group", "nested");
          nestedGroupContainer.setAttribute("data-key", key);
          nestedGroupContainer.setAttribute("data-group-key", groupKey);
          const dropdownButton = document.createElement("div");
          dropdownButton.classList.add("talent-pool-dropdown-button", "nested");
          dropdownButton.textContent = "";
          dropdownButton.addEventListener("click", (e) => {
            this.dropdownButtonHandler(e);
          });
          nestedGroupContainer.appendChild(dropdownButton);
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
          const dropdownContainer = document.createElement("div");
          dropdownContainer.classList.add("talent-pool-checkbox-group-wrapper", "dropdown-container", "nested");
          this.storedValue[key][groupKey] = {};
          mainCheckboxInput.addEventListener("change", (event) => {
            const allSubGroups = Object.keys(item.group);
            if (event.target.checked) {
              allSubGroups.forEach((subGroupKey) => {
                const subItem = item.group[subGroupKey];
                const subGroupCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}`);
                if (subGroupCheckbox) subGroupCheckbox.checked = true;
                if (subItem.type === "simple") {
                  this.storedValue[key][groupKey][subGroupKey] = subItem.values || [subGroupKey];
                } else if (subItem.values && subItem.values.length > 0) {
                  this.storedValue[key][groupKey][subGroupKey] = [...subItem.values];
                  subItem.values.forEach((val) => {
                    const input = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}-${val}`);
                    if (input) input.checked = true;
                  });
                } else {
                  this.storedValue[key][groupKey][subGroupKey] = ["selected"];
                }
              });
            } else {
              allSubGroups.forEach((subGroupKey) => {
                const subItem = item.group[subGroupKey];
                const subGroupCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}`);
                if (subGroupCheckbox) subGroupCheckbox.checked = false;
                this.storedValue[key][groupKey][subGroupKey] = [];
                if (subItem.values && subItem.values.length > 0) {
                  subItem.values.forEach((val) => {
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
          Object.keys(item.group).forEach((subGroupKey) => {
            const subItem = item.group[subGroupKey];
            this.storedValue[key][groupKey][subGroupKey] = [];
            const nestedSubContainer = document.createElement("div");
            nestedSubContainer.classList.add("talent-pool-nested-subgroup", "nested");
            if (subItem.type === "simple") {
              this.buildSimpleNestedCategory({
                key,
                groupKey,
                subGroupKey,
                title: subItem.name || subGroupKey,
                container: nestedSubContainer
              });
            } else if (!subItem.values || subItem.values.length === 0) {
              this.buildEmptyNestedGroup({
                key,
                groupKey,
                subGroupKey,
                title: subItem.name || subGroupKey,
                container: nestedSubContainer
              });
            } else {
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
          nestedGroupContainer.appendChild(dropdownContainer);
          this.sidebar.appendChild(nestedGroupContainer);
        } else {
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
          const groupConfig = this.parent.custom_talent_category.group[groupKey];
          const subGroupConfig = groupConfig?.group?.[subGroupKey];
          const actualValues = subGroupConfig?.values || [subGroupKey];
          this.storedValue[key][groupKey][subGroupKey] = [...actualValues];
        } else {
          this.storedValue[key][groupKey][subGroupKey] = [];
        }
        this.updateParentCheckboxState(key, groupKey);
        setTimeout(() => this.updateParentCheckboxState(key, groupKey), 10);
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
      allSubGroupsFromConfig.forEach((subGroupKey) => {
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
      const hasAnyPartialOrMixed = partiallySelectedSubGroups > 0 || fullySelectedSubGroups > 0 && unselectedSubGroups > 0;
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
      this.updateParentGroupCounter(key, groupKey);
    }
    updateAllParentGroupCounters() {
      if (!this.parent || !this.parent.custom_talent_category) return;
      const customGroups = this.parent.custom_talent_category.group;
      for (const groupKey in customGroups) {
        const groupConfig = customGroups[groupKey];
        if (groupConfig.type === "group" && groupConfig.group) {
          this.updateParentGroupCounter("custom_talent_category", groupKey);
        }
      }
    }
    updateParentGroupCounter(key, groupKey) {
      if (key !== "custom_talent_category") return;
      const parentCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}`);
      if (!parentCheckbox) return;
      const parentLabel = parentCheckbox.nextElementSibling;
      if (!parentLabel) return;
      const parentCounterSpan = parentLabel.querySelector(".talent-pool-counter-label");
      if (!parentCounterSpan) return;
      if (!this.storedValue[key]) {
        this.storedValue[key] = {};
      }
      if (!this.storedValue[key][groupKey]) {
        this.storedValue[key][groupKey] = {};
      }
      const storedSubGroups = this.storedValue[key][groupKey] || {};
      let totalSelectedCount = 0;
      let hasAnyCheckedSubGroups = false;
      Object.keys(storedSubGroups).forEach((subGroupKey) => {
        const subGroupValues = storedSubGroups[subGroupKey] || [];
        if (subGroupValues.length > 0) {
          hasAnyCheckedSubGroups = true;
          const subGroupCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}`);
          if (subGroupCheckbox) {
            const subGroupLabel = subGroupCheckbox.nextElementSibling;
            const subGroupCounterSpan = subGroupLabel?.querySelector(".talent-pool-counter-label");
            if (subGroupCounterSpan) {
              const match = subGroupCounterSpan.textContent.match(/\((\d+)\)/);
              const count = match ? parseInt(match[1]) : 0;
              totalSelectedCount += count;
            }
          }
        }
      });
      if (!hasAnyCheckedSubGroups) {
        totalSelectedCount = 0;
        const groupConfig = this.parent.custom_talent_category.group[groupKey];
        if (groupConfig && groupConfig.group) {
          Object.keys(groupConfig.group).forEach((subGroupKey) => {
            const subGroupCheckbox = document.getElementById(`talent-pool-${key}-${groupKey}-${subGroupKey}`);
            if (subGroupCheckbox) {
              const subGroupLabel = subGroupCheckbox.nextElementSibling;
              const subGroupCounterSpan = subGroupLabel?.querySelector(".talent-pool-counter-label");
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
    reset() {
      const checkedBoxes = document.querySelectorAll('.talent-pool-filter-sidebar input[type="checkbox"]:checked');
      checkedBoxes.forEach((checkbox) => {
        checkbox.checked = false;
      });
    }
  };

  // src/index.js
  var TalentPool = class {
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
        popupTitle: this.options.popupTitle
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
        Filter: this.Filter
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
        Counter: this.counter
      });
      this.RangeSlider = new RangeSlider({
        sidebar: this.sidebar,
        slider: this.sidebar.rangeSlider
      });
      this.initializeLoading();
    }
    renderSidebar() {
      const categoriesList = this.talentPool.map((item) => (item.properties.custom_talent_category || "").trim().toLowerCase());
      const availableCategories = new Set(categoriesList.filter(Boolean));
      const group = this.custom_talent_category.group;
      const fullGroup = {};
      for (const [key, groupObj] of Object.entries(group)) {
        fullGroup[key] = {
          ...groupObj,
          ...groupObj.values && { values: [...groupObj.values] }
        };
      }
      this.sidebar.buildOptionsData({
        ...this.options.t_procedure_txt
      });
      this.sidebar.buildOptionsDataGroup({
        ...this.custom_talent_category
      });
      this.sidebar.buildOptionsData({
        ...this.options.t_experience_level
      });
      this.sidebar.buildOptionsData({
        ...this.options.t_desired_region_1
      });
      this.sidebar.rangeSlider({
        ...this.options.t_desired_salary
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
      return String(str || "").normalize("NFKC").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[_\s]+/g, " ").replace(/\s*&\s*/g, " and ").replace(/\s+and\s+/g, " and ").replace(/\b_[a-z]$/i, "").trim();
    }
    getSplitPattern(value) {
      if (value.includes(";")) return /[;]/;
      const commaCount = (value.match(/,/g) || []).length;
      return commaCount > 1 || value.length < 100 ? /[;,]/ : /[;]/;
    }
    formateCurrency(value, end = "\u20AC") {
      const numberValue = parseFloat(value);
      if (isNaN(numberValue)) return value;
      return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numberValue).replace("\u20AC", end);
    }
    initializeLoading() {
      const loadingElement = document.querySelector(".talent-pool-loading-text");
      if (loadingElement && this.options.loadingText) {
        if (!loadingElement.querySelector("h4")) {
          const h4 = document.createElement("h4");
          h4.textContent = this.options.loadingText;
          loadingElement.appendChild(h4);
        }
        loadingElement.style.display = "block";
      }
    }
    toggleLoading(show) {
      const displayMap = {
        loading: show ? "flex" : "none",
        box: show ? "none" : "flex",
        pagination: show ? "none" : "flex",
        sidebar: show ? "none" : "block",
        sorting: show ? "none" : "block"
      };
      const elements = {
        loading: document.querySelector(".talent-pool-loading-text"),
        box: document.querySelector(".talent-pool-filter-box"),
        pagination: document.querySelector(".pagination_contain"),
        sidebar: document.querySelector(".talent-pool-filter-sidebar"),
        sorting: document.querySelector(".talent-pool-sorting-container"),
        main: document.getElementById("TalentPool")
      };
      elements.loading && (elements.loading.style.display = displayMap.loading);
      elements.box && (elements.box.style.display = displayMap.box);
      elements.pagination && (elements.pagination.style.display = displayMap.pagination);
      elements.sidebar && (elements.sidebar.style.display = displayMap.sidebar);
      elements.sorting && (elements.sorting.style.display = displayMap.sorting);
      if (elements.main) {
        elements.main.classList.toggle("add_id", show);
      }
    }
    counterLoading(loading = true) {
      const counterContainer = this.container.querySelector(".talent-pool-counter");
      if (!counterContainer) return;
      const spinner = counterContainer.querySelector(".counter-loading");
      if (loading) {
        if (spinner) spinner.style.display = "block";
      } else {
        if (spinner) spinner.style.display = "none";
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
    createCloseButton(onClose = () => {
    }) {
      const button = document.createElement("button");
      button.classList.add("talent-pool-close-button");
      button.innerHTML = `<svg height="512px" id="Layer_1" style="enable-background:new 0 0 512 512;" version="1.1" viewBox="0 0 512 512" width="512px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M443.6,387.1L312.4,255.4l131.5-130c5.4-5.4,5.4-14.2,0-19.6l-37.4-37.6c-2.6-2.6-6.1-4-9.8-4c-3.7,0-7.2,1.5-9.8,4  L256,197.8L124.9,68.3c-2.6-2.6-6.1-4-9.8-4c-3.7,0-7.2,1.5-9.8,4L68,105.9c-5.4,5.4-5.4,14.2,0,19.6l131.5,130L68.4,387.1  c-2.6,2.6-4.1,6.1-4.1,9.8c0,3.7,1.4,7.2,4.1,9.8l37.4,37.6c2.7,2.7,6.2,4.1,9.8,4.1c3.5,0,7.1-1.3,9.8-4.1L256,313.1l130.7,131.1  c2.7,2.7,6.2,4.1,9.8,4.1c3.5,0,7.1-1.3,9.8-4.1l37.4-37.6c2.6-2.6,4.1-6.1,4.1-9.8C447.7,393.2,446.2,389.7,443.6,387.1z"></path></svg>`;
      button.addEventListener("click", () => {
        this.popupClose();
        onClose();
      });
      return button;
    }
  };
  window.TalentPool = TalentPool;
})();
