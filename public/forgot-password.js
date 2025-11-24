// Forgot Password JavaScript

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

let userEmail = '';

// Request OTP Form Handler
const requestOtpForm = document.getElementById('requestOtpForm');
if (requestOtpForm) {
    requestOtpForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const errorMessage = document.getElementById('errorMessage');
        const requestOtpButton = document.getElementById('requestOtpButton');
        const requestOtpText = document.getElementById('requestOtpText');
        const requestOtpSpinner = document.getElementById('requestOtpSpinner');

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

        // Show loading state
        requestOtpButton.disabled = true;
        requestOtpText.style.display = 'none';
        requestOtpSpinner.style.display = 'inline-block';

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send verification code');
            }

            // Store email for next step
            userEmail = email;

            // Show reset password form
            document.getElementById('requestOtpForm').style.display = 'none';
            document.getElementById('resetPasswordForm').style.display = 'block';

            // Update subtitle
            if (data.phoneNumber) {
                document.querySelector('.auth-subtitle').textContent =
                    `Verification code sent to ${data.phoneNumber}`;
            } else {
                document.querySelector('.auth-subtitle').textContent =
                    `If an account exists, a code has been sent to the registered phone number.`;
            }
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';

            // Reset button state
            requestOtpButton.disabled = false;
            requestOtpText.style.display = 'inline';
            requestOtpSpinner.style.display = 'none';
        }
    });
}

// Reset Password Form Handler
const resetPasswordForm = document.getElementById('resetPasswordForm');
if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const otp = document.getElementById('otp').value.trim();
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        const resetErrorMessage = document.getElementById('resetErrorMessage');
        const resetPasswordButton = document.getElementById('resetPasswordButton');
        const resetPasswordText = document.getElementById('resetPasswordText');
        const resetPasswordSpinner = document.getElementById('resetPasswordSpinner');

        // Hide error message
        resetErrorMessage.style.display = 'none';

        // Frontend validation
        if (!otp) {
            resetErrorMessage.textContent = 'Verification code is required';
            resetErrorMessage.style.display = 'block';
            return;
        }

        if (otp.length !== 6 || !/^\d+$/.test(otp)) {
            resetErrorMessage.textContent = 'Verification code must be 6 digits';
            resetErrorMessage.style.display = 'block';
            return;
        }

        if (!newPassword) {
            resetErrorMessage.textContent = 'New password is required';
            resetErrorMessage.style.display = 'block';
            return;
        }

        // Password strength validation
        if (newPassword.length < 8) {
            resetErrorMessage.textContent = 'Password must be at least 8 characters long';
            resetErrorMessage.style.display = 'block';
            return;
        }

        if (!/[A-Z]/.test(newPassword)) {
            resetErrorMessage.textContent = 'Password must contain at least one uppercase letter';
            resetErrorMessage.style.display = 'block';
            return;
        }

        if (!/[a-z]/.test(newPassword)) {
            resetErrorMessage.textContent = 'Password must contain at least one lowercase letter';
            resetErrorMessage.style.display = 'block';
            return;
        }

        if (!/[0-9]/.test(newPassword)) {
            resetErrorMessage.textContent = 'Password must contain at least one number';
            resetErrorMessage.style.display = 'block';
            return;
        }

        if (newPassword !== confirmNewPassword) {
            resetErrorMessage.textContent = 'Passwords do not match';
            resetErrorMessage.style.display = 'block';
            return;
        }

        // Show loading state
        resetPasswordButton.disabled = true;
        resetPasswordText.style.display = 'none';
        resetPasswordSpinner.style.display = 'inline-block';

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: userEmail,
                    otp,
                    newPassword
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }

            // Success! Redirect to login
            alert('Password reset successfully! Please login with your new password.');
            window.location.href = '/login';
        } catch (error) {
            resetErrorMessage.textContent = error.message;
            resetErrorMessage.style.display = 'block';

            // Reset button state
            resetPasswordButton.disabled = false;
            resetPasswordText.style.display = 'inline';
            resetPasswordSpinner.style.display = 'none';
        }
    });
}

// Resend OTP Button Handler
const resendOtpButton = document.getElementById('resendOtpButton');
if (resendOtpButton) {
    resendOtpButton.addEventListener('click', async () => {
        const resetErrorMessage = document.getElementById('resetErrorMessage');
        resetErrorMessage.style.display = 'none';

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: userEmail }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to resend verification code');
            }

            resetErrorMessage.textContent = 'Verification code resent successfully!';
            resetErrorMessage.style.display = 'block';
            resetErrorMessage.style.background = 'rgba(0, 255, 136, 0.1)';
            resetErrorMessage.style.borderColor = 'var(--accent-primary)';
            resetErrorMessage.style.color = 'var(--accent-primary)';

            // Reset error styling after 3 seconds
            setTimeout(() => {
                resetErrorMessage.style.display = 'none';
                resetErrorMessage.style.background = '';
                resetErrorMessage.style.borderColor = '';
                resetErrorMessage.style.color = '';
            }, 3000);
        } catch (error) {
            resetErrorMessage.textContent = error.message;
            resetErrorMessage.style.display = 'block';
        }
    });
}
