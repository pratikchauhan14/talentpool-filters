export default class Counter {
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
		const keys = ['t_procedure_txt', 'custom_talent_category', 't_experience_level', 't_desired_region_1', 't_desired_salary'];
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
			console.log(key);
			const activeValues = (prepared[key] || []).map(normalize);
			const localGroupCount = {};
			for (const talent of dataSource) {
				const raw = talent.properties[key];
				if (!raw) continue;
				const splitPattern = this.getSplitPattern(raw);
				const talentValues = raw.split(splitPattern).map(normalize).filter(Boolean);
				const fullValue = normalize(raw);
				for (const category of talentValues) {
					//simple category from nested groups
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
										subGroupConfig.values.some(val => normalize(val) === category)) {
										isSimpleCategory = true;
										break;
									}
								}
								if (isSimpleCategory) break;
							}
						}
					}
					// Use the existing normalize function from parent
					const normalizedCategory = this.normalize(category);

					if (isSimpleCategory) {
						// For simple categories
						if (!normalizedCategory.includes("_") && this.shouldCount(normalizedCategory, activeValues, fullValue)) {
							localGroupCount[normalizedCategory] = (localGroupCount[normalizedCategory] || 0) + 1;
						}
					} else if (this.shouldCount(normalizedCategory, activeValues, fullValue)) {
						localGroupCount[normalizedCategory] = (localGroupCount[normalizedCategory] || 0) + 1;
					}
				}
				if (!talentValues.includes(fullValue)) {
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
										subGroupConfig.values.some(val => normalize(val) === fullValue)) {
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
				checkboxes.forEach(checkbox => {
					const val = normalize(checkbox.value);
					if (!(val in localGroupCount)) localGroupCount[val] = 0;
				});
				activeValues.forEach(val => {
					if (!(val in localGroupCount)) localGroupCount[val] = 0;
				});
			}
			// nested group counting
			if (key === 'custom_talent_category' && this.sidebar.parent && this.sidebar.parent.custom_talent_category) {
				const customGroups = this.sidebar.parent.custom_talent_category.group;

				for (const groupKey in customGroups) {
					const groupConfig = customGroups[groupKey];
					if (groupConfig.type === 'group' && groupConfig.group) {
						// nested group
						for (const subGroupKey in groupConfig.group) {
							const subGroupConfig = groupConfig.group[subGroupKey];
							if (subGroupConfig.values) {
								subGroupConfig.values.forEach(value => {
									const normalizedValue = normalize(value);
									if (!(normalizedValue in localGroupCount)) {
										// Count occurrences for nested group values
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
							} else if (subGroupConfig.type === 'simple') {
								// nested simple category
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
		// Check if this is a simple category from nested groups
		let isSimpleCategory = false;
		if (this.sidebar?.parent?.custom_talent_category) {
			const customGroups = this.sidebar.parent.custom_talent_category.group;
			for (const groupKey in customGroups) {
				const groupConfig = customGroups[groupKey];
				if (groupConfig.type === 'group' && groupConfig.group) {
					for (const subGroupKey in groupConfig.group) {
						const subGroupConfig = groupConfig.group[subGroupKey];
						if (subGroupConfig.type === 'simple' &&
							subGroupConfig.values &&
							subGroupConfig.values.some(val => this.normalize(val) === category)) {
							isSimpleCategory = true;
							break;
						}
					}
					if (isSimpleCategory) break;
				}
			}
		}
		if (isSimpleCategory) {
			// For simple categories, only count exact matches
			return activeValues.length === 0 || activeValues.includes(category);
		}
		// For other categories, use the original logic
		return activeValues.length === 0 || activeValues.includes(category) || fullValue === category;
	}
	initUI() {
		this.totalCountElement = this.sidebar.sidebar.querySelector('.total-count');
		if (!this.totalCountElement) {
			console.error('Counter element not found in sidebar');
		}
	}
	update({ total = 0, groupCounts = {} }) {
		this.totalCountElement.textContent = `${total} ${this.labels.counterLabel}`;
		const allLabels = this.sidebar.sidebar.querySelectorAll('[data-counter-label]');
		allLabels.forEach(label => {
			const key = label.getAttribute('data-counter-label');
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
		const groups = this.sidebar.sidebar.querySelectorAll('.talent-pool-checkboxes');
		groups.forEach(group => {
			const checkboxes = group.querySelectorAll('[data-counter-label]');
			let hasVisible = false;
			checkboxes.forEach(label => {
				const match = label.textContent.match(/\((\d+)\)/);
				const count = match ? parseInt(match[1]) : 0;
				const labelWrapper = label.closest('.talent-pool-checkbox');
				if (!labelWrapper) return;
				labelWrapper.style.display = count === 0 ? 'none' : '';
				if (count > 0) hasVisible = true;
			});
			group.style.display = hasVisible ? '' : 'none';
		});
	}
	appendCounterToSidebar() {
		// console.log("[Counter] Appending counters to sidebar...");
		if (!this.sidebar?.sidebar) return;
		const checkboxes = this.sidebar.sidebar.querySelectorAll('input[type="checkbox"]');
		checkboxes.forEach(checkbox => {
			//console.log("Checkbox:", checkbox);
			const value = checkbox.value;
			const label = checkbox.nextElementSibling;
			 //console.log("Label:", label);
			if (!label) return;
			if (label.querySelector('.talent-pool-counter-label')) return;
			const countLabel = document.createElement("span");
			countLabel.setAttribute("data-counter-label", this.normalize(value));
			countLabel.classList.add("talent-pool-counter-label");
			label.appendChild(countLabel);
		});
		this.updateCounter();
		this.hideZeroLabelsOnLoad();
		// group category counts
		const normalize = this.normalize.bind(this);
		const keys = ['t_procedure_txt', 'custom_talent_category', 't_experience_level', 't_desired_region_1', 't_desired_salary'];
		const baseCounts = this.computeCounts(this.talentPool, keys, normalize);
		const flatCounts = {};
		for (const groupKey in baseCounts) {
			Object.assign(flatCounts, baseCounts[groupKey]);
		}
		this.updateGroupCategoryCounts(flatCounts);
		this.updateNestedGroupCounts(flatCounts);
		const allGroupContainers = this.sidebar.sidebar.querySelectorAll('.talent-pool-checkboxes');
		const hasActiveFilters = Object.values(this.storedValue || {}).some(val => {
			if (Array.isArray(val)) return val.length > 0;
			if (typeof val === 'object') return Object.values(val).some(arr => Array.isArray(arr) && arr.length > 0);
			return false;
		});
		allGroupContainers.forEach(container => {
			const checkboxes = container.querySelectorAll('.talent-pool-checkbox');
			let hasVisible = false;
			checkboxes.forEach(box => {
				const label = box.querySelector('[data-counter-label]');
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
		const parentCheckboxes = document.querySelectorAll('.talent-pool-checkbox-input');
		parentCheckboxes.forEach(parentCheckbox => {
			const parentLabel = parentCheckbox.nextElementSibling;
			const container = parentCheckbox.closest('.talent-pool-checkboxes');
			const dropdown = container?.querySelector('.dropdown-container');
			if (!dropdown) return;
			let total = 0;
			const childCheckboxes = dropdown.querySelectorAll('input[type="checkbox"]');
			childCheckboxes.forEach(child => {
				const value = this.normalize(child.value);
				total += filterCounts[value] || 0;
			});
			const counterSpan = parentLabel.querySelector('.talent-pool-counter-label');
			if (counterSpan) {
				counterSpan.textContent = ` (${total})`;
			}
		});
	}
	updateNestedGroupCounts(filterCounts = {}) {
		// nested groups 
		if (this.sidebar.parent && this.sidebar.parent.custom_talent_category) {
			const customGroups = this.sidebar.parent.custom_talent_category.group;
			for (const groupKey in customGroups) {
				const groupConfig = customGroups[groupKey];
				if (groupConfig.type === 'group' && groupConfig.group) {
					// Update main group counter
					const mainGroupCheckbox = document.getElementById(`talent-pool-custom_talent_category-${groupKey}`);
					if (mainGroupCheckbox) {
						const mainGroupLabel = mainGroupCheckbox.nextElementSibling;
						let totalGroupCount = 0;
						// Calculate total count for all subgroups
						for (const subGroupKey in groupConfig.group) {
							const subGroupConfig = groupConfig.group[subGroupKey];
							let subGroupTotal = 0;

							if (subGroupConfig.values) {
								subGroupConfig.values.forEach(value => {
									const normalizedValue = this.normalize(value);
									subGroupTotal += filterCounts[normalizedValue] || 0;
								});
							} else if (subGroupConfig.type === 'simple') {
								const normalizedValue = this.normalize(subGroupKey);
								subGroupTotal += filterCounts[normalizedValue] || 0;
							}
							totalGroupCount += subGroupTotal;
							// Update subgroup counter
							const subGroupCheckbox = document.getElementById(`talent-pool-custom_talent_category-${groupKey}-${subGroupKey}`);
							if (subGroupCheckbox) {
								const subGroupLabel = subGroupCheckbox.nextElementSibling;
								const subGroupCounterSpan = subGroupLabel.querySelector('.talent-pool-counter-label');
								if (subGroupCounterSpan) {
									subGroupCounterSpan.textContent = ` (${subGroupTotal})`;
								}
							}
							// Update individual value counters within subgroups
							if (subGroupConfig.values && subGroupConfig.type !== 'simple') {
								subGroupConfig.values.forEach(value => {
									const normalizedValue = this.normalize(value);
									const valueCheckbox = document.querySelector(`input[value="${value}"]`);
									if (valueCheckbox) {
										const valueLabel = valueCheckbox.nextElementSibling;
										const valueCounterSpan = valueLabel?.querySelector('.talent-pool-counter-label');
										if (valueCounterSpan) {
											valueCounterSpan.textContent = ` (${filterCounts[normalizedValue] || 0})`;
										}
									}
								});
							}
						}
						if (this.sidebar.updateParentGroupCounter) {
							this.sidebar.updateParentGroupCounter('custom_talent_category', groupKey);
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
	reset(){
		this.appendCounterToSidebar();
	}
}
