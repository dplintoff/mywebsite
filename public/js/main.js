// Global variables
let currentUser = null;
let quizQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let selectedCourses = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadCourses();
    loadColleges();
    setupEventListeners();
});

// Initialize application
function initializeApp() {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
        // Verify token and get user info
        fetch('/api/user', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                currentUser = data.user;
                updateAuthButtons();
            }
        })
        .catch(error => {
            console.error('Error verifying token:', error);
            localStorage.removeItem('token');
        });
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Register form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    // Hamburger menu
    document.getElementById('hamburger').addEventListener('click', toggleMobileMenu);

    // Quiz functionality
    document.getElementById('nextBtn').addEventListener('click', nextQuestion);
}

// Authentication functions
function showLogin() {
    document.getElementById('loginModal').style.display = 'block';
    document.getElementById('registerModal').style.display = 'none';
}

function showRegister() {
    document.getElementById('registerModal').style.display = 'block';
    document.getElementById('loginModal').style.display = 'none';
}

function closeModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('registerModal').style.display = 'none';
}

function updateAuthButtons() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');

    if (currentUser) {
        loginBtn.textContent = 'Profile';
        registerBtn.textContent = 'Logout';
        loginBtn.onclick = showProfile;
        registerBtn.onclick = logout;
    } else {
        loginBtn.textContent = 'Login';
        registerBtn.textContent = 'Register';
        loginBtn.onclick = showLogin;
        registerBtn.onclick = showRegister;
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateAuthButtons();
            closeModal();
            showNotification('Login successful!', 'success');
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Login failed. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const age = document.getElementById('registerAge').value;
    const gender = document.getElementById('registerGender').value;
    const userClass = document.getElementById('registerClass').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, age, gender, class: userClass })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Registration successful! Please login.', 'success');
            closeModal();
            showLogin();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Registration failed. Please try again.', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    updateAuthButtons();
    showNotification('Logged out successfully!', 'success');
}

function showProfile() {
    // Show user profile modal or redirect to profile page
    showNotification('Profile feature coming soon!', 'info');
}

// Quiz functionality
function startQuiz() {
    if (!currentUser) {
        showLogin();
        return;
    }
    showQuiz();
}

function showQuiz() {
    document.getElementById('startQuizBtn').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'block';

    // Initialize quiz
    currentQuestionIndex = 0;
    userAnswers = [];
    quizQuestions = [
        {
            question: "What subjects interest you the most?",
            options: ["Mathematics & Logic", "Biology & Nature", "Literature & Languages", "Business & Economics"],
            type: "multiple"
        },
        {
            question: "What type of work environment do you prefer?",
            options: ["Research Laboratory", "Office & Business", "Creative Studio", "Field Work"],
            type: "single"
        },
        {
            question: "How do you prefer to solve problems?",
            options: ["Through experiments", "With data and analysis", "Through discussion", "With practical solutions"],
            type: "single"
        },
        {
            question: "What are your career goals?",
            options: ["Scientific Research", "Business Management", "Teaching", "Public Service"],
            type: "multiple"
        },
        {
            question: "What skills do you want to develop?",
            options: ["Technical Skills", "Communication Skills", "Leadership Skills", "Creative Skills"],
            type: "multiple"
        }
    ];

    showQuestion();
}

function showQuestion() {
    const question = quizQuestions[currentQuestionIndex];
    document.getElementById('questionText').textContent = question.question;

    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';

    question.options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'quiz-option';
        optionElement.textContent = option;
        optionElement.onclick = () => selectOption(index);
        optionsContainer.appendChild(optionElement);
    });

    updateProgress();
}

function selectOption(optionIndex) {
    const options = document.querySelectorAll('.quiz-option');

    if (quizQuestions[currentQuestionIndex].type === 'single') {
        options.forEach(opt => opt.classList.remove('selected'));
    }

    options[optionIndex].classList.toggle('selected');
}

function nextQuestion() {
    const selectedOptions = document.querySelectorAll('.quiz-option.selected');
    if (selectedOptions.length === 0) {
        showNotification('Please select at least one option', 'warning');
        return;
    }

    const answers = Array.from(selectedOptions).map(opt => opt.textContent);
    userAnswers.push(answers);

    currentQuestionIndex++;

    if (currentQuestionIndex < quizQuestions.length) {
        showQuestion();
    } else {
        submitQuiz();
    }
}

function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('progressText').textContent = `${currentQuestionIndex + 1} / ${quizQuestions.length}`;
}

async function submitQuiz() {
    try {
        const response = await fetch('/api/submit-quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                userId: currentUser.id,
                quizType: 'aptitude',
                answers: userAnswers
            })
        });

        const data = await response.json();

        if (response.ok) {
            showQuizResults(data);
        } else {
            showNotification('Failed to submit quiz', 'error');
        }
    } catch (error) {
        showNotification('Error submitting quiz', 'error');
    }
}

function showQuizResults(data) {
    const quizContainer = document.getElementById('quizContainer');
    quizContainer.innerHTML = `
        <div class="quiz-results">
            <h3>Quiz Completed!</h3>
            <div class="score">Score: ${data.score}%</div>
            <div class="recommendations">
                <h4>Recommendations:</h4>
                <ul>
                    ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
            <button class="btn btn-primary" onclick="showQuiz()">Take Quiz Again</button>
        </div>
    `;

    // Show recommended courses based on results
    if (data.recommendations.some(rec => rec.includes('Science'))) {
        filterCourses('science');
    } else if (data.recommendations.some(rec => rec.includes('Commerce'))) {
        filterCourses('commerce');
    } else {
        filterCourses('arts');
    }
}

// Course functionality
async function loadCourses() {
    try {
        const response = await fetch('/api/courses');
        const courses = await response.json();

        displayCourses(courses);
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

function displayCourses(courses) {
    const coursesGrid = document.getElementById('coursesGrid');
    coursesGrid.innerHTML = '';

    courses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.innerHTML = `
            <div class="course-header">
                <h3>${course.name}</h3>
                <span class="course-stream">${course.stream}</span>
            </div>
            <div class="course-body">
                <p class="course-description">${course.description}</p>
                <div class="course-details">
                    <div class="course-detail">
                        <strong>Duration</strong><br>${course.duration} years
                    </div>
                    <div class="course-detail">
                        <strong>Career Paths</strong><br>${course.career_paths.split(',')[0]}
                    </div>
                </div>
                <div class="course-careers">
                    ${course.career_paths.split(',').map(career => `<span class="career-tag">${career.trim()}</span>`).join('')}
                </div>
            </div>
        `;
        coursesGrid.appendChild(courseCard);
    });
}

function filterCourses(stream) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    const courses = document.querySelectorAll('.course-card');
    courses.forEach(course => {
        if (stream === 'all' || course.querySelector('.course-stream').textContent.toLowerCase() === stream) {
            course.style.display = 'block';
        } else {
            course.style.display = 'none';
        }
    });
}

// College functionality
async function loadColleges() {
    try {
        const response = await fetch('/api/colleges');
        const colleges = await response.json();

        displayColleges(colleges);
    } catch (error) {
        console.error('Error loading colleges:', error);
    }
}

function displayColleges(colleges) {
    const collegesGrid = document.getElementById('collegesGrid');
    collegesGrid.innerHTML = '';

    colleges.forEach(college => {
        const collegeCard = document.createElement('div');
        collegeCard.className = 'college-card';
        collegeCard.innerHTML = `
            <h3 class="college-name">${college.name}</h3>
            <p class="college-location"><i class="fas fa-map-marker-alt"></i> ${college.location}</p>
            <div class="college-courses">
                <h4>Courses Offered:</h4>
                <p>${college.courses}</p>
            </div>
            <div class="college-facilities">
                ${college.facilities.split(',').map(facility => `<span class="facility-tag">${facility.trim()}</span>`).join('')}
            </div>
            <div class="college-info">
                <p><strong>Cut-off:</strong> ${college.cutoff}%</p>
                <p><strong>Contact:</strong> ${college.contact}</p>
                <p><strong>Website:</strong> <a href="http://${college.website}" target="_blank">${college.website}</a></p>
            </div>
        `;
        collegesGrid.appendChild(collegeCard);
    });
}

async function searchColleges() {
    const location = document.getElementById('locationSearch').value;

    try {
        const response = await fetch(`/api/colleges?location=${encodeURIComponent(location)}`);
        const colleges = await response.json();

        displayColleges(colleges);
    } catch (error) {
        console.error('Error searching colleges:', error);
    }
}

// Utility functions
function toggleMobileMenu() {
    const navMenu = document.getElementById('nav-menu');
    const hamburger = document.getElementById('hamburger');

    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 3000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;

    // Set background color based on type
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Additional functions for navigation
function exploreColleges() {
    document.getElementById('colleges').scrollIntoView({ behavior: 'smooth' });
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');

    if (event.target === loginModal) {
        closeModal();
    }
    if (event.target === registerModal) {
        closeModal();
    }
});
