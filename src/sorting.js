export default class dataSort {
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

        // Update original order when data changes
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
            // If the select doesn't exist yet, wait and try again
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
                // Default sorting should be ascending
                // data = [...this.filter.filteredData].sort((a, b) => {
                //     const aSalary = parseFloat(a.properties.t_desired_salary) || 0;
                //     const bSalary = parseFloat(b.properties.t_desired_salary) || 0;
                //     return aSalary - bSalary;
                // });
                data = [...this.originalOrder];
        }
        this.filter.filteredData = data;
        this.filter.currentPage = 1;
        this.filter.currentChunk = 0;
        this.filter.render();
    }

    SortingUI() {
        const talentPoolFilterRightContent = document.querySelector(".talent-pool-filter-right-content");
        // If the element doesn't exist yet, wait and try again
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
            { value: "desc", label: "Salary Descending" },
        ];
        sortingOptions.forEach((option) => {
            const opt = document.createElement("option");
            opt.value = option.value;
            opt.textContent = option.label;
            selectSort.appendChild(opt);
        });
        sortingContainer.appendChild(selectSort);

        // Append to the end instead of inserting as first child
        talentPoolFilterRightContent.insertBefore(sortingContainer, talentPoolFilterRightContent.children[1]);
    }
    reset() {
        const sortingSelect = document.querySelector('#talent-pool-sort-select');
        if (sortingSelect) {
            sortingSelect.value = 'default';
            this.currentSortValue = "default";
             this.applySorting();
        }
    }
}
