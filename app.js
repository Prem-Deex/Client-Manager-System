const STORAGE_KEY = 'clientManagerData';
let currentClientId = null;
let currentWorkerId = null;
function getClients() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
}


function saveClients(clients) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

function getClient(clientId) {
    const clients = getClients();
    return clients[clientId] || null;
}


function initializeClient(name, rate, area, totalAmount) {
    return {
        id: Date.now().toString(),
        name: name,
        rate: parseFloat(rate),
        area: parseFloat(area),
        totalAmount: parseFloat(totalAmount),
        createdAt: new Date().toISOString(),
        payments: [],
        workers: [],
        history: [{
            date: new Date().toISOString(),
            type: 'client_created',
            message: `Client "${name}" created with total amount ₹${totalAmount.toFixed(2)}`
        }]
    };
}


function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.getAttribute('data-section');
            showSection(section);
        });
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        showSection('new');
        currentClientId = null;
    });
}

function showSection(sectionName) {

    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });


    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });


    if (sectionName === 'new') {
        document.getElementById('new-section').classList.add('active');
        document.querySelector('[data-section="new"]').classList.add('active');
        loadClientsList();
    } else if (sectionName === 'history') {
        document.getElementById('history-section').classList.add('active');
        document.querySelector('[data-section="history"]').classList.add('active');
        loadHistory();
    }
}

function initClientForm() {
    const form = document.getElementById('client-form');
    const rateInput = document.getElementById('rate');
    const areaInput = document.getElementById('area');
    const totalAmountDisplay = document.getElementById('total-amount');


    function calculateTotal() {
        const rate = parseFloat(rateInput.value) || 0;
        const area = parseFloat(areaInput.value) || 0;
        const total = rate * area;
        totalAmountDisplay.textContent = total.toFixed(2);
    }

    rateInput.addEventListener('input', calculateTotal);
    areaInput.addEventListener('input', calculateTotal);

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('client-name').value.trim();
        const rate = parseFloat(rateInput.value);
        const area = parseFloat(areaInput.value);
        const totalAmount = rate * area;

        if (!name || rate <= 0 || area <= 0) {
            alert('Please fill all fields with valid values');
            return;
        }

        const client = initializeClient(name, rate, area, totalAmount);
        const clients = getClients();
        clients[client.id] = client;
        saveClients(clients);

        
        form.reset();
        totalAmountDisplay.textContent = '0.00';

        
        currentClientId = client.id;
        showClientDetail(client.id);
    });
}

function loadClientsList() {
    const clients = getClients();
    const clientsList = document.getElementById('clients-list');
    
    if (Object.keys(clients).length === 0) {
        clientsList.innerHTML = '<p style="color: #999; padding: 20px;">No clients yet. Create your first client above!</p>';
        return;
    }

    clientsList.innerHTML = Object.values(clients).map(client => {
        const totalPaid = client.payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = client.totalAmount - totalPaid;
        
        return `
            <div class="client-card" onclick="showClientDetail('${client.id}')">
                <h4>${escapeHtml(client.name)}</h4>
                <p><strong>Total:</strong> ₹${client.totalAmount.toFixed(2)}</p>
                <p><strong>Paid:</strong> ₹${totalPaid.toFixed(2)}</p>
                <p><strong>Due:</strong> ₹${remaining.toFixed(2)}</p>
            </div>
        `;
    }).join('');
}

function showClientDetail(clientId) {
    currentClientId = clientId;
    const client = getClient(clientId);
    
    if (!client) {
        alert('Client not found');
        return;
    }


    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('client-detail-section').classList.add('active');
    document.getElementById('detail-client-name').textContent = escapeHtml(client.name);
    document.getElementById('detail-rate').textContent = client.rate.toFixed(2);
    document.getElementById('detail-area').textContent = client.area.toFixed(2);
    document.getElementById('detail-total-amount').textContent = client.totalAmount.toFixed(2);
    document.getElementById('client-detail-title').textContent = `Client: ${escapeHtml(client.name)}`;


    const now = new Date();
    const dateTimeStr = now.toISOString().slice(0, 16);
    document.getElementById('payment-date').value = dateTimeStr;


    loadClientPayments();
    loadWorkers();
    updateCashFlow();
}

function initClientPaymentForm() {
    const form = document.getElementById('client-payment-form');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!currentClientId) return;

        const amount = parseFloat(document.getElementById('payment-amount').value);
        const dateTime = document.getElementById('payment-date').value;

        if (amount <= 0) {
            alert('Payment amount must be greater than 0');
            return;
        }

        const client = getClient(currentClientId);
        if (!client) return;

        const payment = {
            id: Date.now().toString(),
            amount: amount,
            date: new Date(dateTime).toISOString()
        };

        client.payments.push(payment);
        
        const totalPaid = client.payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = client.totalAmount - totalPaid;
        client.history.push({
            date: payment.date,
            type: 'client_payment',
            amount: amount,
            totalPaid: totalPaid,
            remaining: remaining,
            message: `Client paid ₹${amount.toFixed(2)}. Total paid: ₹${totalPaid.toFixed(2)}, Due: ₹${remaining.toFixed(2)}`
        });

        const clients = getClients();
        clients[currentClientId] = client;
        saveClients(clients);

        form.reset();
        const now = new Date();
        document.getElementById('payment-date').value = now.toISOString().slice(0, 16);

       
        loadClientPayments();
        updateCashFlow();
        updateHistory();
    });
}

function loadClientPayments() {
    if (!currentClientId) return;

    const client = getClient(currentClientId);
    if (!client) return;

    const totalPaid = client.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, client.totalAmount - totalPaid);

    document.getElementById('total-paid').textContent = totalPaid.toFixed(2);
    document.getElementById('remaining-due').textContent = remaining.toFixed(2);

    const tableBody = document.getElementById('client-payments-table');
    
    if (client.payments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #999;">No payments recorded yet</td></tr>';
        return;
    }

    tableBody.innerHTML = client.payments
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(payment => {
            const date = new Date(payment.date);
            return `
                <tr>
                    <td>${formatDateTime(date)}</td>
                    <td>₹${payment.amount.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="deleteClientPayment('${payment.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
}

function deleteClientPayment(paymentId) {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    const client = getClient(currentClientId);
    if (!client) return;

    client.payments = client.payments.filter(p => p.id !== paymentId);
    

    client.history = client.history.filter(h => 
        !(h.type === 'client_payment' && h.amount === client.payments.find(p => p.id === paymentId)?.amount)
    );

    const clients = getClients();
    clients[currentClientId] = client;
    saveClients(clients);

    loadClientPayments();
    updateCashFlow();
}

function initWorkerForm() {
    const form = document.getElementById('worker-form');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!currentClientId) return;

        const name = document.getElementById('worker-name').value.trim();
        const totalPay = parseFloat(document.getElementById('worker-total-pay').value);

        if (!name || totalPay <= 0) {
            alert('Please fill all fields with valid values');
            return;
        }

        const client = getClient(currentClientId);
        if (!client) return;

        const worker = {
            id: Date.now().toString(),
            name: name,
            totalPay: totalPay,
            payments: []
        };

        client.workers.push(worker);
        
     
        client.history.push({
            date: new Date().toISOString(),
            type: 'worker_added',
            workerName: name,
            totalPay: totalPay,
            message: `Worker "${name}" added with total pay ₹${totalPay.toFixed(2)}`
        });

        const clients = getClients();
        clients[currentClientId] = client;
        saveClients(clients);    
        form.reset();
        loadWorkers();
    });
}

function loadWorkers() {
    if (!currentClientId) return;

    const client = getClient(currentClientId);
    if (!client) return;

    const workersList = document.getElementById('workers-list');
    
    if (client.workers.length === 0) {
        workersList.innerHTML = '<p style="color: #999; padding: 20px;">No workers added yet. Add a worker above!</p>';
        updateCashFlow();
        return;
    }

    workersList.innerHTML = client.workers.map(worker => {
        const totalPaid = worker.payments.reduce((sum, p) => sum + p.amount, 0);
        const due = Math.max(0, worker.totalPay - totalPaid);
        const advance = totalPaid > worker.totalPay ? totalPaid - worker.totalPay : 0;

        return `
            <div class="worker-card">
                <div class="worker-header">
                    <h4>${escapeHtml(worker.name)}</h4>
                    <div>
                        <button class="btn btn-primary btn-sm" onclick="openWorkerPaymentModal('${worker.id}')">Add Payment</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteWorker('${worker.id}')">Delete</button>
                    </div>
                </div>
                <div class="worker-summary">
                    <div><strong>Total Pay:</strong> ₹${worker.totalPay.toFixed(2)}</div>
                    <div class="paid"><strong>Paid:</strong> ₹${totalPaid.toFixed(2)}</div>
                    ${due > 0 ? `<div class="due"><strong>Due:</strong> ₹${due.toFixed(2)}</div>` : ''}
                    ${advance > 0 ? `<div class="advance"><strong>Advance:</strong> ₹${advance.toFixed(2)}</div>` : ''}
                    ${due === 0 && advance === 0 ? '<div class="paid"><strong>Status:</strong> Cleared</div>' : ''}
                </div>
                <div class="payments-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Amount (₹)</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${worker.payments.length === 0 
                                ? '<tr><td colspan="3" style="text-align: center; color: #999;">No payments recorded</td></tr>'
                                : worker.payments
                                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                                    .map(p => `
                                        <tr>
                                            <td>${formatDateTime(new Date(p.date))}</td>
                                            <td>₹${p.amount.toFixed(2)}</td>
                                            <td>
                                                <button class="btn btn-danger btn-sm" onclick="deleteWorkerPayment('${worker.id}', '${p.id}')">Delete</button>
                                            </td>
                                        </tr>
                                    `).join('')
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }).join('');

    updateCashFlow();
}

function openWorkerPaymentModal(workerId) {
    currentWorkerId = workerId;
    const client = getClient(currentClientId);
    if (!client) return;

    const worker = client.workers.find(w => w.id === workerId);
    if (!worker) return;

    document.getElementById('modal-worker-name').textContent = escapeHtml(worker.name);
    
    const now = new Date();
    document.getElementById('worker-payment-date').value = now.toISOString().slice(0, 16);


    updateWorkerModalSummary(worker);

    document.getElementById('worker-payment-modal').classList.add('active');
}

function updateWorkerModalSummary(worker) {
    const totalPaid = worker.payments.reduce((sum, p) => sum + p.amount, 0);
    const due = Math.max(0, worker.totalPay - totalPaid);
    const advance = totalPaid > worker.totalPay ? totalPaid - worker.totalPay : 0;

    document.getElementById('modal-worker-summary').innerHTML = `
        <div class="worker-summary">
            <div><strong>Total Pay:</strong> ₹${worker.totalPay.toFixed(2)}</div>
            <div class="paid"><strong>Paid:</strong> ₹${totalPaid.toFixed(2)}</div>
            ${due > 0 ? `<div class="due"><strong>Due:</strong> ₹${due.toFixed(2)}</div>` : ''}
            ${advance > 0 ? `<div class="advance"><strong>Advance:</strong> ₹${advance.toFixed(2)}</div>` : ''}
        </div>
    `;
}

function initWorkerPaymentForm() {
    const form = document.getElementById('worker-payment-form');
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!currentClientId || !currentWorkerId) return;

        const amount = parseFloat(document.getElementById('worker-payment-amount').value);
        const dateTime = document.getElementById('worker-payment-date').value;

        if (amount <= 0) {
            alert('Payment amount must be greater than 0');
            return;
        }

        const client = getClient(currentClientId);
        if (!client) return;

        const worker = client.workers.find(w => w.id === currentWorkerId);
        if (!worker) return;

        const payment = {
            id: Date.now().toString(),
            amount: amount,
            date: new Date(dateTime).toISOString()
        };

        worker.payments.push(payment);
        
        const totalPaid = worker.payments.reduce((sum, p) => sum + p.amount, 0);
        const due = Math.max(0, worker.totalPay - totalPaid);
        const advance = totalPaid > worker.totalPay ? totalPaid - worker.totalPay : 0;
        
        client.history.push({
            date: payment.date,
            type: 'worker_payment',
            workerName: worker.name,
            amount: amount,
            totalPaid: totalPaid,
            due: due,
            advance: advance,
            message: `Paid ₹${amount.toFixed(2)} to worker "${worker.name}". Total paid: ₹${totalPaid.toFixed(2)}${due > 0 ? `, Due: ₹${due.toFixed(2)}` : ''}${advance > 0 ? `, Advance: ₹${advance.toFixed(2)}` : ''}`
        });

        const clients = getClients();
        clients[currentClientId] = client;
        saveClients(clients);

        form.reset();
        const now = new Date();
        document.getElementById('worker-payment-date').value = now.toISOString().slice(0, 16);

    
        loadWorkers();
        updateWorkerModalSummary(worker);
    });

    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('worker-payment-modal').classList.remove('active');
    });

  
    document.getElementById('worker-payment-modal').addEventListener('click', (e) => {
        if (e.target.id === 'worker-payment-modal') {
            document.getElementById('worker-payment-modal').classList.remove('active');
        }
    });
}

function deleteWorker(workerId) {
    if (!confirm('Are you sure you want to delete this worker? All payment records will be lost.')) return;

    const client = getClient(currentClientId);
    if (!client) return;

    const worker = client.workers.find(w => w.id === workerId);
    if (worker) {
        client.history.push({
            date: new Date().toISOString(),
            type: 'worker_deleted',
            workerName: worker.name,
            message: `Worker "${worker.name}" deleted`
        });
    }

    client.workers = client.workers.filter(w => w.id !== workerId);

    const clients = getClients();
    clients[currentClientId] = client;
    saveClients(clients);

    loadWorkers();
}

function deleteWorkerPayment(workerId, paymentId) {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    const client = getClient(currentClientId);
    if (!client) return;

    const worker = client.workers.find(w => w.id === workerId);
    if (!worker) return;

    worker.payments = worker.payments.filter(p => p.id !== paymentId);

    const clients = getClients();
    clients[currentClientId] = client;
    saveClients(clients);

    loadWorkers();
}


function updateCashFlow() {
    if (!currentClientId) return;

    const client = getClient(currentClientId);
    if (!client) return;

    const totalClientPayments = client.payments.reduce((sum, p) => sum + p.amount, 0);
    const totalWorkerPayments = client.workers.reduce((sum, worker) => {
        return sum + worker.payments.reduce((wSum, p) => wSum + p.amount, 0);
    }, 0);

    
    const moneyLeft = totalClientPayments - totalWorkerPayments;

    document.getElementById('total-client-payments').textContent = totalClientPayments.toFixed(2);
    document.getElementById('total-worker-payments').textContent = totalWorkerPayments.toFixed(2);
    document.getElementById('money-left').textContent = moneyLeft.toFixed(2);

    if (client.payments.length > 0 || client.workers.some(w => w.payments.length > 0)) {
        
        const lastCashFlowIndex = client.history.map((h, i) => h.type === 'cash_flow' ? i : -1).filter(i => i >= 0).pop();
        const cashFlowEntry = {
            date: new Date().toISOString(),
            type: 'cash_flow',
            clientPayments: totalClientPayments,
            workerPayments: totalWorkerPayments,
            moneyLeft: moneyLeft,
            message: `Cash Flow: Received ₹${totalClientPayments.toFixed(2)}, Paid ₹${totalWorkerPayments.toFixed(2)}, Left ₹${moneyLeft.toFixed(2)}`
        };

        if (lastCashFlowIndex !== undefined) {
            client.history[lastCashFlowIndex] = cashFlowEntry;
        } else {
            client.history.push(cashFlowEntry);
        }

        const clients = getClients();
        clients[currentClientId] = client;
        saveClients(clients);
    }
}

function loadHistory() {
    const clients = getClients();
    const clientSelect = document.getElementById('history-client-select');
    const timeline = document.getElementById('history-timeline');


    clientSelect.innerHTML = '<option value="">All Clients</option>';
    Object.values(clients).forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.name;
        clientSelect.appendChild(option);
    });

    clientSelect.addEventListener('change', displayHistory);

    displayHistory();
}

function displayHistory() {
    const clients = getClients();
    const selectedClientId = document.getElementById('history-client-select').value;
    const timeline = document.getElementById('history-timeline');

  
    let allHistory = [];

    Object.values(clients).forEach(client => {
        if (!selectedClientId || client.id === selectedClientId) {
            client.history.forEach(entry => {
                allHistory.push({
                    ...entry,
                    clientId: client.id,
                    clientName: client.name
                });
            });
        }
    });


    allHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (allHistory.length === 0) {
        timeline.innerHTML = '<p style="color: #999; padding: 20px; text-align: center;">No history available</p>';
        return;
    }

    
    const groupedByDate = {};
    allHistory.forEach(entry => {
        const dateKey = new Date(entry.date).toLocaleDateString();
        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(entry);
    });

    timeline.innerHTML = Object.keys(groupedByDate)
        .sort((a, b) => new Date(a) - new Date(b))
        .map(date => {
            const entries = groupedByDate[date];
            
            return `
                <div class="history-entry">
                    <div class="history-date">${date}</div>
                    ${entries.map(entry => {
                        let cashFlowInfo = '';
                        if (entry.type === 'cash_flow') {
                            cashFlowInfo = `
                                <div class="history-item">
                                    <strong>Money Left:</strong> ₹${entry.moneyLeft.toFixed(2)}
                                </div>
                            `;
                        }
                        
                        return `
                            <div class="history-item">
                                <strong>${entry.clientName}:</strong> ${entry.message}
                                ${cashFlowInfo}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }).join('');
}

function updateHistory() {
    if (document.getElementById('history-section').classList.contains('active')) {
        loadHistory();
    }
}


function formatDateTime(date) {
    return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


window.showClientDetail = showClientDetail;
window.openWorkerPaymentModal = openWorkerPaymentModal;
window.deleteWorker = deleteWorker;
window.deleteWorkerPayment = deleteWorkerPayment;
window.deleteClientPayment = deleteClientPayment;


document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initClientForm();
    initClientPaymentForm();
    initWorkerForm();
    initWorkerPaymentForm();
    showSection('new');
});
