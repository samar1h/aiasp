document.addEventListener("DOMContentLoaded", () => {
    const counterContainer = document.getElementById("counterContainer");
    const addCounterButton = document.getElementById("addCounter");
    const resetButton = document.getElementById("resetButton");
    const totalValue = document.getElementById("totalValue");
    const counterCount = document.getElementById("counterCount");
    const averageValue = document.getElementById("averageValue");
    const searchInput = document.getElementById("searchInput");
    
    let counters = loadState();
    
    function generateId() {
        return Math.random().toString(36).substring(2, 10);
    }
    
    function loadState() {
        try {
            const saved = localStorage.getItem("counters");
            return saved ? JSON.parse(saved) : [{ id: generateId(), name: "New Counter", value: 0 }];
        } catch (e) {
            return [{ id: generateId(), name: "New Counter", value: 0 }];
        }
    }

    function saveState() {
        try {
            localStorage.setItem("counters", JSON.stringify(counters));
        } catch (e) {
        }
    }

    function updateStats() {
        let total = 0;
        const count = counters.length;
        
        for (let i = 0; i < count; i++) {
            total += counters[i].value;
        }
        
        totalValue.textContent = total;
        counterCount.textContent = count;
        averageValue.textContent = count > 0 ? Math.round((total / count) * 10) / 10 : 0;
    }

    function renderCounters(filterTerm = "") {
        counterContainer.innerHTML = "";
        
        let filteredIds = [];
        const searchLower = filterTerm.toLowerCase();
        
        if (filterTerm) {
            for (let i = 0; i < counters.length; i++) {
                if (counters[i].name.toLowerCase().includes(searchLower)) {
                    filteredIds.push(counters[i].id);
                }
            }
        } else {
            filteredIds = counters.map(c => c.id);
        }
        
        if (filteredIds.length === 0 && filterTerm) {
            const noResults = document.createElement("div");
            noResults.className = "no-results";
            noResults.textContent = `No counters found matching "${filterTerm}"`;
            counterContainer.appendChild(noResults);
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < filteredIds.length; i++) {
            const counterId = filteredIds[i];
            const counter = counters.find(c => c.id === counterId);
            
            if (!counter) continue;
            
            const counterDiv = document.createElement("div");
            counterDiv.className = "counter";
            counterDiv.id = `counter-${counter.id}`;
            
            const nameInput = document.createElement("input");
            nameInput.className = "counter-name";
            nameInput.value = counter.name;
            nameInput.addEventListener("change", () => {
                const index = counters.findIndex(c => c.id === counter.id);
                if (index !== -1) {
                    counters[index].name = nameInput.value;
                    saveState();
                }
            });
            
            const controls = document.createElement("div");
            controls.className = "counter-controls";
            
            const mainControls = document.createElement("div");
            mainControls.className = "control-group";
            
            const decreaseBtn = document.createElement("button");
            decreaseBtn.className = "counter-btn decrement tooltip";
            decreaseBtn.setAttribute("data-tooltip", "Decrease");
            decreaseBtn.textContent = "-";
            decreaseBtn.addEventListener("click", () => {
                const index = counters.findIndex(c => c.id === counter.id);
                if (index !== -1) {
                    counters[index].value--;
                    valueInput.value = counters[index].value;
                    updateStats();
                    saveState();
                }
            });
            
            const valueInput = document.createElement("input");
            valueInput.className = "counter-value";
            valueInput.type = "number";
            valueInput.inputMode = "numeric";
            valueInput.value = counter.value;
            valueInput.addEventListener("change", () => {
                const index = counters.findIndex(c => c.id === counter.id);
                if (index !== -1) {
                    counters[index].value = parseInt(valueInput.value) || 0;
                    updateStats();
                    saveState();
                }
            });
            
            const increaseBtn = document.createElement("button");
            increaseBtn.className = "counter-btn tooltip";
            increaseBtn.setAttribute("data-tooltip", "Increase");
            increaseBtn.textContent = "+";
            increaseBtn.addEventListener("click", () => {
                const index = counters.findIndex(c => c.id === counter.id);
                if (index !== -1) {
                    counters[index].value++;
                    valueInput.value = counters[index].value;
                    updateStats();
                    saveState();
                }
            });
            
            const actionControls = document.createElement("div");
            actionControls.className = "control-group";
            
            const resetBtn = document.createElement("button");
            resetBtn.className = "reset-btn tooltip";
            resetBtn.setAttribute("data-tooltip", "Reset");
            resetBtn.textContent = "↺";
            resetBtn.addEventListener("click", () => {
                const index = counters.findIndex(c => c.id === counter.id);
                if (index !== -1) {
                    counters[index].value = 0;
                    valueInput.value = 0;
                    updateStats();
                    saveState();
                }
            });
            
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-btn tooltip";
            deleteBtn.setAttribute("data-tooltip", "Delete");
            deleteBtn.textContent = "×";
            deleteBtn.addEventListener("click", () => {
                counters = counters.filter(c => c.id !== counter.id);
                if (counters.length === 0) {
                    counters.push({ id: generateId(), name: "New Counter", value: 0 });
                }
                updateStats();
                saveState();
                renderCounters(searchInput.value);
            });
            
            mainControls.append(decreaseBtn, valueInput, increaseBtn);
            actionControls.append(resetBtn, deleteBtn);
            controls.append(mainControls, actionControls);
            counterDiv.append(nameInput, controls);
            
            fragment.appendChild(counterDiv);
        }
        
        counterContainer.appendChild(fragment);
        updateStats();
    }

    addCounterButton.addEventListener("click", () => {
        counters.push({ id: generateId(), name: "New Counter", value: 0 });
        saveState();
        renderCounters(searchInput.value);
    });
    
    resetButton.addEventListener("click", () => {
        const shouldReset = confirm("Reset all counters?");
        if (shouldReset) {
            counters = [{ id: generateId(), name: "New Counter", value: 0 }];
            saveState();
            renderCounters();
        }
    });
    
    let searchTimeout;
    searchInput.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            renderCounters(e.target.value);
        }, 300);
    });
    
    const passiveOptions = { passive: true };
    document.addEventListener('touchstart', () => {}, passiveOptions);
    document.addEventListener('touchmove', () => {}, passiveOptions);
    
    document.addEventListener('dblclick', (e) => {
        e.preventDefault();
    }, { passive: false });

    renderCounters();
});
