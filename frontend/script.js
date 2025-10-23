// API Configuration
// const API_BASE_URL = 'http://localhost:8000/api/v1';
const API_BASE_URL = 'http://217.182.185.198:8000/api/v1';
// Global State
let currentUser = null;
let currentUserId = null;
let allWords = [];
let todayWords = [];
let allLanguages = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
});

// Check if user is logged in
function checkLogin() {
    const savedUser = localStorage.getItem('wordAppUser');
    const savedUserId = localStorage.getItem('wordAppUserId');
    
    if (savedUser && savedUserId) {
        currentUser = savedUser;
        currentUserId = parseInt(savedUserId);
        showMainApp();
    }
}

// Login Function
async function login() {
    const username = document.getElementById('usernameInput').value.trim();
    
    if (!username) {
        alert('Please enter your name');
        return;
    }
    
    // Show loading state
    const loginBtn = event.target;
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Logging in...';
    loginBtn.disabled = true;
    
    try {
        console.log('Attempting to login with username:', username);
        console.log('API URL:', API_BASE_URL);
        
        // Check if user exists
        const response = await fetch(`${API_BASE_URL}/users/`);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - Cannot connect to server`);
        }
        
        const users = await response.json();
        console.log('Fetched users:', users);
        
        let user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        
        // Create user if doesn't exist
        if (!user) {
            console.log('User not found, creating new user...');
            const createResponse = await fetch(`${API_BASE_URL}/users/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    email: `${username.toLowerCase().replace(/\s/g, '')}@wordapp.com`
                })
            });
            
            if (!createResponse.ok) {
                const errorData = await createResponse.json();
                throw new Error(`Failed to create user: ${JSON.stringify(errorData)}`);
            }
            
            user = await createResponse.json();
            console.log('User created:', user);
        } else {
            console.log('User found:', user);
        }
        
        currentUser = user.username;
        currentUserId = user.id;
        
        localStorage.setItem('wordAppUser', currentUser);
        localStorage.setItem('wordAppUserId', currentUserId);
        
        console.log('Login successful! User ID:', currentUserId);
        showMainApp();
    } catch (error) {
        console.error('Login error:', error);
        alert(`❌ Login failed!\n\nError: ${error.message}\n\nPlease check:\n1. Backend is running (docker-compose ps)\n2. API is accessible (http://localhost:8000/health)\n3. Check browser console (F12) for details`);
        
        // Restore button state
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
    }
}

// Logout Function
function logout() {
    localStorage.removeItem('wordAppUser');
    localStorage.removeItem('wordAppUserId');
    currentUser = null;
    currentUserId = null;
    
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('mainApp').classList.remove('active');
    document.getElementById('usernameInput').value = '';
}

// Show Main App
async function showMainApp() {
    console.log('Switching to main app...');
    
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    document.getElementById('welcomeUser').textContent = `Hello, ${currentUser}! ✨`;
    
    console.log('Main app displayed');
    
    // Load initial data
    await loadLanguages();
    await loadDashboard();
}

// Tab Navigation
function showTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const targetTab = document.getElementById(`${tabName}Tab`);
    if (targetTab) {
        targetTab.classList.add('active');
    } else {
        console.error('Tab not found:', `${tabName}Tab`);
        return;
    }
    
    // Add active class to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // If called programmatically, find and activate the button
        const tabIndex = ['dashboard', 'library', 'languages', 'addWord'].indexOf(tabName);
        if (tabIndex >= 0) {
            document.querySelectorAll('.tab-btn')[tabIndex].classList.add('active');
        }
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
    console.log('Loading dashboard for user:', currentUserId);
    
    try {
        // Load stats
        await loadStats();
        
        // Load today's words
        console.log('Fetching today\'s practice words...');
        const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/practice/today`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch today's words: ${response.status}`);
        }
        
        todayWords = await response.json();
        console.log('Today\'s words:', todayWords);
        
        displayTodayWords(todayWords);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Show error but don't break the app
        document.getElementById('todayWordsList').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Error loading data</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Load Statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/words/`);
        const words = await response.json();
        
        // Get practice history
        const practiceResponse = await fetch(`${API_BASE_URL}/users/${currentUserId}/practice/`);
        const practices = await practiceResponse.json();
        
        // Calculate stats
        const totalWords = words.length;
        
        // Count mastered words (7 practices)
        const wordPracticeCount = {};
        practices.forEach(p => {
            wordPracticeCount[p.word_id] = (wordPracticeCount[p.word_id] || 0) + 1;
        });
        const completedWords = Object.values(wordPracticeCount).filter(count => count >= 7).length;
        
        // Get today's practice count
        const todayResponse = await fetch(`${API_BASE_URL}/users/${currentUserId}/practice/today`);
        const todayPractice = await todayResponse.json();
        
        // Update UI
        document.getElementById('todayCount').textContent = todayPractice.length;
        document.getElementById('totalWords').textContent = totalWords;
        document.getElementById('completedWords').textContent = completedWords;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Display Today's Words
function displayTodayWords(words) {
    const container = document.getElementById('todayWordsList');
    
    if (words.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎉</div>
                <h3>Great job!</h3>
                <p>No words to practice today. Check back tomorrow!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = words.map(word => `
        <div class="word-card">
            <div class="word-header">
                <div class="word-title">${word.word}</div>
                <span class="language-badge">${word.language.name}</span>
            </div>
            <div class="word-meaning">${word.meaning.substring(0, 100)}${word.meaning.length > 100 ? '...' : ''}</div>
            <div class="word-actions">
                <button class="btn btn-practice" onclick="practiceWord(${word.id})">Practice Now 🔥</button>
                <button class="btn btn-view" onclick="viewWord(${word.id})">View Details</button>
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
        
        if (languageId) {
            params.append('language_id', languageId);
        }
        if (search) {
            params.append('search', search);
        }
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        const response = await fetch(url);
        allWords = await response.json();
        
        // Get practice info for each word
        const wordsWithProgress = await Promise.all(
            allWords.map(async (word) => {
                try {
                    const progressResponse = await fetch(`${API_BASE_URL}/users/${currentUserId}/words/${word.id}`);
                    const progressData = await progressResponse.json();
                    return progressData;
                } catch (error) {
                    return { ...word, practice_days_completed: 0 };
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
    
    if (words.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <h3>No words yet</h3>
                <p>Start adding words to build your vocabulary!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = words.map(word => {
        const progress = (word.practice_days_completed / 7) * 100;
        const isMastered = word.practice_days_completed >= 7;
        
        return `
            <div class="word-card">
                <div class="word-header">
                    <div class="word-title">${word.word} ${isMastered ? '✅' : ''}</div>
                    <span class="language-badge">${word.language.name}</span>
                </div>
                <div class="word-meaning">${word.meaning.substring(0, 100)}${word.meaning.length > 100 ? '...' : ''}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%">
                        Day ${word.practice_days_completed}/7
                    </div>
                </div>
                <div class="word-actions">
                    ${word.can_practice_today && !isMastered ? 
                        `<button class="btn btn-practice" onclick="practiceWord(${word.id})">Practice</button>` : 
                        `<button class="btn btn-practice" disabled style="opacity: 0.5;">
                            ${isMastered ? 'Mastered! 🏆' : 'Practiced Today ✓'}
                        </button>`
                    }
                    <button class="btn btn-view" onclick="viewWord(${word.id})">View</button>
                </div>
            </div>
        `;
    }).join('');
}

// Load Languages for Filter
async function loadLanguages() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/languages/`);
        allLanguages = await response.json();
        
        const select = document.getElementById('languageFilter');
        select.innerHTML = '<option value="">All Languages</option>';
        allLanguages.forEach(lang => {
            select.innerHTML += `<option value="${lang.id}">${lang.name}</option>`;
        });
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
        const addBtn = document.getElementById('addWordBtn');
        
        select.innerHTML = '<option value="">Select a language...</option>';
        
        if (allLanguages.length === 0) {
            // Show warning, hide form
            warning.style.display = 'block';
            form.style.opacity = '0.5';
            form.style.pointerEvents = 'none';
            addBtn.disabled = true;
        } else {
            // Hide warning, show form
            warning.style.display = 'none';
            form.style.opacity = '1';
            form.style.pointerEvents = 'auto';
            addBtn.disabled = false;
            
            allLanguages.forEach(lang => {
                select.innerHTML += `<option value="${lang.id}">${lang.name}</option>`;
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
    
    if (languages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🌐</div>
                <h3>No languages yet</h3>
                <p>Add your first language to start building your vocabulary!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = languages.map(lang => `
        <div class="language-card">
            <div class="language-name">${lang.name}</div>
            <div class="language-actions">
                <button class="btn-icon btn-edit" onclick="editLanguage(${lang.id}, '${lang.name.replace(/'/g, "\\'")}')">✏️</button>
                <button class="btn-icon btn-delete" onclick="deleteLanguage(${lang.id}, '${lang.name.replace(/'/g, "\\'")}')">🗑️</button>
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
        
        // Clear form
        document.getElementById('addLanguageForm').reset();
        
        // Show success message
        alert('✅ Language added successfully!');
        
        // Reload languages
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
    
    if (!newName || newName.trim() === '') {
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
        alert('❌ Failed to update language.');
    }
}

// Delete Language
async function deleteLanguage(languageId, languageName) {
    const confirmed = confirm(`⚠️ Are you sure you want to delete "${languageName}"?\n\nThis will also delete ALL words in this language!`);
    
    if (!confirmed) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/languages/${languageId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete language');
        }
        
        alert('✅ Language and all its words deleted successfully!');
        loadLanguagesTab();
        loadLanguages();
        loadStats();
    } catch (error) {
        console.error('Error deleting language:', error);
        alert('❌ Failed to delete language.');
    }
}

// Add New Word
async function addWord(event) {
    event.preventDefault();
    
    const word = document.getElementById('wordInput').value.trim();
    const languageId = document.getElementById('wordLanguageSelect').value;
    const meaning = document.getElementById('meaningInput').value.trim();
    
    if (!languageId) {
        alert('⚠️ Please select a language first!\n\nGo to the "Languages" tab to add a language.');
        return;
    }
    
    const examples = [
        document.getElementById('example1').value.trim(),
        document.getElementById('example2').value.trim(),
        document.getElementById('example3').value.trim()
    ].filter(ex => ex !== '');
    
    console.log('Submitting word:', {
        word: word,
        language_id: parseInt(languageId),
        meaning: meaning,
        examples: examples
    });
    
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
        
        const result = await response.json();
        console.log('Word added successfully:', result);
        
        // Clear form
        document.getElementById('addWordForm').reset();
        
        // Show success message
        alert('✅ Word added successfully!');
        
        // Reload stats
        await loadStats();
        
        // Switch to library tab
        const libraryTabBtn = document.querySelectorAll('.tab-btn')[1];
        libraryTabBtn.click();
    } catch (error) {
        console.error('Error adding word:', error);
        alert(`❌ Failed to add word.\n\n${error.message}`);
    }
}

// View Word Details
async function viewWord(wordId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/words/${wordId}`);
        const word = await response.json();
        
        const examplesHtml = word.examples && word.examples.length > 0 
            ? word.examples.map(ex => `<div class="example-item">📌 ${ex.example_text}</div>`).join('')
            : '<p>No examples added yet.</p>';
        
        const progress = (word.practice_days_completed / 7) * 100;
        
        document.getElementById('modalContent').innerHTML = `
            <div class="modal-word-title">${word.word}</div>
            <span class="language-badge" style="display: inline-block; margin-bottom: 20px;">${word.language.name}</span>
            
            <div class="progress-bar" style="margin: 20px 0;">
                <div class="progress-fill" style="width: ${progress}%">
                    Day ${word.practice_days_completed}/7
                </div>
            </div>
            
            <div class="modal-section">
                <h3>📖 Meaning</h3>
                <p>${word.meaning}</p>
            </div>
            
            <div class="modal-section">
                <h3>💡 Examples</h3>
                ${examplesHtml}
            </div>
            
            <div class="modal-section">
                <h3>📊 Practice History</h3>
                <p>Completed: ${word.practice_days_completed} days</p>
                ${word.can_practice_today ? 
                    `<button class="btn btn-practice" onclick="closeModal(); practiceWord(${word.id})">Practice Now</button>` :
                    `<p style="color: var(--accent-green);">✓ Already practiced today!</p>`
                }
            </div>
        `;
        
        document.getElementById('wordModal').style.display = 'block';
    } catch (error) {
        console.error('Error viewing word:', error);
        alert('Failed to load word details.');
    }
}

// Close Modal
function closeModal() {
    document.getElementById('wordModal').style.display = 'none';
}

// Practice Word
async function practiceWord(wordId) {
    try {
        // Get word details first
        const wordResponse = await fetch(`${API_BASE_URL}/users/${currentUserId}/words/${wordId}`);
        const word = await wordResponse.json();
        
        // Show practice modal
        document.getElementById('practiceContent').innerHTML = `
            <h2>Practice Time! 📚</h2>
            <div class="practice-word">${word.word}</div>
            <div class="language-badge" style="margin: 20px auto; display: inline-block;">${word.language}</div>
            
            <div class="practice-reveal" id="revealSection" style="display: none;">
                <div class="practice-meaning">
                    <h3>💡 Meaning:</h3>
                    <p>${word.meaning}</p>
                </div>
                
                ${word.examples && word.examples.length > 0 ? `
                    <div class="practice-examples">
                        <h3>📌 Examples:</h3>
                        ${word.examples.map(ex => `<div class="example-item">${ex.example_text}</div>`).join('')}
                    </div>
                ` : ''}
                
                <button class="btn btn-practice" onclick="completePractice(${wordId})" style="margin-top: 20px;">
                    Mark as Practiced ✓
                </button>
            </div>
            
            <button class="btn btn-primary" onclick="revealAnswer()" id="revealBtn">
                Show Meaning & Examples 👀
            </button>
        `;
        
        document.getElementById('practiceModal').style.display = 'block';
    } catch (error) {
        console.error('Error starting practice:', error);
        alert('Failed to start practice.');
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
        
        // Show success message
        document.getElementById('practiceContent').innerHTML = `
            <div class="practice-success">
                <div style="font-size: 4rem; margin-bottom: 20px;">🎉</div>
                <div>Great job!</div>
                <div style="font-size: 1.2rem; margin-top: 10px;">Practice recorded successfully</div>
            </div>
            <button class="btn btn-primary" onclick="closePracticeModal()">Continue</button>
        `;
        
        // Reload dashboard after a delay
        setTimeout(() => {
            closePracticeModal();
            loadDashboard();
            if (document.getElementById('libraryTab').classList.contains('active')) {
                loadWords();
            }
        }, 2000);
    } catch (error) {
        console.error('Error completing practice:', error);
        alert(error.message || 'Failed to record practice. You may have already practiced this word today.');
    }
}

// Close Practice Modal
function closePracticeModal() {
    document.getElementById('practiceModal').style.display = 'none';
}

// Close modals when clicking outside
window.onclick = function(event) {
    const wordModal = document.getElementById('wordModal');
    const practiceModal = document.getElementById('practiceModal');
    
    if (event.target === wordModal) {
        closeModal();
    }
    if (event.target === practiceModal) {
        closePracticeModal();
    }
}
