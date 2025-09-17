import Counter from "./counter.js";
import dataSort from "./sorting.js";
export default class Filter {
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
            currentPage: 1,
        });
        this.paginationUI();
        this.sidebar.on("onChange", (storedValue) => {
            this.storedValue = storedValue;
            this.applyFilters();
        });
        // Delay search input setup to ensure DOM is ready
        setTimeout(() => {
            this.setupSearchInput();
        }, 2);
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
        
        // Re-create search input if it was removed
        setTimeout(() => {
            if (!document.getElementById("search")) {
                this.setupSearchInput();
            }
        }, 1);
    }
    prepareFilterValues(filters) {
        const prepared = {};
        const regionFields = ['t_desired_region_1', 't_desired_region_2', 't_desired_region_3'];
        const combinedRegionKey = 't_desired_region_1,t_desired_region_2,t_desired_region_3';
        
        // First, handle the combined region key if it exists
        if (filters[combinedRegionKey] && Array.isArray(filters[combinedRegionKey])) {
            prepared[combinedRegionKey] = [...filters[combinedRegionKey]];
        }
        
        // Then process all other filters
        for (const key in filters) {
            if (key === 't_desired_salary' || key === combinedRegionKey) {
                continue; 
            }
            
            const value = filters[key];
            
            // Handle regular filters
            if (Array.isArray(value)) {
                prepared[key] = [...value];
            } 
            // Handle nested category objects
            else if (typeof value === 'object' && value !== null) {
                const flatValues = [];
                const processNested = (obj) => {
                    if (Array.isArray(obj)) {
                        flatValues.push(...obj);
                    } else if (obj && typeof obj === 'object') {
                        Object.values(obj).forEach(processNested);
                    }
                };
                processNested(value);
                prepared[key] = flatValues;
            } 
            // Handle regular arrays and other values
            else {
                prepared[key] = Array.isArray(value) 
                    ? [...value] 
                    : value ? [value] : [];
            }
        }
        return prepared;
    }
    applySalaryFilter(data, salaryRange) {
        if (!salaryRange || salaryRange.minValue === undefined || salaryRange.maxValue === undefined) {
            return data;
        }
        return data.filter(item => {
            const salary = Number(item.properties?.t_desired_salary);
            return isNaN(salary) || (salary >= salaryRange.minValue && salary <= salaryRange.maxValue);
        });
    }
    applyFilters() {
        const filters = this.storedValue;
        console.log("filters",filters);
        if (!filters || typeof filters !== 'object') {
            this.filteredData = this.talentPool;
            return;
        }
        let currentData = [...this.talentPool];
        // Apply salary filter
        if (this.storedValue.t_desired_salary) {
            currentData = this.applySalaryFilter(currentData, this.storedValue.t_desired_salary);
        }
        const prepared = this.prepareFilterValues(filters);
        const seen = new Set();
        const matched = [];
        // Check if there are any other filters to apply
        const hasOtherFilters = Object.values(prepared).some(arr => Array.isArray(arr) && arr.length > 0);
        if (!hasOtherFilters) {
            // If no other filters, use the salary-filtered data
            this.filteredData = currentData;
        } else {
            for (const key in prepared) {
                const values = prepared[key].map(this.normalize);
                values.forEach(itemValue => {
                    currentData.forEach(talent => {
                        let raw = '';
                        
                        // Handle combined region fields
                        if (key === 't_desired_region_1,t_desired_region_2,t_desired_region_3') {
                            const regionValues = new Set();
                            ['t_desired_region_1', 't_desired_region_2', 't_desired_region_3'].forEach(regionKey => {
                                const regionValue = talent.properties[regionKey];
                                if (regionValue) {
                                    regionValue.split(/[,\s]+/)
                                        .map(v => v.trim())
                                        .filter(Boolean)
                                        .forEach(val => regionValues.add(this.normalize(val)));
                                }
                            });
                            raw = Array.from(regionValues).join(',');
                        } else {
                            // Handle other fields normally
                            raw = talent.properties[key] || '';
                        }
                        if (!raw) return;
                        const splitPattern = this.getSplitPattern(raw);
                        const talentValues = [...new Set(
                            raw.split(splitPattern)
                                .map(val => this.normalize(val))
                                .filter(Boolean)
                        )];
                        const fullValue = this.normalize(raw);
                        let isMatch = false;
                        // Check if this is a simple category from nested groups
                        let isSimpleCategory = false;
                        if (key === 'custom_talent_category' && this.sidebar?.parent?.custom_talent_category) {
                            const customGroups = this.sidebar.parent.custom_talent_category.group;
                            for (const groupKey in customGroups) {
                                const groupConfig = customGroups[groupKey];
                                if (groupConfig.type === 'group' && groupConfig.group) {
                                    for (const subGroupKey in groupConfig.group) {
                                        const subGroupConfig = groupConfig.group[subGroupKey];
                                        if (subGroupConfig.type === 'simple' &&
                                            subGroupConfig.values &&
                                            subGroupConfig.values.some(val => this.normalize(val) === itemValue)) {
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
                                isMatch = talentValues.some(val => {
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
        console.log(this.filteredData);
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
                    <span class="maincategory"><div>${t_maincategory}</div></span>
                </div>
                <div class="talent_box_inner_content">
                    <div class="talent_box_inner_left">
                        <span><b>Experience Level:</b> ${t_experience_level}</span>
                        <span><b>City:</b> ${t_city}</span>
                        <span><b>Salary:</b> ${this.formateCurrency(t_desired_salary, '₹ Per Month')}</span>
                    </div>
                    <div class="talent_box_btn">
                       <a target="_blank" class="btn btn:secondary" href="${talentUrl}">Learn More</a>
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
        this.filteredData.slice(start, end).forEach(item => this.renderCard(item));
    }
    getTotalPages() {
        return Math.ceil(this.filteredData.length / this.itemsPerPageShow);
    }
    renderPaginationControls() {
        const totalPages = this.getTotalPages();
        const currentPage = this.currentPage;
        const pagination = this.paginationControls;
        pagination.innerHTML = "";
        
        // Hide pagination if there are no results
        if (this.filteredData.length === 0) {
            pagination.style.display = "none";
            return;
        }
        // Show pagination if there are results
        pagination.style.display = "block";
        
        const createBtn = (text, disabled, onClick, className = "") => {
            const btn = this.createElement("button", className, pagination);
            btn.textContent = text;
            btn.disabled = disabled;
            btn.onclick = onClick;
        };
        // createBtn(`‹ ${this.labels.prevLabel}`, currentPage === 1, () => {
        //     this.currentPage--;
        //     this.render();
        // });
        if (currentPage > 1) {
            createBtn(`‹ ${this.labels.prevLabel}`, false, () => {
                this.currentPage--;
                this.render();
            });
        }
        
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
            this.createElement("span", "ellipsis", pagination).textContent = "…";
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
            this.createElement("span", "ellipsis", pagination).textContent = "…";
        }
        // createBtn(`${this.labels.nextLabel} ›`, currentPage === totalPages, () => {
        //     this.currentPage++;
        //     this.render();
        // });
        if (currentPage < totalPages) {
            createBtn(`${this.labels.nextLabel} ›`, false, () => {
                this.currentPage++;
                this.render();
            });
        }
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
        const keys = ['t_procedure_txt', 'custom_talent_category', 't_experience_level', 't_desired_region_1', 't_desired_region_2', 't_desired_region_3'];
        if (!normalizedSearch) {
            this.filteredData = this.talentPool;
        } 
        // else {
        //     this.filteredData = this.talentPool.filter(talent => {
        //         return keys.some(key => {
        //             const raw = talent.properties[key];
        //             if (!raw) return false;
        //             const splitPattern = this.getSplitPattern(raw);
        //             const values = raw.split(splitPattern).map(val => this.normalize(val));
        //             return values.some(val => val.includes(normalizedSearch));
        //         });
        //     });
        // }
        else {
            this.filteredData = this.talentPool.filter(talent => {
                return keys.some(key => {
                    let raw = talent.properties[key];
                    // For region fields, combine all region values
                    if (key.startsWith('t_desired_region_')) {
                        const regionValues = [];
                        for (let i = 1; i <= 3; i++) {
                            const regionKey = `t_desired_region_${i}`;
                            if (talent.properties[regionKey]) {
                                regionValues.push(talent.properties[regionKey]);
                            }
                        }
                        raw = regionValues.join(',');
                    }
                    if (!raw) return false;
                    const splitPattern = this.getSplitPattern(raw);
                    const values = raw.split(splitPattern).map(val => this.normalize(val));
                    return values.some(val => val.includes(normalizedSearch));
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
            return function (...args) {
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
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            //remove class indeterminate when search is applied
            const indeterminateCheckboxes = document.querySelectorAll('.talent-pool-filter-sidebar input[type="checkbox"].indeterminate');
            indeterminateCheckboxes.forEach(checkbox => {
                checkbox.classList.remove("indeterminate");
                checkbox.indeterminate = false;
            });
            this.applySearch(searchTerm);
        }, 3);
        searchInput.addEventListener("input", handleSearch);
        const filterSidebar = document.querySelector(".talent-pool-filter-sidebar");
        filterSidebar.addEventListener("change", (e) => {
            if (e.target.type === "checkbox") {
                searchInput.value = "";
            }
        });
        const addDataButton = document.getElementById("add-data");
        // addDataButton.addEventListener("click", () => {
        //     searchInput.value = ""; // Clear search input
        // });
    }
    reset(){
        this.updateData(this.talentPool);
        this.render();
         const searchInput = document.getElementById("search");
         searchInput.value = "";
    }
}