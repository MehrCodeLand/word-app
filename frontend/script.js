// API Configuration
const API_BASE_URL = 'http://217.182.185.198:8000/api/v1';
// const API_BASE_URL = 'http://localhost:8000/api/v1';

// Global State
let currentUser = null;
let currentUserId = null;
let allWords = [];
let todayWords = [];
let allLanguages = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing app...');
    console.log('API Base URL:', API_BASE_URL);
    initTheme();
    checkLogin();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    console.log('Theme initialized:', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    console.log('Theme toggled to:', newTheme);
}

// Check if user is logged in
function checkLogin() {
    const savedUser = localStorage.getItem('wordAppUser');
    const savedUserId = localStorage.getItem('wordAppUserId');
    
    console.log('Checking login status:', { savedUser, savedUserId });
    
    if (savedUser && savedUserId) {
        currentUser = savedUser;
        currentUserId = parseInt(savedUserId);
        console.log('User already logged in:', currentUser);
        showMainApp();
    } else {
        console.log('No saved login, showing login screen');
    }
}

// Login Function
async function login() {
    console.log('Login function called');
    
    const username = document.getElementById('usernameInput').value.trim();
    
    if (!username) {
        alert('Please enter your username');
        return;
    }
    
    console.log('Attempting login for username:', username);
    
    // Get the button
    const loginBtn = document.querySelector('#loginScreen .btn-primary') || document.querySelector('button[onclick="login()"]');
    
    if (!loginBtn) {
        console.error('Login button not found!');
        return;
    }
    
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Logging in...';
    loginBtn.disabled = true;
    
    try {
        console.log('Fetching users from API:', `${API_BASE_URL}/users/`);
        
        const response = await fetch(`${API_BASE_URL}/users/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - Cannot connect to server`);
        }
        
        const users = await response.json();
        console.log('Fetched users:', users.length, 'users');
        
        let user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        
        if (!user) {
            console.log('User not found, creating new user...');
            
            const createResponse = await fetch(`${API_BASE_URL}/users/`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    email: `${username.toLowerCase().replace(/\s/g, '')}@wordapp.com`
                })
            });
            
            console.log('Create user response status:', createResponse.status);
            
            if (!createResponse.ok) {
                const errorData = await createResponse.json();
                console.error('Failed to create user:', errorData);
                throw new Error(`Failed to create user: ${errorData.detail || JSON.stringify(errorData)}`);
            }
            
            user = await createResponse.json();
            console.log('User created successfully:', user);
        } else {
            console.log('User found:', user);
        }
        
        currentUser = user.username;
        currentUserId = user.id;
        
        localStorage.setItem('wordAppUser', currentUser);
        localStorage.setItem('wordAppUserId', currentUserId);
        
        console.log('Login successful! Showing main app...');
        showMainApp();
        
    } catch (error) {
        console.error('Login error:', error);
        alert(`❌ Login failed!\n\n${error.message}\n\nCheck browser console for details.`);
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
    }
}

// Logout Function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('Logging out...');
        localStorage.removeItem('wordAppUser');
        localStorage.removeItem('wordAppUserId');
        currentUser = null;
        currentUserId = null;
        
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('mainApp').classList.remove('active');
        document.getElementById('usernameInput').value = '';
        console.log('Logged out successfully');
    }
}

// Show Main App
async function showMainApp() {
    console.log('Showing main app for user:', currentUser);
    
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    
    // Set user info
    const userNameElement = document.getElementById('userName');
    const userInitialElement = document.getElementById('userInitial');
    
    if (userNameElement) userNameElement.textContent = currentUser;
    if (userInitialElement) userInitialElement.textContent = currentUser.charAt(0).toUpperCase();
    
    console.log('Loading initial data...');
    
    // Load initial data
    try {
        await loadLanguages();
        await loadDashboard();
        console.log('Initial data loaded successfully');
    } catch (error) {
        console.error('Error loading initial data:', error);
    }
}

// Tab Navigation
function showTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Remove active from all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected tab
    const targetTab = document.getElementById(`${tabName}Tab`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Add active to nav item
    const navItem = document.querySelector(`[data-tab="${tabName}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // Load content based on tab
    if (tabName === 'dashboard') {
        loadDashboard();
    } else if (tabName === 'library') {
        loadWords();
    } else if (tabName === 'languages') {
        loadLanguagesTab();
    } else if (tabName === 'addWord') {
        loadLanguagesForWordForm();
    }
}

// Load Dashboard
async function loadDashboard() {
    console.log('Loading dashboard...');
    
    try {
        await loadStats();
        
        const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/practice/today`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch today's words: ${response.status}`);
        }
        
        todayWords = await response.json();
        console.log('Today\'s words loaded:', todayWords.length);
        
        displayTodayWords(todayWords);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        const container = document.getElementById('todayWordsList');
        if (container) {
            container.innerHTML = getEmptyState(
                'Error loading data',
                error.message
            );
        }
    }
}

// Load Statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/words/`);
        const words = await response.json();
        
        const practiceResponse = await fetch(`${API_BASE_URL}/users/${currentUserId}/practice/`);
        const practices = await practiceResponse.json();
        
        const totalWords = words.length;
        
        const wordPracticeCount = {};
        practices.forEach(p => {
            wordPracticeCount[p.word_id] = (wordPracticeCount[p.word_id] || 0) + 1;
        });
        const completedWords = Object.values(wordPracticeCount).filter(count => count >= 7).length;
        
        const todayResponse = await fetch(`${API_BASE_URL}/users/${currentUserId}/practice/today`);
        const todayPractice = await todayResponse.json();
        
        document.getElementById('todayCount').textContent = todayPractice.length;
        document.getElementById('totalWords').textContent = totalWords;
        document.getElementById('completedWords').textContent = completedWords;
        
        console.log('Stats loaded:', { totalWords, completedWords, todayCount: todayPractice.length });
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Display Today's Words
function displayTodayWords(words) {
    const container = document.getElementById('todayWordsList');
    
    if (!container) {
        console.error('Container todayWordsList not found!');
        return;
    }
    
    if (words.length === 0) {
        container.innerHTML = getEmptyState(
            'All caught up!',
            'No words to practice today. Check back tomorrow!'
        );
        return;
    }
    
    container.innerHTML = words.map(word => `
        <div class="word-card" onclick="practiceWord(${word.id})">
            <div class="word-card-header">
                <div>
                    <div class="word-title">${escapeHtml(word.word)}</div>
                    <span class="badge badge-language">${escapeHtml(word.language.name)}</span>
                </div>
            </div>
            <div class="word-meaning">${escapeHtml(word.meaning.substring(0, 120))}${word.meaning.length > 120 ? '...' : ''}</div>
            <div class="word-actions">
                <button class="btn btn-primary" onclick="event.stopPropagation(); practiceWord(${word.id})">
                    Practice Now
                </button>
                <button class="btn btn-secondary" onclick="event.stopPropagation(); viewWord(${word.id})">
                    View Details
                </button>
            </div>
        </div>
    `).join('');
}

// Load All Words
async function loadWords() {
    try {
        const languageId = document.getElementById('languageFilter').value;
        const search = document.getElementById('searchInput').value.trim();
        
        let url = `${API_BASE_URL}/users/${currentUserId}/words/`;
        const params = new URLSearchParams();
        
        if (languageId) params.append('language_id', languageId);
        if (search) params.append('search', search);
        
        if (params.toString()) url += `?${params.toString()}`;
        
        const response = await fetch(url);
        allWords = await response.json();
        
        const wordsWithProgress = await Promise.all(
            allWords.map(async (word) => {
                try {
                    const progressResponse = await fetch(`${API_BASE_URL}/users/${currentUserId}/words/${word.id}`);
                    return await progressResponse.json();
                } catch (error) {
                    return { ...word, practice_days_completed: 0, can_practice_today: true };
                }
            })
        );
        
        displayAllWords(wordsWithProgress);
    } catch (error) {
        console.error('Error loading words:', error);
    }
}

// Display All Words
function displayAllWords(words) {
    const container = document.getElementById('allWordsList');
    
    if (!container) return;
    
    if (words.length === 0) {
        container.innerHTML = getEmptyState(
            'No words found',
            'Start adding words to build your vocabulary!'
        );
        return;
    }
    
    container.innerHTML = words.map(word => {
        const progress = (word.practice_days_completed / 7) * 100;
        const isMastered = word.practice_days_completed >= 7;
        
        return `
            <div class="word-card">
                <div class="word-card-header">
                    <div>
                        <div class="word-title">
                            ${escapeHtml(word.word)}
                            ${isMastered ? '<span class="badge badge-success">Mastered</span>' : ''}
                        </div>
                        <span class="badge badge-language">${escapeHtml(word.language.name)}</span>
                    </div>
                </div>
                <div class="word-meaning">${escapeHtml(word.meaning.substring(0, 120))}${word.meaning.length > 120 ? '...' : ''}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%">
                        ${word.practice_days_completed}/7 days
                    </div>
                </div>
                <div class="word-actions">
                    ${word.can_practice_today && !isMastered ? 
                        `<button class="btn btn-primary" onclick="practiceWord(${word.id})">Practice</button>` : 
                        `<button class="btn btn-secondary" disabled>
                            ${isMastered ? '✓ Mastered' : '✓ Practiced'}
                        </button>`
                    }
                    <button class="btn btn-secondary" onclick="viewWord(${word.id})">View</button>
                </div>
            </div>
        `;
    }).join('');
}

// Load Languages
async function loadLanguages() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/languages/`);
        allLanguages = await response.json();
        
        const select = document.getElementById('languageFilter');
        if (select) {
            select.innerHTML = '<option value="">All Languages</option>';
            allLanguages.forEach(lang => {
                select.innerHTML += `<option value="${lang.id}">${escapeHtml(lang.name)}</option>`;
            });
        }
        
        console.log('Languages loaded:', allLanguages.length);
    } catch (error) {
        console.error('Error loading languages:', error);
    }
}

// Load Languages for Word Form
async function loadLanguagesForWordForm() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/languages/`);
        allLanguages = await response.json();
        
        const select = document.getElementById('wordLanguageSelect');
        const warning = document.getElementById('noLanguagesWarning');
        const form = document.getElementById('addWordForm');
        
        if (!select) return;
        
        select.innerHTML = '<option value="">Select a language...</option>';
        
        if (allLanguages.length === 0) {
            if (warning) warning.style.display = 'flex';
            if (form) form.style.display = 'none';
        } else {
            if (warning) warning.style.display = 'none';
            if (form) form.style.display = 'block';
            
            allLanguages.forEach(lang => {
                select.innerHTML += `<option value="${lang.id}">${escapeHtml(lang.name)}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading languages:', error);
    }
}

// Load Languages Tab
async function loadLanguagesTab() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/languages/`);
        allLanguages = await response.json();
        displayLanguages(allLanguages);
    } catch (error) {
        console.error('Error loading languages:', error);
    }
}

// Display Languages
function displayLanguages(languages) {
    const container = document.getElementById('languagesList');
    
    if (!container) return;
    
    if (languages.length === 0) {
        container.innerHTML = getEmptyState(
            'No languages yet',
            'Add your first language to start building your vocabulary!'
        );
        return;
    }
    
    container.innerHTML = languages.map(lang => `
        <div class="language-card">
            <div class="language-name">${escapeHtml(lang.name)}</div>
            <div class="language-actions">
                <button class="btn-icon" onclick="editLanguage(${lang.id}, '${escapeHtml(lang.name).replace(/'/g, "\\'")}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="btn-icon btn-danger" onclick="deleteLanguage(${lang.id}, '${escapeHtml(lang.name).replace(/'/g, "\\'")}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

// Add Language
async function addLanguage(event) {
    event.preventDefault();
    
    const name = document.getElementById('languageNameInput').value.trim();
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/languages/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to add language');
        }
        
        document.getElementById('addLanguageForm').reset();
        alert('✅ Language added successfully!');
        
        loadLanguagesTab();
        loadLanguages();
    } catch (error) {
        console.error('Error adding language:', error);
        alert(`❌ ${error.message}`);
    }
}

// Edit Language
async function editLanguage(languageId, currentName) {
    const newName = prompt('Enter new language name:', currentName);
    
    if (!newName || newName.trim() === '' || newName === currentName) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/languages/${languageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim() })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update language');
        }
        
        alert('✅ Language updated successfully!');
        loadLanguagesTab();
        loadLanguages();
    } catch (error) {
        console.error('Error updating language:', error);
        alert('❌ Failed to update language');
    }
}

// Delete Language
async function deleteLanguage(languageId, languageName) {
    const confirmed = confirm(`Are you sure you want to delete "${languageName}"?\n\nThis will also delete ALL words in this language!`);
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/languages/${languageId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete language');
        }
        
        alert('✅ Language deleted successfully!');
        loadLanguagesTab();
        loadLanguages();
        loadStats();
    } catch (error) {
        console.error('Error deleting language:', error);
        alert('❌ Failed to delete language');
    }
}

// Add New Word
async function addWord(event) {
    event.preventDefault();
    
    const word = document.getElementById('wordInput').value.trim();
    const languageId = document.getElementById('wordLanguageSelect').value;
    const meaning = document.getElementById('meaningInput').value.trim();
    
    if (!languageId) {
        alert('⚠️ Please select a language first!');
        return;
    }
    
    const examples = [
        document.getElementById('example1').value.trim(),
        document.getElementById('example2').value.trim(),
        document.getElementById('example3').value.trim()
    ].filter(ex => ex !== '');
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/words/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                word: word,
                language_id: parseInt(languageId),
                meaning: meaning,
                examples: examples
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to add word');
        }
        
        document.getElementById('addWordForm').reset();
        alert('✅ Word added successfully!');
        
        await loadStats();
        showTab('library');
    } catch (error) {
        console.error('Error adding word:', error);
        alert(`❌ ${error.message}`);
    }
}

// View Word Details
async function viewWord(wordId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/words/${wordId}`);
        const word = await response.json();
        
        const examplesHtml = word.examples && word.examples.length > 0 
            ? word.examples.map(ex => `<div class="example-item">${escapeHtml(ex.example_text)}</div>`).join('')
            : '<p style="color: var(--text-secondary);">No examples added yet.</p>';
        
        const progress = (word.practice_days_completed / 7) * 100;
        const isMastered = word.practice_days_completed >= 7;
        
        document.getElementById('modalContent').innerHTML = `
            <div class="modal-word-title">${escapeHtml(word.word)}</div>
            <span class="badge badge-language" style="display: inline-block; margin-bottom: 20px;">${escapeHtml(word.language.name)}</span>
            
            <div class="progress-bar" style="margin: 20px 0;">
                <div class="progress-fill" style="width: ${progress}%">
                    ${word.practice_days_completed}/7 days
                </div>
            </div>
            
            <div class="modal-section">
                <h3>Meaning</h3>
                <p>${escapeHtml(word.meaning)}</p>
            </div>
            
            <div class="modal-section">
                <h3>Examples</h3>
                ${examplesHtml}
            </div>
            
            <div class="modal-section">
                <h3>Practice Status</h3>
                <p style="color: var(--text-secondary);">
                    ${isMastered ? 
                        '✓ You have mastered this word!' :
                        `Completed: ${word.practice_days_completed} of 7 days`
                    }
                </p>
                ${word.can_practice_today && !isMastered ? 
                    `<button class="btn btn-primary" onclick="closeModal(); practiceWord(${word.id})">Practice Now</button>` :
                    !isMastered ? `<p style="color: var(--success);">✓ Already practiced today!</p>` : ''
                }
            </div>
        `;
        
        const modal = document.getElementById('wordModal');
        modal.classList.add('active');
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error viewing word:', error);
        alert('❌ Failed to load word details');
    }
}

// Close Modal
function closeModal() {
    const modal = document.getElementById('wordModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 200);
}

// Practice Word
async function practiceWord(wordId) {
    try {
        const wordResponse = await fetch(`${API_BASE_URL}/users/${currentUserId}/words/${wordId}`);
        const word = await wordResponse.json();
        
        document.getElementById('practiceContent').innerHTML = `
            <div class="practice-card">
                <h2 style="margin-bottom: 8px;">Practice Time!</h2>
                <span class="badge badge-language" style="display: inline-block; margin-bottom: 24px;">${escapeHtml(word.language.name)}</span>
                
                <div class="practice-word">${escapeHtml(word.word)}</div>
                
                <div class="practice-reveal" id="revealSection" style="display: none;">
                    <div class="modal-section">
                        <h3>Meaning</h3>
                        <p>${escapeHtml(word.meaning)}</p>
                    </div>
                    
                    ${word.examples && word.examples.length > 0 ? `
                        <div class="modal-section">
                            <h3>Examples</h3>
                            ${word.examples.map(ex => `<div class="example-item">${escapeHtml(ex.example_text)}</div>`).join('')}
                        </div>
                    ` : ''}
                    
                    <button class="btn btn-success btn-large" onclick="completePractice(${wordId})">
                        Mark as Practiced
                    </button>
                </div>
                
                <button class="btn btn-primary btn-large" onclick="revealAnswer()" id="revealBtn">
                    Show Answer
                </button>
            </div>
        `;
        
        const modal = document.getElementById('practiceModal');
        modal.classList.add('active');
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error starting practice:', error);
        alert('❌ Failed to start practice');
    }
}

// Reveal Answer
function revealAnswer() {
    document.getElementById('revealSection').style.display = 'block';
    document.getElementById('revealBtn').style.display = 'none';
}

// Complete Practice
async function completePractice(wordId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/practice/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word_id: wordId })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to record practice');
        }
        
        document.getElementById('practiceContent').innerHTML = `
            <div class="practice-success">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <h2>Great Job!</h2>
                <p style="color: var(--success); font-size: 16px; margin-top: 8px;">Practice recorded successfully</p>
            </div>
            <button class="btn btn-primary btn-large" onclick="closePracticeModal()">Continue</button>
        `;
        
        setTimeout(() => {
            closePracticeModal();
            loadDashboard();
            if (document.getElementById('libraryTab').classList.contains('active')) {
                loadWords();
            }
        }, 2000);
    } catch (error) {
        console.error('Error completing practice:', error);
        alert(`❌ ${error.message || 'Failed to record practice'}`);
    }
}

// Close Practice Modal
function closePracticeModal() {
    const modal = document.getElementById('practiceModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 200);
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getEmptyState(title, description) {
    return `
        <div class="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h3>${title}</h3>
            <p>${description}</p>
        </div>
    `;
}

// Close modals when clicking outside
window.onclick = function(event) {
    const wordModal = document.getElementById('wordModal');
    const practiceModal = document.getElementById('practiceModal');
    
    if (event.target.classList.contains('modal-overlay')) {
        if (wordModal && wordModal.classList.contains('active')) {
            closeModal();
        }
        if (practiceModal && practiceModal.classList.contains('active')) {
            closePracticeModal();
        }
    }
}

// Handle Enter key in login
document.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen && loginScreen.classList.contains('active')) {
            login();
        }
    }
});

console.log('Script loaded successfully');