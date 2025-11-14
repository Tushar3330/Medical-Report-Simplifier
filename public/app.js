// Medical Report Simplifier Frontend
class MedicalReportApp {
    constructor() {
        this.apiBase = window.location.origin;
        this.currentFile = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkApiStatus();
        this.setupTabs();
        this.setupFileUpload();
    }

    setupEventListeners() {
        // Tab navigation
        document.getElementById('text-tab').addEventListener('click', () => this.switchTab('text'));
        document.getElementById('image-tab').addEventListener('click', () => this.switchTab('image'));

        // Processing buttons
        document.getElementById('process-text').addEventListener('click', () => this.processText());
        document.getElementById('process-image').addEventListener('click', () => this.processImage());

        // Utility buttons
        document.getElementById('load-sample').addEventListener('click', () => this.loadSampleData());
        document.getElementById('new-report').addEventListener('click', () => this.resetForm());
        document.getElementById('download-results').addEventListener('click', () => this.downloadResults());
        document.getElementById('retry-button').addEventListener('click', () => this.hideError());

        // Demo buttons
        document.getElementById('demo-simple').addEventListener('click', () => this.loadDemo('simple'));
        document.getElementById('demo-complex').addEventListener('click', () => this.loadDemo('complex'));
        document.getElementById('demo-ocr').addEventListener('click', () => this.loadDemo('ocr'));

        // Image handling
        document.getElementById('remove-image').addEventListener('click', () => this.removeImage());
    }

    setupTabs() {
        this.switchTab('text');
    }

    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${tab}-tab`).classList.add('active');

        // Update panels
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
        document.getElementById(`${tab}-panel`).classList.remove('hidden');
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('image-input');

        // Click to upload
        uploadArea.addEventListener('click', () => fileInput.click());

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
    }

    handleFileSelect(file) {
        // Validate file
        if (!file.type.startsWith('image/')) {
            this.showError('Please select an image file (JPG, PNG, GIF, BMP, TIFF)');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB
            this.showError('File size must be less than 10MB');
            return;
        }

        // Warn about large files
        if (file.size > 5 * 1024 * 1024) { // 5MB
            console.warn('Large image detected. Processing may take longer.');
        }

        this.currentFile = file;

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('preview-img').src = e.target.result;
            document.getElementById('upload-content').classList.add('hidden');
            document.getElementById('image-preview').classList.remove('hidden');
            
            // Show helpful tip for large images
            if (file.size > 3 * 1024 * 1024) { // 3MB
                const uploadArea = document.getElementById('upload-area');
                const tipElement = document.createElement('div');
                tipElement.className = 'mt-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded';
                tipElement.innerHTML = '<i class="fas fa-info-circle"></i> Large image detected. For faster processing, consider using a smaller or cropped image.';
                uploadArea.appendChild(tipElement);
                setTimeout(() => tipElement.remove(), 5000);
            }
        };
        reader.readAsDataURL(file);
    }

    removeImage() {
        this.currentFile = null;
        document.getElementById('upload-content').classList.remove('hidden');
        document.getElementById('image-preview').classList.add('hidden');
        document.getElementById('image-input').value = '';
    }

    async checkApiStatus() {
        try {
            const response = await fetch(`${this.apiBase}/health`);
            const data = await response.json();
            
            if (data.status === 'ok') {
                this.updateStatus('connected', 'API Connected');
            } else {
                this.updateStatus('error', 'API Error');
            }
        } catch (error) {
            this.updateStatus('error', 'API Offline');
        }
    }

    updateStatus(status, message) {
        const indicator = document.getElementById('status-indicator');
        const dot = indicator.querySelector('div');
        const text = indicator.querySelector('span');

        dot.className = `w-3 h-3 rounded-full ${
            status === 'connected' ? 'bg-green-500' :
            status === 'processing' ? 'bg-yellow-500' : 'bg-red-500'
        }`;
        text.textContent = message;
    }

    async processText() {
        const text = document.getElementById('medical-text').value.trim();
        
        if (!text) {
            this.showError('Please enter some medical test data');
            return;
        }

        if (text.length < 10) {
            this.showError('Text must be at least 10 characters long');
            return;
        }

        this.showProcessing('Analyzing text input...');

        try {
            const response = await fetch(`${this.apiBase}/api/medical-reports/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'text',
                    text: text
                })
            });

            const result = await response.json();
            this.hideProcessing();

            if (result.status === 'ok') {
                this.displayResults(result);
            } else {
                this.showError(result.reason || result.message || 'Processing failed');
            }
        } catch (error) {
            this.hideProcessing();
            this.showError(`Network error: ${error.message}`);
        }
    }

    async processImage() {
        if (!this.currentFile) {
            this.showError('Please select an image file');
            return;
        }

        this.showProcessing('Uploading image...');

        try {
            const formData = new FormData();
            formData.append('image', this.currentFile);

            // Update progress messages
            setTimeout(() => {
                this.updateProcessingStep('Extracting text with OCR...');
            }, 1000);

            setTimeout(() => {
                this.updateProcessingStep('Processing image... This may take 30-60 seconds...');
            }, 5000);

            setTimeout(() => {
                this.updateProcessingStep('Still processing... Almost there...');
            }, 20000);

            setTimeout(() => {
                this.updateProcessingStep('This is taking longer than usual. Please wait...');
            }, 40000);

            const response = await fetch(`${this.apiBase}/api/medical-reports/process`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            this.hideProcessing();

            if (result.status === 'ok') {
                this.displayResults(result);
            } else if (result.status === 'timeout') {
                const errorMsg = result.error_message || result.reason || 'OCR processing timed out';
                const suggestion = result.suggestion || 'Please try with a clearer image or use text input';
                this.showError(
                    `<strong>OCR Timeout</strong><br><br>${errorMsg}<br><br><strong>Suggestions:</strong><br>• Try using a smaller or clearer image<br>• Crop the image to show only the test results<br>• ${suggestion}<br><br><strong>Tip:</strong> For faster results, switch to the "Text Input" tab and copy-paste your lab values directly.`,
                    'Processing Timeout'
                );
            } else {
                this.showError(result.reason || result.message || 'Image processing failed');
            }
        } catch (error) {
            this.hideProcessing();
            if (error.name === 'AbortError' || error.message.includes('timeout')) {
                this.showError('Processing timed out. Please try with a clearer image or use text input for faster results.', 'Timeout Error');
            } else {
                this.showError(`Network error: ${error.message}`);
            }
        }
    }

    showProcessing(step) {
        this.updateStatus('processing', 'Processing...');
        document.getElementById('processing-step').textContent = step;
        document.getElementById('processing-status').classList.remove('hidden');
        document.getElementById('error-display').classList.add('hidden');
        document.getElementById('results-section').classList.add('hidden');

        // Simulate processing steps
        const steps = [
            'Extracting test data...',
            'Normalizing results...',
            'Generating explanations...',
            'Finalizing report...'
        ];

        let currentStep = 0;
        const stepInterval = setInterval(() => {
            if (currentStep < steps.length) {
                document.getElementById('processing-step').textContent = steps[currentStep];
                currentStep++;
            } else {
                clearInterval(stepInterval);
            }
        }, 1500);

        // Store interval reference to clear it later
        this.processingInterval = stepInterval;
    }

    updateProcessingStep(step) {
        const stepElement = document.getElementById('processing-step');
        if (stepElement) {
            stepElement.textContent = step;
        }
    }

    hideProcessing() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
        }
        document.getElementById('processing-status').classList.add('hidden');
        this.updateStatus('connected', 'API Connected');
    }

    showError(message, title = 'Processing Error') {
        this.hideProcessing();
        document.getElementById('error-message').innerHTML = message.replace(/\n/g, '<br>');
        
        // Update error title if provided
        const errorTitle = document.querySelector('#error-display h3');
        if (errorTitle) {
            errorTitle.textContent = title;
        }
        
        document.getElementById('error-display').classList.remove('hidden');
        document.getElementById('results-section').classList.add('hidden');
    }

    hideError() {
        document.getElementById('error-display').classList.add('hidden');
    }

    displayResults(data) {
        // Show results section
        document.getElementById('results-section').classList.remove('hidden');

        // Display summary
        this.displaySummary(data.summary, data.explanations);

        // Display test results
        this.displayTests(data.tests);

        // Display explanations
        this.displayExplanations(data.explanations);

        // Display metadata
        this.displayMetadata(data.processing_metadata);

        // Scroll to results
        document.getElementById('results-section').scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });

        // Store results for download
        this.currentResults = data;
    }

    displaySummary(summary, explanations) {
        const summaryContent = document.getElementById('summary-content');
        summaryContent.innerHTML = `
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <p class="text-lg text-gray-800 font-medium">${summary}</p>
                ${explanations && explanations.length > 0 ? `
                    <div class="mt-3 text-sm text-gray-600">
                        <strong>Key Points:</strong>
                        <ul class="list-disc list-inside mt-1 space-y-1">
                            ${explanations.map(exp => `<li>${exp}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }

    displayTests(tests) {
        const testsGrid = document.getElementById('tests-grid');
        testsGrid.innerHTML = tests.map(test => `
            <div class="test-result-card status-${test.status} rounded-lg p-4 shadow-sm">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="font-semibold text-gray-800 text-lg">${test.name}</h3>
                    <span class="px-3 py-1 rounded-full text-sm font-medium ${
                        test.status === 'normal' ? 'bg-green-100 text-green-800' :
                        test.status === 'low' ? 'bg-yellow-100 text-yellow-800' :
                        test.status === 'high' ? 'bg-red-100 text-red-800' :
                        'bg-red-200 text-red-900'
                    }">
                        ${test.status.toUpperCase()}
                    </span>
                </div>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Value:</span>
                        <span class="font-medium text-gray-900">${test.value} ${test.unit}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Normal Range:</span>
                        <span class="text-gray-700">${test.ref_range.low} - ${test.ref_range.high} ${test.unit}</span>
                    </div>
                </div>
                <div class="mt-3 bg-gray-50 rounded p-2">
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="h-2 rounded-full ${
                            test.status === 'normal' ? 'bg-green-500' :
                            test.status === 'low' ? 'bg-yellow-500' :
                            'bg-red-500'
                        }" style="width: ${this.calculatePercentage(test.value, test.ref_range)}%"></div>
                    </div>
                    <div class="flex justify-between text-xs text-gray-500 mt-1">
                        <span>${test.ref_range.low}</span>
                        <span>${test.ref_range.high}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    calculatePercentage(value, range) {
        const min = range.low;
        const max = range.high;
        const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
        return percentage;
    }

    displayExplanations(explanations) {
        if (!explanations || explanations.length === 0) {
            document.getElementById('explanations-section').classList.add('hidden');
            return;
        }

        document.getElementById('explanations-section').classList.remove('hidden');
        const explanationsContent = document.getElementById('explanations-content');
        explanationsContent.innerHTML = explanations.map((explanation, index) => `
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div class="flex items-start space-x-3">
                    <i class="fas fa-info-circle text-yellow-600 mt-1"></i>
                    <p class="text-gray-800">${explanation}</p>
                </div>
            </div>
        `).join('');
    }

    displayMetadata(metadata) {
        if (!metadata) return;

        const metadataContent = document.getElementById('metadata-content');
        metadataContent.innerHTML = `
            <div class="bg-white rounded-lg p-4">
                <h4 class="font-medium text-gray-700 mb-2">Confidence Scores</h4>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span>OCR Quality:</span>
                        <span class="font-medium">${Math.round((metadata.extraction_confidence || 0) * 100)}%</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Normalization:</span>
                        <span class="font-medium">${Math.round((metadata.normalization_confidence || 0) * 100)}%</span>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg p-4">
                <h4 class="font-medium text-gray-700 mb-2">Processing Stats</h4>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span>Tests Found:</span>
                        <span class="font-medium">${metadata.tests_processed || 0}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Processing ID:</span>
                        <span class="font-mono text-xs">${(metadata.processing_id || '').substring(0, 8)}...</span>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg p-4">
                <h4 class="font-medium text-gray-700 mb-2">Timestamp</h4>
                <p class="text-sm text-gray-600">
                    ${metadata.timestamp ? new Date(metadata.timestamp).toLocaleString() : 'N/A'}
                </p>
            </div>
        `;
    }

    loadSampleData() {
        document.getElementById('medical-text').value = 
            "CBC: Hemoglobin 10.2 g/dL (Low), WBC 11,200 /uL (High), RBC 4.2 million/uL (Normal), Platelets 250,000 /uL (Normal)\\n\\nBASIC METABOLIC PANEL:\\nGlucose: 145 mg/dL (High)\\nCreatinine: 1.1 mg/dL (Normal)\\nBUN: 18 mg/dL (Normal)";
        this.switchTab('text');
    }

    loadDemo(type) {
        let demoText = '';
        
        switch(type) {
            case 'simple':
                demoText = "CBC: Hemoglobin 10.2 g/dL (Low), WBC 11,200 /uL (High)";
                break;
            case 'complex':
                demoText = `CBC: Hemoglobin 10.2 g/dL (Low), WBC 11,200 /uL (High), RBC 4.2 million/uL (Normal), Platelets 250,000 /uL (Normal)

BASIC METABOLIC PANEL:
Glucose: 145 mg/dL (High)
Creatinine: 1.1 mg/dL (Normal)
BUN: 18 mg/dL (Normal)
Sodium: 140 mmol/L (Normal)

LIPID PROFILE:
Total Cholesterol: 220 mg/dL (High)
LDL Cholesterol: 150 mg/dL (High)
HDL Cholesterol: 35 mg/dL (Low)
Triglycerides: 180 mg/dL (Normal)`;
                break;
            case 'ocr':
                demoText = "CBC: Hemglobin 10.2 g/dL (Low) WBC 11200 /uL (Hgh)";
                break;
        }
        
        document.getElementById('medical-text').value = demoText;
        this.switchTab('text');
    }

    resetForm() {
        document.getElementById('medical-text').value = '';
        this.removeImage();
        this.hideError();
        document.getElementById('results-section').classList.add('hidden');
        document.getElementById('processing-status').classList.add('hidden');
        this.switchTab('text');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    downloadResults() {
        if (!this.currentResults) return;

        const filename = `medical_report_${new Date().toISOString().split('T')[0]}.json`;
        const dataStr = JSON.stringify(this.currentResults, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = filename;
        link.click();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MedicalReportApp();
});