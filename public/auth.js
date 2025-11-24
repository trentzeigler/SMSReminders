// Authentication JavaScript

function isValidEmail(email) {
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('errorMessage');
        const loginButton = document.getElementById('loginButton');
        const loginText = document.getElementById('loginText');
        const loginSpinner = document.getElementById('loginSpinner');

        // Hide error message
        errorMessage.style.display = 'none';

        // Frontend validation
        if (!email) {
            errorMessage.textContent = 'Email is required';
            errorMessage.style.display = 'block';
            return;
        }

        if (!isValidEmail(email)) {
            errorMessage.textContent = 'Please enter a valid email address';
            errorMessage.style.display = 'block';
            return;
        }

        if (!password) {
            errorMessage.textContent = 'Password is required';
            errorMessage.style.display = 'block';
            return;
        }

        // Show loading state
        loginButton.disabled = true;
        loginText.style.display = 'none';
        loginSpinner.style.display = 'inline-block';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Store token
            localStorage.setItem('token', data.token);

            // Store user data
            window.user = {
                id: data.id,
                email: data.email,
                phoneNumber: data.phoneNumber
            };
            // Redirect to chat
            window.location.href = '/chat';
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';

            // Reset button state
            loginButton.disabled = false;
            loginText.style.display = 'inline';
            loginSpinner.style.display = 'none';
        }
    });
}

// Signup Form Handler
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const phoneNumber = document.getElementById('phoneNumber').value.trim();
        const errorMessage = document.getElementById('errorMessage');
        const signupButton = document.getElementById('signupButton');
        const signupText = document.getElementById('signupText');
        const signupSpinner = document.getElementById('signupSpinner');

        // Hide error message
        errorMessage.style.display = 'none';

        // Frontend validation
        if (!email) {
            errorMessage.textContent = 'Email is required';
            errorMessage.style.display = 'block';
            return;
        }

        if (!isValidEmail(email)) {
            errorMessage.textContent = 'Please enter a valid email address';
            errorMessage.style.display = 'block';
            return;
        }

        if (!password) {
            errorMessage.textContent = 'Password is required';
            errorMessage.style.display = 'block';
            return;
        }

        // Password strength validation
        if (password.length < 8) {
            errorMessage.textContent = 'Password must be at least 8 characters long';
            errorMessage.style.display = 'block';
            return;
        }

        if (!/[A-Z]/.test(password)) {
            errorMessage.textContent = 'Password must contain at least one uppercase letter';
            errorMessage.style.display = 'block';
            return;
        }

        if (!/[a-z]/.test(password)) {
            errorMessage.textContent = 'Password must contain at least one lowercase letter';
            errorMessage.style.display = 'block';
            return;
        }

        if (!/[0-9]/.test(password)) {
            errorMessage.textContent = 'Password must contain at least one number';
            errorMessage.style.display = 'block';
            return;
        }

        if (!confirmPassword) {
            errorMessage.textContent = 'Please confirm your password';
            errorMessage.style.display = 'block';
            return;
        }

        // Validate passwords match
        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match';
            errorMessage.style.display = 'block';
            return;
        }

        // Show loading state
        signupButton.disabled = true;
        signupText.style.display = 'none';
        signupSpinner.style.display = 'inline-block';

        try {
            const body = { email, password };
            if (phoneNumber) {
                body.phoneNumber = phoneNumber;
            }

            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Signup failed');
            }

            // Store token
            localStorage.setItem('token', data.token);

            // Store user data
            window.user = {
                id: data.id,
                email: data.email,
                phoneNumber: data.phoneNumber
            };
            // Redirect to chat
            window.location.href = '/chat';
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';

            // Reset button state
            signupButton.disabled = false;
            signupText.style.display = 'inline';
            signupSpinner.style.display = 'none';
        }
    });
}
