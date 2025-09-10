export default class RangeSlider {
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
        // const start = `${(this.minValue - this.options.min) / (this.options.max - this.options.min) * 100}%`;
        // const end = `${(this.options.max - this.maxValue) / (this.options.max - this.options.min) * 100}%`;
        // console.log("start", start, "end", end);
        // this.progress.style.left = start;
        // this.progress.style.right = end;


        // this.tooltipMin.style.left = start;
        // this.tooltipMax.style.right = end;

        // const formattedMinValue = this.options.formateCurrency ? this.options.formateCurrency(this.minValue) : `${this.minValue}₹`;
        // const formattedMaxValue = this.options.formateCurrency ? this.options.formateCurrency(this.maxValue) : `${this.maxValue}₹`;

        // this.tooltipMin.innerText = formattedMinValue;
        // this.tooltipMax.innerText = formattedMaxValue;

        const range = this.options.max - this.options.min;
        const startPercent = ((this.minValue - this.options.min) / range) * 100;
        const endPercent = ((this.maxValue - this.options.min) / range) * 100;
        // Update progress bar
        this.progress.style.left = `${startPercent}%`;
        this.progress.style.right = `${100 - endPercent}%`;
        // Update tooltips
        this.tooltipMin.style.left = `${startPercent}%`;
        this.tooltipMax.style.left = `${endPercent}%`;
        const formattedMinValue = this.options.formateCurrency ? this.options.formateCurrency(this.minValue) : `${this.minValue}₹`;
        const formattedMaxValue = this.options.formateCurrency ? this.options.formateCurrency(this.maxValue) : `${this.maxValue}₹`;
        this.tooltipMin.innerText = formattedMinValue;
        this.tooltipMax.innerText = formattedMaxValue;
        this.tooltipMin.style.transform = 'translateX(-50%)';
        this.tooltipMax.style.transform = 'translateX(-50%)';
        // overlap
        const overlapThreshold = 5;
        const distance = Math.abs(startPercent - endPercent);
        if (distance <= overlapThreshold) {
            this.tooltipMin.style.top = "-60px";
            this.tooltipMax.style.top = "-35px";
        } else {
            this.tooltipMin.style.top = "-35px";
            this.tooltipMax.style.top = "-35px";
        }
        // Optional z-index swap
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
        /* Slider Container */
        const sliderContainer = document.createElement("div");
        sliderContainer.classList.add("slider");
        const progress = document.createElement("div");
        progress.classList.add("progress");
        this.minValue = this.options.defaultMin;
        this.maxValue = this.options.defaultMax;
        sliderContainer.appendChild(progress);
        container.appendChild(sliderContainer);
        this.progress = progress;
        /* range label  */
        const rangeLabel = document.createElement("div");
        rangeLabel.classList.add("range-label");
        const formattedMin = this.options.formateCurrency ? this.options.formateCurrency(this.options.min) : `${this.options.min}₹`;
        const formattedMax = this.options.formateCurrency ? this.options.formateCurrency(this.options.max) : `${this.options.max}₹`;
        rangeLabel.innerHTML = `<span class="min">${formattedMin}</span> - <span class="max">${formattedMax}</span>`;
        container.appendChild(rangeLabel);
        /* tooltip wrapper */
        const tooltipWrapper = document.createElement("div");
        tooltipWrapper.classList.add("tooltip-wrapper");
        const tooltipMin = document.createElement("span");
        tooltipMin.classList.add("tooltip-min");
        const formattedDefaultMin = this.options.formateCurrency ? this.options.formateCurrency(this.options.defaultMin) : `${this.options.defaultMin}₹`;
        tooltipMin.innerText = formattedDefaultMin;
        tooltipWrapper.appendChild(tooltipMin);
        this.tooltipMin = tooltipMin;
        const tooltipMax = document.createElement("span");
        tooltipMax.classList.add("tooltip-max");
        const formattedDefaultMax = this.options.formateCurrency ? this.options.formateCurrency(this.options.defaultMax) : `${this.options.defaultMax}₹`;
        tooltipMax.innerText = formattedDefaultMax;
        tooltipWrapper.appendChild(tooltipMax);
        this.tooltipMax = tooltipMax;
        container.appendChild(tooltipWrapper);
        /* MinMax Inputs */
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
            if ((newValue + this.options.gap) <= this.maxValue) {
                this.minValue = newValue;
                this.progressUpdate();
            } else {
                event.target.value = this.minValue;
            }
        } else if (type === "max") {
            const newValue = parseInt(event.target.value, 10);
            if ((newValue - this.options.gap) >= this.minValue) {
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
        const format = this.options.formateCurrency || (val => `${val}₹`);
        if (this.tooltipMin) this.tooltipMin.innerText = format(this.minValue);
        if (this.tooltipMax) this.tooltipMax.innerText = format(this.maxValue);
        // Only call progressUpdate if all required elements are available
        if (this.progress && this.tooltipMin && this.tooltipMax) {
            this.progressUpdate();
        }
        this.emit("change", this.getValue());
    }
}